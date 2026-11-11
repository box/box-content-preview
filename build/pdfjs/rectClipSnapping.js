// Injected into pdf.js with toString(), so keep these as uniquely named function declarations that
// reference only their parameters, each other, and globals.

/**
 * Path space is the coordinate space of pdf.js DrawOPS data; ctx.getTransform() maps it to device pixels.
 *
 * @typedef {[number, number, number, number]} BcpRectBounds - [xMin, yMin, xMax, yMax] in path space,
 * with xMin < xMax and yMin < yMax
 * @typedef {[number, number, number, number]} BcpPathRect - [x, y, width, height] in path space, as
 * Path2D.rect takes them
 */

/**
 * Returns the bounds of a path that is a single axis-aligned rectangle, or null for any other shape.
 * The opcodes are parameters because pdf.min.mjs renames pdf.js's DrawOPS constants.
 *
 * @param {Float32Array|number[]} ops - DrawOPS data: each opcode followed by its coordinates
 * @param {number} moveTo
 * @param {number} lineTo
 * @param {number} closePath
 * @return {BcpRectBounds|null}
 */
function bcpGetRectBounds(ops, moveTo, lineTo, closePath) {
    const { length } = ops;
    // A moveTo and three or four lineTo, each opcode followed by x and y, then an optional closePath.
    if ((length !== 12 && length !== 13 && length !== 15 && length !== 16) || ops[0] !== moveTo) {
        return null;
    }
    const cornerCount = length < 15 ? 4 : 5;
    for (let corner = 1; corner < cornerCount; corner += 1) {
        if (ops[corner * 3] !== lineTo) {
            return null;
        }
    }
    if ((length === 13 || length === 16) && ops[length - 1] !== closePath) {
        return null;
    }
    if (cornerCount === 5 && (ops[13] !== ops[1] || ops[14] !== ops[2])) {
        return null;
    }

    const x0 = ops[1];
    const y0 = ops[2];
    const x1 = ops[4];
    const y1 = ops[5];
    const x2 = ops[7];
    const y2 = ops[8];
    const x3 = ops[10];
    const y3 = ops[11];
    const isHorizontalFirst = y0 === y1 && x1 === x2 && y2 === y3 && x3 === x0;
    const isVerticalFirst = x0 === x1 && y1 === y2 && x2 === x3 && y3 === y0;
    if ((!isHorizontalFirst && !isVerticalFirst) || x0 === x2 || y0 === y2) {
        return null;
    }

    return [Math.min(x0, x2), Math.min(y0, y2), Math.max(x0, x2), Math.max(y0, y2)];
}

/**
 * Moves the edges of a rectangle to whole device pixels with the same rounding pdf.js applies to
 * images in drawImageAtIntegerCoords, so clips and the images inside them share edges.
 *
 * @param {BcpRectBounds} bounds
 * @param {{a: number, b: number, c: number, d: number, e: number, f: number}} transform - canvas
 * transform from path space to device pixels, such as a DOMMatrix
 * @return {BcpPathRect|null} rectangle with positive width and height, or null when the transform
 * skews or rotates by other than a multiple of a quarter turn, or when rounding would leave no area
 */
function bcpSnapRectToPixels(bounds, transform) {
    const { a, b, c, d, e, f } = transform;
    const isQuarterTurn = a === 0 && d === 0;
    if (!isQuarterTurn && (b !== 0 || c !== 0)) {
        return null;
    }
    const pathXScale = isQuarterTurn ? b : a;
    const pathXOffset = isQuarterTurn ? f : e;
    const pathYScale = isQuarterTurn ? c : d;
    const pathYOffset = isQuarterTurn ? e : f;
    if (pathXScale === 0 || pathYScale === 0) {
        return null;
    }

    const deviceX0 = Math.round(pathXScale * bounds[0] + pathXOffset);
    const deviceX1 = Math.round(pathXScale * bounds[2] + pathXOffset);
    const deviceY0 = Math.round(pathYScale * bounds[1] + pathYOffset);
    const deviceY1 = Math.round(pathYScale * bounds[3] + pathYOffset);
    // Negated comparisons so NaN from a non-finite transform also leaves the clip alone.
    if (!(Math.abs(deviceX1 - deviceX0) >= 1) || !(Math.abs(deviceY1 - deviceY0) >= 1)) {
        return null;
    }

    return [
        (deviceX0 - pathXOffset) / pathXScale,
        (deviceY0 - pathYOffset) / pathYScale,
        (deviceX1 - deviceX0) / pathXScale,
        (deviceY1 - deviceY0) / pathYScale,
    ];
}

module.exports = { bcpGetRectBounds, bcpSnapRectToPixels };
