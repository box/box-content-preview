/**
 * @fileoverview Annotation utility functions.
 * @author tjin
 */

import { SELECTOR_ANNOTATION_DIALOG } from './annotation-constants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';

// PDF unit = 1/72 inch, CSS pixel = 1/92 inch
const PDF_UNIT_TO_CSS_PIXEL = 4 / 3;
const CSS_PIXEL_TO_PDF_UNIT = 3 / 4;

//------------------------------------------------------------------------------
// DOM Utils
//------------------------------------------------------------------------------

/**
 * Finds the closest ancestor DOM element with the specified class.
 *
 * @param {HTMLElement} element Element to search ancestors of
 * @param {String} className Class name to query
 * @returns {HTMLElement|null} Closest ancestor with given class or null
 */
export function findClosestElWithClass(element, className) {
    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el.classList && el.classList.contains(className)) {
            return el;
        }
    }

    return null;
}

/**
 * Finds the closest element with a data type and returns that data type. If
 * an attributeName is provided, search for that data atttribute instead of
 * data type.
 *
 * @param {HTMLElement} element Element to find closest data type for
 * @param {String} [attributeName] Optional different data attribute to search
 * for
 * @returns {string} Closest data type or empty string
 */
export function findClosestDataType(element, attributeName) {
    const attributeToFind = attributeName || 'data-type';

    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el && el.getAttribute(attributeToFind)) {
            return el.getAttribute(attributeToFind);
        }
    }

    return '';
}

/**
 * Returns the page element and page number that the element is on.
 *
 * @param {HTMLElement} element Element to find page and page number for
 * @returns {Object} Page element/page number if found or null/-1 if not
 */
