import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
} from './constants';
import { getColumnIndex, getPageAbove, getPageBelow, getRowCount } from './galleryGridNavigation';
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
    imageSrc?: string;
    onClick: (pageNum: number) => void;
    onFocus: (pageNum: number) => void;
    pageRatio?: number | null;
    role: 'option' | 'gridcell';
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
}: TileProps): JSX.Element {
    const ratio = pageRatio && Number.isFinite(pageRatio) && pageRatio > 0 ? pageRatio : null;
    const tileStyle = ratio ? { aspectRatio: String(ratio) } : undefined;
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
    // Measured from the rendered layout; drives ARIA grid row/column numbers and 2D navigation.
    const [columnCount, setColumnCount] = useState(1);
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
    const columnCountRef = useRef(1);
    const restoreFocusRef = useRef(false);
    // Anchor tile and its viewport top, captured together when a re-chunk is scheduled so the
    // post-commit effect restores against the same tile even if the anchor page changes meanwhile.
    const rechunkAnchorRef = useRef<{ page: number; top: number } | null>(null);

    const byDistanceFromAnchor = (a: number, b: number): number =>
        Math.abs(a - anchorPageRef.current) - Math.abs(b - anchorPageRef.current);

    function getNeededThumbWidth(): number {
        if (scaleRef.current === 1) {
            return GALLERY_THUMB_MAX_WIDTH;
        }

        const tile = gridRef.current?.querySelector<HTMLElement>('[data-page]');
        const neededWidth = (tile?.offsetWidth || 0) * Math.min(window.devicePixelRatio || 1, GALLERY_THUMB_MAX_DPR);
        return GALLERY_THUMB_WIDTH_TIERS.find(tier => tier >= neededWidth) || GALLERY_THUMB_MAX_TIER;
    }

    // Prioritize visible pages before spending work on the surrounding buffer.
    function getPagesNearViewport(
        marginRatio: number,
        isEligible?: (tile: HTMLElement, pageNum: number) => boolean,
    ): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

        const { scrollTop, clientHeight } = grid;
        const viewportBottom = scrollTop + clientHeight;
        const margin = clientHeight * marginRatio;
        const visible: number[] = [];
        const nearby: number[] = [];

        grid.querySelectorAll<HTMLElement>('[data-page]').forEach(tile => {
            if (!tile.dataset.page) return;
            const pageNum = parseInt(tile.dataset.page, 10);
            if (isEligible && !isEligible(tile, pageNum)) return;
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
        const { pageRatio } = thumbnail;
        if (!store || !pageRatio) return;

        const width = getNeededThumbWidth();
        if (width === GALLERY_THUMB_MAX_WIDTH) {
            store.setRetained([], width, pageRatio);
        } else if (!isProcessingRef.current) {
            store.setRetained(getPagesNearViewport(0.5), width, pageRatio);
        }
    }

    function getUnloadedNearViewport(): number[] {
        return getPagesNearViewport(
            3,
            (tile, pageNum) => !inFlightRef.current.has(pageNum) && !tile.querySelector('img'),
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
            const tiles = grid.querySelectorAll<HTMLElement>('[data-page]');
            for (let i = 0; i < tiles.length; i += 1) {
                if (tiles[i].offsetTop + tiles[i].offsetHeight > grid.scrollTop) {
                    const { page } = tiles[i].dataset;
                    if (page) {
                        anchorPageRef.current = parseInt(page, 10);
                    }
                    break;
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
        const columns = Math.max(1, Math.floor((width + GALLERY_TILE_GAP) / columnPitch));
        const baseWidth = (width - (columns - 1) * GALLERY_TILE_GAP) / columns;
        inner.style.gridTemplateColumns = `repeat(auto-fill, ${Math.min(width, baseWidth * currentScale)}px)`;
        inner.style.justifyContent = 'center';
    }, []);

    // Counts tiles sharing the first row's offsetTop instead of duplicating the CSS
    // auto-fill math, so the stylesheet stays the only source of truth for the layout.
    // Runs after every layout mutation: mount, container resize, and zoom changes.
    const measureColumnCount = useCallback(() => {
        const grid = gridRef.current;
        const inner = innerRef.current;
        if (!isAriaGridEnabled || !grid || !inner) {
            return;
        }

        // Without a layout box (hidden host, zero-size container), offsetTop reads 0 for every
        // tile and the count would balloon to the page count; keep the last measured value.
        if (!inner.offsetWidth) {
            return;
        }

        const tiles = inner.querySelectorAll<HTMLElement>('[data-page]');
        if (tiles.length === 0) {
            return;
        }

        let count = 1;
        while (count < tiles.length && tiles[count].offsetTop === tiles[0].offsetTop) {
            count += 1;
        }

        if (count !== columnCountRef.current) {
            // Re-chunking tiles into different rows recreates the focused tile's DOM node,
            // which would silently drop focus to <body>; remember to restore it post-render.
            restoreFocusRef.current = grid.contains(document.activeElement);
            // Capture where the anchor tile sits now — after any zoom/resize scroll fixups that
            // already ran — so the post-commit effect can restore its position.
            const anchorPage = anchorPageRef.current;
            const anchorTile = grid.querySelector(`[data-page="${anchorPage}"]`);
            rechunkAnchorRef.current = anchorTile
                ? { page: anchorPage, top: anchorTile.getBoundingClientRect().top }
                : null;
            columnCountRef.current = count;
            setColumnCount(count);
        }
    }, [isAriaGridEnabled]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        const previousScale = scaleRef.current;
        scaleRef.current = scale;

        const focal = focalRef.current;
        focalRef.current = null;

        if (!grid || previousScale === scale) {
            applyZoomLayout();
            measureColumnCount();
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
        measureColumnCount();
    }, [applyZoomLayout, measureColumnCount, scale]);

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

        if (gridRef.current) {
            const tile = gridRef.current.querySelector(`[data-page="${currentPage}"]`) as HTMLElement;
            if (tile) {
                tile.scrollIntoView({ block: 'center' });
                tile.focus();
                // The mount-time measurement may have captured this tile's position before this
                // centering ran; refresh the capture so the re-chunk restore keeps the centering.
                const anchor = rechunkAnchorRef.current;
                if (anchor && anchor.page === currentPage) {
                    anchor.top = tile.getBoundingClientRect().top;
                }
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
            // Guarded start: the mount scrollIntoView can fire the scroll handler first, and a
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
        if (!grid) return undefined;

        let isFirstObservation = true;
        const observer = new ResizeObserver(() => {
            // The initial fire on observe() can already report a size the mount-time layout
            // effect never saw (e.g. a container that gained its size right after mount), so
            // always re-apply layout and re-measure; only the scroll-anchor restore is skipped
            // on that first delivery, since there is no viewed area to preserve yet.
            applyZoomLayout();
            if (isFirstObservation) {
                isFirstObservation = false;
                measureColumnCount();
                return;
            }
            const tile = grid.querySelector(`[data-page="${anchorPageRef.current}"]`) as HTMLElement | null;
            if (tile) {
                tile.scrollIntoView({ block: 'start' });
            }
            // Measure after the anchor restore so a scheduled re-chunk captures the restored position.
            measureColumnCount();
            // A larger viewport (fullscreen enter, window resize) can reveal unloaded tiles
            // without any scroll event, so run the same catch-up the scroll handler does.
            handleScrollRef.current();
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, [applyZoomLayout, measureColumnCount]);

    const focusTile = useCallback((pageNum: number, options?: FocusOptions) => {
        const grid = gridRef.current;
        if (!grid) return;
        const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
        if (tile) {
            tile.focus(options);
        }
    }, []);

    // Re-chunk recreates the tile DOM nodes, which drops focus and can shift the scroll
    // position; restore both after the new nodes commit.
    const committedColumnCountRef = useRef(columnCount);
    useLayoutEffect(() => {
        const isRechunk = committedColumnCountRef.current !== columnCount;
        committedColumnCountRef.current = columnCount;
        if (!isRechunk) {
            return;
        }

        const active = document.activeElement;
        if (restoreFocusRef.current || !active || active === document.body) {
            restoreFocusRef.current = false;
            focusTile(focusedPage, { preventScroll: true });
        }

        const anchor = rechunkAnchorRef.current;
        rechunkAnchorRef.current = null;

        // Swapping the row DOM out from under the scroller can shift scrollTop. Restore the
        // captured anchor tile to its captured viewport position by delta, preserving the mount
        // centering and the zoom focal-point / resize fixups that already ran.
        const grid = gridRef.current;
        if (grid && anchor) {
            const tile = grid.querySelector(`[data-page="${anchor.page}"]`) as HTMLElement | null;
            if (tile) {
                grid.scrollTop += tile.getBoundingClientRect().top - anchor.top;
            }
        }
    }, [columnCount, focusedPage, focusTile]);

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
                    const target = isAriaGridEnabled ? getPageAbove(focusedPage, columnCount) : focusedPage - 1;
                    if (target !== null && target >= 1) {
                        focusTile(target);
                    }
                    return;
                }
                case 'ArrowDown': {
                    event.preventDefault();
                    event.stopPropagation();
                    const target = isAriaGridEnabled
                        ? getPageBelow(focusedPage, columnCount, pageCount)
                        : focusedPage + 1;
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
        [columnCount, focusedPage, focusTile, isAriaGridEnabled, onClose, onPageNavigate, pageCount],
    );

    const tiles = [];
    for (let i = 1; i <= pageCount; i += 1) {
        tiles.push(
            <GalleryTile
                key={i}
                ariaColIndex={isAriaGridEnabled ? getColumnIndex(i, columnCount) : undefined}
                imageSrc={highResImages[i] || loadedImages[i]}
                isFocused={i === focusedPage}
                onClick={handleTileClick}
                onFocus={handleTileFocus}
                pageNum={i}
                pageRatio={(getPageRatio && getPageRatio(i)) || pageRatio}
                role={isAriaGridEnabled ? 'gridcell' : 'option'}
            />,
        );
    }

    // ARIA requires gridcells to live inside rows. The display: contents row wrappers add
    // that level to the accessibility tree without generating boxes, so the tiles remain
    // direct CSS-grid items and the visual layout is identical to the flat listbox.
    let content: React.ReactNode = tiles;
    if (isAriaGridEnabled) {
        const rows = [];
        for (let start = 0; start < tiles.length; start += columnCount) {
            const rowIndex = start / columnCount + 1;
            rows.push(
                // Named with the row number so AT announces that instead of every tile in the row.
                <div
                    key={start}
                    aria-label={String(rowIndex)}
                    aria-rowindex={rowIndex}
                    className="bp-gallery-grid-row"
                    role="row"
                >
                    {tiles.slice(start, start + columnCount)}
                </div>,
            );
        }
        content = rows;
    }

    return (
        <div
            ref={gridRef}
            aria-colcount={isAriaGridEnabled ? columnCount : undefined}
            aria-label={__('page_gallery')}
            aria-rowcount={isAriaGridEnabled ? getRowCount(pageCount, columnCount) : undefined}
            className="bp-gallery-grid"
            onFocus={handleGridFocus}
            onKeyDown={handleGridKeyDown}
            onScroll={handleScroll}
            role={isAriaGridEnabled ? 'grid' : 'listbox'}
            tabIndex={-1}
        >
            <div ref={innerRef} className="bp-gallery-grid-inner" role="presentation">
                {content}
            </div>
        </div>
    );
}
