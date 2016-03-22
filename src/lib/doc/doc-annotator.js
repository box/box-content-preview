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

import { CLASS_HIDDEN } from '../constants';
import { ICON_DELETE, ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
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
        // Remove click event handlers
        this.removeAllEventHandlers();

        // Remove highlight mousemove and click handler
        document.removeEventListener('mousemove', this.highlightMousemoveHandler());
        document.removeEventListener(TOUCH_EVENT, this.highlightClickHandler);
        document.removeEventListener(TOUCH_END, this.showAddHighlightButtonHandler);
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

        // Add mousemove handler for adding a hover effect to highlights
        document.addEventListener('mousemove', this.highlightMousemoveHandler());

        // Add click handler for activating a highlight
        document.addEventListener(TOUCH_EVENT, this.highlightClickHandler);

        // Add mouseup/touchend event for showing the add highlight button
        document.addEventListener(TOUCH_END, this.showAddHighlightButtonHandler);
    }

    /**
     * Fetches saved annotations and stores in-memory.
     *
     * @returns {Promise} Promise for fetching saved annotations
     */
    fetchAnnotations() {
        // @TODO(tjin): Load/unload annotations by page based on pages loaded
        // from document viewer

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
        // Remove from in-memory map. We use Array.prototype.some to short
        // circuit loop
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
                    const pageNum = parseInt(removeHighlightButtonEl.getAttribute('data-page'), 10);
                    this.drawHighlightAnnotationsOnPage(pageNum);

                    // Hide button
                    removeHighlightButtonEl.classList.add(CLASS_HIDDEN);
                });
            });
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
        removeHighlightButtonEl.classList.remove(CLASS_HIDDEN);
        pageEl.appendChild(removeHighlightButtonEl);
    }

    /**
     * Hides the add highlight button.
     *
     * @returns {void}
     */
    hideAddHighlightButton() {
        const addHighlightButtonEl = document.querySelector('.box-preview-add-highlight-btn');
        if (addHighlightButtonEl) {
            addHighlightButtonEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Hides the remove highlight button.
     *
     * @returns {void}
     */
    hideRemoveHighlightButton() {
        const removeHighlightButtonEl = document.querySelector('.box-preview-remove-highlight-btn');
        if (removeHighlightButtonEl) {
            removeHighlightButtonEl.classList.add(CLASS_HIDDEN);
        }
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
     * Handler for mousemove over the document. Adds a hover effect for
     * highlight annotations.
     *
     * @returns {Function} mousemove handler
     */
    highlightMousemoveHandler() {
        if (!this.throttledHighlightMousemoveHandler) {
            this.throttledHighlightMousemoveHandler = throttle((event) => {
                const page = getPageElAndPageNumber(event.target).page;
                if (page === -1) {
                    return;
                }

                // Redraw annotations only if annotation we're currently over
                // has changed
                const hoverAnnotationID = this.getHighlightIDFromMousePoint(event.clientX, event.clientY, page);
                if (hoverAnnotationID !== this.hoverAnnotationID) {
                    // Cache which annotation we're currently over
                    this.hoverAnnotationID = hoverAnnotationID;
                    this.drawHighlightAnnotationsOnPage(page);
                }
            }, 100);
        }

        return this.throttledHighlightMousemoveHandler;
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
            this.hideAddHighlightButton();
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

        // Hide remove highlight button
        this.hideRemoveHighlightButton();

        // Show remove highlight button if we clicked on an annotation
        if (this.activeAnnotationID) {
            const highlight = this.annotations[page].find((annotation) => annotation.annotationID === this.activeAnnotationID);
            if (highlight) {
                this.showRemoveHighlightButton(highlight);
            }
        }
    }

    /**
     * Handler for showing the add highlight button. Shown when mouse is
     * released or touch is ended and there is a selection on screen.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    showAddHighlightButtonHandler(event) {
        event.stopPropagation();

        // Do nothing if there is no selection
        const selection = window.getSelection();
        if (selection.isCollapsed || selection.rangeCount < 1) {
            return;
        }

        // Use rangy to save the current selection because using the
        // highlight module can mess with the selection
        const savedSelection = rangy.saveSelection();

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        const pageEl = getPageElAndPageNumber(selection.anchorNode.parentNode).pageEl;
        const highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        const highlightEls = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightEls.length === 0) {
            return;
        }

        let addHighlightButtonEl = document.querySelector('.box-preview-add-highlight-btn');
        if (!addHighlightButtonEl) {
            addHighlightButtonEl = document.createElement('button');
            addHighlightButtonEl.classList.add('box-preview-add-highlight-btn');
            addHighlightButtonEl.innerHTML = ICON_HIGHLIGHT;

            this.addEventHandler(addHighlightButtonEl, (ev) => {
                // @TODO(tjin): Maybe redo this so we aren't just calling that handler
                this.addHighlightAnnotationHandler(ev);

                // Hide button
                addHighlightButtonEl.classList.add(CLASS_HIDDEN);
            });
        }

        // Position button
        const lastHighlightEl = highlightEls[highlightEls.length - 1];
        const dimensions = lastHighlightEl.getBoundingClientRect();
        const pageDimensions = pageEl.getBoundingClientRect();
        addHighlightButtonEl.style.left = `${dimensions.right - pageDimensions.left - 20}px`;
        addHighlightButtonEl.style.top = `${dimensions.top - pageDimensions.top - 50}px`;
        addHighlightButtonEl.classList.remove(CLASS_HIDDEN);
        pageEl.appendChild(addHighlightButtonEl);

        // Clean up rangy highlight and restore selection
        this.removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);
    }

    /**
     * Event handler for adding a highlight annotation. Shows a create
     * highlight annotation dialog with the currently selected text.
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
        this.createAnnotation(annotation, true).then((createdAnnotation) => {
            // Redraw annotations and show new annotation in active state
            this.activeAnnotationID = createdAnnotation.annotationID;
            this.drawHighlightAnnotationsOnPage(page);
            this.showRemoveHighlightButton(createdAnnotation);
        });
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
        const pointAnnotationEl = document.createElement('div');
        const annotationElString = `
            <div class="caret-up"></div>
            <div class="annotation-container">
                <button class="btn show-point-annotation-btn">
                    <span>P</span>
                </button>
            </div>`.trim();
        pointAnnotationEl.classList.add('box-preview-annotation-dialog');
        pointAnnotationEl.setAttribute('data-thread-id', annotation.threadID);
        pointAnnotationEl.innerHTML = annotationElString;

        const location = annotation.location;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        // Annotation icon is 50px wide, so position it 25px to the left of
        // the saved coordinates to center
        pointAnnotationEl.style.left = `${browserX - 25}px`;
        pointAnnotationEl.style.top = `${browserY}px`;

        pageEl.appendChild(pointAnnotationEl);

        const showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
        this.addEventHandler(showPointAnnotationButtonEl, (event) => {
            event.stopPropagation();
            this.showAnnotationDialog(annotation.threadID);
        });
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

        this.addEventHandler(document, (e) => {
            e.stopPropagation();

            // If click isn't on a page, disregard
            const { pageEl, page } = getPageElAndPageNumber(e.target);
            if (!pageEl) {
                return;
            }

            // Store coordinates at 100% scale in PDF space in PDF units
            const pageDimensions = pageEl.getBoundingClientRect();
            const browserCoordinates = [e.clientX - pageDimensions.left, e.clientY - pageDimensions.top];
            const pdfCoordinates = convertDOMSpaceToPDFSpace(browserCoordinates, pageDimensions.height, this.scale);
            const [x, y] = pdfCoordinates;
            const locationData = { x, y, page };

            this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);

            // Cleanup handler
            this.removeEventHandlers(document);
        });
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
        // Create annotation dialog HTML
        const annotationDialogEl = document.createElement('div');
        const annotationElString = `
            <div class="caret-up"></div>
            <div class="annotation-container">
                <textarea class="annotation-textarea"></textarea>
                <div class="button-container">
                    <button class="btn cancel-annotation-btn">
                        <span>Cancel</span>
                    </button>
                    <button class="btn post-annotation-btn">
                        <span>Post</span>
                    </button>
                </div>
            </div>`.trim();
        annotationDialogEl.classList.add('box-preview-annotation-dialog');
        annotationDialogEl.innerHTML = annotationElString;

        const postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
        const cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn');
        const annotationTextEl = annotationDialogEl.querySelector('.annotation-textarea');

        // Function to clean up event handlers and close dialog
        const closeCreateDialog = () => {
            this.removeEventHandlers(document, postButtonEl, cancelButtonEl);
            annotationDialogEl.parentNode.removeChild(annotationDialogEl);
        };

        // Clicking 'Post' to add annotation
        this.addEventHandler(postButtonEl, () => {
            event.stopPropagation();

            // Get annotation text and create annotation
            const annotationText = annotationTextEl.value;
            const annotation = this.createAnnotationObject(annotationType, annotationText, locationData);

            // Save annotation
            this.createAnnotation(annotation, true).then((createdAnnotation) => {
                closeCreateDialog();

                // If annotation is a point annotation, show the point
                // annotation indicator
                if (annotation.type === POINT_ANNOTATION_TYPE) {
                    // @TODO(tjin): Only show point annotation if one doesn't exist already
                    this.showPointAnnotation(createdAnnotation);
                }

                // Show newly created annotation text on top
                this.showAnnotationDialog(createdAnnotation.threadID);
            });
        });

        // Clicking 'Cancel' to cancel annotation
        this.addEventHandler(cancelButtonEl, (event) => {
            event.stopPropagation();
            closeCreateDialog();
        });

        // Clicking outside to close annotation dialog
        this.addEventHandler(document, (event) => {
            event.stopPropagation();

            // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
            if (!findClosestElWithClass(event.target, 'box-preview-annotation-dialog')) {
                closeCreateDialog();
            }
        });

        this.positionDialog(annotationDialogEl, locationData, 260);

        // Save text selection if needed and focus comment textarea
        annotationTextEl.focus();
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {String} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        this.annotationService.getAnnotationsForThread(threadID).then((annotations) => {
            if (!annotations || annotations.length === 0) {
                return;
            }

            // View/reply to existing annotation dialog HTML
            const annotationDialogEl = document.createElement('div');
            const annotationElString = `
                <div class="caret-up"></div>
                <div class="annotation-container">
                    <div class="annotation-comments"></div>
                    <div class="reply-container">
                        <button class="btn-plain add-reply-btn">
                            <span>+ Add Reply</span>
                        </button>
                        <div class="reply-container box-preview-is-hidden">
                            <textarea class="reply annotation-textarea"></textarea>
                            <div class="button-container">
                                <button class="btn cancel-annotation-btn">
                                    <span>Cancel</span>
                                </button>
                                <button class="btn post-annotation-btn">
                                    <span>Post</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`.trim();
            annotationDialogEl.classList.add('box-preview-annotation-dialog');
            annotationDialogEl.innerHTML = annotationElString;

            // Function to create a single comment element
            // @TODO(tjin): move into separate function
            const createAnnotationCommentEl = (annotation) => {
                const avatarUrl = htmlEscape(annotation.user.avatarUrl);
                const userName = htmlEscape(annotation.user.name);
                const created = new Date(annotation.created).toLocaleDateString(
                    'en-US',
                    { hour: '2-digit', minute: '2-digit' }
                );
                const text = htmlEscape(annotation.text);

                const newAnnotationElString = `
                    <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
                    <div class="comment-container">
                        <div class="user-name">${userName}</div>
                        <div class="comment-date">${created}</div>
                        <div class="comment-text">${text}</div>
                    </div>
                    <div class="delete-confirmation box-preview-is-hidden">
                        <div class="delete-confirmation-message">Delete this annotation?</div>
                        <div class="button-container">
                            <button class="btn cancel-delete-btn">
                                <span>No</span>
                            </button>
                            <button class="btn confirm-delete-btn">
                                <span>Yes</span>
                            </button>
                        </div>
                    </div>
                    <button class="btn-plain delete-comment-btn">
                        <span>D</span>
                    </button>`.trim();
                const annotationEl = document.createElement('div');
                annotationEl.innerHTML = newAnnotationElString;
                annotationEl.classList.add('annotation-comment');

                const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
                const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
                const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
                const confirmDeleteButtonEl = annotationEl.querySelector('.confirm-delete-btn');

                // Clicking 'D' to initiate deletion of annotation
                this.addEventHandler(deleteButtonEl, (event) => {
                    event.stopPropagation();

                    deleteConfirmationEl.classList.remove(CLASS_HIDDEN);
                    cancelDeleteButtonEl.focus();
                });

                // Clicking 'No' to cancel deletion of annotation
                this.addEventHandler(cancelDeleteButtonEl, (event) => {
                    event.stopPropagation();

                    deleteConfirmationEl.classList.add(CLASS_HIDDEN);
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
                            const replyButtonEl = annotationDialogEl.querySelector('.add-reply-btn');
                            const cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn');
                            const postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
                            this.removeEventHandlers(document, replyButtonEl, cancelButtonEl, postButtonEl);
                            annotationDialogEl.parentNode.removeChild(annotationDialogEl);

                            // Remove highlight or point element when we delete the whole thread
                            if (annotation.type === POINT_ANNOTATION_TYPE) {
                                const pointAnnotationEl = document.querySelector(`[data-thread-id="${annotation.threadID}"]`);

                                if (pointAnnotationEl) {
                                    const showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
                                    this.removeEventHandlers(showPointAnnotationButtonEl);
                                    pointAnnotationEl.parentNode.removeChild(pointAnnotationEl);
                                }
                            }
                        }
                    }).catch(() => {
                        console.log('There was an error deleting your annotation');
                    });
                });

                return annotationEl;
            };


            // All annotations in a thread should have the same location
            const firstAnnotation = annotations[0];
            const locationData = firstAnnotation.location || {};

            // Loop through annotation comments to generate thread
            const annotationCommentsEl = annotationDialogEl.querySelector('.annotation-comments');
            annotations.forEach((annotation) => {
                // Create annotation comment boxes per annotation in thread
                const annotationEl = createAnnotationCommentEl(annotation);
                annotationCommentsEl.appendChild(annotationEl);
            });

            // Add reply event handlers
            const replyEl = annotationDialogEl.querySelector('.reply-container');
            const replyButtonEl = replyEl.querySelector('.add-reply-btn');
            const cancelButtonEl = replyEl.querySelector('.cancel-annotation-btn');
            const postButtonEl = replyEl.querySelector('.post-annotation-btn');
            const replyContainerEl = replyEl.querySelector('.reply-container');
            const replyTextEl = replyEl.querySelector('.annotation-textarea');

            // Clicking '+ Add Reply' to initiate adding a reply annotation
            this.addEventHandler(replyButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.add(CLASS_HIDDEN);
                replyContainerEl.classList.remove(CLASS_HIDDEN);

                replyTextEl.value = '';
                replyTextEl.focus();
            });

            // Clicking 'Cancel' to cancel adding a reply annotation
            this.addEventHandler(cancelButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove(CLASS_HIDDEN);
                replyContainerEl.classList.add(CLASS_HIDDEN);
            });

            // Clicking 'Post' to add a reply annotation
            this.addEventHandler(postButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove(CLASS_HIDDEN);
                replyContainerEl.classList.add(CLASS_HIDDEN);

                const newAnnotation = Annotation.copy(firstAnnotation, {
                    text: replyTextEl.value.trim(),
                    user: this.user
                });

                // Create annotation, but don't add to in-memory map since a
                // thread already exists
                this.createAnnotation(newAnnotation, false).then((createdAnnotation) => {
                    const annotationEl = createAnnotationCommentEl(createdAnnotation);
                    annotationCommentsEl.appendChild(annotationEl);
                });
            });

            // Clicking outside to close annotation dialog
            this.addEventHandler(document, (event) => {
                event.stopPropagation();

                // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
                if (!findClosestElWithClass(event.target, 'box-preview-annotation-dialog')) {
                    // Remove this event handler and 'reply' event handlers
                    this.removeEventHandlers(document, replyButtonEl, cancelButtonEl, postButtonEl);

                    // Remove 'delete' event handlers
                    if (annotationCommentsEl && annotationCommentsEl.children) {
                        const childrenEls = [].slice.call(annotationCommentsEl.children);
                        childrenEls.forEach((annotationEl) => {
                            const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
                            this.removeEventHandlers(deleteButtonEl);
                        });
                    }

                    annotationDialogEl.parentNode.removeChild(annotationDialogEl);
                }
            });

            this.positionDialog(annotationDialogEl, locationData, 315);
        });
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} location Annotation location object
     * @param {Number} dialogWidth Width of dialog
     * @returns {void}
     */
    positionDialog(dialogEl, location, dialogWidth) {
        const positionedDialogEl = dialogEl;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        positionedDialogEl.style.left = `${browserX - dialogWidth / 2}px`;
        positionedDialogEl.style.top = `${browserY}px`;
        pageEl.appendChild(dialogEl);

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
     * @returns {void}
     */
    addEventHandler(element, handler) {
        element.addEventListener(TOUCH_EVENT, handler);

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
