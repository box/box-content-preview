import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}/`;
export const JS = [
    `${STATIC_URI}pdf.js`,
    `${STATIC_URI}pdf_viewer.js`,
    `${STATIC_URI}pdf.worker.js`,
    `${STATIC_URI}exif.min.js`
];
export const CSS = [`${STATIC_URI}pdf_viewer.css`];
