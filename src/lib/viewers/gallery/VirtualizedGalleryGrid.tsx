import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import noop from 'lodash/noop';
import { decodeKeydown } from '../../util';
import { GALLERY_GRID_PADDING_TOP, GALLERY_TILE_GAP, GALLERY_VIRTUAL_OVERSCAN } from './constants';
import {
    getGalleryLayout,
    getOccupiedColumns,
    getPagesInRow,
    getRowHeight,
    getRowStartOffset,
    getRowTrackWidth,
    resolvePageRatio,
} from './galleryGridLayout';
import { getColumnIndex, getPageAbove, getPageBelow, getRowCount, getRowIndex } from './galleryGridNavigation';
import { GalleryTile, GalleryThumbnail } from './GalleryGridShared';
import useGalleryPinch, { PinchDirection, PinchFocal } from './useGalleryPinch';
import useGalleryThumbnailLoader from './useGalleryThumbnailLoader';
import './GalleryGrid.scss';

export type VirtualizedGalleryGridHandle = {
    handleNavKey: (key: string) => void;
};

export type VirtualizedGalleryGridProps = {
    pageCount: number;
    currentPage: number;
    getPageRatio?: (pageNum: number) => number | null;
    isPinchZoomEnabled?: boolean;
    isTouchZoomEnabled?: boolean;
    onFocusChange?: (pageNum: number) => void;
    onPageNavigate: (n: number) => void;
    onClose: () => void;
    onPinchStart?: (direction: PinchDirection) => void;
    onScaleChange?: (scale: number) => boolean | void;
    scale?: number;
    thumbnail: GalleryThumbnail;
};

type PendingFocus = {
    page: number;
    from: Element | null;
};

function collectPageRatios(pageCount: number, getRatio: (pageNum: number) => number): number[] {
    const ratios: number[] = new Array(pageCount + 1);
    for (let page = 1; page <= pageCount; page += 1) {
        ratios[page] = getRatio(page);
    }
    return ratios;
}

function isRowInScrollport(grid: HTMLElement, rowStart: number, rowEnd: number, scrollMargin: number): boolean {
    const top = rowStart + scrollMargin;
    const bottom = rowEnd + scrollMargin;
    return grid.clientHeight > 0 && bottom > grid.scrollTop && top < grid.scrollTop + grid.clientHeight;
}

function shouldApplyPendingFocus(pending: PendingFocus, grid: HTMLElement | null): boolean {
    const active = document.activeElement;
    if (pending.from === active) {
        return true;
    }
    if (grid && active && grid.contains(active)) {
        return true;
    }
    return !active || active === document.body || active === document.documentElement;
}

function getPinchFocalTile(focal: PinchFocal | null): HTMLElement | null {
    if (!focal) {
        return null;
    }
    return document.elementFromPoint?.(focal.x, focal.y)?.closest<HTMLElement>('[data-page]') ?? null;
}

function adoptVirtualizedInnerWidth(
    inner: HTMLElement | null,
    scale: number,
    layoutWidthRef: { current: number },
    setLayoutWidth: (width: number) => void,
): void {
    if (!inner) {
        return;
    }
    inner.style.setProperty('--bp-gallery-hover-scale', String(1 + 0.02 / scale));
    const width = inner.clientWidth;
    if (width > 0 && width !== layoutWidthRef.current) {
        layoutWidthRef.current = width;
        setLayoutWidth(width);
    }
}

function pageFromFocalTile(focalTile: HTMLElement | null, fallbackPage: number): number {
    const pageAttr = focalTile?.dataset.page;
    return pageAttr ? Number.parseInt(pageAttr, 10) : fallbackPage;
}

function restoreVirtualizedRowScroll(
    grid: HTMLElement,
    page: number,
    pageCount: number,
    prevLayout: { columns: number; tileWidth: number },
    columns: number,
    tileWidth: number,
    getRatio: (pageNum: number) => number,
): void {
    const prevStart = getRowStartOffset(
        getRowIndex(page, prevLayout.columns) - 1,
        pageCount,
        prevLayout.columns,
        prevLayout.tileWidth,
        getRatio,
    );
    const nextStart = getRowStartOffset(getRowIndex(page, columns) - 1, pageCount, columns, tileWidth, getRatio);
    grid.scrollTop += nextStart - prevStart;
}

