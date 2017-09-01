import * as annotatorUtil from '../annotatorUtil';
import {
    CLASS_ANNOTATION_DIALOG,
    CLASS_ANNOTATION_HIGHLIGHT_DIALOG,
    PAGE_PADDING_TOP,
    PAGE_PADDING_BOTTOM,
    DATA_TYPE_ANNOTATION_DIALOG,
    DATA_TYPE_ANNOTATION_INDICATOR,
    DATA_TYPE_HIGHLIGHT,
    DATA_TYPE_ADD_HIGHLIGHT_COMMENT,
    DATA_TYPE_POST,
    DATA_TYPE_CANCEL,
    DATA_TYPE_REPLY_TEXTAREA,
    DATA_TYPE_CANCEL_REPLY,
    DATA_TYPE_POST_REPLY,
    DATA_TYPE_DELETE,
    DATA_TYPE_CANCEL_DELETE,
    DATA_TYPE_CONFIRM_DELETE
} from '../annotationConstants';

const PREVIEW_PRESENTATION_CLASS = 'bp-doc-presentation';
const HEIGHT_PADDING = 30;
// PDF unit = 1/72 inch, CSS pixel = 1/92 inch
const PDF_UNIT_TO_CSS_PIXEL = 4 / 3;
const CSS_PIXEL_TO_PDF_UNIT = 3 / 4;

const DIALOG_DATATYPES = [
    DATA_TYPE_ANNOTATION_DIALOG,
    DATA_TYPE_ANNOTATION_INDICATOR,
    DATA_TYPE_HIGHLIGHT,
    DATA_TYPE_ADD_HIGHLIGHT_COMMENT,
    DATA_TYPE_POST,
    DATA_TYPE_CANCEL,
    DATA_TYPE_REPLY_TEXTAREA,
    DATA_TYPE_CANCEL_REPLY,
    DATA_TYPE_POST_REPLY,
    DATA_TYPE_DELETE,
    DATA_TYPE_CANCEL_DELETE,
    DATA_TYPE_CONFIRM_DELETE
];

/**
 * Checks whether this annotator is on a presentation (PPT) or not.
 *
 * @param {HTMLElement} annotatedElement - Annotated element
 * @return {boolean} Whether annotations are on presentation or not
 */
export function isPresentation(annotatedElement) {
    return annotatedElement.classList.contains(PREVIEW_PRESENTATION_CLASS);
}

//------------------------------------------------------------------------------
// DOM Utils
//------------------------------------------------------------------------------

/**
 * Checks if there is an active annotation in the annotated document
 *
 * @private
 * @param {HTMLElement} annotatedEl - Annotated document
 * @return {boolean} Whether or not a dialog is active
 */
export function hasActiveDialog(annotatedEl) {
    const commentsDialogEl = annotatedEl.querySelector(`.${CLASS_ANNOTATION_DIALOG}:not(.bp-is-hidden)`);
    const highlightDialogEl = annotatedEl.querySelector(`.${CLASS_ANNOTATION_HIGHLIGHT_DIALOG}:not(.bp-is-hidden)`);

    return !!(commentsDialogEl || highlightDialogEl);
}

//------------------------------------------------------------------------------
// Highlight Utils
//------------------------------------------------------------------------------

/**
 * Fast test if a given point is within a polygon. Taken from
 * http://jsperf.com/ispointinpath-boundary-test-speed/6
 *
 * @param {number[]} poly - Polygon defined by array of [x,y] coordinates
 * @param {number} x - X coordinate of point to Test
 * @param {number} y - Y coordinate of point to Test
 * @return {boolean} Whether or not point is in the polygon
 */
export function isPointInPolyOpt(poly, x, y) {
    /* eslint-disable */
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= y && y < poly[j][1]) || (poly[j][1] <= y && y < poly[i][1])) &&
            x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0] &&
            (c = !c);
    return c;
    /* eslint-enable */
}

/* istanbul ignore next */
/**
 * Returns the Rangy highlight object and highlight elements representing
 * the current selection on the given page element.
 *
 * @param {Object} highlighter - Rangy highlighter
 * @param {HTMLElement} pageEl - Page element highlight is over
 * @return {Object} Rangy highlight object and highlight DOM elements
 */
export function getHighlightAndHighlightEls(highlighter, pageEl) {
    const highlight = highlighter.highlights[0];
    const highlightEls = [].slice.call(pageEl.querySelectorAll('.rangy-highlight'), 0).filter((element) => {
        return element.tagName && element.tagName === 'SPAN' && element.textContent.trim() !== '';
    });

    return {
        highlight,
        highlightEls
    };
}
/* eslint-enable space-before-function-paren */

