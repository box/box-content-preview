import { GALLERY_TILE_DEFAULT_RATIO, GALLERY_TILE_GAP, GALLERY_TILE_MIN_WIDTH } from '../constants';
import {
    collectPagesNearViewport,
    getAnchorPageFromScroll,
    getGalleryLayout,
    getPagesInRow,
    getRowHeight,
    getRowStartOffset,
    resolvePageRatio,
} from '../galleryGridLayout';

describe('galleryGridLayout', () => {
    describe('getGalleryLayout', () => {
        test('should use a single min-width column when the container has no width', () => {
            expect(getGalleryLayout(0)).toEqual({ columns: 1, tileWidth: GALLERY_TILE_MIN_WIDTH });
            expect(getGalleryLayout(-10, 2)).toEqual({ columns: 1, tileWidth: GALLERY_TILE_MIN_WIDTH });
        });

        test('should stretch tiles like auto-fill minmax(220px, 1fr) at scale 1', () => {
            expect(getGalleryLayout(920)).toEqual({ columns: 3, tileWidth: 296 });
            expect(getGalleryLayout(692)).toEqual({ columns: 3, tileWidth: GALLERY_TILE_MIN_WIDTH });
            expect(getGalleryLayout(456)).toEqual({ columns: 2, tileWidth: GALLERY_TILE_MIN_WIDTH });
            expect(getGalleryLayout(200)).toEqual({ columns: 1, tileWidth: 200 });
        });

        test('should scale tile width and reduce columns when zoomed in', () => {
            expect(getGalleryLayout(920, 1.5)).toEqual({ columns: 2, tileWidth: 444 });
            expect(getGalleryLayout(200, 2)).toEqual({ columns: 1, tileWidth: 200 });
        });
    });

    describe('resolvePageRatio', () => {
        test('should prefer the per-page ratio, then the first-page ratio, then the placeholder ratio', () => {
            expect(resolvePageRatio(2, page => (page === 2 ? 16 / 9 : null), 3 / 4)).toBe(16 / 9);
            expect(resolvePageRatio(5, page => (page === 2 ? 16 / 9 : null), 3 / 4)).toBe(3 / 4);
            expect(resolvePageRatio(1, undefined, null)).toBe(GALLERY_TILE_DEFAULT_RATIO);
        });
    });

    describe('row geometry', () => {
        const getRatio = (): number => 1;

        test('should list the pages that belong to a row', () => {
            expect(getPagesInRow(0, 3, 10)).toEqual([1, 2, 3]);
            expect(getPagesInRow(3, 3, 10)).toEqual([10]);
        });

        test('should size a row from the tallest tile in it', () => {
            const mixed = (page: number): number => (page === 2 ? 2 : 1);
            expect(getRowHeight(0, 10, 3, 300, mixed)).toBe(300);
        });

        test('should accumulate row offsets including the inter-row gap', () => {
            expect(getRowStartOffset(0, 10, 3, 300, getRatio)).toBe(0);
            expect(getRowStartOffset(1, 10, 3, 300, getRatio)).toBe(300 + GALLERY_TILE_GAP);
        });
    });

    describe('scroll mapping', () => {
        const getRatio = (): number => 1;

        test('should return the first page of the topmost intersecting row', () => {
            expect(getAnchorPageFromScroll(0, 10, 3, 100, getRatio)).toBe(1);
            expect(getAnchorPageFromScroll(100 + GALLERY_TILE_GAP + 1, 10, 3, 100, getRatio)).toBe(4);
        });

        test('should classify visible pages before the buffer', () => {
            const { visible, nearby } = collectPagesNearViewport({
                scrollTop: 0,
                clientHeight: 100,
                marginRatio: 1,
                pageCount: 10,
                columns: 1,
                tileWidth: 100,
                getRatio,
            });

            expect(visible).toEqual([1]);
            expect(nearby[0]).toBe(2);
            expect(nearby).not.toContain(1);
        });
    });
});
