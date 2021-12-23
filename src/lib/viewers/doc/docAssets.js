import Browser from '../../Browser';
import { DOC_LEGACY_STATIC_ASSETS_VERSION, DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_VERSION = Browser.isIE() ? DOC_LEGACY_STATIC_ASSETS_VERSION : DOC_STATIC_ASSETS_VERSION;
const STATIC_URI = `third-party/doc/${STATIC_VERSION}`;

export const CMAP = `${STATIC_URI}/cmaps/`;
export const IMAGES = `${STATIC_URI}/images/`;
export const WORKER = `${STATIC_URI}/pdf.worker.min.js`;

export const JS = [`${STATIC_URI}/pdf.min.js`, `${STATIC_URI}/pdf_viewer.min.js`, `${STATIC_URI}/exif.min.js`];
export const CSS = [`${STATIC_URI}/pdf_viewer.min.css`];
export const PRELOAD_JS = [WORKER];
