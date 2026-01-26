import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}`;
const EXIF_VERSION = '2.107.0';
const EXIF_STATIC_URI = `third-party/doc/${EXIF_VERSION}`;

export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.js`;

export const JS = [`${STATIC_URI}/pdf.min.js`, `${STATIC_URI}/pdf_viewer.min.js`, `${EXIF_STATIC_URI}/exif.min.js`];
export const JS_NO_EXIF = [`${STATIC_URI}/pdf.min.js`, `${STATIC_URI}/pdf_viewer.min.js`];
export const EXIF_READER = [`${EXIF_STATIC_URI}/exif-reader.min.js`];
export const CSS = [`${STATIC_URI}/pdf_viewer.min.css`];
export const PRELOAD_JS = [WORKER];
