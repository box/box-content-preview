import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryGrid from '../GalleryGrid';

const observeMock = jest.fn();
const disconnectMock = jest.fn();
let resizeCallback: () => void;
((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = jest
    .fn()
    .mockImplementation((callback: () => void) => {
        resizeCallback = callback;
        return { observe: observeMock, disconnect: disconnectMock };
    });

describe('GalleryGrid', () => {
    const mockThumbnail = {
        init: jest.fn().mockResolvedValue(100),
        getImageFromCache: jest.fn().mockReturnValue(null),
        createThumbnailImage: jest.fn().mockResolvedValue(null),
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
        // Mock scrollIntoView
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
                expect(tile.querySelector('.bp-gallery-tile-badge')).toBeInTheDocument();
            });
        });

        test('should scroll current page tile into view on mount', () => {
            getWrapper();
            expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
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
            grid.focus();

            await waitFor(() => {
                const focusedTile = screen.getByLabelText('Page 3');
                expect(focusedTile).toHaveFocus();
            });
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

            act(() => resizeCallback()); // initial fire on observe() is skipped
            expect(tile3Spy).not.toHaveBeenCalled();

            act(() => resizeCallback());
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

            act(() => resizeCallback()); // skipped initial fire
            act(() => resizeCallback());

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

            test('should update scale from a two-finger touch pinch', () => {
                const onScaleChange = jest.fn();
                getWrapper({ hasTouch: true, onScaleChange });
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
            // No layout: every tile reports zero geometry, so nothing registers as near the
            // viewport and the pump parks after its first batch (scroll/resize revive it)
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
            getWrapper({ pageCount: 10, currentPage: 1, thumbnail });

            // No geometry yet, so only the first batch runs (and resolves no images)
            await waitFor(() => {
                expect(thumbnail.createThumbnailImage).toHaveBeenCalledTimes(4);
            });
            thumbnail.createThumbnailImage.mockClear();

            // Simulate a resize (e.g. fullscreen enter) revealing the tiles
            layoutGrid(500);
            act(() => resizeCallback()); // initial fire on observe() is skipped
            act(() => resizeCallback());

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

        test('should check cache for each page on mount', () => {
            getWrapper();
            expect(mockThumbnail.getImageFromCache).toHaveBeenCalledTimes(10);
        });

        test('should use cached images when available', () => {
            const cachedThumbnail = {
                ...mockThumbnail,
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
        });

        test('should show placeholder for uncached pages', () => {
            getWrapper();
            const tile1 = screen.getByLabelText('Page 1');
            expect(tile1.querySelector('.bp-gallery-tile-placeholder')).toBeInTheDocument();
            expect(tile1.querySelector('img')).not.toBeInTheDocument();
        });

        test('should size placeholders from the page ratio once init resolves', async () => {
            // 16:9 landscape page: ratio 16/9 -> padding-top 56.25%
            const thumbnail = { ...mockThumbnail, pageRatio: 16 / 9 };
            getWrapper({ thumbnail });

            await waitFor(() => {
                const placeholder = screen
                    .getByLabelText('Page 1')
                    .querySelector('.bp-gallery-tile-placeholder') as HTMLElement;
                expect(placeholder.style.paddingTop).toBe('56.25%');
            });
        });

        test('should size each placeholder from its own page ratio when getPageRatio provides one', async () => {
            // First page portrait (3:4), page 2 landscape (16:9); pages beyond have no
            // metadata yet and fall back to the first-page ratio.
            const thumbnail = { ...mockThumbnail, pageRatio: 3 / 4 };
            const getPageRatio = (pageNum: number): number | null => (pageNum === 2 ? 16 / 9 : null);
            getWrapper({ thumbnail, getPageRatio });

            await waitFor(() => {
                const landscape = screen
                    .getByLabelText('Page 2')
                    .querySelector('.bp-gallery-tile-placeholder') as HTMLElement;
                expect(landscape.style.paddingTop).toBe('56.25%');
            });

            const fallback = screen
                .getByLabelText('Page 5')
                .querySelector('.bp-gallery-tile-placeholder') as HTMLElement;
            expect(parseFloat(fallback.style.paddingTop)).toBeCloseTo(133.333);
        });

        test('should leave placeholder sizing to the stylesheet when no page ratio is available', async () => {
            getWrapper(); // mockThumbnail has no pageRatio
            await waitFor(() => {
                expect(mockThumbnail.init).toHaveBeenCalled();
            });

            const placeholder = screen
                .getByLabelText('Page 1')
                .querySelector('.bp-gallery-tile-placeholder') as HTMLElement;
            expect(placeholder.style.paddingTop).toBe('');
        });
    });
});