function capturePendingFocusIfGridActive(
    grid: HTMLElement,
    pendingFocusRef: { current: PendingFocus | null },
    focusedPage: number,
): void {
    if (!grid.contains(document.activeElement) || pendingFocusRef.current != null) {
        return;
    }
    pendingFocusRef.current = { page: focusedPage, from: document.activeElement };
}

function adoptVirtualizedResizeWidth(
    grid: HTMLElement,
    inner: HTMLElement,
    layoutWidthRef: { current: number },
    pendingFocusRef: { current: PendingFocus | null },
    focusedPage: number,
    setLayoutWidth: (width: number) => void,
): number {
    const width = inner.clientWidth;
    if (width <= 0 || width === layoutWidthRef.current) {
        return width;
    }
    if (grid.contains(document.activeElement)) {
        pendingFocusRef.current = pendingFocusRef.current ?? {
            page: focusedPage,
            from: document.activeElement,
        };
    }
    layoutWidthRef.current = width;
    setLayoutWidth(width);
    return width;
}

function completeFirstVirtualizedMeasure({
    grid,
    pageCount,
    currentPage,
    columns,
    getRatio,
    hasMeasuredLayoutRef,
    prevRatiosRef,
    pendingFocusRef,
    scrollToIndex,
    onReady,
}: {
    grid: HTMLElement;
    pageCount: number;
    currentPage: number;
    columns: number;
    getRatio: (pageNum: number) => number;
    hasMeasuredLayoutRef: { current: boolean };
    prevRatiosRef: { current: number[] | undefined };
    pendingFocusRef: { current: PendingFocus | null };
    scrollToIndex: (index: number, options: { align: 'center' }) => void;
    onReady: () => void;
}): boolean {
    if (hasMeasuredLayoutRef.current) {
        return false;
    }
    if (grid.clientHeight <= 0 || pageCount <= 0) {
        return true;
    }
    hasMeasuredLayoutRef.current = true;
    prevRatiosRef.current = prevRatiosRef.current ?? collectPageRatios(pageCount, getRatio);
    pendingFocusRef.current = pendingFocusRef.current ?? { page: currentPage, from: document.activeElement };
    scrollToIndex(getRowIndex(currentPage, columns) - 1, { align: 'center' });
    onReady();
    return true;
}

