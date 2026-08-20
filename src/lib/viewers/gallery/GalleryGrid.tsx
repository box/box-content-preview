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
    /** When true, use ARIA grid roles and 2D arrow navigation instead of listbox/option. */
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
    ariaPosInSet?: number;
    ariaSetSize?: number;
    imageSrc?: string;
    onClick: (pageNum: number) => void;
    onFocus: (pageNum: number) => void;
    pageRatio?: number | null;
    role: 'option' | 'gridcell';
    width: number;
}

const GalleryTile = React.memo(function GalleryTile({
    pageNum,
    isFocused,
    ariaColIndex,
    ariaPosInSet,
    ariaSetSize,
    imageSrc,
    onClick,
    onFocus,
    pageRatio,
    role,
    width,
}: TileProps): JSX.Element {
    const ratio = pageRatio && Number.isFinite(pageRatio) && pageRatio > 0 ? pageRatio : null;
    const tileStyle = ratio ? { aspectRatio: String(ratio), width } : { width };
    const contentStyle = ratio ? { height: '100%' } : undefined;
    const placeholderStyle = ratio ? { ...contentStyle, paddingTop: 0 } : undefined;

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            aria-colindex={ariaColIndex}
            aria-label={replacePlaceholders(__('page_gallery_tile'), [String(pageNum)])}
            aria-posinset={ariaPosInSet}
            aria-selected={isFocused}
            aria-setsize={ariaSetSize}
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

    loadedImagesRef.current = loadedImages;
    focusedPageRef.current = focusedPage;
    layoutWidthRef.current = layoutWidth;
    pageCountRef.current = pageCount;
    getPageRatioRef.current = getPageRatio;
    pageRatioRef.current = pageRatio;

    const { columns, tileWidth } = getGalleryLayout(layoutWidth, scale);
    const columnsRef = useRef(columns);
    const tileWidthRef = useRef(tileWidth);
    const prevColumnsForFocusRef = useRef(columns);

    if (prevColumnsForFocusRef.current !== columns) {
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

    const virtualizer = useVirtualizer({
        count: getRowCount(pageCount, columns),
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

        const neededWidth = tileWidthRef.current * Math.min(window.devicePixelRatio || 1, GALLERY_THUMB_MAX_DPR);
        return GALLERY_THUMB_WIDTH_TIERS.find(tier => tier >= neededWidth) || GALLERY_THUMB_MAX_TIER;
    }

    // Prioritize visible pages before spending work on the surrounding buffer.
    function getPagesNearViewport(marginRatio: number, isEligible?: (pageNum: number) => boolean): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

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
        return getPagesNearViewport(
            3,
            pageNum => !inFlightRef.current.has(pageNum) && !loadedImagesRef.current[pageNum],
        );
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
            anchorPageRef.current = getAnchorPageFromScroll(
                grid.scrollTop,
                pageCountRef.current,
                columnsRef.current,
                tileWidthRef.current,
                getRatioRef.current,
            );
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

    useLayoutEffect(() => {
        virtualizer.measure();
    }, [columns, getRatio, pageCount, tileWidth, virtualizer]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        const inner = innerRef.current;
        const previousScale = scaleRef.current;
        scaleRef.current = scale;

        const focal = focalRef.current;
        focalRef.current = null;

        if (inner) {
            inner.style.setProperty('--bp-gallery-hover-scale', String(1 + 0.02 / scale));
            const width = inner.clientWidth;
            if (width > 0 && width !== layoutWidthRef.current) {
                layoutWidthRef.current = width;
                setLayoutWidth(width);
            }
        }

        const prevLayout = prevLayoutRef.current;
        prevLayoutRef.current = { columns, tileWidth, scale };

        if (!grid || previousScale === scale) {
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
    }, [columns, getRatio, pageCount, scale, tileWidth]);

    useLayoutEffect(() => {
        const page = pendingFocusRef.current;
        if (page == null) {
            return;
        }
        const tile = gridRef.current && gridRef.current.querySelector<HTMLElement>(`[data-page="${page}"]`);
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

        pendingFocusRef.current = currentPage;
        virtualizer.scrollToIndex(getRowIndex(currentPage, columnsRef.current) - 1, { align: 'center' });

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
            const width = inner.clientWidth;
            // The initial fire on observe() can already report a size the mount-time layout
            // effect never saw (e.g. a container that gained its size right after mount), so
            // always adopt a positive width; only the scroll-anchor restore is skipped on that
            // first delivery, since there is no viewed area to preserve yet.
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
            virtualizer.scrollToIndex(getRowIndex(anchorPageRef.current, columnsRef.current) - 1, { align: 'start' });
            // A larger viewport (fullscreen enter, window resize) can reveal unloaded tiles
            // without any scroll event, so run the same catch-up the scroll handler does.
            handleScrollRef.current();
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, [virtualizer]);

    const focusTile = useCallback(
        (pageNum: number, options?: FocusOptions) => {
            const grid = gridRef.current;
            if (!grid) return;
            const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
            if (tile) {
                tile.focus(options);
                return;
            }
            pendingFocusRef.current = pageNum;
            virtualizer.scrollToIndex(getRowIndex(pageNum, columnsRef.current) - 1, {
                align: options && options.preventScroll ? 'auto' : 'center',
            });
        },
        [virtualizer],
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

    const tileRole = isAriaGridEnabled ? 'gridcell' : 'option';
    const virtualRows = virtualizer.getVirtualItems();
    const rows = virtualRows.map(virtualRow => {
        const rowIndex = virtualRow.index + 1;
        const pages = getPagesInRow(virtualRow.index, columns, pageCount);

        return (
            <div
                key={virtualRow.key}
                aria-label={isAriaGridEnabled ? String(rowIndex) : undefined}
                aria-rowindex={isAriaGridEnabled ? rowIndex : undefined}
                className="bp-gallery-grid-row"
                role={isAriaGridEnabled ? 'row' : 'presentation'}
                style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                }}
            >
                {pages.map(pageNum => (
                    <GalleryTile
                        key={pageNum}
                        ariaColIndex={isAriaGridEnabled ? getColumnIndex(pageNum, columns) : undefined}
                        ariaPosInSet={isAriaGridEnabled ? undefined : pageNum}
                        ariaSetSize={isAriaGridEnabled ? undefined : pageCount}
                        imageSrc={highResImages[pageNum] || loadedImages[pageNum]}
                        isFocused={pageNum === focusedPage}
                        onClick={handleTileClick}
                        onFocus={handleTileFocus}
                        pageNum={pageNum}
                        pageRatio={(getPageRatio && getPageRatio(pageNum)) || pageRatio}
                        role={tileRole}
                        width={tileWidth}
                    />
                ))}
            </div>
        );
    });

    return (
        <div
            ref={gridRef}
            aria-colcount={isAriaGridEnabled ? columns : undefined}
            aria-label={__('page_gallery')}
            aria-rowcount={isAriaGridEnabled ? getRowCount(pageCount, columns) : undefined}
            className="bp-gallery-grid"
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
                style={{ height: virtualizer.getTotalSize() }}
            >
                {rows}
            </div>
        </div>
    );
}
