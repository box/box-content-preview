export const GALLERY_THUMB_MAX_WIDTH = 440;
export const CONCURRENT_LOADS = 4;
export const SCROLL_THROTTLE_MS = 200;

// Keep in sync with GalleryGrid.scss row gap / min tile width / padding-top.
export const GALLERY_TILE_GAP = 16;
export const GALLERY_TILE_MIN_WIDTH = 220;
export const GALLERY_GRID_PADDING_TOP = 40;
// Default tile width/height. GalleryGrid.scss padding-top must stay 1/ratio (129%).
export const GALLERY_TILE_DEFAULT_RATIO = 100 / 129;
export const GALLERY_VIRTUAL_OVERSCAN = 3;

export const GALLERY_THUMB_WIDTH_TIERS = [
    GALLERY_THUMB_MAX_WIDTH,
    GALLERY_THUMB_MAX_WIDTH * 2,
    GALLERY_THUMB_MAX_WIDTH * 3,
];
export const GALLERY_THUMB_MAX_TIER = GALLERY_THUMB_WIDTH_TIERS[GALLERY_THUMB_WIDTH_TIERS.length - 1];
export const GALLERY_THUMB_MAX_DPR = 2;
export const GALLERY_HIGH_RES_MAX_BYTES = 64 * 1024 * 1024;
export const GALLERY_HIGH_RES_MAX_PAGES = 16;
export const GALLERY_HIGH_RES_CONCURRENCY = 2;

// Gallery availability and zoom limits.
// Hide the gallery toggle for files above this page count.
export const GALLERY_MAX_PAGES = 200;
export const GALLERY_MAX_SCALE = 3;
export const GALLERY_MIN_SCALE = 0.5;
export const GALLERY_SCALE_STEP = 0.1;

// Keep in sync with the thumbnails sidebar CSS transition.
export const THUMBNAILS_SIDEBAR_TRANSITION_TIME = 301;
