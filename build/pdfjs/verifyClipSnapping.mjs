/* eslint-disable no-console */
// Renders a page of 30 image strips, each under its own rectangular clip at fractional
// coordinates, with stock and patched pdf.js. Fails if the patched build shows any seam.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { createCanvas } = require('@napi-rs/canvas');
const { patchPdfjs } = require('./patchPdfjs');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pdfjsBuildDir = path.join(rootDir, 'node_modules/pdfjs-dist/legacy/build');
const fixturePath = path.join(rootDir, 'build/pdfjs/fixtures/image-strips-under-clips.pdf');
// Stays inside the project so pdf.js's createRequire(import.meta.url) finds the hoisted
// @napi-rs/canvas, an optional dependency of pdfjs-dist.
const patchedDir = path.join(rootDir, 'node_modules/.cache/box-content-preview-pdfjs');

const FILL_LUMA = 40;
const SEAM_THRESHOLD = 15;
const SCALES = [1, 1.25, 1.37, 1.5, 2];
const ROTATIONS = [0, 90];
const RENDER_CASES = ROTATIONS.flatMap(rotation => SCALES.map(scale => ({ rotation, scale })));

// Strips run horizontally at 0 degrees, so seams show up along the middle column, and along the
// middle row once the page is turned.
const countSeamLines = ({ data, width, height }, rotation) => {
    const isTurned = rotation % 180 !== 0;
    const scanLength = isTurned ? width : height;
    let seamLines = 0;
    for (let offset = 1; offset < scanLength - 1; offset += 1) {
        const x = isTurned ? offset : Math.floor(width / 2);
        const y = isTurned ? Math.floor(height / 2) : offset;
        const pixelIndex = (y * width + x) * 4;
        const luma = 0.299 * data[pixelIndex] + 0.587 * data[pixelIndex + 1] + 0.114 * data[pixelIndex + 2];
        if (Math.abs(luma - FILL_LUMA) > SEAM_THRESHOLD) {
            seamLines += 1;
        }
    }
    return seamLines;
};

const writePatchedPdfjs = () => {
    fs.mkdirSync(patchedDir, { recursive: true });
    const patchedPath = path.join(patchedDir, 'pdf.min.mjs');
    fs.writeFileSync(patchedPath, patchPdfjs(fs.readFileSync(path.join(pdfjsBuildDir, 'pdf.min.mjs'), 'utf8')));
    return patchedPath;
};

const countSeamsPerCase = async pdfjsPath => {
    const pdfjs = await import(pathToFileURL(pdfjsPath).href);
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(pdfjsBuildDir, 'pdf.worker.min.mjs')).href;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fixturePath)) });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    const seamsPerCase = await Promise.all(
        RENDER_CASES.map(async ({ rotation, scale }) => {
            const viewport = page.getViewport({ scale, rotation });
            const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            const canvasContext = canvas.getContext('2d');
            await page.render({ canvas, canvasContext, viewport }).promise;
            return countSeamLines(canvasContext.getImageData(0, 0, canvas.width, canvas.height), rotation);
        }),
    );

    await loadingTask.destroy();
    return seamsPerCase;
};

const stockSeamCounts = await countSeamsPerCase(path.join(pdfjsBuildDir, 'pdf.min.mjs'));
const patchedSeamCounts = await countSeamsPerCase(writePatchedPdfjs());

RENDER_CASES.forEach(({ rotation, scale }, index) => {
    console.log(
        `scale ${scale}, rotation ${rotation}: ${stockSeamCounts[index]} seam lines stock, ${patchedSeamCounts[index]} patched`,
    );
});

if (stockSeamCounts.every(seamLines => seamLines === 0)) {
    console.error(
        'verifyClipSnapping: stock pdf.js renders the fixture without seams, so this check proves nothing. ' +
            'If pdf.js fixed mozilla/pdf.js#3351, remove build/pdfjs; otherwise update the fixture or seam detector.',
    );
    process.exit(1);
}

if (patchedSeamCounts.some(seamLines => seamLines > 0)) {
    console.error('verifyClipSnapping: patched pdf.js still renders seams between clipped image tiles.');
    process.exit(1);
}
