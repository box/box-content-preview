import { GALLERY_TILE_DEFAULT_RATIO, GALLERY_TILE_GAP, GALLERY_TILE_MIN_WIDTH } from './constants';

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

/**
 * Fitted auto-fill columns can exceed the number of pages (a 2-page doc on a
 * wide viewport). ARIA and 2D navigation should only count occupied columns.
 */
export function getOccupiedColumns(fittedColumns: number, pageCount: number): number {
    return Math.min(fittedColumns, Math.max(pageCount, 1));
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

/** Width of a full row of tiles, used to left-align a short last row inside a centered track. */
export function getRowTrackWidth(columns: number, tileWidth: number, gap: number = GALLERY_TILE_GAP): number {
    if (columns <= 0) {
        return 0;
    }
    return columns * tileWidth + (columns - 1) * gap;
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
