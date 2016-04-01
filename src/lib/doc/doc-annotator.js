import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import Annotator from '../annotation/annotator';
import Browser from '../browser';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';

import * as constants from '../annotation/constants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';
import { ICON_DELETE, ICON_DELETE_SMALL, ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const MENU_HIDE_TIMEOUT = 500;
const MOUSEMOVE_THROTTLE = 25;
const POINT_ANNOTATION_TYPE = 'point';
const TOUCH_EVENT = Browser.isMobile() ? 'touchstart' : 'click';
const TOUCH_END = Browser.isMobile() ? 'touchend' : 'mouseup';

// PDF unit = 1/72 inch, CSS pixel = 1/92 inch
const PDF_UNIT_TO_CSS_PIXEL = 4 / 3;
const CSS_PIXEL_TO_PDF_UNIT = 3 / 4;

const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';

/* ---------- Helpers ---------- */
/**
 * Finds the closest ancestor DOM element with the specified class.
 *
 * @param {HTMLElement} element Element to search ancestors of
 * @param {String} className Class name to query
 * @returns {HTMLElement|null} Closest ancestor with given class or null
 */
function findClosestElWithClass(element, className) {
    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el.classList && el.classList.contains(className)) {
            return el;
        }
    }

    return null;
}

/**
 * Finds the closest element with a data type and returns that data type.
 *
 * @param {HTMLElement} element Element to find closest data type for
 * @returns {string} Closest data type or empty string
 */
