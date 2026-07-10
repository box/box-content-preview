import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
            screen.getByLabelText('Page 3').focus();
            screen.getByLabelText('Page 1').focus();
            await userEvent.keyboard('{ArrowUp}');
            expect(screen.getByLabelText('Page 1')).toHaveFocus();
        });

        test('should not move past last tile on ArrowDown', async () => {
            getWrapper();
            screen.getByLabelText('Page 3').focus();
            screen.getByLabelText('Page 10').focus();
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
            tile5.focus();

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
            tile5.focus();
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

            resizeCallback(); // initial fire on observe() is skipped
            expect(tile3Spy).not.toHaveBeenCalled();

            resizeCallback();
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

            resizeCallback(); // skipped initial fire
            resizeCallback();

            expect(tile7Spy).toHaveBeenCalledWith({ block: 'start' });
            expect(otherTilesSpy).not.toHaveBeenCalled();
        });

        test('should disconnect the observer on unmount', () => {
            const { unmount } = getWrapper();
            unmount();
            expect(disconnectMock).toHaveBeenCalled();
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
    });
});
