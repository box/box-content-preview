import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/doc/${DOC_STATIC_ASSETS_VERSION}/`;
export const JS = [
    `${STATIC_URI}compatibility.min.js`,
    `${STATIC_URI}pdf.min.js`,
    `${STATIC_URI}pdf_viewer.min.js`,
    `${STATIC_URI}pdf.worker.min.js`,
    `${STATIC_URI}exif.min.js`
];
export const CSS = [`${STATIC_URI}pdf_viewer.min.css`];
