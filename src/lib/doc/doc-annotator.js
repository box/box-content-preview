import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import Annotator from '../annotation/annotator';
import Browser from '../browser';
import { ICON_DELETE } from '../icons/icons';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const POINT_ANNOTATION_TYPE = 'point';
const TOUCH_EVENT = Browser.isMobile() ? 'touchstart' : 'click';

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
 * quad points in the format of 8xn numbers
 * @param {Number} pageHeight DOM height of PDF page
 * @returns {Number[]} Either [x,y] or 8xn coordinates in DOM space.
 */
function pdfSpaceToDOMSpace(coordinates, pageHeight) {
    // If input is [x, y] instead of quad points
    if (coordinates.length === 2) {
        const [x, y] = coordinates;
        return [x, pageHeight - y];
    }

    const [x1, y1, x2, y2, x3, y3, x4, y4] = coordinates;
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

        // Init scale and rotation if needed
        this.scale = this.scale || 1;
        this.rotation = this.rotation || 0;

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

    /**
     * Sets the rotation.
     *
     * @param {Number} deg
     * @returns {void}
     */
    setRotation(deg) {
        this.rotation = deg;

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

                if (!this.annotations[page]) {
                    this.annotations[page] = [];
                }

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
        this.fetchAnnotations().then(() => {
            // Show highlight and point annotations after we've generated
            // an in-memory map
            this.renderAnnotations();
        });
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
            if (!this.annotations[page]) {
                this.annotations[page] = [];
            }

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
            const scaledQuadPoint = quadPoint.map((x) => x * this.scale);
            const DOMQuadPoint = pdfSpaceToDOMSpace(scaledQuadPoint, pageHeight);
            const [x1, y1, x2, y2, x3, y3, x4, y4] = DOMQuadPoint;

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
                    const pageNum = removeHighlightButtonEl.getAttribute('data-page');
                    this.drawHighlightAnnotationsOnPage(pageNum);

                    // Hide button
                    removeHighlightButtonEl.classList.add('hidden');
                });
            });

            pageEl.appendChild(removeHighlightButtonEl);
        } else {
            removeHighlightButtonEl.parentNode.removeChild(removeHighlightButtonEl);
            pageEl.appendChild(removeHighlightButtonEl);
        }

        // Create remove highlight button and position it above the upper right
        // corner of the highlight
        const pdfCoordinates = this.getUpperRightCorner(annotation.location.quadPoints, pageEl);
        const [upperRightX, upperRightY] = pdfSpaceToDOMSpace(pdfCoordinates, pageEl.getBoundingClientRect().height);

        // Position button
        removeHighlightButtonEl.style.left = `${upperRightX - 20}px`;
        removeHighlightButtonEl.style.top = `${upperRightY - 50}px`;
        removeHighlightButtonEl.setAttribute('data-annotation-id', annotation.annotationID);
        removeHighlightButtonEl.setAttribute('data-page', page);
        removeHighlightButtonEl.classList.remove('hidden');
    }

    /**
     * Hides the remove highlight button.
     *
     * @returns {void}
     */
    hideRemoveHighlightButton() {
        const removeHighlightButtonEl = document.querySelector('.box-preview-remove-highlight-btn');
        if (removeHighlightButtonEl) {
            removeHighlightButtonEl.classList.add('hidden');
        }
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
                const pageEl = findClosestElWithClass(event.target, 'page');
                if (!pageEl) {
                    return;
                }

                const page = pageEl.getAttribute('data-page-number');
                const canvasEl = pageEl.querySelector('.box-preview-annotation-layer');
                if (!canvasEl) {
                    return;
                }

                const canvasDimensions = canvasEl.getBoundingClientRect();
                const pageHeight = canvasDimensions.height;
                const annotations = this.annotations[page];
                if (!Array.isArray(annotations)) {
                    return;
                }

                const highlights = annotations.filter((annotation) => annotation.type === HIGHLIGHT_ANNOTATION_TYPE);
                if (!highlights) {
                    return;
                }

                // We loop through all the annotations on this page and see if the
                // mouse is over some annotation. We use Array.prototype.some so
                // we can stop iterating over annotations when we've found one.
                let hoverAnnotationID = '';
                highlights.some((highlight) => {
                    return highlight.location.quadPoints.some((quadPoint) => {
                        const scaledQuadPoint = quadPoint.map((x) => x * this.scale);
                        const DOMQuadPoint = pdfSpaceToDOMSpace(scaledQuadPoint, pageHeight);
                        const [x1, y1, x2, y2, x3, y3, x4, y4] = DOMQuadPoint;
                        const mouseX = event.clientX - canvasDimensions.left;
                        const mouseY = event.clientY - canvasDimensions.top;

                        // Check if mouse is inside a rectangle of this
                        // annotation
                        const isPointInPoly = isPointInPolyOpt([
                            [x1, y1],
                            [x2, y2],
                            [x3, y3],
                            [x4, y4]
                        ], mouseX, mouseY);

                        if (isPointInPoly) {
                            hoverAnnotationID = highlight.annotationID;
                        }

                        return isPointInPoly;
                    });
                });

                // Redraw annotations only if annotation we're currently over
                // has changed
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
     * Handler for click on document for activating highlights. Changes style
     * of highlight to show active state and shows a delete button.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    highlightClickHandler(event) {
        event.stopPropagation();

        const pageEl = findClosestElWithClass(event.target, 'page');
        if (!pageEl) {
            return;
        }

        const page = pageEl.getAttribute('data-page-number');
        const annotations = this.annotations[page];
        if (!Array.isArray(annotations)) {
            return;
        }

        const highlights = annotations.filter((annotation) => annotation.type === HIGHLIGHT_ANNOTATION_TYPE);
        if (!highlights) {
            return;
        }

        // @TODO(tjin): will need to check if click is in an annotation on
        // mobile since the hover handler isn't active there
        // if (Browser.isMobile()) {
        //     // check if click is in annotation
        // }

        // If we are clicking outside an annotation, unset the active annotation
        if (!this.hoverAnnotationID || this.hoverAnnotationID === '') {
            this.activeAnnotationID = '';
        }

        // Redraw page to show active annotation or deactivate annotation
        this.activeAnnotationID = this.hoverAnnotationID;
        this.drawHighlightAnnotationsOnPage(page);

        // Hide any existing remove highlight button
        this.hideRemoveHighlightButton();

        // Show remove highlight button if we clicked on an annotation
        if (this.activeAnnotationID) {
            const highlight = highlights.find((hl) => hl.annotationID === this.activeAnnotationID);
            if (highlight) {
                this.showRemoveHighlightButton(highlight);
            }
        }
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

        // Get selection location and dimensions
        const selection = window.getSelection();
        if (selection.rangeCount < 1) {
            return;
        }

        const pageEl = findClosestElWithClass(selection.anchorNode.parentNode, 'page');
        const page = pageEl ? pageEl.getAttribute('data-page-number') : 1;

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        const highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        const highlightElements = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightElements.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightElements.forEach((element) => {
            quadPoints.push(this.getQuadPoints(element, pageEl));
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
        const pageScale = this.scale;
        const x = location.x * pageScale;
        const y = location.y * pageScale;
        const page = location.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        pageEl.appendChild(pointAnnotationEl);
        pointAnnotationEl.style.left = `${x - 25}px`;
        pointAnnotationEl.style.top = `${y}px`;

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

            const pageEl = findClosestElWithClass(e.target, 'page');

            // If click isn't on a page, disregard
            if (!pageEl) {
                return;
            }

            // Generate annotation parameters and location data to store
            const pageDimensions = pageEl.getBoundingClientRect();
            const page = pageEl.getAttribute('data-page-number');
            const pageScale = this.scale;
            const x = (e.clientX - pageDimensions.left) / pageScale;
            const y = (e.clientY - pageDimensions.top) / pageScale;
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
            this.removeEventHandlers(document);
            this.removeEventHandlers(postButtonEl);
            this.removeEventHandlers(cancelButtonEl);
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
                        <div class="reply-container hidden">
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
                    <div class="delete-confirmation hidden">
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

                    deleteConfirmationEl.classList.remove('hidden');
                    cancelDeleteButtonEl.focus();
                });

                // Clicking 'No' to cancel deletion of annotation
                this.addEventHandler(cancelDeleteButtonEl, (event) => {
                    event.stopPropagation();

                    deleteConfirmationEl.classList.add('hidden');
                    deleteButtonEl.focus();
                });

                // Clicking 'Yes' to confirm deletion of annotation
                this.addEventHandler(confirmDeleteButtonEl, (event) => {
                    event.stopPropagation();
                    const annotationParentEl = annotationEl.parentNode;
                    const isRootAnnotation = annotationParentEl.childElementCount === 1;

                    // Remove from in-memory map if it is root annotation
                    this.deleteAnnotation(annotation.annotationID, isRootAnnotation).then(() => {
                        this.removeEventHandlers(deleteButtonEl);
                        this.removeEventHandlers(cancelDeleteButtonEl);
                        this.removeEventHandlers(confirmDeleteButtonEl);
                        annotationParentEl.removeChild(annotationEl);

                        // If this was the root comment in this thread, remove the whole thread
                        if (isRootAnnotation) {
                            const replyButtonEl = annotationDialogEl.querySelector('.add-reply-btn');
                            const cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn');
                            const postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
                            this.removeEventHandlers(document);
                            this.removeEventHandlers(replyButtonEl);
                            this.removeEventHandlers(cancelButtonEl);
                            this.removeEventHandlers(postButtonEl);

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
                replyButtonEl.classList.add('hidden');
                replyContainerEl.classList.remove('hidden');

                replyTextEl.value = '';
                replyTextEl.focus();
            });

            // Clicking 'Cancel' to cancel adding a reply annotation
            this.addEventHandler(cancelButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove('hidden');
                replyContainerEl.classList.add('hidden');
            });

            // Clicking 'Post' to add a reply annotation
            this.addEventHandler(postButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove('hidden');
                replyContainerEl.classList.add('hidden');

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
                    this.removeEventHandlers(document);

                    // Remove 'reply' event handlers
                    this.removeEventHandlers(replyButtonEl);
                    this.removeEventHandlers(cancelButtonEl);
                    this.removeEventHandlers(postButtonEl);

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
     * @param {Object} locationData Data about where to position the dialog
     * @param {Number} dialogWidth Width of dialog
     * @returns {void}
     */
    positionDialog(dialogEl, locationData, dialogWidth) {
        const positionedDialogEl = dialogEl;
        const page = locationData.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        pageEl.appendChild(dialogEl);
        positionedDialogEl.style.left = `${(locationData.x - dialogWidth / 2)}px`;
        positionedDialogEl.style.top = `${locationData.y}px`;
        positionedDialogEl.style.transform = `scale(${this.scale})`;

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
     * Helper to remove all saved event handlers from an element.
     *
     * @param {HTMLElement} element Element to remove handlers from
     * @returns {void}
     */
    removeEventHandlers(element) {
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
     * @param {HTMLElement} relativeEl Element quad points should be relative to
     * @returns {Number[]} Coordinates in the form of [x1, y1, x2, y2, x3, y3,
     * x4, y4] with (x1, y1) being the lower left (untransformed) corner of the
     * element and the other 3 vertices in counterclockwise order. These are
     * in PDF default user space.
     */
    getQuadPoints(element, relativeEl) {
        // Create quad point helper elements once if needed
        if (!this.quadCornerContainerEl) {
            this.quadCornerContainerEl = document.createElement('div');
            this.quadCornerContainerEl.classList.add('box-preview-quad-corner-container');

            // Create zero-size elements that can be styled to the 4 corners of
            // quadrilateral around element - using 4 divs is faster than using
            // one div and moving it around
            this.quadCorner1El = document.createElement('div');
            this.quadCorner2El = document.createElement('div');
            this.quadCorner3El = document.createElement('div');
            this.quadCorner4El = document.createElement('div');

            this.quadCorner1El.classList.add('box-preview-quad-corner', 'corner1');
            this.quadCorner2El.classList.add('box-preview-quad-corner', 'corner2');
            this.quadCorner3El.classList.add('box-preview-quad-corner', 'corner3');
            this.quadCorner4El.classList.add('box-preview-quad-corner', 'corner4');

            this.quadCornerContainerEl.appendChild(this.quadCorner1El);
            this.quadCornerContainerEl.appendChild(this.quadCorner2El);
            this.quadCornerContainerEl.appendChild(this.quadCorner3El);
            this.quadCornerContainerEl.appendChild(this.quadCorner4El);
        }

        // Insert helper into element to calculate quad points for
        element.appendChild(this.quadCornerContainerEl);

        const corner1Rect = this.quadCorner1El.getBoundingClientRect();
        const corner2Rect = this.quadCorner2El.getBoundingClientRect();
        const corner3Rect = this.quadCorner3El.getBoundingClientRect();
        const corner4Rect = this.quadCorner4El.getBoundingClientRect();
        const relativeRect = relativeEl.getBoundingClientRect();
        const relativeLeft = relativeRect.left;
        const relativeBottom = relativeRect.bottom;

        // Cleanup helper element
        element.removeChild(this.quadCornerContainerEl);

        // Calculate PDF default user coordinates of these 4 corners
        const quadPoints = [
            corner1Rect.left - relativeLeft,
            relativeBottom - corner1Rect.bottom,
            corner2Rect.left - relativeLeft,
            relativeBottom - corner2Rect.bottom,
            corner3Rect.left - relativeLeft,
            relativeBottom - corner3Rect.bottom,
            corner4Rect.left - relativeLeft,
            relativeBottom - corner4Rect.bottom
        ];

        // Return quad points at 100% scale
        return quadPoints.map((x) => x / this.scale);
    }

    /**
     * Gets coordinates representing upper right corner of the annotation
     * represented by the provided quad points. Note that these coordinates
     * are in PDF default user space, with the origin at the bottom left corner
     * of the document.
     *
     * @param {Number[]} quadPoints Quad points of annotation to get upper
     * right corner for in PDF default user space
     * @returns {Number[]} [x,y] of upper right corner of quad points in PDF
     * default user space.
     */
    getUpperRightCorner(quadPoints) {
        let [x, y] = [0, 0];
        quadPoints.forEach((quadPoint) => {
            const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoint;

            x = Math.max(x, Math.max(x1, x2, x3, x4));
            y = Math.max(y, Math.max(y1, y2, y3, y4));
        });

        // Return scaled coordinates
        return [x, y].map((val) => val * this.scale);
    }
}

export default DocAnnotator;
