import React, { useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import './GalleryGrid.scss';

const GALLERY_THUMB_MAX_WIDTH = 440;
const INITIAL_LOAD_BUFFER = 40;
const CONCURRENT_LOADS = 4;
const SCROLL_THROTTLE_MS = 200;

interface GalleryThumbnail {
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

    const handleTileFocus = useCallback(
        (pageNum: number) => {
            setFocusedPage(pageNum);
            if (onFocusChange) {
                onFocusChange(pageNum);
            }
        },
        [onFocusChange],
    );

    const handleGridFocus = useCallback(
        (event: React.FocusEvent) => {
            if (event.target === gridRef.current && gridRef.current) {
                const tile = gridRef.current.querySelector(`[data-page="${focusedPage}"]`) as HTMLElement;
                if (tile) {
                    tile.focus();
                }
            }
        },
        [focusedPage],
    );

    const handleGridKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                return;
            }

            if (event.key === 'Tab' && gridRef.current) {
                const buttons = gridRef.current.querySelectorAll('button');
                const first = buttons[0];
                const last = buttons[buttons.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        },
        [onClose],
    );

    const tiles = [];
    for (let i = 1; i <= pageCount; i += 1) {
        const isFocused = i === focusedPage;
        tiles.push(
            <button
                key={i}
                aria-label={`Page ${i}${isFocused ? ', current page' : ''}`}
                className={`bp-gallery-tile${isFocused ? ' bp-gallery-tile--selected' : ''}`}
                data-page={i}
                onClick={() => onPageNavigate(i)}
                onFocus={() => handleTileFocus(i)}
                type="button"
            >
                <span className="bp-gallery-tile-badge">{i}</span>
                {loadedImages[i] ? (
                    <img alt={`Page ${i}`} src={loadedImages[i]} />
                ) : (
                    <span className="bp-gallery-tile-placeholder" />
                )}
            </button>,
        );
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
            ref={gridRef}
            className="bp-gallery-grid"
            onFocus={handleGridFocus}
            onKeyDown={handleGridKeyDown}
            onScroll={handleScrollRef.current}
            tabIndex={-1}
        >
            {tiles}
        </div>
    );
}