const VirtualizedGalleryGrid = forwardRef<VirtualizedGalleryGridHandle, VirtualizedGalleryGridProps>(
    function VirtualizedGalleryGrid(
        {
            pageCount,
            currentPage,
            getPageRatio,
            isPinchZoomEnabled = false,
            isTouchZoomEnabled = false,
            onClose,
            onFocusChange,
            onPageNavigate,
            onPinchStart = noop,
            onScaleChange = noop,
            scale = 1,
            thumbnail,
        },
        ref,
    ) {
        const [focusedPage, setFocusedPage] = useState(currentPage);
        const [layoutWidth, setLayoutWidth] = useState(0);
        const anchorPageRef = useRef(currentPage);
        const gridRef = useRef<HTMLDivElement>(null);
        const innerRef = useRef<HTMLDivElement>(null);
        const focalRef = useRef<PinchFocal | null>(null);
        const scaleRef = useRef(scale);
        const pendingFocusRef = useRef<PendingFocus | null>(null);
        const focusedPageRef = useRef(focusedPage);
        const layoutWidthRef = useRef(layoutWidth);
        const pageCountRef = useRef(pageCount);
        const currentPageRef = useRef(currentPage);

        focusedPageRef.current = focusedPage;
        layoutWidthRef.current = layoutWidth;
        pageCountRef.current = pageCount;
        currentPageRef.current = currentPage;

        const layout = getGalleryLayout(layoutWidth, scale);
        const columns = getOccupiedColumns(layout.columns, pageCount);
        const { tileWidth } = layout;
        const columnsRef = useRef(columns);
        const tileWidthRef = useRef(tileWidth);
        columnsRef.current = columns;
        tileWidthRef.current = tileWidth;

        const prevLayoutRef = useRef({ columns, tileWidth, scale });
        const prevRatiosRef = useRef<number[] | undefined>(undefined);
        const hasMeasuredLayoutRef = useRef(false);

        // Virtualizer needs getRatioRef for estimateSize; the ref is updated after the
        // thumbnail loader provides the first-page ratio.
        const getRatioRef = useRef((pageNum: number): number => resolvePageRatio(pageNum, getPageRatio, null));

        const virtualizer = useVirtualizer({
            count: getRowCount(pageCount, columns),
            enabled: true,
            estimateSize: (rowIndex: number) =>
                getRowHeight(rowIndex, pageCount, columns, tileWidth, getRatioRef.current),
            gap: GALLERY_TILE_GAP,
            getScrollElement: () => gridRef.current,
            overscan: GALLERY_VIRTUAL_OVERSCAN,
            scrollMargin: GALLERY_GRID_PADDING_TOP,
            rangeExtractor: range => {
                const indexes = defaultRangeExtractor(range);
                const focusedRow = getRowIndex(focusedPageRef.current, columnsRef.current) - 1;
                if (focusedRow >= 0 && focusedRow < range.count && indexes.indexOf(focusedRow) === -1) {
                    indexes.push(focusedRow);
                    indexes.sort((a, b) => a - b);
                }
                return indexes;
            },
        });
        const virtualizerRef = useRef(virtualizer);
        virtualizerRef.current = virtualizer;

        const {
            loadedImages,
            highResImages,
            pageRatio,
            isQueueReadyRef,
            handleScrollThrottled,
        } = useGalleryThumbnailLoader(thumbnail, currentPage, pageCount, {
            gridRef,
            virtualizerRef,
            columnsRef,
            tileWidthRef,
            pageCountRef,
            anchorPageRef,
            scaleRef,
        });

        const getRatio = useCallback((pageNum: number): number => resolvePageRatio(pageNum, getPageRatio, pageRatio), [
            getPageRatio,
            pageRatio,
        ]);
        getRatioRef.current = getRatio;

        const handleScroll = useCallback(() => {
            const grid = gridRef.current;
            if (grid) {
                const pages = pageCountRef.current;
                if (pages > 0) {
                    const item = virtualizerRef.current.getVirtualItemForOffset(grid.scrollTop);
                    if (item) {
                        anchorPageRef.current = Math.min(item.index * columnsRef.current + 1, pages);
                    }
                }
            }
            handleScrollThrottled();
        }, [handleScrollThrottled]);

        useGalleryPinch({
            focalRef,
            gridRef,
            isPinchZoomEnabled,
            isTouchZoomEnabled,
            onGestureStart: onPinchStart,
            onZoom: onScaleChange,
            scaleRef,
        });

        // Remeasure row heights when page ratios change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useLayoutEffect(() => {
            if (!hasMeasuredLayoutRef.current || layoutWidth <= 0) {
                return;
            }
            const prev = prevLayoutRef.current;
            if (prev.columns !== columns || prev.tileWidth !== tileWidth) {
                return;
            }
            const grid = gridRef.current;
            if (!grid) {
                return;
            }
            const items = virtualizer.getVirtualItems();
            const didVisibleSizeChange = items.some(
                item => Math.abs(item.size - getRowHeight(item.index, pageCount, columns, tileWidth, getRatio)) > 0.5,
            );
            if (!didVisibleSizeChange) {
                prevRatiosRef.current = prevRatiosRef.current ?? collectPageRatios(pageCount, getRatio);
                return;
            }

            const prevRatios = prevRatiosRef.current;
            virtualizer.measure();
            if (prevRatios) {
                const getPrevRatio = (pageNum: number): number => {
                    const previous = prevRatios[pageNum];
                    return previous ?? getRatio(pageNum);
                };
                const page = anchorPageRef.current;
                const prevStart = getRowStartOffset(
                    getRowIndex(page, columns) - 1,
                    pageCount,
                    columns,
                    tileWidth,
                    getPrevRatio,
                );
                const nextStart = getRowStartOffset(
                    getRowIndex(page, columns) - 1,
                    pageCount,
                    columns,
                    tileWidth,
                    getRatio,
                );
                grid.scrollTop += nextStart - prevStart;
            }
            prevRatiosRef.current = collectPageRatios(pageCount, getRatio);
            handleScrollThrottled();
        });

        useLayoutEffect(() => {
            virtualizer.measure();
            if (prevRatiosRef.current && prevRatiosRef.current.length !== pageCount + 1) {
                prevRatiosRef.current = undefined;
            }
        }, [columns, getRatio, pageCount, tileWidth, virtualizer]);

        // Restore scroll position after scale/column/width changes.
        useLayoutEffect(() => {
            const grid = gridRef.current;
            const previousScale = scaleRef.current;
            scaleRef.current = scale;
            const focal = focalRef.current;
            focalRef.current = null;

            // Capture the anchor tile's position before the layout changes.
            const focalTile = getPinchFocalTile(focal);
            const anchorTile = focalTile || grid?.querySelector<HTMLElement>(`[data-page="${anchorPageRef.current}"]`);
            const beforeRect = anchorTile?.getBoundingClientRect();

            adoptVirtualizedInnerWidth(innerRef.current, scale, layoutWidthRef, setLayoutWidth);

            const prevLayout = prevLayoutRef.current;
            const didColumnsOrWidthChange = prevLayout.columns !== columns || prevLayout.tileWidth !== tileWidth;
            const didScaleChange = previousScale !== scale;
            prevLayoutRef.current = { columns, tileWidth, scale };

            if (!grid || layoutWidth <= 0) {
                return;
            }

            if (
                completeFirstVirtualizedMeasure({
                    grid,
                    pageCount,
                    currentPage,
                    columns,
                    getRatio,
                    hasMeasuredLayoutRef,
                    prevRatiosRef,
                    pendingFocusRef,
                    scrollToIndex: virtualizer.scrollToIndex,
                    onReady: handleScrollThrottled,
                })
            ) {
                return;
            }

            if (!didColumnsOrWidthChange && !didScaleChange) {
                return;
            }

            capturePendingFocusIfGridActive(grid, pendingFocusRef, focusedPageRef.current);

            // Prefer pixel-accurate rect delta when the anchor tile is mounted and has layout.
            const afterRect = anchorTile?.getBoundingClientRect();
            if (anchorTile && beforeRect && afterRect && (beforeRect.width > 0 || beforeRect.height > 0)) {
                grid.scrollLeft += afterRect.left - beforeRect.left;
                grid.scrollTop += afterRect.top - beforeRect.top;
            } else {
                restoreVirtualizedRowScroll(
                    grid,
                    pageFromFocalTile(focalTile, anchorPageRef.current),
                    pageCount,
                    prevLayout,
                    columns,
                    tileWidth,
                    getRatio,
                );
            }
            handleScrollThrottled();
        }, [
            columns,
            currentPage,
            getRatio,
            handleScrollThrottled,
            layoutWidth,
            pageCount,
            scale,
            tileWidth,
            virtualizer,
        ]);

        // Apply pending focus after virtualizer commits new rows.
        useLayoutEffect(() => {
            const pending = pendingFocusRef.current;
            if (!pending) {
                return;
            }
            const grid = gridRef.current;
            if (!shouldApplyPendingFocus(pending, grid)) {
                pendingFocusRef.current = null;
                return;
            }
            const tile = grid?.querySelector<HTMLElement>(`[data-page="${pending.page}"]`);
            if (tile) {
                pendingFocusRef.current = null;
                tile.focus({ preventScroll: true });
            }
        });

        // Set initial pending focus on mount.
        useEffect(() => {
            pendingFocusRef.current = pendingFocusRef.current ?? { page: currentPage, from: document.activeElement };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // ResizeObserver for initial width measurement and reflow.
        useEffect(() => {
            const grid = gridRef.current;
            const inner = innerRef.current;
            if (!grid || !inner) return undefined;

            let isFirstObservation = true;
            const observer = new ResizeObserver(() => {
                const width = adoptVirtualizedResizeWidth(
                    grid,
                    inner,
                    layoutWidthRef,
                    pendingFocusRef,
                    focusedPageRef.current,
                    setLayoutWidth,
                );
                if (width > 0) {
                    completeFirstVirtualizedMeasure({
                        grid,
                        pageCount: pageCountRef.current,
                        currentPage: currentPageRef.current,
                        columns: getOccupiedColumns(
                            getGalleryLayout(width, scaleRef.current).columns,
                            pageCountRef.current,
                        ),
                        getRatio: getRatioRef.current,
                        hasMeasuredLayoutRef,
                        prevRatiosRef,
                        pendingFocusRef,
                        scrollToIndex: virtualizerRef.current.scrollToIndex,
                        onReady: handleScrollThrottled,
                    });
                }
                if (isFirstObservation) {
                    isFirstObservation = false;
                    return;
                }
                handleScrollThrottled();
            });
            observer.observe(grid);

            return () => observer.disconnect();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const selectPage = useCallback(
            (pageNum: number) => {
                focusedPageRef.current = pageNum;
                setFocusedPage(pageNum);
                if (onFocusChange) {
                    onFocusChange(pageNum);
                }
            },
            [onFocusChange],
        );

        const focusTile = useCallback(
            (pageNum: number, options?: FocusOptions & { align?: 'auto' | 'start' | 'center' | 'end' }) => {
                const grid = gridRef.current;
                if (!grid) return;
                selectPage(pageNum);

                const preventScroll = Boolean(options?.preventScroll);
                const align = options?.align ?? 'auto';

                if (!preventScroll) {
                    const rowIdx = getRowIndex(pageNum, columnsRef.current) - 1;
                    const cols = columnsRef.current;
                    const tw = tileWidthRef.current;
                    const pages = pageCountRef.current;
                    const rowStart = getRowStartOffset(rowIdx, pages, cols, tw, getRatioRef.current);
                    const rowEnd = rowStart + getRowHeight(rowIdx, pages, cols, tw, getRatioRef.current);
                    const inView =
                        align === 'auto' && isRowInScrollport(grid, rowStart, rowEnd, GALLERY_GRID_PADDING_TOP);
                    if (!inView) {
                        pendingFocusRef.current = { page: pageNum, from: document.activeElement };
                        virtualizer.scrollToIndex(rowIdx, { align });
                        grid.dispatchEvent(new Event('scroll'));
                        return;
                    }
                }

                const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
                if (tile) {
                    tile.focus({ preventScroll: true });
                    return;
                }

                if (!preventScroll) {
                    pendingFocusRef.current = { page: pageNum, from: document.activeElement };
                    virtualizer.scrollToIndex(getRowIndex(pageNum, columnsRef.current) - 1, { align });
                    grid.dispatchEvent(new Event('scroll'));
                }
            },
            [selectPage, virtualizer],
        );

        const handleTileFocus = useCallback(
            (pageNum: number) => {
                selectPage(pageNum);
            },
            [selectPage],
        );

        const handleTileClick = useCallback(
            (pageNum: number) => {
                onPageNavigate(pageNum);
            },
            [onPageNavigate],
        );

        const handleGridFocus = useCallback(
            (event: React.FocusEvent) => {
                if (event.target === gridRef.current) {
                    focusTile(focusedPage, { preventScroll: true });
                }
            },
            [focusedPage, focusTile],
        );

        const handleNavKey = useCallback(
            (key: string): boolean => {
                const page = focusedPageRef.current;
                const columnCount = columnsRef.current;
                switch (key) {
                    case 'ArrowUp': {
                        const target = getPageAbove(page, columnCount);
                        if (target !== null && target >= 1) {
                            focusTile(target);
                        }
                        return true;
                    }
                    case 'ArrowDown': {
                        const target = getPageBelow(page, columnCount, pageCount);
                        if (target !== null && target <= pageCount) {
                            focusTile(target);
                        }
                        return true;
                    }
                    case 'ArrowLeft':
                        if (page > 1) {
                            focusTile(page - 1);
                        }
                        return true;
                    case 'ArrowRight':
                        if (page < pageCount) {
                            focusTile(page + 1);
                        }
                        return true;
                    case 'Home':
                        focusTile(1, { align: 'start' });
                        return true;
                    case 'End':
                        focusTile(pageCount, { align: 'end' });
                        return true;
                    case 'Enter':
                    case 'Space':
                        onPageNavigate(page);
                        return true;
                    default:
                        return false;
                }
            },
            [focusTile, onPageNavigate, pageCount],
        );

        useImperativeHandle(ref, () => ({ handleNavKey }), [handleNavKey]);

        const handleGridKeyDown = useCallback(
            (event: React.KeyboardEvent) => {
                const key = decodeKeydown(event);

                if (key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                    return;
                }

                if (handleNavKey(key)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            },
            [handleNavKey, onClose],
        );

        const virtualItems = virtualizer.getVirtualItems();

        // Pump thumbnail loading when focus moves to ensure new rows get thumbnails.
        const skipInitialFocusPumpRef = useRef(true);
        useEffect(() => {
            if (!isQueueReadyRef.current) {
                return undefined;
            }
            if (skipInitialFocusPumpRef.current) {
                skipInitialFocusPumpRef.current = false;
                return undefined;
            }
            const pump = (): void => {
                handleScroll();
                handleScrollThrottled.flush();
            };
            pump();
            const raf = requestAnimationFrame(pump);
            return () => cancelAnimationFrame(raf);
        }, [focusedPage, handleScroll, handleScrollThrottled, isQueueReadyRef]);

        const renderTile = (pageNum: number): JSX.Element => (
            <GalleryTile
                key={pageNum}
                ariaColIndex={getColumnIndex(pageNum, columns)}
                imageSrc={highResImages[pageNum] || loadedImages[pageNum]}
                isFocused={pageNum === focusedPage}
                onClick={handleTileClick}
                onFocus={handleTileFocus}
                pageNum={pageNum}
                pageRatio={getPageRatio?.(pageNum) || pageRatio}
                role="gridcell"
                width={tileWidth}
            />
        );

        const rowTrackWidth = getRowTrackWidth(columns, tileWidth);
        const rowLeft = Math.max(0, (layoutWidth - rowTrackWidth) / 2);

        const content = virtualItems.map(virtualRow => {
            const rowIndex = virtualRow.index + 1;
            const pages = getPagesInRow(virtualRow.index, columns, pageCount);

            return (
                // ARIA grid, not an HTML table — <tr> is not valid here.
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                <div
                    key={virtualRow.key}
                    aria-label={String(rowIndex)}
                    aria-rowindex={rowIndex}
                    className="bp-gallery-grid-row"
                    role="row"
                    style={{
                        height: `${virtualRow.size}px`,
                        left: `${rowLeft}px`,
                        transform: `translateY(${virtualRow.start - GALLERY_GRID_PADDING_TOP}px)`,
                        width: `${rowTrackWidth}px`,
                    }}
                >
                    {pages.map(renderTile)}
                </div>
            );
        });

        return (
            <div
                ref={gridRef}
                aria-colcount={columns}
                aria-label={__('page_gallery')}
                aria-rowcount={getRowCount(pageCount, columns)}
                className="bp-gallery-grid bp-gallery-grid--virtualized"
                onFocus={handleGridFocus}
                onKeyDown={handleGridKeyDown}
                onScroll={handleScroll}
                role="grid"
                tabIndex={-1}
            >
                <div ref={innerRef} className="bp-gallery-grid-inner" style={{ height: virtualizer.getTotalSize() }}>
                    {content}
                </div>
            </div>
        );
    },
);

export default VirtualizedGalleryGrid;
