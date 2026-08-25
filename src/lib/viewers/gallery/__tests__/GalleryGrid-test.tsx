import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    GALLERY_GRID_PADDING_TOP,
    GALLERY_THUMB_MAX_WIDTH,
    GALLERY_THUMB_WIDTH_TIERS,
    GALLERY_TILE_DEFAULT_RATIO,
    GALLERY_TILE_GAP,
    GALLERY_TILE_MIN_WIDTH,
} from '../constants';
import GalleryGrid from '../GalleryGrid';
import { getGalleryLayout, getRowStartOffset, getRowTrackWidth } from '../galleryGridLayout';
import { getRowIndex } from '../galleryGridNavigation';

const observeMock = jest.fn();
const disconnectMock = jest.fn();
const resizeCallbacks: Array<(entries?: unknown[]) => void> = [];
((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = jest
    .fn()
    .mockImplementation((callback: (entries?: unknown[]) => void) => {
        resizeCallbacks.push(callback);
        return { observe: observeMock, unobserve: jest.fn(), disconnect: disconnectMock };
    });

const fireResize = (): void => {
    act(() => {
        resizeCallbacks.forEach(callback => callback([]));
    });
};

// Width that yields 3 columns at scale 1; height large enough that 10-page tests mount every row.
const DEFAULT_WIDTH = 920;
const DEFAULT_HEIGHT = 4000;
let mockWidth = DEFAULT_WIDTH;
let mockHeight = DEFAULT_HEIGHT;

const widthForColumns = (columns: number): number =>
    columns * GALLERY_TILE_MIN_WIDTH + (columns - 1) * GALLERY_TILE_GAP;

const setViewport = (width: number, height: number): void => {
    mockWidth = width;
    mockHeight = height;
};

describe('GalleryGrid', () => {
    const mockThumbnail = {
        init: jest.fn().mockResolvedValue(100),
        getImageFromCache: jest.fn().mockReturnValue(null),
        createThumbnailImage: jest.fn().mockResolvedValue(null),
        renderPageImage: jest.fn(() => ({ cancel: jest.fn(), promise: Promise.resolve(null) })),
        destroy: jest.fn(),
    };

    const defaultProps = {
        pageCount: 10,
        currentPage: 3,
        onPageNavigate: jest.fn(),
        onClose: jest.fn(),
        thumbnail: mockThumbnail,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resizeCallbacks.length = 0;
        setViewport(DEFAULT_WIDTH, DEFAULT_HEIGHT);

        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            configurable: true,
            get() {
                return mockWidth;
            },
        });
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            configurable: true,
            get() {
                return mockHeight;
            },
        });
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() {
                return mockWidth;
            },
        });
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
            configurable: true,
            get() {
                return mockHeight;
            },
        });
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
            configurable: true,
            get(this: HTMLElement) {
                const inner = this.firstElementChild as HTMLElement | null;
                if (inner && inner.style && inner.style.height) {
                    return parseFloat(inner.style.height) || mockHeight;
                }
                return mockHeight;
            },
        });

        Element.prototype.scrollTo = jest.fn(function scrollTo(this: Element, arg?: ScrollToOptions | number) {
            if (typeof arg === 'object' && arg && arg.top != null) {
                Object.defineProperty(this, 'scrollTop', { configurable: true, writable: true, value: arg.top });
            }
        });
        Element.prototype.scrollIntoView = jest.fn();
    });

    const getWrapper = (props = {}) => render(<GalleryGrid {...defaultProps} {...props} />);

    describe('render', () => {
        test('should render the gallery grid container with listbox role', () => {
            getWrapper();
            const grid = screen.getByRole('listbox');
            expect(grid).toHaveClass('bp-gallery-grid');
            expect(grid).toHaveAttribute('aria-label', 'Page gallery');
        });

        test('should render an option for each page', () => {
            getWrapper();
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(10);
        });

        test('should set aria-label on each tile', () => {
            getWrapper();
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
        });
    });

    describe('resin tagging', () => {
        test('should set the resin target on every tile', () => {
            getWrapper();
            screen.getAllByRole('option').forEach(tile => {
                expect(tile).toHaveAttribute('data-resin-target', 'galleryTile');
            });
        });
    });

    describe('current page highlight', () => {
        test('should apply selected class to current page tile', () => {
            getWrapper();
            const tile = screen.getByLabelText('Page 3');
            expect(tile).toHaveClass('bp-gallery-tile--selected');
        });

        test('should set aria-selected on current page tile only', () => {
            getWrapper();
            expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-selected', 'false');
        });

        test('should give current page tile tabIndex 0 and others -1 (roving tabindex)', () => {
            getWrapper();
            expect(screen.getByLabelText('Page 3')).toHaveAttribute('tabIndex', '0');
            expect(screen.getByLabelText('Page 1')).toHaveAttribute('tabIndex', '-1');
        });

        test('should render badge on every tile', () => {
            getWrapper();
            const allTiles = screen.getAllByRole('option');
            allTiles.forEach(tile => {
                const badge = tile.querySelector('.bp-gallery-tile-badge');
                expect(badge).toBeInTheDocument();
                expect(badge).toHaveAttribute('aria-hidden', 'true');
            });
        });

        test('should scroll the current page tile into view on mount', () => {
            getWrapper();
            expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        });
    });

    describe('navigation', () => {
        test('should call onPageNavigate on tile click', async () => {
            const onPageNavigate = jest.fn();
            getWrapper({ onPageNavigate });
            await userEvent.click(screen.getByLabelText('Page 5'));
            expect(onPageNavigate).toHaveBeenCalledWith(5);
        });

        test('should still allow click navigation when thumbnail render failed (fallback tile)', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const failingThumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockRejectedValue(new Error('render failed')),
            };
            const onPageNavigate = jest.fn();
            getWrapper({ onPageNavigate, thumbnail: failingThumbnail });

            const tile = screen.getByLabelText('Page 7');
            expect(tile.querySelector('.bp-gallery-tile-badge')).toBeInTheDocument();
            expect(tile.querySelector('.bp-gallery-tile-placeholder')).toBeInTheDocument();

            await userEvent.click(tile);
            expect(onPageNavigate).toHaveBeenCalledWith(7);
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe('keyboard', () => {
        test('should call onClose on Escape', async () => {
            const onClose = jest.fn();
            getWrapper({ onClose });
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{Escape}');
            expect(onClose).toHaveBeenCalled();
        });

        test('should move focus to next tile on ArrowDown', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{ArrowDown}');
            expect(screen.getByLabelText('Page 4')).toHaveFocus();
        });

        test('should move focus to next tile on ArrowRight', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{ArrowRight}');
            expect(screen.getByLabelText('Page 4')).toHaveFocus();
        });

        test('should allow native focus scrolling when moving between listbox tiles', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            const nextTile = screen.getByLabelText('Page 4');
            const focus = jest.spyOn(nextTile, 'focus');

            await userEvent.keyboard('{ArrowRight}');

            expect(focus).toHaveBeenCalledWith({ preventScroll: false });
            expect(nextTile).toHaveFocus();
        });

        test('should move focus to previous tile on ArrowUp', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{ArrowUp}');
            expect(screen.getByLabelText('Page 2')).toHaveFocus();
        });

        test('should move focus to previous tile on ArrowLeft', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{ArrowLeft}');
            expect(screen.getByLabelText('Page 2')).toHaveFocus();
        });

        test('should not move past first tile on ArrowUp', async () => {
            getWrapper();
            act(() => screen.getByLabelText('Page 3').focus());
            act(() => screen.getByLabelText('Page 1').focus());
            await userEvent.keyboard('{ArrowUp}');
            expect(screen.getByLabelText('Page 1')).toHaveFocus();
        });

        test('should not move past last tile on ArrowDown', async () => {
            getWrapper();
            act(() => screen.getByLabelText('Page 3').focus());
            act(() => screen.getByLabelText('Page 10').focus());
            await userEvent.keyboard('{ArrowDown}');
            expect(screen.getByLabelText('Page 10')).toHaveFocus();
        });

        test('should jump to first tile on Home', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{Home}');
            expect(screen.getByLabelText('Page 1')).toHaveFocus();
        });

        test('should jump to last tile on End', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{End}');
            expect(screen.getByLabelText('Page 10')).toHaveFocus();
        });

        test('should call onPageNavigate on Enter', async () => {
            const onPageNavigate = jest.fn();
            getWrapper({ onPageNavigate });
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard('{Enter}');
            expect(onPageNavigate).toHaveBeenCalledWith(3);
        });

        test('should call onPageNavigate on Space', async () => {
            const onPageNavigate = jest.fn();
            getWrapper({ onPageNavigate });
            screen.getByLabelText('Page 3').focus();
            await userEvent.keyboard(' ');
            expect(onPageNavigate).toHaveBeenCalledWith(3);
        });

        test.each([
            '{ArrowUp}',
            '{ArrowDown}',
            '{ArrowLeft}',
            '{ArrowRight}',
            '{Home}',
            '{End}',
            '{Enter}',
            ' ',
            '{Escape}',
        ])('should stop propagation on %s so parent handlers do not fire', async keyString => {
            const parentHandler = jest.fn();
            document.addEventListener('keydown', parentHandler);
            getWrapper();
            screen.getByLabelText('Page 3').focus();

            await userEvent.keyboard(keyString);

            expect(parentHandler).not.toHaveBeenCalled();
            document.removeEventListener('keydown', parentHandler);
        });
    });

    describe('focus management', () => {
        test('should focus current page tile on mount', () => {
            getWrapper();
            const tile = screen.getByLabelText('Page 3');
            expect(tile).toHaveFocus();
        });

        test('should move selected class when tile receives focus', async () => {
            getWrapper();
            const tile5 = screen.getByLabelText('Page 5');
            act(() => tile5.focus());

            await waitFor(() => {
                expect(tile5).toHaveClass('bp-gallery-tile--selected');
            });

            const tile3 = screen.getByLabelText('Page 3');
            expect(tile3).not.toHaveClass('bp-gallery-tile--selected');
        });

        test('should call onFocusChange when tile receives focus', () => {
            const onFocusChange = jest.fn();
            getWrapper({ onFocusChange });
            const tile5 = screen.getByLabelText('Page 5');
            act(() => tile5.focus());
            expect(onFocusChange).toHaveBeenCalledWith(5);
        });

        test('should redirect focus to focused tile when grid container is clicked', async () => {
            getWrapper();
            const grid = screen.getByRole('listbox');
            const focusedTile = screen.getByLabelText('Page 3');
            const focus = jest.spyOn(focusedTile, 'focus');
            grid.focus();

            await waitFor(() => {
                expect(focusedTile).toHaveFocus();
            });
            expect(focus).toHaveBeenCalledWith({ preventScroll: true });
        });
    });

    describe('resize handling', () => {
        test('should restore the current page tile to the top when the grid resizes before any scroll', () => {
            getWrapper();
            expect(observeMock).toHaveBeenCalled();

            const otherTilesSpy = jest.fn();
            const tile3Spy = jest.fn();
            screen.getAllByRole('option').forEach(tile => {
                tile.scrollIntoView = tile === screen.getByLabelText('Page 3') ? tile3Spy : otherTilesSpy;
            });

            fireResize(); // initial fire on observe() is skipped
            expect(tile3Spy).not.toHaveBeenCalled();

            fireResize();
            expect(tile3Spy).toHaveBeenCalledWith({ block: 'start' });
            expect(otherTilesSpy).not.toHaveBeenCalled();
        });

        test('should anchor to the topmost visible tile after a scroll so resize restores the viewed area', () => {
            getWrapper();
            const grid = screen.getByRole('listbox');
            const tiles = screen.getAllByRole('option');

            // Simulate a layout where each tile is 100px tall and the grid is scrolled to 620px,
            // making page 7 (offsetTop 600–700) the topmost visible tile.
            tiles.forEach((tile, index) => {
                Object.defineProperty(tile, 'offsetTop', { configurable: true, value: index * 100 });
                Object.defineProperty(tile, 'offsetHeight', { configurable: true, value: 100 });
            });
            Object.defineProperty(grid, 'scrollTop', { configurable: true, value: 620 });
            fireEvent.scroll(grid);

            const otherTilesSpy = jest.fn();
            const tile7Spy = jest.fn();
            tiles.forEach(tile => {
                tile.scrollIntoView = tile === screen.getByLabelText('Page 7') ? tile7Spy : otherTilesSpy;
            });

            fireResize(); // skipped initial fire
            fireResize();

            expect(tile7Spy).toHaveBeenCalledWith({ block: 'start' });
            expect(otherTilesSpy).not.toHaveBeenCalled();
        });

        test('should disconnect the observer on unmount', () => {
            const { unmount } = getWrapper();
            unmount();
            expect(disconnectMock).toHaveBeenCalled();
        });
    });

    describe('zoom', () => {
        test('should scale and clamp the tile width while keeping the listbox structure untouched', () => {
            const { rerender } = getWrapper();
            const inner = screen.getByRole('presentation');
            Object.defineProperty(inner, 'clientWidth', { configurable: true, value: 920 });

            expect(inner).toHaveClass('bp-gallery-grid-inner');
            expect(inner.style.gridTemplateColumns).toBe('');
            expect(inner.style.getPropertyValue('--bp-gallery-hover-scale')).toBe('1.02');
            expect(screen.getByRole('listbox')).toContainElement(inner);
            expect(screen.getAllByRole('option')).toHaveLength(10);

            rerender(<GalleryGrid {...defaultProps} scale={1.5} />);

            expect(inner.style.gridTemplateColumns).toBe('repeat(auto-fill, 444px)');
            expect(inner.style.justifyContent).toBe('center');
            expect(inner.style.getPropertyValue('--bp-gallery-hover-scale')).toBe(String(1 + 0.02 / 1.5));
            expect(screen.getAllByRole('option')).toHaveLength(10);

            rerender(<GalleryGrid {...defaultProps} scale={1} />);

            expect(inner.style.gridTemplateColumns).toBe('');
            expect(inner.style.justifyContent).toBe('');
            expect(inner.style.getPropertyValue('--bp-gallery-hover-scale')).toBe('1.02');

            Object.defineProperty(inner, 'clientWidth', { configurable: true, value: 200 });
            rerender(<GalleryGrid {...defaultProps} scale={2} />);

            expect(inner.style.gridTemplateColumns).toBe('repeat(auto-fill, 200px)');
            expect(inner.style.getPropertyValue('--bp-gallery-hover-scale')).toBe('1.01');
        });

        test('should keep the topmost visible tile anchored when the scale changes', () => {
            const { rerender } = getWrapper();
            const grid = screen.getByRole('listbox');
            Object.defineProperty(grid, 'scrollLeft', { configurable: true, value: 0, writable: true });
            Object.defineProperty(grid, 'scrollTop', { configurable: true, value: 100, writable: true });
            const anchorTile = screen.getByLabelText('Page 3');
            jest.spyOn(anchorTile, 'getBoundingClientRect')
                .mockReturnValueOnce({ left: 0, top: 150 } as DOMRect)
                .mockReturnValueOnce({ left: 30, top: 390 } as DOMRect);

            rerender(<GalleryGrid {...defaultProps} scale={2} />);

            expect(grid.scrollLeft).toBe(30);
            expect(grid.scrollTop).toBe(340);
        });

        describe('pinch gestures', () => {
            let rafCallback: FrameRequestCallback | null = null;

            const wheelEvent = (init: WheelEventInit): WheelEvent =>
                new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });

            const touchEvent = (type: string, xPositions: number[]): TouchEvent => {
                const touches = xPositions.map(
                    x => (({ clientX: x, clientY: 0, pageX: x, pageY: 0 } as unknown) as Touch),
                );
                return new TouchEvent(type, { bubbles: true, cancelable: true, touches });
            };

            beforeEach(() => {
                rafCallback = null;
                jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
                    rafCallback = callback;
                    return 1;
                });
            });

            afterEach(() => {
                jest.restoreAllMocks();
                delete (document as { elementFromPoint?: unknown }).elementFromPoint;
            });

            test('should update scale from a ctrl+wheel trackpad pinch anchored on the cursor', () => {
                const onScaleChange = jest.fn();
                const { rerender } = getWrapper({ isPinchZoomEnabled: true, onScaleChange });
                const grid = screen.getByRole('listbox');
                Object.defineProperty(grid, 'scrollLeft', { configurable: true, value: 0, writable: true });
                Object.defineProperty(grid, 'scrollTop', { configurable: true, value: 0, writable: true });
                const event = wheelEvent({ clientX: 300, clientY: 200, ctrlKey: true, deltaY: -20 });

                act(() => {
                    grid.dispatchEvent(event);
                });
                expect(event.defaultPrevented).toBe(true);

                act(() => rafCallback!(0));
                expect(onScaleChange).toHaveBeenCalledWith(1.2);

                const pinchTile = screen.getByLabelText('Page 5');
                document.elementFromPoint = jest.fn().mockReturnValue(pinchTile);
                jest.spyOn(pinchTile, 'getBoundingClientRect')
                    .mockReturnValueOnce({ left: 250, top: 180 } as DOMRect)
                    .mockReturnValueOnce({ left: 310, top: 260 } as DOMRect);

                rerender(
                    <GalleryGrid {...defaultProps} isPinchZoomEnabled onScaleChange={onScaleChange} scale={1.2} />,
                );

                expect(document.elementFromPoint).toHaveBeenCalledWith(300, 200);
                expect(grid.scrollLeft).toBe(60);
                expect(grid.scrollTop).toBe(80);
            });

            test('should clear the pinch focal point when the scale change is rejected', () => {
                const onScaleChange = jest.fn().mockReturnValue(false);
                const { rerender } = getWrapper({ isPinchZoomEnabled: true, onScaleChange });
                const grid = screen.getByRole('listbox');

                act(() => {
                    grid.dispatchEvent(wheelEvent({ clientX: 300, clientY: 200, ctrlKey: true, deltaY: -20 }));
                });
                act(() => rafCallback!(0));

                document.elementFromPoint = jest.fn();
                rerender(
                    <GalleryGrid {...defaultProps} isPinchZoomEnabled onScaleChange={onScaleChange} scale={1.1} />,
                );

                expect(document.elementFromPoint).not.toHaveBeenCalled();
            });

            test('should update scale from a two-finger touch pinch', () => {
                const onScaleChange = jest.fn();
                getWrapper({ isTouchZoomEnabled: true, onScaleChange });
                const grid = screen.getByRole('listbox');

                act(() => {
                    grid.dispatchEvent(touchEvent('touchstart', [0, 100]));
                    grid.dispatchEvent(touchEvent('touchmove', [0, 200]));
                });

                act(() => rafCallback!(0));
                expect(onScaleChange).toHaveBeenCalledWith(2);
            });

            test('should report one pinch session per burst of trackpad wheel events', () => {
                let now = 1000;
                jest.spyOn(Date, 'now').mockImplementation(() => now);
                const onPinchStart = jest.fn();
                getWrapper({ isPinchZoomEnabled: true, onPinchStart });
                const grid = screen.getByRole('listbox');

                act(() => {
                    grid.dispatchEvent(wheelEvent({ ctrlKey: true, deltaY: -20 }));
                    now += 50; // Within the same gesture
                    grid.dispatchEvent(wheelEvent({ ctrlKey: true, deltaY: -20 }));
                });

                expect(onPinchStart).toHaveBeenCalledTimes(1);
                expect(onPinchStart).toHaveBeenCalledWith('zoomIn');

                act(() => {
                    now += 500; // A pause starts a new gesture
                    grid.dispatchEvent(wheelEvent({ ctrlKey: true, deltaY: 20 }));
                });

                expect(onPinchStart).toHaveBeenCalledTimes(2);
                expect(onPinchStart).toHaveBeenLastCalledWith('zoomOut');
            });

            test('should ignore plain wheel scrolling and ctrl+wheel when pinch zoom is disabled', () => {
                const onScaleChange = jest.fn();
                const { rerender } = getWrapper({ isPinchZoomEnabled: true, onScaleChange });
                const grid = screen.getByRole('listbox');

                const plainWheel = wheelEvent({ deltaY: -20 });
                act(() => {
                    grid.dispatchEvent(plainWheel);
                });
                expect(plainWheel.defaultPrevented).toBe(false);

                rerender(<GalleryGrid {...defaultProps} isPinchZoomEnabled={false} onScaleChange={onScaleChange} />);
                const ctrlWheel = wheelEvent({ ctrlKey: true, deltaY: -20 });
                act(() => {
                    grid.dispatchEvent(ctrlWheel);
                });

                expect(ctrlWheel.defaultPrevented).toBe(false);
                expect(onScaleChange).not.toHaveBeenCalled();
            });
        });
    });

    describe('viewport-aware loading', () => {
        // Lay the grid out as a single column of 100px-tall tiles so getUnloadedNearViewport
        // has real geometry to work with (jsdom defaults all dimensions to 0).
        const layoutGrid = (clientHeight: number) => {
            const grid = screen.getByRole('listbox');
            Object.defineProperty(grid, 'clientHeight', { configurable: true, value: clientHeight });
            screen.getAllByRole('option').forEach((tile, index) => {
                Object.defineProperty(tile, 'offsetTop', { configurable: true, value: index * 100 });
                Object.defineProperty(tile, 'offsetHeight', { configurable: true, value: 100 });
            });
        };

        let rafSpy: jest.SpyInstance;

        beforeEach(() => {
            // Run the queue pump synchronously so 40+ load cycles don't need real frames
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
                cb(0);
                return 0;
            });
        });

        afterEach(() => {
            rafSpy.mockRestore();
        });

        test('should load exactly the viewport + buffer, then go idle', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            getWrapper({ pageCount: 50, currentPage: 1, thumbnail });
            // clientHeight 1200 → 3x buffer 3600 → tiles above 4800px (pages 1-48) are near the viewport
            layoutGrid(1200);

            await waitFor(() => {
                expect(screen.getByLabelText('Page 48').querySelector('img')).toBeInTheDocument();
            });
            // Pages beyond the viewport + buffer stay lazy
            expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(48);
            expect(screen.getByLabelText('Page 49').querySelector('img')).not.toBeInTheDocument();
        });

        test('should temporarily sharpen visible tiles after zooming in', async () => {
            const renderPageImage = jest.fn((pageNum: number, { thumbMaxWidth }: { thumbMaxWidth: number }) => ({
                cancel: jest.fn(),
                promise: Promise.resolve({
                    dataUrl: `data:image/png;high-res-${pageNum}`,
                    height: thumbMaxWidth,
                    width: thumbMaxWidth,
                }),
            }));
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn((pageIndex: number) => {
                    const image = document.createElement('img');
                    image.src = `data:image/png;base-${pageIndex + 1}`;
                    return Promise.resolve(image);
                }),
                pageRatio: 1,
                renderPageImage,
            };
            const { rerender } = getWrapper({ pageCount: 10, currentPage: 1, thumbnail });
            layoutGrid(500);

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(10);
            });
            expect(thumbnail.createThumbnailImage).toHaveBeenCalledWith(0, {
                createImgTag: true,
                thumbMaxWidth: GALLERY_THUMB_MAX_WIDTH,
            });
            thumbnail.createThumbnailImage.mockClear();

            screen.getAllByRole('option').forEach(tile => {
                Object.defineProperty(tile, 'offsetWidth', { configurable: true, value: 600 });
            });
            rerender(<GalleryGrid {...defaultProps} currentPage={1} scale={2} thumbnail={thumbnail} />);

            await waitFor(() => {
                expect(renderPageImage).toHaveBeenCalledWith(1, { thumbMaxWidth: GALLERY_THUMB_WIDTH_TIERS[1] });
            });
            expect(thumbnail.createThumbnailImage).not.toHaveBeenCalled();
            expect(screen.getByLabelText('Page 1').querySelector('img')).toHaveAttribute(
                'src',
                'data:image/png;high-res-1',
            );

            rerender(<GalleryGrid {...defaultProps} currentPage={1} scale={1} thumbnail={thumbnail} />);

            await waitFor(() => {
                expect(screen.getByLabelText('Page 1').querySelector('img')).toHaveAttribute(
                    'src',
                    'data:image/png;base-1',
                );
            });
        });

        test('should wait for thumbnail initialization before rendering high-resolution pages', async () => {
            let resolveInit!: (value: number) => void;
            const initPromise = new Promise<number>(resolve => {
                resolveInit = resolve;
            });
            const renderPageImage = jest.fn((pageNum: number, { thumbMaxWidth }: { thumbMaxWidth: number }) => ({
                cancel: jest.fn(),
                promise: Promise.resolve({
                    dataUrl: `data:image/png;high-res-${pageNum}`,
                    height: thumbMaxWidth,
                    width: thumbMaxWidth,
                }),
            }));
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue(null),
                init: jest.fn(() => initPromise),
                pageRatio: undefined as number | undefined,
                renderPageImage,
            };
            const { rerender } = getWrapper({ pageCount: 10, currentPage: 1, thumbnail });
            layoutGrid(500);
            screen.getAllByRole('option').forEach(tile => {
                Object.defineProperty(tile, 'offsetWidth', { configurable: true, value: 600 });
            });

            rerender(<GalleryGrid {...defaultProps} currentPage={1} scale={2} thumbnail={thumbnail} />);
            expect(renderPageImage).not.toHaveBeenCalled();

            thumbnail.pageRatio = 1;
            resolveInit(100);

            await waitFor(() => {
                expect(renderPageImage).toHaveBeenCalledWith(1, { thumbMaxWidth: GALLERY_THUMB_WIDTH_TIERS[1] });
            });
        });

        test('should load radiating outward from the viewed area', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            getWrapper({ pageCount: 50, currentPage: 25, thumbnail });
            // Large viewport: every tile falls within viewport + buffer, so all 50 load
            layoutGrid(5000);

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(50);
            });

            // Distance-sorted from the anchor (page 25) throughout, never DOM order
            const pages = thumbnail.createThumbnailImage.mock.calls.map(([index]) => index + 1);
            const distances = pages.map(p => Math.abs(p - 25));
            expect(distances).toEqual([...distances].sort((a, b) => a - b));
        });

        test('should load visible tiles before buffered off-screen tiles when scrolling into an unloaded area', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            getWrapper({ pageCount: 60, currentPage: 1, thumbnail });
            // Single column, 100px tiles, 300px viewport: initial load covers pages 1-12
            layoutGrid(300);

            await waitFor(() => {
                expect(screen.getByLabelText('Page 12').querySelector('img')).toBeInTheDocument();
            });
            thumbnail.createThumbnailImage.mockClear();

            // Jump deep into unloaded territory: pages 51-53 visible, 42-50/54-60 in the buffer
            const grid = screen.getByRole('listbox');
            Object.defineProperty(grid, 'scrollTop', { configurable: true, value: 5000 });
            fireEvent.scroll(grid);

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage.mock.calls.length).toBeGreaterThanOrEqual(3);
            });
            const firstPages = thumbnail.createThumbnailImage.mock.calls.slice(0, 3).map(([index]) => index + 1);
            expect(firstPages).toEqual([51, 52, 53]);
        });

        test('should go idle after the first batch when the grid has no measurable geometry', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            // Prototype mocks otherwise report a tall viewport; zero height means nothing is nearby
            // and the pump parks after its first batch (scroll/resize revive it).
            setViewport(DEFAULT_WIDTH, 0);
            getWrapper({ pageCount: 50, currentPage: 1, thumbnail });

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(4);
            });
            // Give the pump a chance to (incorrectly) continue before asserting it went idle
            await new Promise(resolve => {
                setTimeout(resolve, 50);
            });
            expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(4);
        });

        test('should load newly revealed tiles on resize without a scroll event', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue(null),
            };
            setViewport(DEFAULT_WIDTH, 0);
            getWrapper({ pageCount: 10, currentPage: 1, thumbnail });

            // No geometry yet, so only the first batch runs (and resolves no images)
            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(4);
            });
            thumbnail.createThumbnailImage.mockClear();

            // Simulate a resize (e.g. fullscreen enter) revealing the tiles
            setViewport(DEFAULT_WIDTH, DEFAULT_HEIGHT);
            layoutGrid(500);
            fireResize(); // initial fire on observe() is skipped
            fireResize();

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(10);
            });
        });
    });

    describe('thumbnail loading', () => {
        test('should call thumbnail.init on mount', async () => {
            getWrapper();
            await waitFor(() => {
                expect(mockThumbnail.init).toHaveBeenCalled();
            });
        });

        test('should still start the load queue when thumbnail.init rejects', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const thumbnail = {
                ...mockThumbnail,
                init: jest.fn().mockRejectedValue(new Error('init failed')),
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            getWrapper({ thumbnail });

            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalled();
            });
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        test('should check cache for each page on mount', () => {
            getWrapper();
            expect(mockThumbnail.getImageFromCache).toHaveBeenCalledTimes(10);
        });

        test('should use cached images while preserving the page ratio', async () => {
            const cachedThumbnail = {
                ...mockThumbnail,
                pageRatio: 4 / 3,
                getImageFromCache: jest.fn(pageIndex => {
                    if (pageIndex === 2) {
                        return { image: { src: 'data:image/png;cached-page-3' }, inProgress: false };
                    }
                    return null;
                }),
            };
            getWrapper({ thumbnail: cachedThumbnail });

            const tile3 = screen.getByLabelText('Page 3');
            const img = tile3.querySelector('img');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'data:image/png;cached-page-3');
            await waitFor(() => {
                expect(tile3.style.aspectRatio).toBe(String(4 / 3));
                expect(img?.style.height).toBe('100%');
            });
        });

        test('should show placeholder for uncached pages', () => {
            getWrapper();
            const tile1 = screen.getByLabelText('Page 1');
            expect(tile1.querySelector('.bp-gallery-tile-placeholder')).toBeInTheDocument();
            expect(tile1.querySelector('img')).not.toBeInTheDocument();
        });

        test('should size tiles from the page ratio once init resolves', async () => {
            const thumbnail = { ...mockThumbnail, pageRatio: 16 / 9 };
            getWrapper({ thumbnail });

            await waitFor(() => {
                const tile = screen.getByLabelText('Page 1');
                expect(tile.style.aspectRatio).toBe(String(16 / 9));
                expect((tile.querySelector('.bp-gallery-tile-placeholder') as HTMLElement).style.height).toBe('100%');
            });
        });

        test('should size each tile from its own page ratio when getPageRatio provides one', async () => {
            // First page portrait (3:4), page 2 landscape (16:9); pages beyond have no
            // metadata yet and fall back to the first-page ratio.
            const thumbnail = { ...mockThumbnail, pageRatio: 3 / 4 };
            const getPageRatio = (pageNum: number): number | null => (pageNum === 2 ? 16 / 9 : null);
            getWrapper({ thumbnail, getPageRatio });

            await waitFor(() => {
                expect(screen.getByLabelText('Page 2').style.aspectRatio).toBe(String(16 / 9));
            });

            expect(screen.getByLabelText('Page 5').style.aspectRatio).toBe(String(3 / 4));
        });

        test('should leave placeholder sizing to the stylesheet when no page ratio is available', async () => {
            getWrapper(); // mockThumbnail has no pageRatio
            await waitFor(() => {
                expect(mockThumbnail.init).toHaveBeenCalled();
            });

            const tile = screen.getByLabelText('Page 1');
            const placeholder = tile.querySelector('.bp-gallery-tile-placeholder') as HTMLElement;
            expect(tile.style.aspectRatio).toBeFalsy();
            expect(placeholder.style.paddingTop).toBe('');
        });
    });

    describe('ARIA grid', () => {
        const setupGrid = (columns: number, props = {}) => {
            setViewport(widthForColumns(columns), DEFAULT_HEIGHT);
            return getWrapper({ isAriaGridEnabled: true, ...props });
        };

        const layoutColumns = (columns: number) => {
            setViewport(widthForColumns(columns), DEFAULT_HEIGHT);
            fireResize();
        };

        const focusPage = (page: number) => act(() => screen.getByLabelText(`Page ${page}`).focus());

        describe('mount focus', () => {
            test('should keep focus on the current page tile after mount', () => {
                setupGrid(3);
                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');
                expect(screen.getByLabelText('Page 3')).toHaveFocus();
            });

            test('should center the current page after the first positive layout width', async () => {
                setViewport(widthForColumns(3), 400);
                getWrapper({ isAriaGridEnabled: true, currentPage: 40, pageCount: 80 });

                const grid = screen.getByRole('grid');
                expect(grid).toHaveAttribute('aria-colcount', '3');
                fireEvent.scroll(grid);
                await waitFor(() => {
                    expect(screen.getByLabelText('Page 40')).toBeInTheDocument();
                });
                expect(screen.getByLabelText('Page 40')).toHaveFocus();
                expect(screen.queryByLabelText('Page 80')).not.toBeInTheDocument();
            });
        });

        describe('ARIA roles and row/column numbers', () => {
            test('should render grid, row, and gridcell structure with row/column numbers', () => {
                setupGrid(3);

                const grid = screen.getByRole('grid');
                expect(grid).toHaveClass('bp-gallery-grid');
                expect(grid).toHaveAttribute('aria-label', 'Page gallery');
                expect(grid).toHaveAttribute('aria-rowcount', '4');
                expect(grid).toHaveAttribute('aria-colcount', '3');
                expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
                expect(screen.queryAllByRole('option')).toHaveLength(0);

                const rows = screen.getAllByRole('row');
                expect(rows).toHaveLength(4);
                rows.forEach((row, index) => {
                    expect(row).toHaveAttribute('aria-rowindex', String(index + 1));
                    expect(row).toHaveAttribute('aria-label', String(index + 1));
                    expect(row).toHaveClass('bp-gallery-grid-row');
                });
                expect(rows[0].querySelectorAll('[role="gridcell"]')).toHaveLength(3);
                expect(rows[3].querySelectorAll('[role="gridcell"]')).toHaveLength(1);
                expect(rows[0]).toHaveStyle({ transform: 'translateY(0px)' });

                expect(screen.getAllByRole('gridcell')).toHaveLength(10);
                expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-colindex', '1');
                expect(screen.getByLabelText('Page 5')).toHaveAttribute('aria-colindex', '2');
                expect(screen.getByLabelText('Page 10')).toHaveAttribute('aria-colindex', '1');
            });

            test('should not advertise empty columns when the document is shorter than the fitted row', async () => {
                setupGrid(6, { currentPage: 1, pageCount: 2 });

                const grid = screen.getByRole('grid');
                expect(grid).toHaveAttribute('aria-colcount', '2');
                expect(grid).toHaveAttribute('aria-rowcount', '1');
                expect(screen.getAllByRole('row')).toHaveLength(1);
                expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-colindex', '1');
                expect(screen.getByLabelText('Page 2')).toHaveAttribute('aria-colindex', '2');

                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 1')).toHaveFocus();
                await userEvent.keyboard('{ArrowRight}');
                expect(screen.getByLabelText('Page 2')).toHaveFocus();
                await userEvent.keyboard('{ArrowUp}');
                expect(screen.getByLabelText('Page 2')).toHaveFocus();
            });

            test('should left-align leftover tiles in a short last row', () => {
                const { rerender } = setupGrid(3, { pageCount: 8 });

                const rows = screen.getAllByRole('row');
                expect(rows).toHaveLength(3);
                expect(rows[2].querySelectorAll('[role="gridcell"]')).toHaveLength(2);

                const layout = getGalleryLayout(widthForColumns(3));
                const trackWidth = getRowTrackWidth(layout.columns, layout.tileWidth);
                rows.forEach(row => {
                    expect(row).toHaveStyle({
                        width: `${trackWidth}px`,
                        left: '0px',
                    });
                });

                rerender(<GalleryGrid {...defaultProps} isAriaGridEnabled pageCount={8} scale={1.5} />);

                const zoomed = getGalleryLayout(widthForColumns(3), 1.5);
                const zoomedTrackWidth = getRowTrackWidth(zoomed.columns, zoomed.tileWidth);
                const zoomedLeft = (widthForColumns(3) - zoomedTrackWidth) / 2;
                screen.getAllByRole('row').forEach(row => {
                    expect(row).toHaveStyle({
                        width: `${zoomedTrackWidth}px`,
                        left: `${zoomedLeft}px`,
                    });
                });
            });

            test('should keep selection and roving tabindex semantics on gridcells', () => {
                setupGrid(3);

                expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-selected', 'true');
                expect(screen.getByLabelText('Page 3')).toHaveAttribute('tabIndex', '0');
                expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-selected', 'false');
                expect(screen.getByLabelText('Page 1')).toHaveAttribute('tabIndex', '-1');
            });

            test('should not add row/column numbers when the flag is off', () => {
                getWrapper();

                const listbox = screen.getByRole('listbox');
                expect(listbox).not.toHaveAttribute('aria-rowcount');
                expect(listbox).not.toHaveAttribute('aria-colcount');
                expect(screen.queryAllByRole('row')).toHaveLength(0);
                expect(screen.getByLabelText('Page 1')).not.toHaveAttribute('aria-colindex');
            });
        });

        describe('2D keyboard navigation', () => {
            // Rows at 3 columns: [1 2 3] [4 5 6] [7 8 9] [10]
            test('should move down a row on ArrowDown', async () => {
                setupGrid(3);
                focusPage(2);
                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 5')).toHaveFocus();
            });

            test('should not scroll on ArrowDown when the next row is already in view', async () => {
                setupGrid(3);
                const grid = screen.getByRole('grid');
                Object.defineProperty(grid, 'scrollTop', { configurable: true, writable: true, value: 0 });
                focusPage(2);

                await userEvent.keyboard('{ArrowDown}');

                expect(screen.getByLabelText('Page 5')).toHaveFocus();
                expect(grid.scrollTop).toBe(0);
            });

            test('should scroll on ArrowDown when grid padding puts the next row below the fold', async () => {
                const width = widthForColumns(3);
                const { columns, tileWidth } = getGalleryLayout(width);
                const nextRowStart = getRowStartOffset(1, 10, columns, tileWidth, () => GALLERY_TILE_DEFAULT_RATIO);
                setViewport(width, Math.ceil(nextRowStart) + GALLERY_GRID_PADDING_TOP - 1);
                getWrapper({ isAriaGridEnabled: true, currentPage: 2 });

                const grid = screen.getByRole('grid');
                Object.defineProperty(grid, 'scrollTop', { configurable: true, writable: true, value: 0 });
                focusPage(2);

                await userEvent.keyboard('{ArrowDown}');

                expect(screen.getByLabelText('Page 5')).toHaveFocus();
                expect(grid.scrollTop).toBeGreaterThan(0);
            });

            test('should move up a row on ArrowUp', async () => {
                setupGrid(3);
                focusPage(5);
                await userEvent.keyboard('{ArrowUp}');
                expect(screen.getByLabelText('Page 2')).toHaveFocus();
            });

            test('should not scroll on ArrowUp when the previous row is already in view', async () => {
                setupGrid(3);
                const grid = screen.getByRole('grid');
                Object.defineProperty(grid, 'scrollTop', { configurable: true, writable: true, value: 0 });
                focusPage(5);

                await userEvent.keyboard('{ArrowUp}');

                expect(screen.getByLabelText('Page 2')).toHaveFocus();
                expect(grid.scrollTop).toBe(0);
            });

            test('should not move on ArrowUp in the first row', async () => {
                setupGrid(3);
                focusPage(2);
                await userEvent.keyboard('{ArrowUp}');
                expect(screen.getByLabelText('Page 2')).toHaveFocus();
            });

            test('should not move on ArrowDown in the last row', async () => {
                setupGrid(3);
                focusPage(10);
                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 10')).toHaveFocus();
            });

            test('should clamp ArrowDown to the last tile when no cell is directly below', async () => {
                setupGrid(3);
                focusPage(9); // directly below would be page 12, which does not exist
                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 10')).toHaveFocus();
            });

            test('should not move on ArrowDown in a full last row', async () => {
                setupGrid(2); // rows: [1 2] [3 4] [5 6] [7 8] [9 10]
                focusPage(9);
                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 9')).toHaveFocus();
            });

            test('should wrap to the next row on ArrowRight at a row edge', async () => {
                setupGrid(3);
                focusPage(3);
                await userEvent.keyboard('{ArrowRight}');
                expect(screen.getByLabelText('Page 4')).toHaveFocus();
            });

            test('should wrap to the previous row on ArrowLeft at a row start', async () => {
                setupGrid(3);
                focusPage(4);
                await userEvent.keyboard('{ArrowLeft}');
                expect(screen.getByLabelText('Page 3')).toHaveFocus();
            });

            test('should not move past the last page on ArrowRight', async () => {
                setupGrid(3);
                focusPage(10);
                await userEvent.keyboard('{ArrowRight}');
                expect(screen.getByLabelText('Page 10')).toHaveFocus();
            });

            test('should not move past the first page on ArrowLeft', async () => {
                setupGrid(3);
                focusPage(1);
                await userEvent.keyboard('{ArrowLeft}');
                expect(screen.getByLabelText('Page 1')).toHaveFocus();
            });

            test('should keep Home and End jumping to the first and last page of the grid', async () => {
                setupGrid(3);
                focusPage(5);
                await userEvent.keyboard('{Home}');
                expect(screen.getByLabelText('Page 1')).toHaveFocus();
                await userEvent.keyboard('{End}');
                expect(screen.getByLabelText('Page 10')).toHaveFocus();
            });

            test('should call onPageNavigate on Enter', async () => {
                const onPageNavigate = jest.fn();
                setupGrid(3, { onPageNavigate });
                focusPage(5);
                await userEvent.keyboard('{Enter}');
                expect(onPageNavigate).toHaveBeenCalledWith(5);
            });

            test('should call onClose on Escape', async () => {
                const onClose = jest.fn();
                setupGrid(3, { onClose });
                focusPage(5);
                await userEvent.keyboard('{Escape}');
                expect(onClose).toHaveBeenCalled();
            });
        });

        describe('responsive column changes', () => {
            test('should restore the anchored page using the new column count after a resize', () => {
                const rowStart = (page: number, columnCount: number): number => {
                    const { columns, tileWidth } = getGalleryLayout(widthForColumns(columnCount));
                    return getRowStartOffset(
                        getRowIndex(page, columns) - 1,
                        10,
                        columns,
                        tileWidth,
                        () => GALLERY_TILE_DEFAULT_RATIO,
                    );
                };

                setupGrid(3, { currentPage: 7, pageCount: 10 });
                const grid = screen.getByRole('grid');
                // Viewed area is page 7's row at 3 columns; resize must remap that page, not the old row index.
                Object.defineProperty(grid, 'scrollTop', {
                    configurable: true,
                    writable: true,
                    value: rowStart(7, 3),
                });

                layoutColumns(2);

                expect(grid.scrollTop).toBe(rowStart(7, 2));
                expect(grid.scrollTop).not.toBe(rowStart(7, 3));
            });

            test('should update metadata and keep focus on the same page when the column count changes', async () => {
                setupGrid(3);
                focusPage(5);
                await waitFor(() => expect(screen.getByLabelText('Page 5')).toHaveFocus());
                const nodeBeforeRechunk = screen.getByLabelText('Page 5');

                layoutColumns(2); // rows become [1 2] [3 4] [5 6] [7 8] [9 10]

                const grid = screen.getByRole('grid');
                expect(grid).toHaveAttribute('aria-rowcount', '5');
                expect(grid).toHaveAttribute('aria-colcount', '2');
                expect(screen.getAllByRole('row')).toHaveLength(5);
                expect(screen.getByLabelText('Page 5')).toHaveAttribute('aria-colindex', '1');
                // Prove the re-chunk actually recreated the node, so a passing focus assertion
                // demonstrates restoration across a node swap rather than surviving focus
                expect(screen.getByLabelText('Page 5')).not.toBe(nodeBeforeRechunk);
                expect(screen.getByLabelText('Page 5')).toHaveFocus();
                expect(screen.getByLabelText('Page 5')).toHaveAttribute('aria-selected', 'true');
            });

            test('should keep 2D navigation in sync with the new column count', async () => {
                setupGrid(3);
                focusPage(5);
                layoutColumns(2);

                await userEvent.keyboard('{ArrowDown}');
                expect(screen.getByLabelText('Page 7')).toHaveFocus();
            });

            test('should not steal focus from outside the grid when a resize re-chunks', () => {
                setupGrid(3);
                const outside = document.createElement('button');
                document.body.appendChild(outside);
                act(() => outside.focus());

                layoutColumns(2);

                // The re-chunk happened, but focus stays where the user put it
                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '2');
                expect(outside).toHaveFocus();

                document.body.removeChild(outside);
            });

            test('should recompute the column count when the zoom scale changes', () => {
                const { rerender } = setupGrid(3);
                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');

                rerender(<GalleryGrid {...defaultProps} isAriaGridEnabled scale={1.5} />);

                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '2');
                expect(screen.getAllByRole('row')).toHaveLength(5);
            });

            test('should keep the last measured column count when the grid loses its layout box', () => {
                setupGrid(3);
                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');

                setViewport(0, DEFAULT_HEIGHT);
                fireResize();

                expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');
            });
        });

        describe('page ratio remasure', () => {
            test('should remasure row height when a per-page ratio becomes known', () => {
                const ratios: Record<number, number | null> = {};
                const getPageRatio = (pageNum: number): number | null => ratios[pageNum] ?? null;
                const { rerender } = setupGrid(3, { currentPage: 1, getPageRatio, pageCount: 10 });
                const { tileWidth } = getGalleryLayout(widthForColumns(3));

                expect(parseFloat(screen.getAllByRole('row')[0].style.height)).toBeCloseTo(
                    tileWidth / GALLERY_TILE_DEFAULT_RATIO,
                );

                ratios[2] = 0.5;
                rerender(
                    <GalleryGrid
                        {...defaultProps}
                        currentPage={1}
                        getPageRatio={getPageRatio}
                        isAriaGridEnabled
                        pageCount={10}
                    />,
                );

                expect(parseFloat(screen.getAllByRole('row')[0].style.height)).toBeCloseTo(tileWidth / 0.5);
                expect(screen.getByLabelText('Page 2').style.aspectRatio).toBe(String(0.5));
            });

            test('should keep the anchored page in view when ratios above it change', () => {
                const ratios: Record<number, number | null> = {};
                const getPageRatio = (pageNum: number): number | null => ratios[pageNum] ?? null;
                const { columns, tileWidth } = getGalleryLayout(widthForColumns(3));
                const rowStart = (getRatio: (pageNum: number) => number): number =>
                    getRowStartOffset(getRowIndex(7, columns) - 1, 10, columns, tileWidth, getRatio);

                const { rerender } = setupGrid(3, { currentPage: 7, getPageRatio, pageCount: 10 });
                const grid = screen.getByRole('grid');
                Object.defineProperty(grid, 'scrollTop', {
                    configurable: true,
                    writable: true,
                    value: rowStart(() => GALLERY_TILE_DEFAULT_RATIO),
                });

                ratios[1] = 0.5;
                ratios[2] = 0.5;
                ratios[3] = 0.5;
                rerender(
                    <GalleryGrid
                        {...defaultProps}
                        currentPage={7}
                        getPageRatio={getPageRatio}
                        isAriaGridEnabled
                        pageCount={10}
                    />,
                );

                expect(grid.scrollTop).toBe(rowStart(pageNum => ratios[pageNum] ?? GALLERY_TILE_DEFAULT_RATIO));
                expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
            });

            test('should remasure and re-anchor when the first-page ratio lands from init', async () => {
                let resolveInit: ((value?: unknown) => void) | undefined;
                const thumbnail = {
                    ...mockThumbnail,
                    pageRatio: 0.5,
                    init: jest.fn(
                        () =>
                            new Promise(resolve => {
                                resolveInit = resolve;
                            }),
                    ),
                };
                const { columns, tileWidth } = getGalleryLayout(widthForColumns(3));
                const rowStart = (getRatio: (pageNum: number) => number): number =>
                    getRowStartOffset(getRowIndex(7, columns) - 1, 10, columns, tileWidth, getRatio);

                setupGrid(3, { currentPage: 7, pageCount: 10, thumbnail });
                const grid = screen.getByRole('grid');
                Object.defineProperty(grid, 'scrollTop', {
                    configurable: true,
                    writable: true,
                    value: rowStart(() => GALLERY_TILE_DEFAULT_RATIO),
                });

                await act(async () => {
                    resolveInit?.();
                });

                await waitFor(() => {
                    expect(parseFloat(screen.getAllByRole('row')[2].style.height)).toBeCloseTo(tileWidth / 0.5);
                });
                expect(grid.scrollTop).toBe(rowStart(() => 0.5));
                expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
            });
        });
    });

    describe('virtualization', () => {
        test('should mount every tile when the enhanced gallery flag is off', () => {
            setViewport(400, 400);
            getWrapper({ pageCount: 80, currentPage: 1 });

            expect(screen.getAllByRole('option')).toHaveLength(80);
            expect(screen.getByLabelText('Page 80')).toBeInTheDocument();
        });

        test('should only mount visible and overscan rows when the enhanced gallery flag is on', () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });

            const cells = screen.getAllByRole('gridcell');
            expect(cells.length).toBeGreaterThan(0);
            expect(cells.length).toBeLessThan(80);
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.queryByLabelText('Page 80')).not.toBeInTheDocument();
        });

        test('should mount new rows when scrolling', async () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });
            expect(screen.queryByLabelText('Page 80')).not.toBeInTheDocument();

            const grid = screen.getByRole('grid');
            const inner = document.querySelector('.bp-gallery-grid-inner') as HTMLElement;
            Object.defineProperty(grid, 'scrollTop', {
                configurable: true,
                writable: true,
                value: parseFloat(inner.style.height),
            });
            fireEvent.scroll(grid);

            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toBeInTheDocument();
            });
        });

        test('should focus Home and End tiles after their rows mount', async () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });
            screen.getByLabelText('Page 1').focus();

            await userEvent.keyboard('{End}');
            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toHaveFocus();
            });

            await userEvent.keyboard('{Home}');
            await waitFor(() => {
                expect(screen.getByLabelText('Page 1')).toHaveFocus();
            });
        });

        test('should jump Home and End when the focused tile has been scrolled offscreen', async () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });
            screen.getByLabelText('Page 1').focus();

            const grid = screen.getByRole('grid');
            const inner = document.querySelector('.bp-gallery-grid-inner') as HTMLElement;
            Object.defineProperty(grid, 'scrollTop', {
                configurable: true,
                writable: true,
                value: parseFloat(inner.style.height),
            });
            fireEvent.scroll(grid);
            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toBeInTheDocument();
            });
            expect(screen.getByLabelText('Page 1')).toHaveFocus();

            await userEvent.keyboard('{End}');
            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toHaveFocus();
            });

            await userEvent.keyboard('{Home}');
            await waitFor(() => {
                expect(screen.getByLabelText('Page 1')).toHaveFocus();
            });
        });

        test('should load thumbnails around the End row without a follow-up scroll', async () => {
            const thumbnail = {
                ...mockThumbnail,
                createThumbnailImage: jest.fn().mockResolvedValue({ src: 'data:image/png;test' }),
            };
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, currentPage: 1, pageCount: 80, thumbnail });
            screen.getByLabelText('Page 1').focus();
            thumbnail.createThumbnailImage.mockClear();

            await userEvent.keyboard('{End}');

            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toBeInTheDocument();
            });
            await waitFor(() => {
                const pages = thumbnail.createThumbnailImage.mock.calls.map(([index]) => index + 1);
                expect(pages.some(page => page >= 77)).toBe(true);
            });
        });

        test('should open the End page even if that tile has not mounted yet', async () => {
            const onPageNavigate = jest.fn();
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, onPageNavigate, pageCount: 80, currentPage: 1 });
            screen.getByLabelText('Page 1').focus();

            await userEvent.keyboard('{End}{Enter}');

            expect(onPageNavigate).toHaveBeenCalledWith(80);
        });

        test('should not pull focus back into the grid after Home/End if the user has left it', async () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });
            screen.getByLabelText('Page 1').focus();
            await userEvent.keyboard('{End}');

            const outside = document.createElement('button');
            document.body.appendChild(outside);
            act(() => outside.focus());

            fireEvent.scroll(screen.getByRole('grid'));
            expect(outside).toHaveFocus();

            document.body.removeChild(outside);
        });

        test('should keep the focused tile mounted and navigable after it scrolls out of view', async () => {
            setViewport(400, 400);
            getWrapper({ isAriaGridEnabled: true, pageCount: 80, currentPage: 1 });
            screen.getByLabelText('Page 1').focus();

            const grid = screen.getByRole('grid');
            const inner = document.querySelector('.bp-gallery-grid-inner') as HTMLElement;
            Object.defineProperty(grid, 'scrollTop', {
                configurable: true,
                writable: true,
                value: parseFloat(inner.style.height),
            });
            fireEvent.scroll(grid);
            await waitFor(() => {
                expect(screen.getByLabelText('Page 80')).toBeInTheDocument();
            });
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 1')).toHaveFocus();

            await userEvent.keyboard('{ArrowDown}');
            fireEvent.scroll(grid);
            await waitFor(() => {
                expect(screen.getByLabelText('Page 2')).toHaveFocus();
            });
        });
    });
});