/**
 * Returns whether or not there currently is a non-empty selection.
 *
 * @return {boolean} Whether there is a non-empty selection
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
 *
 * @param {number[]} coordinates - Either a [x,y] coordinate location or
 * quad points in the format of 8xn numbers in PDF space in PDF units
 * @param {number} pageHeight - Height of page in CSS pixels, needed to convert
 * coordinate origin from bottom left (PDF) to top left (DOM)
 * @param {number} scale - Document zoom scale
 * @return {number[]} Either [x,y] or 8xn coordinates in DOM space in CSS
 * pixels
 */
export function convertPDFSpaceToDOMSpace(coordinates, pageHeight, scale) {
    const scaledCoordinates = coordinates.map((val) => val * PDF_UNIT_TO_CSS_PIXEL * scale);
    if (scaledCoordinates.length === 2) {
        const [x, y] = scaledCoordinates;
        return [x, pageHeight - y];
    }

    const [x1, y1, x2, y2, x3, y3, x4, y4] = scaledCoordinates;
    return [x1, pageHeight - y1, x2, pageHeight - y2, x3, pageHeight - y3, x4, pageHeight - y4];
}

/**
 * Converts coordinates in DOM space to coordinates in PDF space.
 *
 * @param {number[]} coordinates - Either a [x,y] coordinate location or
 * quad points in the format of 8xn numbers in DOM space in CSS pixels
 * @param {number} pageHeight - Height of page in CSS pixels, needed to convert
 * coordinate origin from top left (DOM) to bottom left (PDF)
 * @param {number} scale - Document zoom scale
 * @return {number[]} Either [x,y] or 8xn coordinates in PDF space in PDF
 * units
 */
export function convertDOMSpaceToPDFSpace(coordinates, pageHeight, scale) {
    let pdfCoordinates = [];
    if (coordinates.length === 2) {
        const [x, y] = coordinates;
        pdfCoordinates = [x, pageHeight - y];
    } else {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = coordinates;
        pdfCoordinates = [x1, pageHeight - y1, x2, pageHeight - y2, x3, pageHeight - y3, x4, pageHeight - y4];
    }

    return pdfCoordinates.map((val) => (val * CSS_PIXEL_TO_PDF_UNIT / scale).toFixed(4));
}

/**
 * Returns browser coordinates given an annotation location object and the HTML
 * element being annotated on.
 *
 * @param {Object} location - Annotation location object
 * @param {HTMLElement} annotatedElement - HTML element being annotated on
 * @return {number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const pageEl = annotatedElement.querySelector(`[data-page-number="${location.page}"]`) || annotatedElement;
    const pageDimensions = pageEl.getBoundingClientRect();
    const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
    const zoomScale = annotatorUtil.getScale(annotatedElement);
    let x = location.x;
    let y = location.y;

    // If needed, scale coords comparing current dimensions with saved dimensions
    const dimensionScale = annotatorUtil.getDimensionScale(
        location.dimensions,
        pageDimensions,
        zoomScale,
        HEIGHT_PADDING
    );
    if (dimensionScale) {
        x *= dimensionScale.x;
        y *= dimensionScale.y;
    }

    return convertPDFSpaceToDOMSpace([x, y], pageHeight, zoomScale);
}

/* istanbul ignore next */
/**
 * Returns the coordinates of the quadrilateral representing this element
 * per the PDF text markup annotation spec. Note that these coordinates
 * are in PDF default user space, with the origin at the bottom left corner
 * of the document.
 *
 * We do this by letting the browser figure out the coordinates for us.
 * See http://stackoverflow.com/a/17098667
 *
 * @param {HTMLElement} element - Element to get quad points for
 * @param {HTMLElement} pageEl - Page element quad points are relative to
 * @param {number} scale - Document zoom scale
 * @return {number[]} Coordinates in the form of [x1, y1, x2, y2, x3, y3,
 * x4, y4] with (x1, y1) being the lower left (untransformed) corner of the
 * element and the other 3 vertices in counterclockwise order. These are
 * in PDF default user space.
 */
