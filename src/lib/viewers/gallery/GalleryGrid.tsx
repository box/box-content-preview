import React, { useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { decodeKeydown, replacePlaceholders } from '../../util';
import './GalleryGrid.scss';

const GALLERY_THUMB_MAX_WIDTH = 440;
const CONCURRENT_LOADS = 4;
const SCROLL_THROTTLE_MS = 200;

export interface GalleryThumbnail {
    init: () => Promise<unknown>;
    getImageFromCache: (itemIndex: number) => { image?: HTMLImageElement; inProgress: boolean } | null | undefined;
    createThumbnailImage: (
        itemIndex: number,
        options: { createImgTag: boolean; thumbMaxWidth: number },
    ) => Promise<HTMLImageElement | null>;
    /** First-page width:height ratio, populated by init(). Used to size placeholders to the real page shape. */
    pageRatio?: number;
}

export type Props = {
    pageCount: number;
    currentPage: number;
    /** Per-page width:height ratio (null while unknown). Falls back to the first-page ratio. */
    getPageRatio?: (pageNum: number) => number | null;
    onFocusChange?: (pageNum: number) => void;
    onPageNavigate: (n: number) => void;
    onClose: () => void;
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
    // Match the placeholder to the real page shape so tiles don't resize (reflow/jitter) as images arrive
    const placeholderStyle = pageRatio ? { paddingTop: `${100 / pageRatio}%` } : undefined;

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            aria-label={replacePlaceholders(__('page_gallery_tile'), [String(pageNum)])}
            aria-selected={isFocused}
            className={`bp-gallery-tile${isFocused ? ' bp-gallery-tile--selected' : ''}`}
            data-page={pageNum}
            onClick={() => onClick(pageNum)}
            onFocus={() => onFocus(pageNum)}
            role="option"
            tabIndex={isFocused ? 0 : -1}
        >
            <span className="bp-gallery-tile-badge">{pageNum}</span>
            {imageSrc ? (
                <img alt="" src={imageSrc} />
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
    onClose,
    onFocusChange,
    onPageNavigate,
    thumbnail,
}: Props): JSX.Element {
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [focusedPage, setFocusedPage] = useState(currentPage);
    const [pageRatio, setPageRatio] = useState<number | null>(null);
    // Topmost visible page — the scroll anchor used to restore the viewed area after a reflow.
    const anchorPageRef = useRef(currentPage);
    const gridRef = useRef<HTMLDivElement>(null);
    const queueRef = useRef<number[]>([]);
    const isProcessingRef = useRef(false);
    const isMountedRef = useRef(true);
    const inFlightRef = useRef<Set<number>>(new Set());

    const byDistanceFromAnchor = (a: number, b: number): number =>
        Math.abs(a - anchorPageRef.current) - Math.abs(b - anchorPageRef.current);

    // Unloaded tiles within viewport + buffer, on-screen tiles first so the user never
    // watches a visible hole while off-screen pages load. Pages already being rendered
    // (in flight) are excluded so re-derives can't waste loader slots on them.
    function getUnloadedNearViewport(): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

        const { scrollTop, clientHeight } = grid;
        const bufferZone = clientHeight * 3;
        const viewportBottom = scrollTop + clientHeight;

        const visibleUnloaded: number[] = [];
        const bufferedUnloaded: number[] = [];
        const tiles = grid.querySelectorAll('[data-page]');

        tiles.forEach(tile => {
            const el = tile as HTMLElement;
            if (!el.dataset.page) return;
            const pageNum = parseInt(el.dataset.page, 10);
            if (inFlightRef.current.has(pageNum) || el.querySelector('img')) return;
            const tileTop = el.offsetTop;
            const tileBottom = tileTop + el.offsetHeight;

            if (tileBottom > scrollTop && tileTop < viewportBottom) {
                visibleUnloaded.push(pageNum);
            } else if (tileBottom > scrollTop - bufferZone && tileTop < viewportBottom + bufferZone) {
                bufferedUnloaded.push(pageNum);
            }
        });

        return [...visibleUnloaded.sort(byDistanceFromAnchor), ...bufferedUnloaded.sort(byDistanceFromAnchor)];
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

    useEffect(() => {
        const throttledScroll = handleScrollRef.current;

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
        });

        return () => {
            isMountedRef.current = false;
            queueRef.current = [];
            isProcessingRef.current = false;
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
    }, []);

    const focusTile = useCallback((pageNum: number) => {
        const grid = gridRef.current;
        if (!grid) return;
        const tile = grid.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
        if (tile) {
            tile.focus();
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
                focusTile(focusedPage);
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
                imageSrc={loadedImages[i]}
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
            {tiles}
        </div>
    );
}
