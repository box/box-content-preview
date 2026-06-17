import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryGrid from '../GalleryGrid';

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
        test('should render the gallery grid container', () => {
            getWrapper();
            expect(document.querySelector('.bp-gallery-grid')).toBeInTheDocument();
        });

        test('should render a button for each page', () => {
            getWrapper();
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(10);
        });

        test('should set aria-label on each tile', () => {
            getWrapper();
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 3, current page')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
        });
    });

    describe('current page highlight', () => {
        test('should apply selected class to current page tile', () => {
            getWrapper();
            const tile = screen.getByLabelText('Page 3, current page');
            expect(tile).toHaveClass('bp-gallery-tile--selected');
        });

        test('should not apply selected class to other tiles', () => {
            getWrapper();
            const tile = screen.getByLabelText('Page 1');
            expect(tile).not.toHaveClass('bp-gallery-tile--selected');
        });

        test('should render badge on every tile', () => {
            getWrapper();
            const allTiles = screen.getAllByRole('button');
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
    });

    describe('keyboard', () => {
        test('should call onClose on Escape', async () => {
            const onClose = jest.fn();
            getWrapper({ onClose });
            const grid = document.querySelector('.bp-gallery-grid') as HTMLElement;
            grid.focus();
            await userEvent.keyboard('{Escape}');
            expect(onClose).toHaveBeenCalled();
        });

        test('should wrap focus from last tile to first on Tab', async () => {
            getWrapper();
            const buttons = screen.getAllByRole('button');
            const lastButton = buttons[buttons.length - 1];
            lastButton.focus();
            await userEvent.tab();
            expect(buttons[0]).toHaveFocus();
        });

        test('should wrap focus from first tile to last on Shift+Tab', async () => {
            getWrapper();
            const buttons = screen.getAllByRole('button');
            buttons[0].focus();
            await userEvent.tab({ shift: true });
            expect(buttons[buttons.length - 1]).toHaveFocus();
        });
    });

    describe('focus management', () => {
        test('should focus current page tile on mount', () => {
            getWrapper();
            const tile = screen.getByLabelText('Page 3, current page');
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
            const grid = document.querySelector('.bp-gallery-grid') as HTMLElement;
            // Simulate clicking empty area — focus goes to grid container
            grid.focus();

            await waitFor(() => {
                // Focus should redirect to the focused page tile
                const focusedTile = screen.getByLabelText('Page 3, current page');
                expect(focusedTile).toHaveFocus();
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

            const tile3 = screen.getByLabelText('Page 3, current page');
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
