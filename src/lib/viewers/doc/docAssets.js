const STATIC_URI = `static/pdfjs-dist`;

export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.mjs`;

export const JS = [`${STATIC_URI}/pdf.min.mjs`, `${STATIC_URI}/pdf_viewer.mjs`, `${STATIC_URI}/exif.min.js`];
export const JS_NO_EXIF = [`${STATIC_URI}/pdf.min.mjs`, `${STATIC_URI}/pdf_viewer.mjs`];
export const EXIF_READER = [`${STATIC_URI}/exif-reader.min.js`];
export const CSS = [`${STATIC_URI}/pdf_viewer.css`];
export const PRELOAD_JS = [WORKER];
