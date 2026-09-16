/**
 * Pure math for the gallery ARIA grid: pages are laid out row-major, so page p
 * (1-based) occupies row floor((p - 1) / columns) + 1 and column ((p - 1) % columns) + 1.
 * All indices returned here are 1-based, matching aria-rowindex / aria-colindex.
 */

export function getRowCount(pageCount: number, columnCount: number): number {
    return Math.ceil(pageCount / columnCount);
}

export function getRowIndex(pageNum: number, columnCount: number): number {
    return Math.floor((pageNum - 1) / columnCount) + 1;
}

export function getColumnIndex(pageNum: number, columnCount: number): number {
    return ((pageNum - 1) % columnCount) + 1;
}

/** Page one row up in the same column, or null when already in the first row. */
export function getPageAbove(pageNum: number, columnCount: number): number | null {
    const target = pageNum - columnCount;
    return target >= 1 ? target : null;
}

/**
 * Page one row down in the same column, clamped to the last page when the final row is
 * incomplete (so Down from a cell with no cell directly below lands on the last tile).
 * Null when already in the last row.
 */
export function getPageBelow(pageNum: number, columnCount: number, pageCount: number): number | null {
    if (getRowIndex(pageNum, columnCount) >= getRowCount(pageCount, columnCount)) {
        return null;
    }
    return Math.min(pageNum + columnCount, pageCount);
}
