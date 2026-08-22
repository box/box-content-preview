import { GALLERY_TILE_DEFAULT_RATIO, GALLERY_TILE_GAP, GALLERY_TILE_MIN_WIDTH } from './constants';
import { getRowCount } from './galleryGridNavigation';

export interface GalleryLayout {
    columns: number;
    tileWidth: number;
}

/**
 * Column count and tile width for a gallery of `width` CSS pixels at `scale`.
 * Matches CSS auto-fill minmax(220px, 1fr) at scale 1, and the listbox path's
 * applyZoomLayout + auto-fill behavior when zoomed.
 */
export function getGalleryLayout(width: number, scale = 1): GalleryLayout {
    if (width <= 0) {
        return { columns: 1, tileWidth: GALLERY_TILE_MIN_WIDTH };
    }

    const columnPitch = GALLERY_TILE_MIN_WIDTH + GALLERY_TILE_GAP;
    const baseColumns = Math.max(1, Math.floor((width + GALLERY_TILE_GAP) / columnPitch));
    const baseWidth = (width - (baseColumns - 1) * GALLERY_TILE_GAP) / baseColumns;
    const tileWidth = Math.min(width, baseWidth * scale);
    // At scale 1 this equals baseColumns algebraically; flooring the round-trip of
    // tileWidth can drop a column to floating-point error (e.g. 1522px → 5 instead of 6).
    if (scale === 1) {
        return { columns: baseColumns, tileWidth };
    }
    const columns = Math.max(1, Math.floor((width + GALLERY_TILE_GAP) / (tileWidth + GALLERY_TILE_GAP) + 1e-9));

    return { columns, tileWidth };
}

export function resolvePageRatio(
    pageNum: number,
    getPageRatio: ((pageNum: number) => number | null) | undefined,
    pageRatio: number | null,
): number {
    const ratio = getPageRatio?.(pageNum) || pageRatio;
    if (ratio && Number.isFinite(ratio) && ratio > 0) {
        return ratio;
    }
    return GALLERY_TILE_DEFAULT_RATIO;
}

/** `rowIndex` is 0-based (TanStack). `getRowIndex()` in galleryGridNavigation is 1-based. */
export function getPagesInRow(rowIndex: number, columns: number, pageCount: number): number[] {
    const start = rowIndex * columns + 1;
    const end = Math.min(start + columns - 1, pageCount);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }
    return pages;
}

export function getRowHeight(
    rowIndex: number,
    pageCount: number,
    columns: number,
    tileWidth: number,
    getRatio: (pageNum: number) => number,
): number {
    const pages = getPagesInRow(rowIndex, columns, pageCount);
    return pages.reduce((height, pageNum) => Math.max(height, tileWidth / getRatio(pageNum)), 0);
}

export function getRowStartOffset(
    rowIndex: number,
    pageCount: number,
    columns: number,
    tileWidth: number,
    getRatio: (pageNum: number) => number,
    gap: number = GALLERY_TILE_GAP,
): number {
    let offset = 0;
    for (let row = 0; row < rowIndex; row += 1) {
        offset += getRowHeight(row, pageCount, columns, tileWidth, getRatio) + gap;
    }
    return offset;
}

export function getAnchorPageFromScroll(
    scrollTop: number,
    pageCount: number,
    columns: number,
    tileWidth: number,
    getRatio: (pageNum: number) => number,
    gap: number = GALLERY_TILE_GAP,
): number {
    if (pageCount <= 0) {
        return 1;
    }

    const rowCount = getRowCount(pageCount, columns);
    let top = 0;
    for (let row = 0; row < rowCount; row += 1) {
        const size = getRowHeight(row, pageCount, columns, tileWidth, getRatio);
        if (top + size > scrollTop) {
            return row * columns + 1;
        }
        top += size + gap;
    }

    return (rowCount - 1) * columns + 1;
}

export function collectPagesNearViewport({
    scrollTop,
    clientHeight,
    marginRatio,
    pageCount,
    columns,
    tileWidth,
    getRatio,
    isEligible,
    gap = GALLERY_TILE_GAP,
}: {
    scrollTop: number;
    clientHeight: number;
    marginRatio: number;
    pageCount: number;
    columns: number;
    tileWidth: number;
    getRatio: (pageNum: number) => number;
    isEligible?: (pageNum: number) => boolean;
    gap?: number;
}): { visible: number[]; nearby: number[] } {
    const visible: number[] = [];
    const nearby: number[] = [];
    if (clientHeight <= 0 || columns <= 0 || pageCount <= 0) {
        return { visible, nearby };
    }

    const viewportBottom = scrollTop + clientHeight;
    const margin = clientHeight * marginRatio;
    const rowCount = getRowCount(pageCount, columns);
    let top = 0;

    for (let row = 0; row < rowCount; row += 1) {
        const size = getRowHeight(row, pageCount, columns, tileWidth, getRatio);
        const bottom = top + size;
        let bucket: number[] | null = null;
        if (bottom > scrollTop && top < viewportBottom) {
            bucket = visible;
        } else if (bottom > scrollTop - margin && top < viewportBottom + margin) {
            bucket = nearby;
        }

        if (bucket) {
            const pages = getPagesInRow(row, columns, pageCount);
            pages.forEach(pageNum => {
                if (!isEligible || isEligible(pageNum)) {
                    bucket.push(pageNum);
                }
            });
        }

        top = bottom + gap;
    }

    return { visible, nearby };
}
