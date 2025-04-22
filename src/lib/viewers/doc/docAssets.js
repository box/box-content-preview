import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}`;
export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.mjs`;

export const JS = [`${STATIC_URI}/pdf.min.mjs`, `${STATIC_URI}/pdf_viewer.min.mjs`, `${STATIC_URI}/exif.min.js`];
export const JS_NO_EXIF = [`${STATIC_URI}/pdf.min.mjs`, `${STATIC_URI}/pdf_viewer.min.mjs`];
export const EXIF_READER = [`${STATIC_URI}/exif-reader.min.js`];
export const CSS = [`${STATIC_URI}/pdf_viewer.min.css`];
export const PRELOAD_JS = [WORKER];
