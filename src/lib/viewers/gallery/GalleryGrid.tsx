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
import throttle from 'lodash/throttle';
import { decodeKeydown, replacePlaceholders } from '../../util';
import HighResThumbnailStore, { HighResRenderTask } from './HighResThumbnailStore';
import {
    CONCURRENT_LOADS,
    GALLERY_HIGH_RES_CONCURRENCY,
    GALLERY_HIGH_RES_MAX_BYTES,
    GALLERY_HIGH_RES_MAX_PAGES,
    GALLERY_THUMB_MAX_DPR,
    GALLERY_THUMB_MAX_TIER,
    GALLERY_THUMB_MAX_WIDTH,
    GALLERY_THUMB_WIDTH_TIERS,
    GALLERY_TILE_GAP,
    GALLERY_TILE_MIN_WIDTH,
    SCROLL_THROTTLE_MS,
    GALLERY_VIRTUAL_OVERSCAN,
} from './constants';
import {
    getGalleryLayout,
    getPagesInRow,
    getRowHeight,
    getRowStartOffset,
    resolvePageRatio,
} from './galleryGridLayout';
import { getColumnIndex, getPageAbove, getPageBelow, getRowCount, getRowIndex } from './galleryGridNavigation';
import useGalleryPinch, { PinchDirection, PinchFocal } from './useGalleryPinch';
import './GalleryGrid.scss';

export interface GalleryThumbnail {
    init: () => Promise<unknown>;
    getImageFromCache: (itemIndex: number) => { image?: HTMLImageElement; inProgress: boolean } | null | undefined;
    createThumbnailImage: (
        itemIndex: number,
        options: { createImgTag: boolean; thumbMaxWidth: number },
    ) => Promise<HTMLImageElement | null>;
    renderPageImage: (pageNum: number, options: { thumbMaxWidth: number }) => HighResRenderTask;
    /** First-page width:height ratio, populated by init(). Used to size placeholders to the real page shape. */
    pageRatio?: number;
}

