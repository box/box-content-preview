import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}`;
const versionParts = DOC_STATIC_ASSETS_VERSION.split('.').map(part => parseInt(part, 10));
const JS_EXTENSTION =
    versionParts[0] > 2 || (versionParts[0] === 2 && versionParts[1] >= 105 && versionParts[2] >= 0) ? 'mjs' : 'js';

export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.${JS_EXTENSTION}`;

export const JS = [
    `${STATIC_URI}/pdf.min.${JS_EXTENSTION}`,
    `${STATIC_URI}/pdf_viewer.min.${JS_EXTENSTION}`,
    `${STATIC_URI}/exif.min.js`,
];
export const CSS = [`${STATIC_URI}/pdf_viewer.min.css`];
export const PRELOAD_JS = [WORKER];