export function getPageElAndPageNumber(element) {
    const pageEl = findClosestElWithClass(element, 'page');
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

/**
 * Shows the specified element or element with specified selector.
 *
 * @param {HTMLElement|String} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function showElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.remove(CLASS_HIDDEN);
    }
}

/**
 * Hides the specified element or element with specified selector.
 *
 * @param {HTMLElement|String} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function hideElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.add(CLASS_HIDDEN);
    }
}

/**
 * Reset textarea element - clears value, resets styles, and remove active
 * state.
 *
 * @param {HTMLElement} element Textarea to reset
 * @returns {void}
 */
export function resetTextarea(element) {
    const textareaEl = element;
    textareaEl.value = '';
    textareaEl.style.width = '';
    textareaEl.style.height = '';
    textareaEl.classList.remove(CLASS_ACTIVE);
}

//------------------------------------------------------------------------------
// Highlight Utils
//------------------------------------------------------------------------------

/**
 * Fast test if a given point is within a polygon. Taken from
 * http://jsperf.com/ispointinpath-boundary-test-speed/6
 *
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
 *
 * @param {HTMLElement} pageEl Page element to get selection objects from
 * @param {Object} highlighter Rangy highlighter
 * @returns {Object} Rangy highlight object and highlight DOM elements
 */
export function getHighlightAndHighlightEls(pageEl, highlighter) {
    // We use Rangy to turn the selection into a highlight, which creates
    // spans around the selection that we can then turn into quadpoints
    const highlight = highlighter.highlightSelection('highlight', {
        containerElementId: pageEl.id
    })[0];
    const highlightEls = [].slice.call(document.querySelectorAll('.highlight'), 0).filter((element) => {
        return element.tagName && element.tagName === 'SPAN';
    });

    return {
        highlight,
        highlightEls
    };
}

/**
 * Returns whether or not the selection represented by the highlight elements
 * is reversed by detecting if the mouse cursor is closer to the top-most
 * or bottom-most element.
 *
 * @param {Event} event DOM Event
 * @param {HTMLElement[]} elements Elements representing selection
 * @returns {Boolean} Whether or not the selection is reversed
 */
export function isSelectionReversed(event, elements) {
    const topDimensions = elements[0].getBoundingClientRect();
    const bottomDimensions = elements[elements.length - 1].getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Calculate distance between mouse and top left corner of top selection
    // line vs distance between mouse and bottom right corner of bottom
    // selection line
    const topLength = Math.sqrt(Math.pow(topDimensions.left - mouseX, 2) + Math.pow(topDimensions.top - mouseY, 2));
    const bottomLength = Math.sqrt(Math.pow(bottomDimensions.right - mouseX, 2) + Math.pow(bottomDimensions.bottom - mouseY, 2));

    return topLength < bottomLength;
}

/**
 * Returns whether or not there currently is a non-empty selection.
 *
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
// Point Utils
//------------------------------------------------------------------------------

/**
 * Returns whether or not there is a dialog open.
 *
 * @returns {Boolean} Whether a dialog is open or not
 */
export function isDialogOpen() {
    const annotationDialogEls = [].slice.call(document.querySelectorAll(SELECTOR_ANNOTATION_DIALOG), 0);
    if (annotationDialogEls.some((dialogEl) => !dialogEl.classList.contains(CLASS_HIDDEN))) {
        return true;
    }

    return false;
}

/**
 * Checks whether element is fully in viewport.
 *
 * @returns {Boolean} Whether element is fully in viewport
 */
export function isElementInViewport(element) {
    const dimensions = element.getBoundingClientRect();

    return (
        dimensions.top >= 0 &&
        dimensions.left >= 0 &&
        dimensions.bottom <= window.innerHeight &&
        dimensions.right <= window.innerWidth
    );
}

//------------------------------------------------------------------------------
// Coordinate Utils
//------------------------------------------------------------------------------

/**
 * Converts coordinates in PDF space to coordinates in DOM space.
 *
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
 *
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
 * Returns zoom scale of annotated element.
 *
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {Number} Zoom scale
 */
export function getScale(annotatedElement) {
    return parseFloat(annotatedElement.getAttribute('data-scale')) || 1;
}

/**
 * Returns browser coordinates given an annotation location object and
 * the HTML element being annotated on.
 *
 * @param {Object} location Annotation location object
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const pageEl = annotatedElement.querySelector(`[data-page-number="${location.page}"]`) || annotatedElement;
    const pageHeight = pageEl.getBoundingClientRect().height;
    const scale = getScale(annotatedElement);
    return convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, scale);
}

/**
 * Returns the coordinates of the quadrilateral representing this element
 * per the PDF text markup annotation spec. Note that these coordinates
 * are in PDF default user space, with the origin at the bottom left corner
 * of the document.
 *
 * We do this by letting the browser figure out the coordinates for us.
 * See http://stackoverflow.com/a/17098667
 *
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
    const pageLeft = pageDimensions.left;
    const pageBottom = pageDimensions.top;

    // Cleanup helper container
    element.removeChild(quadCornerContainerEl);

    // Calculate coordinates of these 4 corners
    const quadPoints = [
        corner1Dimensions.left - pageLeft,
        corner1Dimensions.top - pageBottom,
        corner2Dimensions.left - pageLeft,
        corner2Dimensions.top - pageBottom,
        corner3Dimensions.left - pageLeft,
        corner3Dimensions.top - pageBottom,
        corner4Dimensions.left - pageLeft,
        corner4Dimensions.top - pageBottom
    ];

    // Return quad points at 100% scale in PDF units
    return convertDOMSpaceToPDFSpace(quadPoints, pageDimensions.height, scale);
}

/**
 * Gets coordinates representing upper right corner of the annotation
 * represented by the provided quad points. We define upper right corner
 * as the top right corner of the rectangle representing the top-most
 * annotation. Note that these coordinates are in PDF default user space, with
 * the origin at the bottom left corner of the document.
 *
 * @param {Number[]} quadPoints Quad points of annotation to get upper
 * right corner for in PDF space in PDF units
 * @returns {Number[]} [x,y] of upper right corner of quad points in PDF
 * space in PDF units
 */
export function getUpperRightCorner(quadPoints) {
    let [x, y] = [0, 0];
    quadPoints.forEach((quadPoint) => {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoint;

        // If this rectangle is higher than previously recorded highest,
        // use the right edge of this rectangle
        const tempY = Math.max(y, Math.max(y1, y2, y3, y4));
        if (tempY > y) {
            x = Math.max(x, Math.max(x1, x2, x3, x4));
            y = tempY;
        }
    });

    return [x, y];
}

//------------------------------------------------------------------------------
// General Utils
//------------------------------------------------------------------------------

/**
 * Escapes HTML.
 *
 * @param {String} str Input string
 * @returns {String} HTML escaped string
 */
export function htmlEscape(str) {
    return str.replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
}