export type Props = {
    pageCount: number;
    currentPage: number;
    /** Per-page width:height ratio (null while unknown). Falls back to the first-page ratio. */
    getPageRatio?: (pageNum: number) => number | null;
    /** Enhanced gallery: ARIA grid, 2D arrow navigation, and row virtualization. */
    isAriaGridEnabled?: boolean;
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

export type GalleryGridHandle = {
    handleNavKey: (key: string) => void;
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

function shouldApplyPendingFocus(pending: PendingFocus, grid: HTMLElement | null): boolean {
    const active = document.activeElement;
    if (pending.from === active) {
        return true;
    }
    if (grid && active && grid.contains(active)) {
        return true;
    }
    // Unmounting a focused tile dumps focus to body; an explicit move to another control must not restore.
    return !active || active === document.body || active === document.documentElement;
}

function getPinchFocalTile(focal: PinchFocal | null): HTMLElement | null {
    if (!focal) {
        return null;
    }
    return document.elementFromPoint?.(focal.x, focal.y)?.closest<HTMLElement>('[data-page]') ?? null;
}

function restoreListboxZoomAnchor(
    grid: HTMLElement,
    focal: PinchFocal | null,
    anchorPage: number,
    applyZoomLayout: () => void,
): void {
    const focalTile = getPinchFocalTile(focal);
    const anchorTile = focalTile || grid.querySelector<HTMLElement>(`[data-page="${anchorPage}"]`);
    const beforeRect = anchorTile?.getBoundingClientRect();
    applyZoomLayout();
    if (!anchorTile || !beforeRect) {
        return;
    }
    const afterRect = anchorTile.getBoundingClientRect();
    grid.scrollLeft += afterRect.left - beforeRect.left;
    grid.scrollTop += afterRect.top - beforeRect.top;
}

function applyListboxScaleLayout(
    grid: HTMLElement | null,
    previousScale: number,
    scale: number,
    applyZoomLayout: () => void,
    focal: PinchFocal | null,
    anchorPage: number,
    onRestored: () => void,
): void {
    if (!grid || previousScale === scale) {
        applyZoomLayout();
        return;
    }
    restoreListboxZoomAnchor(grid, focal, anchorPage, applyZoomLayout);
    onRestored();
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
    // The initial observe() can already report a size the mount layout effect
    // never saw, so always adopt a positive width. Scroll restore waits for the
    // layout effect so it uses the committed column count.
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

function restoreListboxResizeAnchor(grid: HTMLElement, anchorPage: number): void {
    const tile = grid.querySelector(`[data-page="${anchorPage}"]`) as HTMLElement | null;
    if (tile) {
        tile.scrollIntoView({ block: 'start' });
    }
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

interface TileProps {
    pageNum: number;
    isFocused: boolean;
    ariaColIndex?: number;
    imageSrc?: string;
    onClick: (pageNum: number) => void;
    onFocus: (pageNum: number) => void;
    pageRatio?: number | null;
    role: 'option' | 'gridcell';
    width?: number;
}

const GalleryTile = React.memo(function GalleryTile({
    pageNum,
    isFocused,
    ariaColIndex,
    imageSrc,
    onClick,
    onFocus,
    pageRatio,
    role,
    width,
}: TileProps): JSX.Element {
    const ratio = pageRatio && Number.isFinite(pageRatio) && pageRatio > 0 ? pageRatio : null;
    const tileStyle = {
        ...(ratio ? { aspectRatio: String(ratio) } : undefined),
        ...(width != null ? { width } : undefined),
    };
    const contentStyle = ratio ? { height: '100%' } : undefined;
    const placeholderStyle = ratio ? { ...contentStyle, paddingTop: 0 } : undefined;

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            aria-colindex={ariaColIndex}
            aria-label={replacePlaceholders(__('page_gallery_tile'), [String(pageNum)])}
            aria-selected={isFocused}
            className={`bp-gallery-tile${isFocused ? ' bp-gallery-tile--selected' : ''}`}
            data-page={pageNum}
            data-resin-target="galleryTile"
            onClick={() => onClick(pageNum)}
            onFocus={() => onFocus(pageNum)}
            role={role}
            style={tileStyle}
            tabIndex={isFocused ? 0 : -1}
        >
            <span aria-hidden="true" className="bp-gallery-tile-badge">
                {pageNum}
            </span>
            {imageSrc ? (
                <img alt="" src={imageSrc} style={contentStyle} />
            ) : (
                <span className="bp-gallery-tile-placeholder" style={placeholderStyle} />
            )}
        </div>
    );
});

const GalleryGrid = forwardRef<GalleryGridHandle, Props>(function GalleryGrid(
    {
        pageCount,
        currentPage,
        getPageRatio,
        isAriaGridEnabled = false,
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
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [highResImages, setHighResImages] = useState<Record<number, string>>({});
    const [focusedPage, setFocusedPage] = useState(currentPage);
    const [pageRatio, setPageRatio] = useState<number | null>(null);
    const [layoutWidth, setLayoutWidth] = useState(0);
    // Topmost visible page — the scroll anchor used to restore the viewed area after a reflow.
    const anchorPageRef = useRef(currentPage);
    const gridRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const focalRef = useRef<PinchFocal | null>(null);
    const scaleRef = useRef(scale);
    const queueRef = useRef<number[]>([]);
    const isProcessingRef = useRef(false);
    const isMountedRef = useRef(true);
    const inFlightRef = useRef<Set<number>>(new Set());
    const highResStoreRef = useRef<HighResThumbnailStore | null>(null);
    const pendingFocusRef = useRef<PendingFocus | null>(null);
    const loadedImagesRef = useRef(loadedImages);
    const focusedPageRef = useRef(focusedPage);
    const layoutWidthRef = useRef(layoutWidth);
    const pageCountRef = useRef(pageCount);
    const currentPageRef = useRef(currentPage);
    const isAriaGridEnabledRef = useRef(isAriaGridEnabled);

    loadedImagesRef.current = loadedImages;
    focusedPageRef.current = focusedPage;
    layoutWidthRef.current = layoutWidth;
    pageCountRef.current = pageCount;
    currentPageRef.current = currentPage;
    isAriaGridEnabledRef.current = isAriaGridEnabled;

    const { columns, tileWidth } = getGalleryLayout(layoutWidth, scale);
    const columnsRef = useRef(columns);
    const tileWidthRef = useRef(tileWidth);
    columnsRef.current = columns;
    tileWidthRef.current = tileWidth;

    const getRatio = useCallback((pageNum: number): number => resolvePageRatio(pageNum, getPageRatio, pageRatio), [
        getPageRatio,
        pageRatio,
    ]);
    const getRatioRef = useRef(getRatio);
    getRatioRef.current = getRatio;

    const prevLayoutRef = useRef({ columns, tileWidth, scale });
    const prevRatiosRef = useRef<number[] | undefined>(undefined);
    const hasMeasuredLayoutRef = useRef(false);

    const virtualizer = useVirtualizer({
        count: isAriaGridEnabled ? getRowCount(pageCount, columns) : 0,
        enabled: isAriaGridEnabled,
        estimateSize: (rowIndex: number) => getRowHeight(rowIndex, pageCount, columns, tileWidth, getRatio),
        gap: GALLERY_TILE_GAP,
        getScrollElement: () => gridRef.current,
        overscan: GALLERY_VIRTUAL_OVERSCAN,
        // Keep the selected row mounted so scrolling it offscreen does not drop keyboard focus.
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

    const byDistanceFromAnchor = (a: number, b: number): number =>
        Math.abs(a - anchorPageRef.current) - Math.abs(b - anchorPageRef.current);

    function getNeededThumbWidth(): number {
        if (scaleRef.current === 1) {
            return GALLERY_THUMB_MAX_WIDTH;
        }

        if (isAriaGridEnabledRef.current) {
            const neededWidth = tileWidthRef.current * Math.min(window.devicePixelRatio || 1, GALLERY_THUMB_MAX_DPR);
            return GALLERY_THUMB_WIDTH_TIERS.find(tier => tier >= neededWidth) || GALLERY_THUMB_MAX_TIER;
        }

        const tile = gridRef.current?.querySelector<HTMLElement>('[data-page]');
        const neededWidth = (tile?.offsetWidth || 0) * Math.min(window.devicePixelRatio || 1, GALLERY_THUMB_MAX_DPR);
        return GALLERY_THUMB_WIDTH_TIERS.find(tier => tier >= neededWidth) || GALLERY_THUMB_MAX_TIER;
    }

    // Prioritize visible pages before spending work on the surrounding buffer.
    function getPagesNearViewport(
        marginRatio: number,
        isEligible?: (pageNum: number, tile?: HTMLElement) => boolean,
    ): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

        if (isAriaGridEnabledRef.current) {
            const { scrollTop, clientHeight } = grid;
            if (clientHeight <= 0) {
                return [];
            }

            const viewportBottom = scrollTop + clientHeight;
            const margin = clientHeight * marginRatio;
            const visible: number[] = [];
            const nearby: number[] = [];
            const columnCount = columnsRef.current;
            const pages = pageCountRef.current;

            virtualizerRef.current.getVirtualItems().forEach(item => {
                const bottom = item.start + item.size;
                let bucket: number[] | null = null;
                if (bottom > scrollTop && item.start < viewportBottom) {
                    bucket = visible;
                } else if (bottom > scrollTop - margin && item.start < viewportBottom + margin) {
                    bucket = nearby;
                }
                if (!bucket) {
                    return;
                }
                const target = bucket;
                getPagesInRow(item.index, columnCount, pages).forEach(pageNum => {
                    if (!isEligible || isEligible(pageNum)) {
                        target.push(pageNum);
                    }
                });
            });

            return [...visible.sort(byDistanceFromAnchor), ...nearby.sort(byDistanceFromAnchor)];
        }

        const { scrollTop, clientHeight } = grid;
        const viewportBottom = scrollTop + clientHeight;
        const margin = clientHeight * marginRatio;
        const visible: number[] = [];
        const nearby: number[] = [];

        grid.querySelectorAll<HTMLElement>('[data-page]').forEach(tile => {
            if (!tile.dataset.page) return;
            const pageNum = parseInt(tile.dataset.page, 10);
            if (isEligible && !isEligible(pageNum, tile)) return;
            const tileTop = tile.offsetTop;
            const tileBottom = tileTop + tile.offsetHeight;

            if (tileBottom > scrollTop && tileTop < viewportBottom) {
                visible.push(pageNum);
            } else if (tileBottom > scrollTop - margin && tileTop < viewportBottom + margin) {
                nearby.push(pageNum);
            }
        });

        return [...visible.sort(byDistanceFromAnchor), ...nearby.sort(byDistanceFromAnchor)];
    }

    function syncHighRes() {
        const store = highResStoreRef.current;
        const { pageRatio: thumbRatio } = thumbnail;
        if (!store || !thumbRatio) return;

        const width = getNeededThumbWidth();
        if (width === GALLERY_THUMB_MAX_WIDTH) {
            store.setRetained([], width, thumbRatio);
        } else if (!isProcessingRef.current) {
            store.setRetained(getPagesNearViewport(0.5), width, thumbRatio);
        }
    }

    function getUnloadedNearViewport(): number[] {
        return getPagesNearViewport(3, (pageNum, tile) => {
            if (inFlightRef.current.has(pageNum)) {
                return false;
            }
            if (tile) {
                return !tile.querySelector('img');
            }
            return !loadedImagesRef.current[pageNum];
        });
    }

    function processQueue() {
        if (!isMountedRef.current || !thumbnail || queueRef.current.length === 0) {
            isProcessingRef.current = false;
            return;
        }

        const batch = queueRef.current.slice(0, CONCURRENT_LOADS);
        queueRef.current = queueRef.current.slice(CONCURRENT_LOADS);

        requestAnimationFrame(() => {
            if (!isMountedRef.current || !thumbnail) {
                isProcessingRef.current = false;
                return;
            }

            let completed = 0;

            const onComplete = () => {
                completed += 1;
                if (completed < batch.length) return;

                if (!isMountedRef.current) {
                    isProcessingRef.current = false;
                    return;
                }

                // Keep only what the viewport + buffer still needs, then go idle. This prune is
                // what makes loading lazy (the mount queue starts as the whole document); the
                // scroll/resize handlers re-derive what to load on demand after that.
                const remaining = new Set(queueRef.current);
                queueRef.current = getUnloadedNearViewport().filter(p => remaining.has(p));
                if (queueRef.current.length === 0) {
                    isProcessingRef.current = false;
                    syncHighRes();
                    return;
                }
                processQueue();
            };

            batch.forEach(pageNum => {
                inFlightRef.current.add(pageNum);
                thumbnail
                    .createThumbnailImage(pageNum - 1, { createImgTag: true, thumbMaxWidth: GALLERY_THUMB_MAX_WIDTH })
                    .then((imageEl: HTMLImageElement | null) => {
                        inFlightRef.current.delete(pageNum);
                        if (isMountedRef.current && imageEl && imageEl.src) {
                            setLoadedImages(prev => ({ ...prev, [pageNum]: imageEl.src }));
                        }
                        onComplete();
                    })
                    .catch(err => {
                        inFlightRef.current.delete(pageNum);
                        console.error('Gallery thumbnail failed for page', pageNum, err); // eslint-disable-line no-console
                        onComplete();
                    });
            });
        });
    }

    function startProcessing() {
        if (!isProcessingRef.current && queueRef.current.length > 0) {
            isProcessingRef.current = true;
            processQueue();
        }
    }

    const handleScrollRef = useRef(
        throttle(() => {
            const nearbyUnloaded = getUnloadedNearViewport();
            if (nearbyUnloaded.length > 0) {
                const currentQueue = new Set(queueRef.current);
                const toAdd = nearbyUnloaded.filter(p => !currentQueue.has(p));
                queueRef.current = [...toAdd, ...queueRef.current];
                startProcessing();
            }
            syncHighRes();
        }, SCROLL_THROTTLE_MS),
    );

    // Unthrottled so the anchor is accurate the instant a reflow (e.g. fullscreen) happens.
    const handleScroll = useCallback(() => {
        const grid = gridRef.current;
        if (grid) {
            if (isAriaGridEnabledRef.current) {
                const pages = pageCountRef.current;
                if (pages > 0) {
                    const item = virtualizerRef.current.getVirtualItemForOffset(grid.scrollTop);
                    if (item) {
                        anchorPageRef.current = Math.min(item.index * columnsRef.current + 1, pages);
                    }
                }
            } else {
                const tiles = Array.from(grid.querySelectorAll<HTMLElement>('[data-page]'));
                const anchorTile = tiles.find(tile => tile.offsetTop + tile.offsetHeight > grid.scrollTop);
                const page = anchorTile?.dataset.page;
                if (page) {
                    anchorPageRef.current = Number.parseInt(page, 10);
                }
            }
        }
        handleScrollRef.current();
    }, []);

    useGalleryPinch({
        focalRef,
        gridRef,
        isPinchZoomEnabled,
        isTouchZoomEnabled,
        onGestureStart: onPinchStart,
        onZoom: onScaleChange,
        scaleRef,
    });

    const applyZoomLayout = useCallback(() => {
        const inner = innerRef.current;
        if (!inner) {
            return;
        }

        const currentScale = scaleRef.current;
        inner.style.setProperty('--bp-gallery-hover-scale', String(1 + 0.02 / currentScale));

        if (currentScale === 1) {
            inner.style.gridTemplateColumns = '';
            inner.style.justifyContent = '';
            return;
        }

        const width = inner.clientWidth;
        const columnPitch = GALLERY_TILE_MIN_WIDTH + GALLERY_TILE_GAP;
        const layoutColumns = Math.max(1, Math.floor((width + GALLERY_TILE_GAP) / columnPitch));
        const baseWidth = (width - (layoutColumns - 1) * GALLERY_TILE_GAP) / layoutColumns;
        inner.style.gridTemplateColumns = `repeat(auto-fill, ${Math.min(width, baseWidth * currentScale)}px)`;
        inner.style.justifyContent = 'center';
    }, []);

    // getPageRatio is a stable method whose return values change as PDF.js
    // metadata arrives, so a dep on getRatio would miss mixed-size pages. Compare
    // visible row sizes to live ratios after every commit. Skip when columns/width
    // are changing — the restore effect below remaps scroll for that case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
        if (!isAriaGridEnabled || !hasMeasuredLayoutRef.current || layoutWidth <= 0) {
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
        handleScrollRef.current();
    });

    useLayoutEffect(() => {
        if (isAriaGridEnabled) {
            virtualizer.measure();
            if (prevRatiosRef.current && prevRatiosRef.current.length !== pageCount + 1) {
                prevRatiosRef.current = undefined;
            }
        }
    }, [columns, getRatio, isAriaGridEnabled, pageCount, tileWidth, virtualizer]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        const previousScale = scaleRef.current;
        scaleRef.current = scale;
        const focal = focalRef.current;
        focalRef.current = null;

        if (!isAriaGridEnabled) {
            applyListboxScaleLayout(
                grid,
                previousScale,
                scale,
                applyZoomLayout,
                focal,
                anchorPageRef.current,
                handleScrollRef.current,
            );
            return;
        }

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
                onReady: handleScrollRef.current,
            })
        ) {
            return;
        }

        // Restore after this commit so row indexes use the new column count. Restoring
        // inside ResizeObserver would still see the stale columnsRef.
        if (!didColumnsOrWidthChange && !didScaleChange) {
            return;
        }

        capturePendingFocusIfGridActive(grid, pendingFocusRef, focusedPageRef.current);
        restoreVirtualizedRowScroll(
            grid,
            pageFromFocalTile(getPinchFocalTile(focal), anchorPageRef.current),
            pageCount,
            prevLayout,
            columns,
            tileWidth,
            getRatio,
        );
        handleScrollRef.current();
    }, [
        applyZoomLayout,
        columns,
        currentPage,
        getRatio,
        isAriaGridEnabled,
        layoutWidth,
        pageCount,
        scale,
        tileWidth,
        virtualizer,
    ]);

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

    useEffect(() => {
        const throttledScroll = handleScrollRef.current;
        const highResStore = new HighResThumbnailStore({
            maxBytes: GALLERY_HIGH_RES_MAX_BYTES,
            maxConcurrent: GALLERY_HIGH_RES_CONCURRENCY,
            maxPages: GALLERY_HIGH_RES_MAX_PAGES,
            onChange: images => {
                if (isMountedRef.current) {
                    setHighResImages(images);
                }
            },
            render: (pageNum, width) => thumbnail.renderPageImage(pageNum, { thumbMaxWidth: width }),
        });
        highResStoreRef.current = highResStore;

        if (isAriaGridEnabled) {
            pendingFocusRef.current = pendingFocusRef.current ?? { page: currentPage, from: document.activeElement };
        } else if (gridRef.current) {
            const tile = gridRef.current.querySelector(`[data-page="${currentPage}"]`) as HTMLElement;
            if (tile) {
                tile.scrollIntoView({ block: 'center' });
                tile.focus();
            }
        }

        const initialImages: Record<number, string> = {};
        const uncachedPages: number[] = [];

        for (let i = 1; i <= pageCount; i += 1) {
            const cached = thumbnail.getImageFromCache(i - 1);
            const src = cached?.image?.src;
            if (src) {
                initialImages[i] = src;
            } else {
                uncachedPages.push(i);
            }
        }

        if (Object.keys(initialImages).length > 0) {
            setLoadedImages(initialImages);
        }

        uncachedPages.sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
        queueRef.current = uncachedPages;

        thumbnail
            .init()
            .then(() => {
                if (!isMountedRef.current) return;
                if (typeof thumbnail.pageRatio === 'number' && thumbnail.pageRatio > 0) {
                    setPageRatio(thumbnail.pageRatio);
                }
                // Guarded start: the mount scroll can fire the scroll handler first, and a
                // second unguarded pump would double the concurrent thumbnail renders.
                startProcessing();
                syncHighRes();
            })
            .catch(err => {
                if (!isMountedRef.current) return;
                console.error('Gallery thumbnail init failed', err); // eslint-disable-line no-console
                startProcessing();
            });

        return () => {
            isMountedRef.current = false;
            pendingFocusRef.current = null;
            queueRef.current = [];
            isProcessingRef.current = false;
            highResStore.destroy();
            highResStoreRef.current = null;
            throttledScroll.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listbox restores the viewed tile here. Virtualized only records width; scroll
    // remap waits for the layout effect so it uses the committed column count.
    useEffect(() => {
        const grid = gridRef.current;
        const inner = innerRef.current;
        if (!grid || !inner) return undefined;

        let isFirstObservation = true;
        const observer = new ResizeObserver(() => {
            if (isAriaGridEnabled) {
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
                        columns: getGalleryLayout(width, scaleRef.current).columns,
                        getRatio: getRatioRef.current,
                        hasMeasuredLayoutRef,
                        prevRatiosRef,
                        pendingFocusRef,
                        scrollToIndex: virtualizerRef.current.scrollToIndex,
                        onReady: handleScrollRef.current,
                    });
                }
            } else {
                applyZoomLayout();
            }
            if (isFirstObservation) {
                isFirstObservation = false;
                return;
            }
            if (!isAriaGridEnabled) {
                restoreListboxResizeAnchor(grid, anchorPageRef.current);
            }
            // A larger viewport (fullscreen enter, window resize) can reveal unloaded tiles
            // without any scroll event, so run the same catch-up the scroll handler does.
            handleScrollRef.current();
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, [applyZoomLayout, isAriaGridEnabled]);

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
        (pageNum: number, options?: FocusOptions) => {
            const grid = gridRef.current;
            if (!grid) return;
            selectPage(pageNum);
            const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
            if (tile) {
                tile.focus(options);
                return;
            }
            if (!isAriaGridEnabled) {
                return;
            }
            pendingFocusRef.current = { page: pageNum, from: document.activeElement };
            virtualizer.scrollToIndex(getRowIndex(pageNum, columnsRef.current) - 1, {
                align: options?.preventScroll ? 'auto' : 'center',
            });
        },
        [isAriaGridEnabled, selectPage, virtualizer],
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

    // Listbox: every arrow moves ±1 page. ARIA grid: Left/Right stay ±1 (across row
    // edges, clamped at first/last page); Up/Down move one row (Down clamps on a short last row).
    const handleNavKey = useCallback(
        (key: string): boolean => {
            const page = focusedPageRef.current;
            const columnCount = columnsRef.current;
            switch (key) {
                case 'ArrowUp': {
                    const target = isAriaGridEnabled ? getPageAbove(page, columnCount) : page - 1;
                    if (target !== null && target >= 1) {
                        focusTile(target);
                    }
                    return true;
                }
                case 'ArrowDown': {
                    const target = isAriaGridEnabled ? getPageBelow(page, columnCount, pageCount) : page + 1;
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
                    focusTile(1);
                    return true;
                case 'End':
                    focusTile(pageCount);
                    return true;
                case 'Enter':
                case 'Space':
                    onPageNavigate(page);
                    return true;
                default:
                    return false;
            }
        },
        [focusTile, isAriaGridEnabled, onPageNavigate, pageCount],
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

    const renderTile = (pageNum: number): JSX.Element => (
        <GalleryTile
            key={pageNum}
            ariaColIndex={isAriaGridEnabled ? getColumnIndex(pageNum, columns) : undefined}
            imageSrc={highResImages[pageNum] || loadedImages[pageNum]}
            isFocused={pageNum === focusedPage}
            onClick={handleTileClick}
            onFocus={handleTileFocus}
            pageNum={pageNum}
            pageRatio={(getPageRatio && getPageRatio(pageNum)) || pageRatio}
            role={isAriaGridEnabled ? 'gridcell' : 'option'}
            width={isAriaGridEnabled ? tileWidth : undefined}
        />
    );

    let content: React.ReactNode;
    if (isAriaGridEnabled) {
        content = virtualizer.getVirtualItems().map(virtualRow => {
            const rowIndex = virtualRow.index + 1;
            const pages = getPagesInRow(virtualRow.index, columns, pageCount);

            return (
                <div
                    key={virtualRow.key}
                    aria-label={String(rowIndex)}
                    aria-rowindex={rowIndex}
                    className="bp-gallery-grid-row"
                    role="row"
                    style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                    }}
                >
                    {pages.map(renderTile)}
                </div>
            );
        });
    } else {
        const tiles = [];
        for (let i = 1; i <= pageCount; i += 1) {
            tiles.push(renderTile(i));
        }
        content = tiles;
    }

    return (
        <div
            ref={gridRef}
            aria-colcount={isAriaGridEnabled ? columns : undefined}
            aria-label={__('page_gallery')}
            aria-rowcount={isAriaGridEnabled ? getRowCount(pageCount, columns) : undefined}
            className={`bp-gallery-grid${isAriaGridEnabled ? ' bp-gallery-grid--virtualized' : ''}`}
            onFocus={handleGridFocus}
            onKeyDown={handleGridKeyDown}
            onScroll={handleScroll}
            role={isAriaGridEnabled ? 'grid' : 'listbox'}
            tabIndex={-1}
        >
            <div
                ref={innerRef}
                className="bp-gallery-grid-inner"
                role="presentation"
                style={isAriaGridEnabled ? { height: virtualizer.getTotalSize() } : undefined}
            >
                {content}
            </div>
        </div>
    );
});

export default GalleryGrid;
