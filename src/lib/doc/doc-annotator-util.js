/**
 * @fileoverview Document annotator utility functions.
 * @author tjin
 */

import * as annotatorUtil from '../annotation/annotator-util';

const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;
// PDF unit = 1/72 inch, CSS pixel = 1/92 inch
const PDF_UNIT_TO_CSS_PIXEL = 4 / 3;
const CSS_PIXEL_TO_PDF_UNIT = 3 / 4;
const HIGHLIGHT_DIALOG_WIDTH = 282;

//------------------------------------------------------------------------------
// DOM Utils
//------------------------------------------------------------------------------

/**
* Returns the page element and page number that the element is on.
* @param {HTMLElement} element Element to find page and page number for
* @returns {Object} Page element/page number if found or null/-1 if not
*/
export function getPageElAndPageNumber(element) {
    const pageEl = annotatorUtil.findClosestElWithClass(element, 'page');
    if (pageEl) {
        return {
            pageEl,
            page: parseInt(pageEl.getAttribute('data-page-number'), 10)
        };
    }

    return {
        pageEl: null,
        page: -1
    };
}

//------------------------------------------------------------------------------
// Highlight Utils
//------------------------------------------------------------------------------

/**
 * Fast test if a given point is within a polygon. Taken from
 * http://jsperf.com/ispointinpath-boundary-test-speed/6
 * @param {Number[]} poly Polygon defined by array of [x,y] coordinates
 * @param {Number} x X coordinate of point to Test
 * @param {Number} y Y coordinate of point to Test
 * @returns {Boolean} Whether or not point is in the polygon
 */
export function isPointInPolyOpt(poly, x, y) {
    /* eslint-disable */
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= y && y < poly[j][1]) || (poly[j][1] <= y && y < poly[i][1])) && (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) && (c = !c);
    return c;
    /* eslint-enable */
}

/**
 * Returns the Rangy highlight object and highlight elements representing
 * the current selection on the given page element.
 * @param {Object} highlighter Rangy highlighter
 * @param {HTMLElement} pageEl Page element highlight is over
 * @returns {Object} Rangy highlight object and highlight DOM elements
 */
export function getHighlightAndHighlightEls(highlighter, pageEl) {
    // We use Rangy to turn the selection into a highlight, which creates
    // spans around the selection that we can then turn into quadpoints
    const highlight = highlighter.highlightSelection('rangy-highlight', {
        containerElementId: pageEl.id
    })[0];

    // Only grab highlights on the text layer
    const textLayer = pageEl.querySelector('.textLayer');
    const highlightEls = [].slice.call(textLayer.querySelectorAll('.rangy-highlight'), 0).filter((element) => {
        return element.tagName && element.tagName === 'SPAN' && element.textContent.trim() !== '';
    });

    return {
        highlight,
        highlightEls
    };
}

/**
 * Returns whether or not there currently is a non-empty selection.
 * @returns {Boolean} Whether there is a non-empty selection
 */
export function isSelectionPresent() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount < 1) {
        return false;
    }

    return true;
}

//------------------------------------------------------------------------------
// Coordinate Utils
//------------------------------------------------------------------------------

/**
 * Converts coordinates in PDF space to coordinates in DOM space.
 * @param {Number[]} coordinates Either a [x,y] coordinate location or
 * quad points in the format of 8xn numbers in PDF space in PDF units
 * @param {Number} pageHeight Height of page in CSS pixels, needed to convert
 * coordinate origin from bottom left (PDF) to top left (DOM)
 * @param {Number} scale Document zoom scale
 * @returns {Number[]} Either [x,y] or 8xn coordinates in DOM space in CSS
 * pixels
 */
export function convertPDFSpaceToDOMSpace(coordinates, pageHeight, scale) {
    const scaledCoordinates = coordinates.map((val) => val * PDF_UNIT_TO_CSS_PIXEL * scale);
    if (scaledCoordinates.length === 2) {
        const [x, y] = scaledCoordinates;
        return [x, pageHeight - y];
    }

    const [x1, y1, x2, y2, x3, y3, x4, y4] = scaledCoordinates;
    return [
        x1,
        pageHeight - y1,
        x2,
        pageHeight - y2,
        x3,
        pageHeight - y3,
        x4,
        pageHeight - y4
    ];
}

