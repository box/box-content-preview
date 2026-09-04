import { useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import HighResThumbnailStore from './HighResThumbnailStore';
import {
    CONCURRENT_LOADS,
    GALLERY_HIGH_RES_CONCURRENCY,
    GALLERY_HIGH_RES_MAX_BYTES,
    GALLERY_HIGH_RES_MAX_PAGES,
    GALLERY_THUMB_MAX_DPR,
    GALLERY_THUMB_MAX_TIER,
    GALLERY_THUMB_MAX_WIDTH,
    GALLERY_THUMB_WIDTH_TIERS,
    SCROLL_THROTTLE_MS,
} from './constants';
import { getPagesInRow } from './galleryGridLayout';
import { GalleryThumbnail } from './GalleryGridShared';

export interface ThumbnailLoaderRefs {
    gridRef: React.RefObject<HTMLDivElement>;
    virtualizerRef: React.MutableRefObject<{
        getVirtualItems: () => Array<{ index: number; start: number; size: number }>;
    }>;
    columnsRef: React.MutableRefObject<number>;
    tileWidthRef: React.MutableRefObject<number>;
    pageCountRef: React.MutableRefObject<number>;
    anchorPageRef: React.MutableRefObject<number>;
    scaleRef: React.MutableRefObject<number>;
}

export interface ThumbnailLoaderResult {
    loadedImages: Record<number, string>;
    highResImages: Record<number, string>;
    pageRatio: number | null;
    isQueueReadyRef: React.MutableRefObject<boolean>;
    handleScrollThrottled: ReturnType<typeof throttle>;
    startProcessing: () => void;
    syncHighRes: () => void;
}

export default function useGalleryThumbnailLoader(
    thumbnail: GalleryThumbnail,
    currentPage: number,
    pageCount: number,
    refs: ThumbnailLoaderRefs,
): ThumbnailLoaderResult {
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [highResImages, setHighResImages] = useState<Record<number, string>>({});
    const [pageRatio, setPageRatio] = useState<number | null>(null);

    const queueRef = useRef<number[]>([]);
    const isProcessingRef = useRef(false);
    const isMountedRef = useRef(true);
    const inFlightRef = useRef<Set<number>>(new Set());
    const isQueueReadyRef = useRef(false);
    const highResStoreRef = useRef<HighResThumbnailStore | null>(null);
    const loadedImagesRef = useRef(loadedImages);
    loadedImagesRef.current = loadedImages;

    const { gridRef, virtualizerRef, columnsRef, tileWidthRef, pageCountRef, anchorPageRef, scaleRef } = refs;

    const byDistanceFromAnchor = (a: number, b: number): number =>
        Math.abs(a - anchorPageRef.current) - Math.abs(b - anchorPageRef.current);

    function getNeededThumbWidth(): number {
        if (scaleRef.current === 1) {
            return GALLERY_THUMB_MAX_WIDTH;
        }
        const neededWidth = tileWidthRef.current * Math.min(window.devicePixelRatio || 1, GALLERY_THUMB_MAX_DPR);
        return GALLERY_THUMB_WIDTH_TIERS.find(tier => tier >= neededWidth) || GALLERY_THUMB_MAX_TIER;
    }

    function getPagesNearViewport(marginRatio: number, isEligible?: (pageNum: number) => boolean): number[] {
        const grid = gridRef.current;
        if (!grid) return [];

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
        return getPagesNearViewport(3, (pageNum: number) => {
            if (inFlightRef.current.has(pageNum)) {
                return false;
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
                    .createThumbnailImage(pageNum - 1, {
                        createImgTag: true,
                        thumbMaxWidth: GALLERY_THUMB_MAX_WIDTH,
                    })
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleScrollThrottled = useCallback(
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
        [],
    );

    useEffect(() => {
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
        isQueueReadyRef.current = true;

        thumbnail
            .init()
            .then(() => {
                if (!isMountedRef.current) return;
                if (typeof thumbnail.pageRatio === 'number' && thumbnail.pageRatio > 0) {
                    setPageRatio(thumbnail.pageRatio);
                }
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
            isQueueReadyRef.current = false;
            queueRef.current = [];
            isProcessingRef.current = false;
            highResStore.destroy();
            highResStoreRef.current = null;
            handleScrollThrottled.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        loadedImages,
        highResImages,
        pageRatio,
        isQueueReadyRef,
        handleScrollThrottled,
        startProcessing,
        syncHighRes,
    };
}
