/* eslint-disable no-console */
// Snaps single-rectangle clips in pdf.js to whole device pixels, so images tiled under adjacent
// clips meet without the antialiased seam in https://github.com/mozilla/pdf.js/issues/3351.
const fs = require('fs');
const { bcpGetRectBounds, bcpSnapRectToPixels } = require('./rectClipSnapping');

const PATCH_MARKER = 'function bcpSnapRectClip(';
const MAKE_PATH_ANCHOR = 'function makePathFromDrawOPS(';

const createShapeError = (description, found) =>
    new Error(
        `patchPdfjs: expected exactly one ${description} in pdf.js but found ${found}. ` +
            'pdf.js changed shape; check whether mozilla/pdf.js#3351 is fixed upstream, then update or remove build/pdfjs/patchPdfjs.js.',
    );

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchOnce = (source, pattern, description) => {
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1) {
        throw createShapeError(description, matches.length);
    }
    return matches[0];
};

const getDrawOpcode = (makePathBody, method) => {
    const casePattern = new RegExp(`case\\s+([\\w$.]+):\\s*[\\w$]+\\.${method}\\(`, 'g');
    return matchOnce(makePathBody, casePattern, `${method} case in makePathFromDrawOPS`)[1];
};

// Keys rectangle bounds by Path2D, because constructPath replaces the DrawOPS argument with the
// Path2D on first render and later renders never pass the raw ops again.
const patchMakePathFromDrawOPS = source => {
    const start = source.indexOf(MAKE_PATH_ANCHOR);
    if (start === -1 || start !== source.lastIndexOf(MAKE_PATH_ANCHOR)) {
        throw createShapeError('makePathFromDrawOPS function', start === -1 ? 0 : 'several');
    }
    const end = source.indexOf('Unrecognized drawing path operator', start);
    if (end === -1) {
        throw createShapeError('makePathFromDrawOPS warning for unknown operators', 0);
    }
    const makePathBody = source.slice(start, end);
    const moveTo = getDrawOpcode(makePathBody, 'moveTo');
    const lineTo = getDrawOpcode(makePathBody, 'lineTo');
    const closePath = getDrawOpcode(makePathBody, 'closePath');

    const injectedRuntime = `
${bcpGetRectBounds.toString()}
${bcpSnapRectToPixels.toString()}
const bcpRectClipBounds = new WeakMap();
function makePathFromDrawOPS(drawOps) {
    const path = bcpPdfjsMakePathFromDrawOPS(drawOps);
    const bounds = drawOps ? bcpGetRectBounds(drawOps, ${moveTo}, ${lineTo}, ${closePath}) : null;
    if (bounds) {
        bcpRectClipBounds.set(path, bounds);
    }
    return path;
}
function bcpSnapRectClip(path, ctx) {
    const bounds = bcpRectClipBounds.get(path);
    const snappedRect = bounds ? bcpSnapRectToPixels(bounds, ctx.getTransform()) : null;
    if (!snappedRect) {
        return path;
    }
    const snappedPath = new Path2D();
    snappedPath.rect(snappedRect[0], snappedRect[1], snappedRect[2], snappedRect[3]);
    return snappedPath;
}
function bcpPdfjsMakePathFromDrawOPS(`;

    // The runtime ends mid-declaration, renaming pdf.js's own function so the wrapper takes its name.
    return source.slice(0, start) + injectedRuntime + source.slice(start + MAKE_PATH_ANCHOR.length);
};

const patchConsumePath = source => {
    const consumePathSignature = matchOnce(
        source,
        /consumePath\(([\w$]+),\s*([\w$]+),\s*([\w$]+)\)\s*\{/g,
        'consumePath(opIdx, path, clipBox) method',
    );
    const pathParam = consumePathSignature[2];
    const start = consumePathSignature.index;
    const end = source.indexOf('startNewPathAndClipBox', start);
    if (end === -1) {
        throw createShapeError('startNewPathAndClipBox call ending consumePath', 0);
    }
    const consumePathBody = source.slice(start, end);
    const clipCallPattern = new RegExp(`((?:[\\w$]+\\.)*[\\w$]+)\\.clip\\(${escapeRegExp(pathParam)}(?=[,)])`, 'g');
    const clipCallCount = (consumePathBody.match(clipCallPattern) || []).length;
    if (clipCallCount !== 2) {
        throw new Error(
            `patchPdfjs: expected the even-odd and nonzero ctx.clip calls in consumePath but found ${clipCallCount}. ` +
                'Update build/pdfjs/patchPdfjs.js for the new pdf.js version.',
        );
    }
    const patchedConsumePathBody = consumePathBody.replace(
        clipCallPattern,
        (call, context) => `${context}.clip(bcpSnapRectClip(${pathParam}, ${context})`,
    );

    return source.slice(0, start) + patchedConsumePathBody + source.slice(end);
};

const patchPdfjs = source => {
    if (source.includes(PATCH_MARKER)) {
        return source;
    }
    return patchConsumePath(patchMakePathFromDrawOPS(source));
};

if (require.main === module) {
    const filePaths = process.argv.slice(2);
    if (!filePaths.length) {
        console.error('Usage: node build/pdfjs/patchPdfjs.js <pdf.mjs>...');
        process.exit(1);
    }
    filePaths.forEach(filePath => {
        fs.writeFileSync(filePath, patchPdfjs(fs.readFileSync(filePath, 'utf8')));
        console.log(`patchPdfjs: snapped rectangular clips in ${filePath}`);
    });
}

module.exports = { patchPdfjs };
