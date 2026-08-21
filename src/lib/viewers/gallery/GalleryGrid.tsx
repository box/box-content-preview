import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
    collectPagesNearViewport,
    getAnchorPageFromScroll,
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

export default function GalleryGrid({
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
}: Props): JSX.Element {
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
    const pendingFocusRef = useRef<number | null>(null);
    const loadedImagesRef = useRef(loadedImages);
    const focusedPageRef = useRef(focusedPage);
    const layoutWidthRef = useRef(layoutWidth);
    const pageCountRef = useRef(pageCount);
    const getPageRatioRef = useRef(getPageRatio);
    const pageRatioRef = useRef(pageRatio);
    const isAriaGridEnabledRef = useRef(isAriaGridEnabled);

    loadedImagesRef.current = loadedImages;
    focusedPageRef.current = focusedPage;
    layoutWidthRef.current = layoutWidth;
    pageCountRef.current = pageCount;
    getPageRatioRef.current = getPageRatio;
    pageRatioRef.current = pageRatio;
    isAriaGridEnabledRef.current = isAriaGridEnabled;

    const { columns, tileWidth } = getGalleryLayout(layoutWidth, scale);
    const columnsRef = useRef(columns);
    const tileWidthRef = useRef(tileWidth);
    const prevColumnsForFocusRef = useRef(columns);

    if (isAriaGridEnabled && prevColumnsForFocusRef.current !== columns) {
        if (gridRef.current && gridRef.current.contains(document.activeElement)) {
            pendingFocusRef.current = focusedPage;
        }
        prevColumnsForFocusRef.current = columns;
    }
    columnsRef.current = columns;
    tileWidthRef.current = tileWidth;

    const getRatio = useCallback((pageNum: number): number => resolvePageRatio(pageNum, getPageRatio, pageRatio), [
        getPageRatio,
        pageRatio,
    ]);
    const getRatioRef = useRef(getRatio);
    getRatioRef.current = getRatio;

    const prevLayoutRef = useRef({ columns, tileWidth, scale });
    const hasMeasuredLayoutRef = useRef(false);

    const virtualizer = useVirtualizer({
        count: isAriaGridEnabled ? getRowCount(pageCount, columns) : 0,
        enabled: isAriaGridEnabled,
        estimateSize: (rowIndex: number) => getRowHeight(rowIndex, pageCount, columns, tileWidth, getRatio),
        gap: GALLERY_TILE_GAP,
        getScrollElement: () => gridRef.current,
        overscan: GALLERY_VIRTUAL_OVERSCAN,
    });

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
            const { visible, nearby } = collectPagesNearViewport({
                clientHeight: grid.clientHeight,
                columns: columnsRef.current,
                getRatio: getRatioRef.current,
                isEligible,
                marginRatio,
                pageCount: pageCountRef.current,
                scrollTop: grid.scrollTop,
                tileWidth: tileWidthRef.current,
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
                    .catch(() => {
                        inFlightRef.current.delete(pageNum);
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
                anchorPageRef.current = getAnchorPageFromScroll(
                    grid.scrollTop,
                    pageCountRef.current,
                    columnsRef.current,
                    tileWidthRef.current,
                    getRatioRef.current,
                );
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

    useLayoutEffect(() => {
        if (isAriaGridEnabled) {
            virtualizer.measure();
        }
    }, [columns, getRatio, isAriaGridEnabled, pageCount, tileWidth, virtualizer]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        const inner = innerRef.current;
        const previousScale = scaleRef.current;
        scaleRef.current = scale;

        const focal = focalRef.current;
        focalRef.current = null;

        if (!isAriaGridEnabled) {
            if (!grid || previousScale === scale) {
                applyZoomLayout();
                return;
            }

            const focalTile = focal
                ? document.elementFromPoint?.(focal.x, focal.y)?.closest<HTMLElement>('[data-page]')
                : null;
            const anchorTile = focalTile || grid.querySelector<HTMLElement>(`[data-page="${anchorPageRef.current}"]`);
            const beforeRect = anchorTile && anchorTile.getBoundingClientRect();

            applyZoomLayout();

            if (anchorTile && beforeRect) {
                const afterRect = anchorTile.getBoundingClientRect();
                grid.scrollLeft += afterRect.left - beforeRect.left;
                grid.scrollTop += afterRect.top - beforeRect.top;
            }

            handleScrollRef.current();
            return;
        }

        if (inner) {
            inner.style.setProperty('--bp-gallery-hover-scale', String(1 + 0.02 / scale));
            const width = inner.clientWidth;
            if (width > 0 && width !== layoutWidthRef.current) {
                layoutWidthRef.current = width;
                setLayoutWidth(width);
            }
        }

        const prevLayout = prevLayoutRef.current;
        const didColumnsOrWidthChange = prevLayout.columns !== columns || prevLayout.tileWidth !== tileWidth;
        const didScaleChange = previousScale !== scale;
        prevLayoutRef.current = { columns, tileWidth, scale };

        // First positive width is the initial measure, not a user resize. Skip restore
        // so it does not fight the mount scroll to currentPage.
        const isFirstMeasuredLayout = !hasMeasuredLayoutRef.current;
        if (layoutWidth > 0) {
            hasMeasuredLayoutRef.current = true;
        }

        // Restore after this commit so row indexes use the new column count. Doing
        // this in ResizeObserver reads columnsRef before setLayoutWidth flushes.
        if (!grid || (!didColumnsOrWidthChange && !didScaleChange) || isFirstMeasuredLayout) {
            return;
        }

        const focalTile = focal
            ? document.elementFromPoint?.(focal.x, focal.y)?.closest<HTMLElement>('[data-page]')
            : null;
        const page = focalTile && focalTile.dataset.page ? parseInt(focalTile.dataset.page, 10) : anchorPageRef.current;
        const prevStart = getRowStartOffset(
            getRowIndex(page, prevLayout.columns) - 1,
            pageCount,
            prevLayout.columns,
            prevLayout.tileWidth,
            getRatio,
        );
        const nextStart = getRowStartOffset(getRowIndex(page, columns) - 1, pageCount, columns, tileWidth, getRatio);
        grid.scrollTop += nextStart - prevStart;

        handleScrollRef.current();
    }, [applyZoomLayout, columns, getRatio, isAriaGridEnabled, layoutWidth, pageCount, scale, tileWidth]);

    useLayoutEffect(() => {
        const page = pendingFocusRef.current;
        if (page == null) {
            return;
        }
        const tile = gridRef.current?.querySelector<HTMLElement>(`[data-page="${page}"]`);
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
            pendingFocusRef.current = currentPage;
            virtualizer.scrollToIndex(getRowIndex(currentPage, columnsRef.current) - 1, { align: 'center' });
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
            if (cached && cached.image && cached.image.src) {
                initialImages[i] = cached.image.src;
            } else {
                uncachedPages.push(i);
            }
        }

        if (Object.keys(initialImages).length > 0) {
            setLoadedImages(initialImages);
        }

        uncachedPages.sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
        queueRef.current = uncachedPages;

        thumbnail.init().then(() => {
            if (!isMountedRef.current) return;
            if (typeof thumbnail.pageRatio === 'number' && thumbnail.pageRatio > 0) {
                setPageRatio(thumbnail.pageRatio);
            }
            // Guarded start: the mount scroll can fire the scroll handler first, and a
            // second unguarded pump would double the concurrent thumbnail renders.
            startProcessing();
            syncHighRes();
        });

        return () => {
            isMountedRef.current = false;
            queueRef.current = [];
            isProcessingRef.current = false;
            highResStore.destroy();
            highResStoreRef.current = null;
            throttledScroll.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the viewed area in place when the grid reflows (fullscreen enter/exit, window resize):
    // the scroll offset is preserved while tile positions shift, drifting the view otherwise.
    useEffect(() => {
        const grid = gridRef.current;
        const inner = innerRef.current;
        if (!grid || !inner) return undefined;

        let isFirstObservation = true;
        const observer = new ResizeObserver(() => {
            if (isAriaGridEnabled) {
                const width = inner.clientWidth;
                // The initial fire on observe() can already report a size the mount-time layout
                // effect never saw (e.g. a container that gained its size right after mount), so
                // always adopt a positive width. Scroll restore is not done here: columnsRef is
                // still stale until setLayoutWidth commits; the layout effect restores after that.
                if (width > 0 && width !== layoutWidthRef.current) {
                    if (grid.contains(document.activeElement)) {
                        pendingFocusRef.current = focusedPageRef.current;
                    }
                    layoutWidthRef.current = width;
                    setLayoutWidth(width);
                }
                if (isFirstObservation) {
                    isFirstObservation = false;
                    return;
                }
            } else {
                applyZoomLayout();
                if (isFirstObservation) {
                    isFirstObservation = false;
                    return;
                }
                const tile = grid.querySelector(`[data-page="${anchorPageRef.current}"]`) as HTMLElement | null;
                if (tile) {
                    tile.scrollIntoView({ block: 'start' });
                }
            }
            // A larger viewport (fullscreen enter, window resize) can reveal unloaded tiles
            // without any scroll event, so run the same catch-up the scroll handler does.
            handleScrollRef.current();
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, [applyZoomLayout, isAriaGridEnabled]);

    const focusTile = useCallback(
        (pageNum: number, options?: FocusOptions) => {
            const grid = gridRef.current;
            if (!grid) return;
            const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
            if (tile) {
                tile.focus(options);
                return;
            }
            if (!isAriaGridEnabled) {
                return;
            }
            pendingFocusRef.current = pageNum;
            virtualizer.scrollToIndex(getRowIndex(pageNum, columnsRef.current) - 1, {
                align: options && options.preventScroll ? 'auto' : 'center',
            });
        },
        [isAriaGridEnabled, virtualizer],
    );

    const handleTileFocus = useCallback(
        (pageNum: number) => {
            setFocusedPage(pageNum);
            if (onFocusChange) {
                onFocusChange(pageNum);
            }
        },
        [onFocusChange],
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

    const handleGridKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            const key = decodeKeydown(event);

            switch (key) {
                case 'Escape':
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                    return;
                // Listbox: every arrow moves ±1 page. ARIA grid: Left/Right stay ±1 (across row
                // edges, clamped at first/last page); Up/Down move one row (Down clamps on a short last row).
                case 'ArrowUp': {
                    event.preventDefault();
                    event.stopPropagation();
                    const target = isAriaGridEnabled ? getPageAbove(focusedPage, columns) : focusedPage - 1;
                    if (target !== null && target >= 1) {
                        focusTile(target);
                    }
                    return;
                }
                case 'ArrowDown': {
                    event.preventDefault();
                    event.stopPropagation();
                    const target = isAriaGridEnabled ? getPageBelow(focusedPage, columns, pageCount) : focusedPage + 1;
                    if (target !== null && target <= pageCount) {
                        focusTile(target);
                    }
                    return;
                }
                case 'ArrowLeft':
                    event.preventDefault();
                    event.stopPropagation();
                    if (focusedPage > 1) {
                        focusTile(focusedPage - 1);
                    }
                    return;
                case 'ArrowRight':
                    event.preventDefault();
                    event.stopPropagation();
                    if (focusedPage < pageCount) {
                        focusTile(focusedPage + 1);
                    }
                    return;
                case 'Home':
                    event.preventDefault();
                    event.stopPropagation();
                    focusTile(1);
                    return;
                case 'End':
                    event.preventDefault();
                    event.stopPropagation();
                    focusTile(pageCount);
                    return;
                case 'Enter':
                case 'Space':
                    event.preventDefault();
                    event.stopPropagation();
                    onPageNavigate(focusedPage);
                    break;
                default:
            }
        },
        [columns, focusedPage, focusTile, isAriaGridEnabled, onClose, onPageNavigate, pageCount],
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
}