/**
 * Converts coordinates in DOM space to coordinates in PDF space.
 * @param {Number[]} coordinates Either a [x,y] coordinate location or
 * quad points in the format of 8xn numbers in DOM space in CSS pixels
 * @param {Number} pageHeight Height of page in CSS pixels, needed to convert
 * coordinate origin from top left (DOM) to bottom left (PDF)
 * @param {Number} scale Document zoom scale
 * @returns {Number[]} Either [x,y] or 8xn coordinates in PDF space in PDF
 * units
 */
export function convertDOMSpaceToPDFSpace(coordinates, pageHeight, scale) {
    let pdfCoordinates = [];
    if (coordinates.length === 2) {
        const [x, y] = coordinates;
        pdfCoordinates = [x, pageHeight - y];
    } else {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = coordinates;
        pdfCoordinates = [
            x1,
            pageHeight - y1,
            x2,
            pageHeight - y2,
            x3,
            pageHeight - y3,
            x4,
            pageHeight - y4
        ];
    }

    return pdfCoordinates.map((val) => (val * CSS_PIXEL_TO_PDF_UNIT / scale).toFixed(4));
}

/**
 * Returns dimension scale multiplier for x and y axes calculated from comparing
 * the current page dimensions scaled to 100% with page dimensions when
 * annotations were created.
 *
 * @param {Object} dimensions Dimensions saved in annotation
 * @param {Object} pageDimensions Current page dimensions
 * @param {Number} zoomScale Zoom scale
 * @returns {Object|null} {x, y} dimension scale if needed, null otherwise
 */
export function getDimensionScale(dimensions, pageDimensions, zoomScale) {
    let dimensionScale = null;

    // Scale comparing current dimensions with saved dimensions if needed
    if (dimensions && dimensions.x !== undefined && dimensions.y !== undefined) {
        const pageWidth = pageDimensions.width / zoomScale;
        const pageHeight = (pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM) / zoomScale;

        // Ignore sub-pixel variations that could result from float math
        if (Math.abs(pageWidth - dimensions.x) > 1 || Math.abs(pageHeight !== dimensions.y) > 1) {
            dimensionScale = {
                x: pageWidth / dimensions.x,
                y: pageHeight / dimensions.y
            };
        }
    }

    return dimensionScale;
}

/**
 * Returns browser coordinates given an annotation location object and the HTML
 * element being annotated on.
 * @param {Object} location Annotation location object
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const pageEl = annotatedElement.querySelector(`[data-page-number="${location.page}"]`) || annotatedElement;
    const pageDimensions = pageEl.getBoundingClientRect();
    const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
    const zoomScale = annotatorUtil.getScale(annotatedElement);
    let x = location.x;
    let y = location.y;

    // If needed, scale coords comparing current dimensions with saved dimensions
    const dimensionScale = getDimensionScale(location.dimensions, pageDimensions, zoomScale);
    if (dimensionScale) {
        x *= dimensionScale.x;
        y *= dimensionScale.y;
    }

    return convertPDFSpaceToDOMSpace([x, y], pageHeight, zoomScale);
}

/**
 * Returns the coordinates of the quadrilateral representing this element
 * per the PDF text markup annotation spec. Note that these coordinates
 * are in PDF default user space, with the origin at the bottom left corner
 * of the document.
 *
 * We do this by letting the browser figure out the coordinates for us.
 * See http://stackoverflow.com/a/17098667
 * @param {HTMLElement} element Element to get quad points for
 * @param {HTMLElement} pageEl Page element quad points are relative to
 * @param {Number} scale Document zoom scale
 * @returns {Number[]} Coordinates in the form of [x1, y1, x2, y2, x3, y3,
 * x4, y4] with (x1, y1) being the lower left (untransformed) corner of the
 * element and the other 3 vertices in counterclockwise order. These are
 * in PDF default user space.
 */