export function getQuadPoints(element, pageEl, scale) {
    const quadCornerContainerEl = document.createElement('div');
    quadCornerContainerEl.classList.add('bp-quad-corner-container');

    // Create zero-size elements that can be styled to the 4 corners of
    // quadrilateral around element - using 4 divs is faster than using
    // one div and moving it around
    quadCornerContainerEl.innerHTML = `
        <div class="bp-quad-corner corner1"></div>
        <div class="bp-quad-corner corner2"></div>
        <div class="bp-quad-corner corner3"></div>
        <div class="bp-quad-corner corner4"></div>`.trim();

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

    // Calculate coordinates of these 4 corners.
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
/* eslint-enable space-before-function-paren */

/**
 * Returns the lower right corner of the last quad point. This should provide
 * the same location the add highlight button is shown at given that the
 * quad points are stored in the correct order, ie left to right, top to bottom.
 * @param {number[]} quadPoints - Quad points in PDF space in PDF units
 * @return {number[]} [x,y] of lower right corner of last quad point
 */
export function getLowerRightCornerOfLastQuadPoint(quadPoints) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints[quadPoints.length - 1];
    return [Math.max(x1, x2, x3, x4), Math.min(y1, y2, y3, y4)];
}

/**
 * Returns the top right corner of the last quad point. This should provide
 * the same location the add highlight button is shown at given that the
 * quad points are stored in the correct order, ie left to right, top to bottom.
 * @param {number[]} quadPoints - Quad points in PDF space in PDF units
 * @return {number[]} [x,y] of lower right corner of last quad point
 */
export function getTopRightCornerOfLastQuadPoint(quadPoints) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints[quadPoints.length - 1];
    return [Math.min(x1, x2, x3, x4), Math.min(y1, y2, y3, y4)];
}

/**
 * Check whether a selection is valid for creating a highlight from.
 *
 * @param {Selection} selection The selection object to test
 * @return {boolean} True if the selection is valid for creating a highlight from
 */
export function isValidSelection(selection) {
    const isInvalid =
        selection.rangeCount <= 0 || // Check for an invalid range triggering selection
        selection.isCollapsed || // Make sure the text is non-collapsed(or hidden)
        selection.toString() === ''; // Empty can occur if there is conflict with element layout

    return !isInvalid;
}

/**
 * Scales the canvas an annotation should be drawn on
 *
 * @param {HTMLElement} pageEl - The DOM element for the current page
 * @param {HTMLElement} annotationLayerEl - The annotation canvas layer
 * @return {HTMLElement} The scaled annotation canvas layer
 */
export function scaleCanvas(pageEl, annotationLayerEl) {
    const pageDimensions = pageEl.getBoundingClientRect();
    const pxRatio = window.devicePixelRatio || 1;
    const width = pageDimensions.width;
    const height = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

    const scaledCanvas = annotationLayerEl;
    scaledCanvas.width = pxRatio * width;
    scaledCanvas.height = pxRatio * height;

    if (pxRatio !== 1) {
        scaledCanvas.style.width = `${width}px`;
        scaledCanvas.style.height = `${height}px`;

        const context = annotationLayerEl.getContext('2d');
        context.scale(pxRatio, pxRatio);
    }

    return scaledCanvas;
}

/**
 * Gets the context an annotation should be drawn on.
 *
 * @param {HTMLElement} pageEl - The DOM element for the current page
 * @param {string} annotationLayerClass - The class name for the annotation layer
 * @param {number} [paddingTop] - The top padding of each page element
 * @param {number} [paddingBottom] - The bottom padding of each page element
 * @return {RenderingContext|null} Context or null if no page element was given
 */
export function getContext(pageEl, annotationLayerClass) {
    if (!pageEl) {
        return null;
    }

    // Create annotation layer if one does not exist (e.g. first load or page resize)
    let annotationLayerEl = pageEl.querySelector(`.${annotationLayerClass}`);
    if (!annotationLayerEl) {
        annotationLayerEl = document.createElement('canvas');
        annotationLayerEl.classList.add(annotationLayerClass);
        annotationLayerEl = scaleCanvas(pageEl, annotationLayerEl);

        const textLayerEl = pageEl.querySelector('.textLayer');
        pageEl.insertBefore(annotationLayerEl, textLayerEl);
    }

    return annotationLayerEl.getContext('2d');
}

/**
 * Gets the current page element.
 *
 * @private
 * @param {HTMLElement} annotatedEl - HTML Element being annotated on
 * @param {number} pageNum - Page number
 * @return {HTMLElement|null} Page element if it exists, otherwise null
 */
export function getPageEl(annotatedEl, pageNum) {
    return annotatedEl.querySelector(`[data-page-number="${pageNum}"]`);
}

/**
 * Checks whether the mouse event occured in a highlight dialog
 *
 * @private
 * @param {HTMLElement} eventTarget mouse event target element
 * @return {boolean} Whether mouse event occured in a highlight dialog
 */
export function isDialogDataType(eventTarget) {
    const dataType = annotatorUtil.findClosestDataType(eventTarget);
    return DIALOG_DATATYPES.indexOf(dataType) !== -1;
}
