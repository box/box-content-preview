import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}`;
export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.js`;

export const JS = [`${STATIC_URI}/pdf.min.js`, `${STATIC_URI}/pdf_viewer.min.js`, `${STATIC_URI}/exif.min.js`];
export const JS_NO_EXIF = [`${STATIC_URI}/pdf.min.js`, `${STATIC_URI}/pdf_viewer.min.js`];
// TODO: Add exif-reader.min.js to local third-party assets. Using CDN as temporary workaround.
export const EXIF_READER = ['https://cdn01.boxcdn.net/platform/preview/third-party/doc/2.107.0/exif-reader.min.js'];
export const CSS = [`${STATIC_URI}/pdf_viewer.min.css`];
export const PRELOAD_JS = [WORKER];
