import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    GALLERY_GRID_PADDING_TOP,
    GALLERY_THUMB_MAX_WIDTH,
    GALLERY_TILE_DEFAULT_RATIO,
    GALLERY_TILE_GAP,
    GALLERY_TILE_MIN_WIDTH,
} from '../constants';
import VirtualizedGalleryGrid, { VirtualizedGalleryGridProps } from '../VirtualizedGalleryGrid';
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

describe('VirtualizedGalleryGrid', () => {
    const mockThumbnail = {
        init: jest.fn().mockResolvedValue(100),
        getImageFromCache: jest.fn().mockReturnValue(null),
        createThumbnailImage: jest.fn().mockResolvedValue(null),
        renderPageImage: jest.fn(() => ({ cancel: jest.fn(), promise: Promise.resolve(null) })),
        destroy: jest.fn(),
    };

    const defaultProps: VirtualizedGalleryGridProps = {
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

    const getWrapper = (props: Partial<VirtualizedGalleryGridProps> = {}) =>
        render(<VirtualizedGalleryGrid {...defaultProps} {...props} />);

    const setupGrid = (columns: number, props: Partial<VirtualizedGalleryGridProps> = {}) => {
        setViewport(widthForColumns(columns), DEFAULT_HEIGHT);
        return getWrapper(props);
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
            getWrapper({ currentPage: 40, pageCount: 80 });

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
            setupGrid(3, { pageCount: 8 });

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
        });

        test('should keep selection and roving tabindex semantics on gridcells', () => {
            setupGrid(3);

            expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByLabelText('Page 3')).toHaveAttribute('tabIndex', '0');
            expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-selected', 'false');
            expect(screen.getByLabelText('Page 1')).toHaveAttribute('tabIndex', '-1');
        });
    });

    describe('2D keyboard navigation', () => {
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
            getWrapper({ currentPage: 2 });

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

        test('should clamp ArrowDown to the last tile when no cell is directly below', async () => {
            setupGrid(3);
            focusPage(9);
            await userEvent.keyboard('{ArrowDown}');
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

            layoutColumns(2);

            const grid = screen.getByRole('grid');
            expect(grid).toHaveAttribute('aria-rowcount', '5');
            expect(grid).toHaveAttribute('aria-colcount', '2');
            expect(screen.getAllByRole('row')).toHaveLength(5);
            expect(screen.getByLabelText('Page 5')).toHaveAttribute('aria-colindex', '1');
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

            expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '2');
            expect(outside).toHaveFocus();

            document.body.removeChild(outside);
        });

        test('should recompute the column count when the zoom scale changes', () => {
            const { rerender } = setupGrid(3);
            expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');

            rerender(<VirtualizedGalleryGrid {...defaultProps} scale={1.5} />);

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

    describe('page ratio remeasure', () => {
        test('should remeasure row height when a per-page ratio becomes known', () => {
            const ratios: Record<number, number | null> = {};
            const getPageRatio = (pageNum: number): number | null => ratios[pageNum] ?? null;
            const { rerender } = setupGrid(3, { currentPage: 1, getPageRatio, pageCount: 10 });
            const { tileWidth } = getGalleryLayout(widthForColumns(3));

            expect(parseFloat(screen.getAllByRole('row')[0].style.height)).toBeCloseTo(
                tileWidth / GALLERY_TILE_DEFAULT_RATIO,
            );

            ratios[2] = 0.5;
            rerender(
                <VirtualizedGalleryGrid {...defaultProps} currentPage={1} getPageRatio={getPageRatio} pageCount={10} />,
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
                <VirtualizedGalleryGrid {...defaultProps} currentPage={7} getPageRatio={getPageRatio} pageCount={10} />,
            );

            expect(grid.scrollTop).toBe(rowStart(pageNum => ratios[pageNum] ?? GALLERY_TILE_DEFAULT_RATIO));
            expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
        });

        test('should remeasure and re-anchor when the first-page ratio lands from init', async () => {
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

    describe('virtualization', () => {
        test('should only mount visible and overscan rows', () => {
            setViewport(400, 400);
            getWrapper({ pageCount: 80, currentPage: 1 });

            const cells = screen.getAllByRole('gridcell');
            expect(cells.length).toBeGreaterThan(0);
            expect(cells.length).toBeLessThan(80);
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.queryByLabelText('Page 80')).not.toBeInTheDocument();
        });

        test('should mount new rows when scrolling', async () => {
            setViewport(400, 400);
            getWrapper({ pageCount: 80, currentPage: 1 });
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

        test('should keep the focused tile mounted and navigable after it scrolls out of view', async () => {
            setViewport(400, 400);
            getWrapper({ pageCount: 80, currentPage: 1 });
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
