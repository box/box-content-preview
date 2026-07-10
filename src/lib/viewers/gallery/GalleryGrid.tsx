import React, { useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { decodeKeydown, replacePlaceholders } from '../../util';
import './GalleryGrid.scss';

const GALLERY_THUMB_MAX_WIDTH = 440;
const INITIAL_LOAD_BUFFER = 40;
const CONCURRENT_LOADS = 4;
const SCROLL_THROTTLE_MS = 200;

export interface GalleryThumbnail {
    init: () => Promise<unknown>;
    getImageFromCache: (itemIndex: number) => { image?: HTMLImageElement; inProgress: boolean } | null | undefined;
    createThumbnailImage: (
        itemIndex: number,
        options: { createImgTag: boolean; thumbMaxWidth: number },
    ) => Promise<HTMLImageElement | null>;
}

export type Props = {
    pageCount: number;
    currentPage: number;
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
}

const GalleryTile = React.memo(function GalleryTile({
    pageNum,
    isFocused,
    imageSrc,
    onClick,
    onFocus,
}: TileProps): JSX.Element {
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
            {imageSrc ? <img alt="" src={imageSrc} /> : <span className="bp-gallery-tile-placeholder" />}
        </div>
    );
});

export default function GalleryGrid({
    pageCount,
    currentPage,
    onClose,
    onFocusChange,
    onPageNavigate,
    thumbnail,
}: Props): JSX.Element {
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [focusedPage, setFocusedPage] = useState(currentPage);
    // Topmost visible page — the scroll anchor used to restore the viewed area after a reflow.
    const anchorPageRef = useRef(currentPage);
    const gridRef = useRef<HTMLDivElement>(null);
    const queueRef = useRef<number[]>([]);
    const isProcessingRef = useRef(false);
    const isMountedRef = useRef(true);
    const initialLoadDoneRef = useRef(false);
    const initialLoadCountRef = useRef(0);

    function processQueue() {
        if (!isMountedRef.current || !thumbnail || queueRef.current.length === 0) {
            isProcessingRef.current = false;
            return;
        }

        const batchSize = initialLoadDoneRef.current ? CONCURRENT_LOADS : 1;
        const batch = queueRef.current.slice(0, batchSize);
        queueRef.current = queueRef.current.slice(batchSize);

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

                if (!initialLoadDoneRef.current) {
                    initialLoadCountRef.current += batch.length;
                    if (initialLoadCountRef.current >= INITIAL_LOAD_BUFFER) {
                        initialLoadDoneRef.current = true;
                        isProcessingRef.current = false;
                        return;
                    }
                }
                processQueue();
            };

            batch.forEach(pageNum => {
                thumbnail
                    .createThumbnailImage(pageNum - 1, { createImgTag: true, thumbMaxWidth: GALLERY_THUMB_MAX_WIDTH })
                    .then((imageEl: HTMLImageElement | null) => {
                        if (isMountedRef.current && imageEl && imageEl.src) {
                            setLoadedImages(prev => ({ ...prev, [pageNum]: imageEl.src }));
                        }
                        onComplete();
                    })
                    .catch(() => {
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

    function getUnloadedNearViewport(): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

        const { scrollTop, clientHeight } = grid;
        const bufferZone = clientHeight * 3;
        const viewportTop = scrollTop - bufferZone;
        const viewportBottom = scrollTop + clientHeight + bufferZone;

        const nearbyUnloaded: number[] = [];
        const tiles = grid.querySelectorAll('[data-page]');

        tiles.forEach(tile => {
            const el = tile as HTMLElement;
            if (!el.dataset.page) return;
            const pageNum = parseInt(el.dataset.page, 10);
            const tileTop = el.offsetTop;
            const tileBottom = tileTop + el.offsetHeight;

            if (tileBottom > viewportTop && tileTop < viewportBottom && !el.querySelector('img')) {
                nearbyUnloaded.push(pageNum);
            }
        });

        return nearbyUnloaded;
    }

    const handleScrollRef = useRef(
        throttle(() => {
            const nearbyUnloaded = getUnloadedNearViewport();
            if (nearbyUnloaded.length > 0) {
                const currentQueue = queueRef.current;
                const toAdd = nearbyUnloaded.filter(p => !currentQueue.includes(p));
                queueRef.current = [...toAdd, ...currentQueue];
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
                initialLoadCountRef.current += 1;
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
            isProcessingRef.current = true;
            processQueue();
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