export function getQuadPoints(element, pageEl, scale) {
    const quadCornerContainerEl = document.createElement('div');
    quadCornerContainerEl.classList.add('box-preview-quad-corner-container');

    // Create zero-size elements that can be styled to the 4 corners of
    // quadrilateral around element - using 4 divs is faster than using
    // one div and moving it around
    quadCornerContainerEl.innerHTML = `
        <div class="box-preview-quad-corner corner1"></div>
        <div class="box-preview-quad-corner corner2"></div>
        <div class="box-preview-quad-corner corner3"></div>
        <div class="box-preview-quad-corner corner4"></div>`.trim();

    // Insert helper container into element
    element.appendChild(quadCornerContainerEl);
    const quadCorner1El = quadCornerContainerEl.querySelector('.corner1');
    const quadCorner2El = quadCornerContainerEl.querySelector('.corner2');
    const quadCorner3El = quadCornerContainerEl.querySelector('.corner3');
    const quadCorner4El = quadCornerContainerEl.querySelector('.corner4');
    const corner1Dimensions = quadCorner1El.getBoundingClientRect();
    const corner2Dimensions = quadCorner2El.getBoundingClientRect();
    const corner3Dimensions = quadCorner3El.getBoundingClientRect();
    const corner4Dimensions = quadCorner4El.getBoundingClientRect();
    const pageDimensions = pageEl.getBoundingClientRect();
    const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
    const pageLeft = pageDimensions.left;
    const pageTop = pageDimensions.top + PAGE_PADDING_TOP;

    // Cleanup helper container
    element.removeChild(quadCornerContainerEl);

    // Calculate coordinates of these 4 corners
    const quadPoints = [
        corner1Dimensions.left - pageLeft,
        corner1Dimensions.top - pageTop,
        corner2Dimensions.left - pageLeft,
        corner2Dimensions.top - pageTop,
        corner3Dimensions.left - pageLeft,
        corner3Dimensions.top - pageTop,
        corner4Dimensions.left - pageLeft,
        corner4Dimensions.top - pageTop
    ];

    // Return quad points at 100% scale in PDF units
    return convertDOMSpaceToPDFSpace(quadPoints, pageHeight, scale);
}

/**
 * Returns the lower right corner of the last quad point. This should provide
 * the same location the add highlight button is shown at given that the
 * quad points are stored in the correct order, ie left to right, top to bottom.
 * @param {Number[]} quadPoints Quad points in PDF space in PDF units
 * @returns {Number[]} [x,y] of lower right corner of last quad point
 */
export function getLowerRightCornerOfLastQuadPoint(quadPoints) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints[quadPoints.length - 1];
    return [
        Math.max(x1, x2, x3, x4),
        Math.min(y1, y2, y3, y4)
    ];
}

/**
 * Gets coordinates representing lower center point of the annotation
 * represented by the provided quad points. We define lower center point
 * as the bottom center corner of the rectangle representing the bottom-most
 * annotation. Note that these coordinates are in PDF default user space, with
 * the origin at the bottom left corner of the document.
 * @param {Number[]} quadPoints Quad points of annotation to get lower
 * right corner for in PDF space in PDF units
 * @returns {Number[]} [x,y] of lower right corner of quad points in PDF
 * space in PDF units
 * @param {Number[]} quadPoints Quad points in PDF space in PDF units
 * @returns {Number[]} [x,y] of lower right corner of last quad point
 */
export function getLowerCenterPoint(quadPoints) {
    let [maxX, minX, y] = [0, 99999, 99999];
    quadPoints.forEach((quadPoint) => {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoint;

        // If this rectangle is lower than previously recorded lowest,
        // use the right edge of this rectangle
        const tempMaxX = Math.max(x1, x2, x3, x4);
        const tempMinX = Math.min(x1, x2, x3, x4);
        const tempY = Math.min(y1, y2, y3, y4);

        if (tempMinX < minX) {
            minX = tempMinX;
        }
        if (tempMaxX > maxX) {
            maxX = tempMaxX;
        }

        if (tempY <= y) {
            y = tempY;
        }
    });

    const x = (minX + maxX) / 2 - HIGHLIGHT_DIALOG_WIDTH / 2;
    return [x, y];
}
