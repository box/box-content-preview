import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import noop from 'lodash/noop';
import throttle from 'lodash/throttle';
import { decodeKeydown, replacePlaceholders } from '../../util';
import HighResThumbnailStore, { HighResRenderTask } from './HighResThumbnailStore';
import useGalleryPinch, { PinchDirection, PinchFocal } from './useGalleryPinch';
import './GalleryGrid.scss';

const GALLERY_THUMB_MAX_WIDTH = 440;
const CONCURRENT_LOADS = 4;
const SCROLL_THROTTLE_MS = 200;
// Keep in sync with the 100% grid rule in GalleryGrid.scss
const GALLERY_TILE_GAP = 16;
const GALLERY_TILE_MIN_WIDTH = 220;
const GALLERY_THUMB_WIDTH_TIERS = [GALLERY_THUMB_MAX_WIDTH, GALLERY_THUMB_MAX_WIDTH * 2, GALLERY_THUMB_MAX_WIDTH * 3];
const GALLERY_THUMB_MAX_TIER = GALLERY_THUMB_WIDTH_TIERS[GALLERY_THUMB_WIDTH_TIERS.length - 1];
const GALLERY_THUMB_MAX_DPR = 2;
const GALLERY_HIGH_RES_MAX_BYTES = 64 * 1024 * 1024;
const GALLERY_HIGH_RES_MAX_PAGES = 16;
const GALLERY_HIGH_RES_CONCURRENCY = 2;
const GALLERY_DEFAULT_PAGE_RATIO = 0.775;

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
    imageSrc?: string;
    onClick: (pageNum: number) => void;
    onFocus: (pageNum: number) => void;
    pageRatio?: number | null;
}

const GalleryTile = React.memo(function GalleryTile({
    pageNum,
    isFocused,
    imageSrc,
    onClick,
    onFocus,
    pageRatio,
}: TileProps): JSX.Element {
    const ratio = pageRatio && Number.isFinite(pageRatio) && pageRatio > 0 ? pageRatio : null;
    const tileStyle = ratio ? { aspectRatio: String(ratio) } : undefined;
    const contentStyle = ratio ? { height: '100%' } : undefined;
    const placeholderStyle = ratio ? { ...contentStyle, paddingTop: 0 } : undefined;

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            aria-label={replacePlaceholders(__('page_gallery_tile'), [String(pageNum)])}
            aria-selected={isFocused}
            className={`bp-gallery-tile${isFocused ? ' bp-gallery-tile--selected' : ''}`}
            data-page={pageNum}
            data-resin-target="galleryTile"
            onClick={() => onClick(pageNum)}
            onFocus={() => onFocus(pageNum)}
            role="option"
            style={tileStyle}
            tabIndex={isFocused ? 0 : -1}
        >
            <span className="bp-gallery-tile-badge">{pageNum}</span>
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
        if (!store) return;

        const width = getNeededThumbWidth();
        const ratio = thumbnail.pageRatio || GALLERY_DEFAULT_PAGE_RATIO;
        if (width === GALLERY_THUMB_MAX_WIDTH) {
            store.setRetained([], width, ratio);
        } else if (!isProcessingRef.current) {
            store.setRetained(getPagesNearViewport(0.5), width, ratio);
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

    useLayoutEffect(() => {
        const grid = gridRef.current;
        const previousScale = scaleRef.current;
        scaleRef.current = scale;

        const focal = focalRef.current;
        focalRef.current = null;

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
    }, [applyZoomLayout, scale]);

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
            if (isFirstObservation) {
                isFirstObservation = false; // ResizeObserver always fires once on observe()
                return;
            }
            applyZoomLayout();
            const tile = grid.querySelector(`[data-page="${anchorPageRef.current}"]`) as HTMLElement | null;
            if (tile) {
                tile.scrollIntoView({ block: 'start' });
            }
            // A larger viewport (fullscreen enter, window resize) can reveal unloaded tiles
            // without any scroll event, so run the same catch-up the scroll handler does.
            handleScrollRef.current();
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, [applyZoomLayout]);

    const focusTile = useCallback((pageNum: number, options?: FocusOptions) => {
        const grid = gridRef.current;
        if (!grid) return;
        const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
        if (tile) {
            tile.focus(options);
        }
    }, []);

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
                // Listbox is 1-D — arrows move ±1; row-aware nav comes with v2 grid role.
                case 'ArrowUp':
                case 'ArrowLeft':
                    event.preventDefault();
                    event.stopPropagation();
                    if (focusedPage > 1) {
                        focusTile(focusedPage - 1);
                    }
                    return;
                case 'ArrowDown':
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
        [focusedPage, focusTile, onClose, onPageNavigate, pageCount],
    );

    const tiles = [];
    for (let i = 1; i <= pageCount; i += 1) {
        tiles.push(
            <GalleryTile
                key={i}
                imageSrc={highResImages[i] || loadedImages[i]}
                isFocused={i === focusedPage}
                onClick={handleTileClick}
                onFocus={handleTileFocus}
                pageNum={i}
                pageRatio={(getPageRatio && getPageRatio(i)) || pageRatio}
            />,
        );
    }

    return (
        <div
            ref={gridRef}
            aria-label={__('page_gallery')}
            className="bp-gallery-grid"
            onFocus={handleGridFocus}
            onKeyDown={handleGridKeyDown}
            onScroll={handleScroll}
            role="listbox"
            tabIndex={-1}
        >
            <div ref={innerRef} className="bp-gallery-grid-inner" role="presentation">
                {tiles}
            </div>
        </div>
    );
}