function findClosestDataType(element) {
    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el && el.getAttribute('data-type')) {
            return el.getAttribute('data-type');
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
function getPageElAndPageNumber(element) {
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
function showElement(elementOrSelector) {
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
function hideElement(elementOrSelector) {
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
function resetTextarea(element) {
    const textareaEl = element;
    textareaEl.value = '';
    textareaEl.style = '';
    textareaEl.classList.remove(CLASS_ACTIVE);
}

/**
 * Escapes HTML.
 *
 * @param {String} str Input string
 * @returns {String} HTML escaped string
 */
function htmlEscape(str) {
    return str.replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
}

/**
 * Fast test if a given point is within a polygon. Taken from
 * http://jsperf.com/ispointinpath-boundary-test-speed/6
 *
 * @param {Number[]} poly Polygon defined by array of [x,y] coordinates
 * @param {Number} x X coordinate of point to Test
 * @param {Number} y Y coordinate of point to Test
 * @returns {Boolean} Whether or not point is in the polygon
 */
function isPointInPolyOpt(poly, x, y) {
    /* eslint-disable */
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= y && y < poly[j][1]) || (poly[j][1] <= y && y < poly[i][1])) && (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) && (c = !c);
    return c;
    /* eslint-enable */
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
function isSelectionReversed(event, elements) {
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
 * Checks whether element is fully in viewport.
 *
 * @returns {Boolean} Whether element is fully in viewport
 */
function isElementInViewport(element) {
    const dimensions = element.getBoundingClientRect();

    return (
        dimensions.top >= 0 &&
        dimensions.left >= 0 &&
        dimensions.bottom <= window.innerHeight &&
        dimensions.right <= window.innerWidth
    );
}

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
function convertPDFSpaceToDOMSpace(coordinates, pageHeight, scale) {
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
function convertDOMSpaceToPDFSpace(coordinates, pageHeight, scale) {
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

    return pdfCoordinates.map((val) => val * CSS_PIXEL_TO_PDF_UNIT / scale);
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
function getQuadPoints(element, pageEl, scale) {
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
 * represented by the provided quad points. Note that these coordinates
 * are in PDF default user space, with the origin at the bottom left corner
 * of the document.
 *
 * @param {Number[]} quadPoints Quad points of annotation to get upper
 * right corner for in PDF space in PDF units
 * @returns {Number[]} [x,y] of upper right corner of quad points in PDF
 * space in PDF units
 */
function getUpperRightCorner(quadPoints) {
    let [x, y] = [0, 0];
    quadPoints.forEach((quadPoint) => {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoint;

        x = Math.max(x, Math.max(x1, x2, x3, x4));
        y = Math.max(y, Math.max(y1, y2, y3, y4));
    });

    return [x, y];
}

/**
 * Document annotator class. Extends base annotator class.
 */
@autobind
class DocAnnotator extends Annotator {

    /**
     * Initializes document annotations.
     *
     * @returns {void}
     */
    init() {
        // Event handler refs for cleanup
        this.handlerRefs = [];

        // Init scale if needed
        this.scale = this.scale || 1;

        this.setupAnnotations();
    }

    /**
     * Destructor.
     *
     * @returns {void}
     */
    destroy() {
        // Remove managed click event handlers
        this.removeAllEventHandlers();

        // Remove click handlers bound to document
        this.unbindHighlightHandlers();
        document.removeEventListener('mousemove', this.mousemoveHandler());
        document.removeEventListener(TOUCH_EVENT, this.pointClickHandler);
    }

    /**
     * Sets the zoom scale.
     *
     * @param {Number} scale
     * @returns {void}
     */
    setScale(scale) {
        this.scale = scale;

        // Reset any active annotation
        this.activeAnnotationID = '';
    }

    /* ---------- Generic Annotations ---------- */
    /**
     * Annotations setup.
     *
     * @returns {void}
     */
    setupAnnotations() {
        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));

        // Init in-memory map of annotations: page -> annotations on page
        // Note that this map only includes the first annotation in a thread
        // since we only need to display one annotation per thread and can
        // load the other ones on-demand
        this.annotations = {};

        // Set defaults for highlight annotations
        this.hoverAnnotationID = ''; // ID of annotation user is hovered over
        this.activeAnnotationID = ''; // ID of active annotation (clicked)

        this.bindHighlightHandlers();

        // Add handler for annotation hover behavior
        document.addEventListener('mousemove', this.mousemoveHandler());

        // Add handler for point annotation click behavior (for mobile)
        document.addEventListener(TOUCH_EVENT, this.pointClickHandler);

        // Hide annotation dialogs and buttons on right click
        document.addEventListener('contextmenu', this.contextmenuHandler);
    }

    /**
     * Fetches saved annotations and stores in-memory.
     *
     * @returns {Promise} Promise for fetching saved annotations
     */
    fetchAnnotations() {
        // @TODO(tjin): Load/unload annotations by page based on pages loaded from document viewer

        // Fetch map of thread ID to annotations, return the promise
        return this.annotationService.getAnnotationsForFile(this.fileID).then((annotationsMap) => {
            // Generate maps of page to annotations
            for (const annotations of annotationsMap.values()) {
                // We only need to show the first annotation in a thread
                const firstAnnotation = annotations[0];
                const page = firstAnnotation.location.page || 1;
                this.annotations[page] = this.annotations[page] || [];
                this.annotations[page].push(firstAnnotation);
            }
        });
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     */
    renderAnnotations() {
        this.showHighlightAnnotations();
        this.showPointAnnotations();
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // Show highlight and point annotations after we've generated
        // an in-memory map
        this.fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Create an annotation object from annotation data.
     *
     * @param {String} annotationType Type of annotation
     * @param {String} annotationText Comment text for annotation
     * @param {Object} locationData Location data
     * @returns {Annotation} Annotation
     */
    createAnnotationObject(annotationType, annotationText, locationData) {
        const data = {
            fileID: this.fileID,
            type: annotationType,
            text: annotationText,
            location: locationData,
            user: this.user
        };

        return new Annotation(data);
    }

    /**
     * Adds an annotation to persistant store and in-memory map
     *
     * @param {Annotation} annotation Annotation to add
     * @param {Boolean} addToMap Whether or not to add to in-memory map
     * @returns {Promise} Promise to add annotation, resolves with created
     * annotation
     */
    createAnnotation(annotation, addToMap) {
        if (addToMap) {
            const page = annotation.location.page;
            this.annotations[page] = this.annotations[page] || [];
            this.annotations[page].push(annotation);
        }

        return this.annotationService.create(annotation);
    }

    /**
     * Removes an annotation from persistant store and in-memory map
     *
     * @param {Annotation} annotation Annotation to remove
     * @param {Boolean} removeFromMap Whether or not to remove from in-memory map
     * @returns {Promise} Promise to remove annotation
     */
    deleteAnnotation(annotationID, removeFromMap) {
        // Remove from in-memory map. We use Array.prototype.some to short circuit loop
        if (removeFromMap) {
            Object.keys(this.annotations).some((page) => {
                const pageAnnotations = this.annotations[page];
                return pageAnnotations.some((annot, index) => {
                    if (annot.annotationID === annotationID) {
                        pageAnnotations.splice(index, 1);
                        return true;
                    }
                    return false;
                });
            });
        }

        // Remove from persistant store
        return this.annotationService.delete(annotationID);
    }

    /**
     * Right click handler - hides annotations-related dialogs, buttons,
     * and icons.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    contextmenuHandler() {
        hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
        hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
        hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
    }

    /**
     * Handler for mousemove over the document. Controls highlight and point
     * annotation hover behavior. We use a single throttled mousemove handler
     * for performance.
     *
     * @returns {Function} mousemove handler
     */
    mousemoveHandler() {
        if (!this.throttledMousemoveHandler) {
            this.throttledMousemoveHandler = throttle((event) => {
                // Short circuit all mousemove behavior if we are not on a page
                const eventTarget = event.target;
                const { pageEl, page } = getPageElAndPageNumber(eventTarget);
                if (page === -1) {
                    hideElement(constants.SELECTOR_ANNOTATION_POINT_ICON);
                    return;
                }

                // Point annotation hover behavior
                const dataType = findClosestDataType(eventTarget);
                const inAnnotationDialog = dataType === 'show-annotation-dialog' || dataType === 'create-annotation-dialog';

                // Show annotation thread when hovering over point icon
                if (dataType === 'show-point-annotation-btn') {
                    clearTimeout(this.timeoutHandler);
                    this.timeoutHandler = null;
                    this.showAnnotationDialog(event.target.getAttribute('data-thread-id'));
                } else if (inAnnotationDialog) {
                    clearTimeout(this.timeoutHandler);
                    this.timeoutHandler = null;
                } else {
                    if (!this.timeoutHandler) {
                        this.timeoutHandler = setTimeout(() => {
                            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
                            this.timeoutHandler = null;
                        }, MENU_HIDE_TIMEOUT);
                    }
                }

                // Get or create point annotation mode icon
                let pointAnnotationIconEl = document.querySelector(constants.SELECTOR_ANNOTATION_POINT_ICON);
                if (!pointAnnotationIconEl) {
                    pointAnnotationIconEl = document.createElement('div');
                    pointAnnotationIconEl.classList.add(constants.CLASS_ANNOTATION_POINT_ICON);
                    pointAnnotationIconEl.classList.add(CLASS_HIDDEN);
                }

                // Append point annotation icon to correct parent
                if (!pageEl.contains(pointAnnotationIconEl)) {
                    pageEl.appendChild(pointAnnotationIconEl);
                }

                // If in annotation mode and mouse is not in a dialog, make icon track the mouse
                const docEl = document.querySelector('.box-preview-doc');
                const inAnnotationMode = docEl.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE);
                if (inAnnotationMode && !inAnnotationDialog) {
                    const pageDimensions = pageEl.getBoundingClientRect();
                    // Icon is 22px wide so we shift icon left/up 11px to center on cursor
                    pointAnnotationIconEl.style.left = `${event.clientX - pageDimensions.left - 11}px`;
                    pointAnnotationIconEl.style.top = `${event.clientY - pageDimensions.top - 11}px`;
                    showElement(pointAnnotationIconEl);
                } else {
                    hideElement(pointAnnotationIconEl);
                }

                // Highlight annotation hover behavior
                if (!inAnnotationMode) {
                    // Redraw annotations only if annotation we're currently over has changed
                    const hoverAnnotationID = this.getHighlightIDFromMousePoint(event.clientX, event.clientY, page);
                    if (hoverAnnotationID !== this.hoverAnnotationID) {
                        // Cache which annotation we're currently over
                        this.hoverAnnotationID = hoverAnnotationID;
                        this.drawHighlightAnnotationsOnPage(page);
                    }
                }
            }, MOUSEMOVE_THROTTLE);
        }

        return this.throttledMousemoveHandler;
    }

    /* ---------- Highlight Annotations ---------- */
    /**
    * Draws a single highlight annotation on the provided context.
    *
    * @param {Annotation} annotation Highlight annotation to show
    * @param {RenderingContext} contex 2D drawing context to use
    * @returns {void}
    */
    drawHighlightAnnotation(annotation, context) {
        const ctx = context;
        const annotationID = annotation.annotationID;
        const quadPoints = annotation.location.quadPoints;
        const pageHeight = context.canvas.getBoundingClientRect().height;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.scale);
            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

            // If annotation being drawn is the annotation the mouse is over or
            // the annotation is 'active' or clicked, draw the highlight with
            // a different, darker color
            if (annotationID === this.hoverAnnotationID ||
                annotationID === this.activeAnnotationID) {
                ctx.fillStyle = HIGHLIGHT_ACTIVE_FILL_STYLE;
            } else {
                ctx.fillStyle = HIGHLIGHT_NORMAL_FILL_STYLE;
            }

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();

            // We 'cut out'/erase the highlight rectangle before drawing
            // the actual highlight rectangle to prevent overlapping
            // transparency
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = HIGHLIGHT_ERASE_FILL_STYLE;
            ctx.fill();
            ctx.restore();

            // Draw actual highlight rectangle
            ctx.fill();
        });
    }

    /**
     * Shows highlight annotations for the specified page by re-drawing all
     * highlight annotations currently in memory for the specified page.
     *
     * @param {Number} page Page to draw annotations for
     * @returns {void}
     */
    drawHighlightAnnotationsOnPage(page) {
        // let time = new Date().getTime();
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);
        if (!pageEl) {
            return;
        }

        // Create an annotation layer on the page if it doesn't exist
        let annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (!annotationLayerEl) {
            const pageDimensions = pageEl.getBoundingClientRect();
            const textLayerEl = pageEl.querySelector('.textLayer');
            annotationLayerEl = document.createElement('canvas');
            annotationLayerEl.classList.add('box-preview-annotation-layer');
            annotationLayerEl.width = pageDimensions.width;
            annotationLayerEl.height = pageDimensions.height;
            pageEl.insertBefore(annotationLayerEl, textLayerEl);
        }

        // Clear canvas
        const ctx = annotationLayerEl.getContext('2d');
        ctx.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);

        // Draw highlights
        const annotations = this.annotations[page] || [];
        annotations.forEach((annotation) => {
            if (annotation.type === HIGHLIGHT_ANNOTATION_TYPE) {
                this.drawHighlightAnnotation(annotation, ctx);
            }
        });

        // console.log(`Drawing annotations for page ${page} took ${new Date().getTime() - time}ms`);
    }

    /**
     * Shows highlight annotations (annotations on selected text).
     *
     * @param {Annotation[]} highlightAnnotations Array of highlight annotations
     * @returns {void}
     */
    showHighlightAnnotations() {
        Object.keys(this.annotations).forEach((page) => {
            const highlights = this.annotations[page].filter((annotation) => annotation.type === HIGHLIGHT_ANNOTATION_TYPE);

            // Draw highlights if there are any on the page
            if (highlights.length > 0) {
                this.drawHighlightAnnotationsOnPage(page);
            }
        });
    }

    /**
     * Shows the remove highlight button for an annotation.
     *
     * @param {Annotation} annotation Annotation to show remove button for
     * @returns {void}
     */
    showRemoveHighlightButton(annotation) {
        const page = annotation.location.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        let removeHighlightButtonEl = document.querySelector('.box-preview-remove-highlight-btn');
        if (!removeHighlightButtonEl) {
            removeHighlightButtonEl = document.createElement('button');
            removeHighlightButtonEl.classList.add('box-preview-remove-highlight-btn');
            removeHighlightButtonEl.innerHTML = ICON_DELETE;

            this.addEventHandler(removeHighlightButtonEl, (event) => {
                event.stopPropagation();

                const annotationID = removeHighlightButtonEl.getAttribute('data-annotation-id');

                this.deleteAnnotation(annotationID, true).then(() => {
                    // Redraw highlights on page
                    const pageNum = removeHighlightButtonEl.getAttribute('data-page');
                    this.drawHighlightAnnotationsOnPage(pageNum);

                    // Hide button
                    hideElement(removeHighlightButtonEl);
                });
            });

            pageEl.appendChild(removeHighlightButtonEl);
        } else {
            removeHighlightButtonEl.parentNode.removeChild(removeHighlightButtonEl);
            pageEl.appendChild(removeHighlightButtonEl);
        }

        // Create remove highlight button and position it above the upper right
        // corner of the highlight
        const pageHeight = pageEl.getBoundingClientRect().height;
        const upperRightCorner = getUpperRightCorner(annotation.location.quadPoints, pageEl);
        const [browserX, browserY] = convertPDFSpaceToDOMSpace(upperRightCorner, pageHeight, this.scale);

        // Position button
        removeHighlightButtonEl.style.left = `${browserX - 20}px`;
        removeHighlightButtonEl.style.top = `${browserY - 50}px`;
        removeHighlightButtonEl.setAttribute('data-annotation-id', annotation.annotationID);
        removeHighlightButtonEl.setAttribute('data-page', page);
        showElement(removeHighlightButtonEl);
    }

    /**
     * Returns the highlight annotation ID of the highlight located at the
     * specified mouse location.
     *
     * @param {Number} mouseX clientX of mouse event
     * @param {Number} mouseY clientY of mouse event
     * @param {Number} page Page of document
     * @returns {String} Highlight annotation ID if a highlight is at the
     * location or an empty string
     */
    getHighlightIDFromMousePoint(mouseX, mouseY, page) {
        const annotations = this.annotations[page];
        if (!Array.isArray(annotations)) {
            return '';
        }

        const highlights = annotations.filter((annotation) => annotation.type === HIGHLIGHT_ANNOTATION_TYPE);
        if (!highlights) {
            return '';
        }

        const pageEl = document.querySelector(`[data-page-number="${page}"]`);
        const canvasEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (!canvasEl) {
            return '';
        }

        const canvasDimensions = canvasEl.getBoundingClientRect();
        const pageHeight = canvasDimensions.height;

        // DOM coordinates with respect to the page
        const x = mouseX - canvasDimensions.left;
        const y = mouseY - canvasDimensions.top;

        // We loop through all the annotations on this page and see if the
        // mouse is over some annotation. We use Array.prototype.some so
        // we can stop iterating over annotations when we've found one.
        let hoverAnnotationID = '';
        highlights.some((highlight) => {
            return highlight.location.quadPoints.some((quadPoint) => {
                const browserQuadPoint = convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.scale);
                const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

                // Check if mouse is inside a rectangle of this
                // annotation
                const isPointInPoly = isPointInPolyOpt([
                    [x1, y1],
                    [x2, y2],
                    [x3, y3],
                    [x4, y4]
                ], x, y);

                if (isPointInPoly) {
                    hoverAnnotationID = highlight.annotationID;
                }

                return isPointInPoly;
            });
        });

        return hoverAnnotationID;
    }

    /**
     * Binds highlight-related event handlers. We don't manage these with
     * our 'addEventHandler' since they're all bound on the document and we
     * don't want to remove the wrong ones during cleanup.
     *
     * @returns {void}
     */
    bindHighlightHandlers() {
        // Add click handlers for activating a highlight or showing and hiding point comments
        document.addEventListener(TOUCH_EVENT, this.highlightClickHandler);

        // Add mouseup/touchend event for showing the add highlight button
        document.addEventListener(TOUCH_END, this.showAddHighlightButtonHandler);
    }

    /**
     * Unbinds highlight-related event handlers.
     *
     * @returns {void}
     */
    unbindHighlightHandlers() {
        document.removeEventListener(TOUCH_EVENT, this.highlightClickHandler);
        document.removeEventListener(TOUCH_END, this.showAddHighlightButtonHandler);
    }

    /**
     * Handler to show the add highlight button. Shown when mouse is
     * released or touch is ended and there is a selection on screen.
     *
     * @returns {void}
     */
    showAddHighlightButtonHandler(event) {
        // Do nothing if there is no selection
        const selection = window.getSelection();
        if (selection.isCollapsed || selection.rangeCount < 1) {
            return;
        }

        // Do nothing if any annotation dialog is open
        const annotationDialogEls = [].slice.call(document.querySelectorAll(constants.SELECTOR_ANNOTATION_DIALOG), 0);
        if (annotationDialogEls.some((dialogEl) => !dialogEl.classList.contains(CLASS_HIDDEN))) {
            return;
        }

        // Use Rangy to save the current selection because using the
        // highlight module can mess with the selection. We restore this
        // selection after we clean up the highlight
        const savedSelection = rangy.saveSelection();

        const pageEl = getPageElAndPageNumber(selection.anchorNode.parentNode).pageEl;
        if (!pageEl) {
            return;
        }

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        const highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        const highlightEls = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightEls.length === 0) {
            return;
        }

        let addHighlightButtonEl = document.querySelector(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        if (!addHighlightButtonEl) {
            addHighlightButtonEl = document.createElement('button');
            addHighlightButtonEl.classList.add(constants.CLASS_HIGHLIGHT_BUTTON_ADD);
            addHighlightButtonEl.innerHTML = ICON_HIGHLIGHT;

            this.addEventHandler(addHighlightButtonEl, this.addHighlightAnnotationHandler);
        }

        // Calculate where to position button
        const pageDimensions = pageEl.getBoundingClientRect();
        let buttonX;
        let buttonY;

        // If selection is reversed, button should be placed before the first line of selection
        if (isSelectionReversed(event, highlightEls)) {
            const firstHighlightEl = highlightEls[0];
            const dimensions = firstHighlightEl.getBoundingClientRect();
            buttonX = dimensions.left - pageDimensions.left - 20;
            buttonY = dimensions.top - pageDimensions.top - 50;

        // Otherwise, button should be placed after bottom line of selection
        } else {
            const lastHighlightEl = highlightEls[highlightEls.length - 1];
            const dimensions = lastHighlightEl.getBoundingClientRect();
            buttonX = dimensions.right - pageDimensions.left - 20;
            buttonY = dimensions.top - pageDimensions.top - 50;
        }

        // Position button
        addHighlightButtonEl.style.left = `${buttonX}px`;
        addHighlightButtonEl.style.top = `${buttonY}px`;
        showElement(addHighlightButtonEl);
        pageEl.appendChild(addHighlightButtonEl);

        // Clean up rangy highlight and restore selection
        this.removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);
    }

    /**
     * Shows the remove highlight button for an annotation.
     *
     * @param {Annotation} annotation Annotation to show remove button for
     * @returns {void}
     */
    showRemoveHighlightButton(annotation) {
        const page = annotation.location.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        let removeHighlightButtonEl = document.querySelector('.box-preview-remove-highlight-btn');
        if (!removeHighlightButtonEl) {
            removeHighlightButtonEl = document.createElement('button');
            removeHighlightButtonEl.classList.add('box-preview-remove-highlight-btn');
            removeHighlightButtonEl.innerHTML = ICON_DELETE;

            this.addEventHandler(removeHighlightButtonEl, (event) => {
                event.stopPropagation();

                const annotationID = removeHighlightButtonEl.getAttribute('data-annotation-id');

                this.deleteAnnotation(annotationID, true).then(() => {
                    // Redraw highlights on page
                    const pageNum = parseInt(removeHighlightButtonEl.getAttribute('data-page'), 10);
                    this.drawHighlightAnnotationsOnPage(pageNum);
                    hideElement(removeHighlightButtonEl);
                });
            });
        }

        // Create remove highlight button and position it above the upper right corner of the highlight
        const pageHeight = pageEl.getBoundingClientRect().height;
        const upperRightCorner = getUpperRightCorner(annotation.location.quadPoints, pageEl);
        const [browserX, browserY] = convertPDFSpaceToDOMSpace(upperRightCorner, pageHeight, this.scale);

        // Position button
        removeHighlightButtonEl.style.left = `${browserX - 20}px`;
        removeHighlightButtonEl.style.top = `${browserY - 50}px`;
        removeHighlightButtonEl.setAttribute('data-annotation-id', annotation.annotationID);
        removeHighlightButtonEl.setAttribute('data-page', page);
        showElement(removeHighlightButtonEl);
        pageEl.appendChild(removeHighlightButtonEl);
    }

    /**
     * Document click handler for handling highlights. Activates highlights
     * when they are clicked on by changing style to be a darker shade and
     * showing the delete highlight button. Also hides any existing add or
     * remove highlight buttons beforehand.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    highlightClickHandler(event) {
        event.stopPropagation();

        // Hide add highlight button if there is no current selection
        const selection = window.getSelection();
        if (selection.isCollapsed || selection.rangeCount < 1) {
            hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        }

        // Stop dealing with highlights if the click was outside a page
        const page = getPageElAndPageNumber(event.target).page;
        if (page === -1) {
            return;
        }

        // Redraw with active annotation if needed
        const clickedAnnotationID = this.getHighlightIDFromMousePoint(event.clientX, event.clientY, page);
        if (this.activeAnnotationID !== clickedAnnotationID) {
            this.activeAnnotationID = clickedAnnotationID;
            this.drawHighlightAnnotationsOnPage(page);
        }

        // Hide any existing remove highlight button
        hideElement('.box-preview-remove-highlight-btn');

        // Show remove highlight button if we clicked on an annotation
        if (this.activeAnnotationID) {
            const highlight = this.annotations[page].find((annotation) => annotation.annotationID === this.activeAnnotationID);
            if (highlight) {
                this.showRemoveHighlightButton(highlight);
            }
        }
    }

    /**
     * Event handler for adding a highlight annotation. Generates a highlight
     * out of the current window selection and saves it.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addHighlightAnnotationHandler(event) {
        event.stopPropagation();

        // Do nothing if there is no selection
        const selection = window.getSelection();
        if (selection.isCollapsed || selection.rangeCount < 1) {
            return;
        }

        const { pageEl, page } = getPageElAndPageNumber(selection.anchorNode.parentNode);
        if (!pageEl) {
            return;
        }

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        const highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        const highlightEls = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightEls.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightEls.forEach((element) => {
            quadPoints.push(getQuadPoints(element, pageEl, this.scale));
        });

        // Unselect text and remove rangy highlight
        selection.removeAllRanges();
        this.removeRangyHighlight(highlight);

        // Create annotation
        const annotation = this.createAnnotationObject(HIGHLIGHT_ANNOTATION_TYPE, '', {
            page,
            quadPoints
        });

        // Save and show annotation
        this.createAnnotation(annotation, true).then(() => {
            // Redraw annotations to show new annotation
            this.drawHighlightAnnotationsOnPage(page);
        });

        // Hide add highlight button
        hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
    }

    /* ---------- Point Annotations ---------- */
    /**
     * Shows a single point annotation (annotation on specific points).
     *
     * @param {Annotation} annotation Point annotation to show
     * @returns {void}
     */
    showPointAnnotation(annotation) {
        // Create point annotation HTML
        const pointAnnotationButtonEl = document.createElement('button');
        pointAnnotationButtonEl.classList.add('box-preview-show-point-annotation-btn');
        pointAnnotationButtonEl.setAttribute('data-type', 'show-point-annotation-btn');
        pointAnnotationButtonEl.setAttribute('data-thread-id', annotation.threadID);

        const location = annotation.location;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        // Annotation icon is 22px wide
        pointAnnotationButtonEl.style.left = `${browserX - 11}px`;
        pointAnnotationButtonEl.style.top = `${browserY - 11}px`;
        pageEl.appendChild(pointAnnotationButtonEl);
    }

    /**
     * Shows point annotations (annotations on specific points).
     *
     * @param {Annotation[]} pointAnnotations Array of point annotations
     * @returns {void}
     */
    showPointAnnotations() {
        Object.keys(this.annotations).forEach((page) => {
            const points = this.annotations[page].filter((annotation) => annotation.type === POINT_ANNOTATION_TYPE);
            points.forEach((annotation) => {
                this.showPointAnnotation(annotation);
            });
        });
    }

    /**
     * Shows a placeholder point annotation icon at the specified location.
     *
     * @param {Object} location Location data for where to place placeholder
     * @returns {void}
     */
    showPlaceholderPointAnnotation(location) {
        let pointPlaceholderEl = document.querySelector(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        if (!pointPlaceholderEl) {
            pointPlaceholderEl = document.createElement('button');
            pointPlaceholderEl.classList.add(constants.CLASS_ANNOTATION_POINT_PLACEHOLDER);
        }

        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);
        pointPlaceholderEl.style.left = `${browserX - 11}px`;
        pointPlaceholderEl.style.top = `${browserY - 11}px`;
        showElement(pointPlaceholderEl);
        pageEl.appendChild(pointPlaceholderEl);
    }

    /**
     * Handler for click on document for showing and hiding point comments
     * and dialog. This is mainly used for mobile compatibility since on the
     * web, we have a hover interaction.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    pointClickHandler(event) {
        const eventTarget = event.target;
        const dataType = findClosestDataType(eventTarget);

        if (dataType === 'show-point-annotation-btn') {
            this.showAnnotationDialog(eventTarget.getAttribute('data-thread-id'));
        } else if (dataType === 'show-annotation-dialog') {
            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        } else if (dataType === 'create-annotation-dialog') {
            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
            hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        } else {
            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
            hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        }
    }

    /**
     * Toggles point annotation mode on and off. When point annotation mode is
     * on, clicking an area will create a point annotation at that location.
     *
     * @returns {void}
     */
    togglePointAnnotationModeHandler() {
        const docEl = document.querySelector('.box-preview-doc');

        // If in annotation mode, turn it off
        if (docEl.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)) {
            docEl.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            this.removeEventHandlers(docEl);

            // Enable highlight-related events
            this.bindHighlightHandlers();

        // Otherwise, enable annotation mode
        } else {
            docEl.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            this.addEventHandler(docEl, this.addPointAnnotationHandler);

            // Disable highlight-related events
            this.unbindHighlightHandlers();
        }
    }

    /**
     * Event handler for adding a point annotation. Shows a create point
     * annotation dialog at the next location the user clicks.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addPointAnnotationHandler(event) {
        event.stopPropagation();

        // @TODO(tjin): Close existing open annotations

        // @TODO(tjin): Investigate edge cases with existing highlights in 'bindOnClickCreateComment'

        // If click isn't on a page, ignore
        const eventTarget = event.target;
        const { pageEl, page } = getPageElAndPageNumber(eventTarget);
        if (!pageEl) {
            return;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = findClosestDataType(eventTarget);
        if (dataType === 'show-annotation-dialog' ||
            dataType === 'create-annotation-dialog') {
            return;
        }

        // Store coordinates at 100% scale in PDF space in PDF units
        const pageDimensions = pageEl.getBoundingClientRect();
        const browserCoordinates = [event.clientX - pageDimensions.left, event.clientY - pageDimensions.top];
        const pdfCoordinates = convertDOMSpaceToPDFSpace(browserCoordinates, pageDimensions.height, this.scale);
        const [x, y] = pdfCoordinates;
        const locationData = { x, y, page };

        this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);
    }

    /* ---------- Dialogs ---------- */
    /**
     * Show a dialog that allows a user to create an annotation.
     *
     * @param {Object} locationData Location to place dialog
     * @param {String} annotationType Type of annotation
     * @returns {void}
     */
    createAnnotationDialog(locationData, annotationType) {
        // Show a placeholder & hide point annotation indicator
        this.showPlaceholderPointAnnotation(locationData);
        hideElement(constants.SELECTOR_ANNOTATION_POINT_ICON);

        // Create annotation dialog HTML
        let annotationDialogEl = document.querySelector(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
        if (!annotationDialogEl) {
            annotationDialogEl = document.createElement('div');
            annotationDialogEl.setAttribute('data-type', 'create-annotation-dialog');
            annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG_CREATE);
            const annotationElString = `
                <div class="annotation-container">
                    <textarea class="annotation-textarea ${CLASS_ACTIVE}" placeholder="Add a comment here..."></textarea>
                    <div class="button-container">
                        <button class="btn cancel-annotation-btn">CANCEL</button>
                        <button class="btn btn-primary post-annotation-btn">POST</button>
                    </div>
                </div>`.trim();
            annotationDialogEl.innerHTML = annotationElString;
        }

        const postButtonEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_POST);
        const cancelButtonEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_CANCEL);
        const annotationTextEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);

        // Clean up existing handler
        this.removeEventHandlers(postButtonEl, cancelButtonEl);

        // Clicking 'Post' to add annotation
        this.addEventHandler(postButtonEl, () => {
            event.stopPropagation();

            // Get annotation text and create annotation
            const annotationText = annotationTextEl.value;
            const annotation = this.createAnnotationObject(annotationType, annotationText, locationData);

            // Save annotation
            this.createAnnotation(annotation, true).then((createdAnnotation) => {
                hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
                hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);

                // Show point annotation icon
                this.showPointAnnotation(createdAnnotation);

                // Show newly created annotation text on top
                this.showAnnotationDialog(createdAnnotation.threadID);
            });
        });

        // Clicking 'Cancel' to cancel annotation
        this.addEventHandler(cancelButtonEl, (event) => {
            event.stopPropagation();
            hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        });

        this.positionDialog(annotationDialogEl, locationData);

        annotationTextEl.value = '';

        // Focus only if in viewport - otherwise, focus forces a scroll
        if (isElementInViewport(annotationTextEl)) {
            annotationTextEl.focus();
        }
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {String} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        // Don't regenerate dialog if the appropriate one is open already
        let annotationDialogEl = document.querySelector(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
        if (annotationDialogEl && !annotationDialogEl.classList.contains(CLASS_HIDDEN) &&
            annotationDialogEl.getAttribute('data-thread-id') === threadID) {
            return;
        }

        this.annotationService.getAnnotationsForThread(threadID).then((annotations) => {
            if (!annotations || annotations.length === 0) {
                return;
            }

            // Create annotation dialog if needed
            if (!annotationDialogEl) {
                annotationDialogEl = document.createElement('div');
                annotationDialogEl.setAttribute('data-type', 'show-annotation-dialog');
                annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG);
                annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG_SHOW);
                annotationDialogEl.innerHTML = `
                    <div class="annotation-container">
                        <div class="annotation-comments"></div>
                        <div class="reply-container">
                            <textarea class="annotation-textarea" placeholder="Post a reply..."></textarea>
                            <div class="button-container ${CLASS_HIDDEN}">
                                <button class="btn cancel-annotation-btn">CANCEL</button>
                                <button class="btn btn-primary post-annotation-btn">POST</button>
                            </div>
                        </div>
                    </div>`.trim();
            }

            annotationDialogEl.setAttribute('data-thread-id', threadID);

            const replyContainerEl = annotationDialogEl.querySelector(constants.SELECTOR_REPLY_CONTAINER);
            const replyButtonContainerEl = replyContainerEl.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
            const replyTextEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            const cancelButtonEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_CANCEL);
            const postButtonEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_POST);
            const annotationCommentsEl = annotationDialogEl.querySelector(constants.SELECTOR_COMMENTS_CONTAINER);
            const commentButtonEls = [].slice.call(annotationCommentsEl.querySelectorAll('button'), 0);

            // Remove old event handlers for reply buttons and delete-related buttons inside the comment thread
            this.removeEventHandlers(cancelButtonEl, postButtonEl, ...commentButtonEls);

            // Reset thread
            annotationCommentsEl.innerHTML = '';
            resetTextarea(replyTextEl);

            // Clicking in textarea shows reply buttons
            this.addEventHandler(replyTextEl, (event) => {
                event.stopPropagation();

                replyTextEl.classList.add(CLASS_ACTIVE);
                showElement(replyButtonContainerEl);
            });

            // Typing in textarea shows reply buttons
            this.addEventHandler(replyTextEl, (event) => {
                event.stopPropagation();

                replyTextEl.classList.add(CLASS_ACTIVE);
                showElement(replyButtonContainerEl);
            }, 'keydown');

            // Clicking 'Cancel' to cancel adding a reply annotation
            this.addEventHandler(cancelButtonEl, (event) => {
                event.stopPropagation();

                resetTextarea(replyTextEl);
                hideElement(replyButtonContainerEl);
                replyTextEl.focus();
            });

            // Clicking 'Post' to add a reply annotation
            const firstAnnotation = annotations[0];
            this.addEventHandler(postButtonEl, (event) => {
                event.stopPropagation();

                resetTextarea(replyTextEl);
                hideElement(replyButtonContainerEl);

                // Create annotation, but don't add to in-memory map since a thread already exists
                const newAnnotation = Annotation.copy(firstAnnotation, {
                    text: replyTextEl.value.trim(),
                    user: this.user
                });
                this.createAnnotation(newAnnotation, false).then((createdAnnotation) => {
                    const annotationEl = this.createAnnotationCommentEl(createdAnnotation);
                    annotationCommentsEl.appendChild(annotationEl);
                });

                // Focus only if in viewport - otherwise, focus forces a scroll
                if (isElementInViewport(replyTextEl)) {
                    replyTextEl.focus();
                }
            });

            // Loop through annotation comments to generate comment thread
            annotations.forEach((annotation) => {
                // Create annotation comment boxes per annotation in thread
                const annotationEl = this.createAnnotationCommentEl(annotation);
                annotationCommentsEl.appendChild(annotationEl);
            });

            // All annotations in a thread should have the same location
            const locationData = firstAnnotation.location || {};
            this.positionDialog(annotationDialogEl, locationData);

            // Focus only if in viewport - otherwise, focus forces a scroll
            if (isElementInViewport(replyTextEl)) {
                replyTextEl.focus();
            }
        });
    }

    /**
     * Creates a single annotation comment in a thread and binds relevant
     * event handlers for the buttons.
     *
     * @param {Annotation} annotation Annotation to create comment with
     * @returns {HTMLElement} Annotation comment element
     */
    createAnnotationCommentEl(annotation) {
        const avatarUrl = htmlEscape(annotation.user.avatarUrl);
        const userName = htmlEscape(annotation.user.name);
        const created = new Date(annotation.created).toLocaleDateString(
            'en-US',
            { hour: '2-digit', minute: '2-digit' }
        );
        const text = htmlEscape(annotation.text);

        const annotationEl = document.createElement('div');
        annotationEl.classList.add('annotation-comment');
        annotationEl.innerHTML = `
            <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
            <div class="profile-container">
                <div class="user-name">${userName}</div>
                <div class="comment-date">${created}</div>
            </div>
            <div class="comment-text">${text}</div>
            <button class="btn-plain delete-comment-btn">${ICON_DELETE_SMALL}</button>
            <div class="delete-confirmation ${CLASS_HIDDEN}">
                <div class="delete-confirmation-message">Delete this annotation?</div>
                <div class="button-container">
                    <button class="btn cancel-delete-btn">CANCEL</button>
                    <button class="btn btn-primary confirm-delete-btn">DELETE</button>
                </div>
            </div>`.trim();

        // Bind event handlers for delete-related buttons
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
        const confirmDeleteButtonEl = annotationEl.querySelector('.confirm-delete-btn');

        // Clicking delete button to initiate deletion of annotation
        this.addEventHandler(deleteButtonEl, (event) => {
            event.stopPropagation();

            showElement(deleteConfirmationEl);
            cancelDeleteButtonEl.focus();
        });

        // Clicking 'No' to cancel deletion of annotation
        this.addEventHandler(cancelDeleteButtonEl, (event) => {
            event.stopPropagation();

            hideElement(deleteConfirmationEl);
            deleteButtonEl.focus();
        });

        // Clicking 'Yes' to confirm deletion of annotation
        this.addEventHandler(confirmDeleteButtonEl, (event) => {
            event.stopPropagation();
            const annotationParentEl = annotationEl.parentNode;
            const isRootAnnotation = annotationParentEl.childElementCount === 1;

            // Remove from in-memory map if it is root annotation
            this.deleteAnnotation(annotation.annotationID, isRootAnnotation).then(() => {
                this.removeEventHandlers(deleteButtonEl, cancelDeleteButtonEl, confirmDeleteButtonEl);
                annotationParentEl.removeChild(annotationEl);

                // If this was the root comment in this thread, remove the whole thread
                if (isRootAnnotation) {
                    hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);

                    // Remove point icon when we delete whole thread
                    const pointAnnotationButtonEl = document.querySelector(`[data-thread-id="${annotation.threadID}"]`);
                    if (pointAnnotationButtonEl) {
                        this.removeEventHandlers(pointAnnotationButtonEl);
                        pointAnnotationButtonEl.parentNode.removeChild(pointAnnotationButtonEl);
                    }
                }
            }).catch(() => {
                // console.log('There was an error deleting your annotation');
            });
        });

        return annotationEl;
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} location Annotation location object
     * @returns {void}
     */
    positionDialog(dialogEl, location) {
        const positionedDialogEl = dialogEl;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        // Show dialog so we can get width
        pageEl.appendChild(dialogEl);
        showElement(positionedDialogEl);
        const dimensions = dialogEl.getBoundingClientRect();

        // Center middle of dialog with point
        positionedDialogEl.style.left = `${browserX - dimensions.width / 2}px`;

        // Position 7px below location and transparent border pushes it down further
        positionedDialogEl.style.top = `${browserY + 7}px`;

        // @TODO(tjin): reposition to avoid sides
    }

    /* ---------- Helpers ---------- */
    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the
     * internal highlighter list that has a matching ID. We can't directly use
     * the highlighter's removeHighlights since the highlight could possibly
     * not be a true Rangy highlight object.
     *
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     */
    removeRangyHighlight(highlight) {
        const highlights = this.highlighter.highlights;
        if (!Array.isArray(highlights)) {
            return;
        }

        const matchingHighlights = highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this.highlighter.removeHighlights(matchingHighlights);
    }

    /**
     * Helper to add event handler to an element and save a reference for
     * cleanup.
     *
     * @param {HTMLElement} element Element to attach handler to
     * @param {Function} handler Event handler
     * @param {String} [eventType] Optional type of event
     * @returns {void}
     */
    addEventHandler(element, handler, eventType = TOUCH_EVENT) {
        element.addEventListener(eventType, handler);

        let handlerRef = this.handlerRefs.find((ref) => {
            return ref.element === element;
        });

        if (!handlerRef) {
            handlerRef = {
                element,
                handlers: [handler]
            };

            this.handlerRefs.push(handlerRef);
        } else {
            handlerRef.handlers.push(handler);
        }
    }

    /**
     * Helper to remove all saved event handlers from an element or multiple
     * elements.
     *
     * @param {...HTMLElement} elements Element(s) to remove handlers from
     * @returns {void}
     */
    removeEventHandlers(...elements) {
        elements.forEach((element) => {
            if (!element || typeof element.removeEventListener !== 'function') {
                return;
            }

            // Find the matching element and handler ref
            const handlerIndex = this.handlerRefs.findIndex((ref) => {
                return ref.element === element;
            });
            if (handlerIndex === -1) {
                return;
            }

            // Remove all the handlers in the handler ref from the element
            this.handlerRefs[handlerIndex].handlers.forEach((handler) => {
                element.removeEventListener(TOUCH_EVENT, handler);
            });

            // Remove handler ref entry
            this.handlerRefs.splice(handlerIndex, 1);
        });
    }

    /**
     * Helper to remove all saved event handlers.
     *
     * @returns {void}
     */
    removeAllEventHandlers() {
        this.handlerRefs.forEach((handlerRef) => {
            const element = handlerRef.element;
            handlerRef.handlers.forEach((handler) => {
                element.removeEventListener(TOUCH_EVENT, handler);
            });
        });
    }
}

export default DocAnnotator;
