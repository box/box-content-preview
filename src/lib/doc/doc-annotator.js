import autobind from 'autobind-decorator';
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

import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/constants';
import { CLASS_HIDDEN } from '../constants';
import { ICON_DELETE, ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const MENU_HIDE_TIMEOUT = 500;
const MOUSEMOVE_THROTTLE = 25;
const POINT_ANNOTATION_ICON_WIDTH = 16;
const TOUCH_EVENT = Browser.isMobile() ? 'touchstart' : 'click';
const TOUCH_END = Browser.isMobile() ? 'touchend' : 'mouseup';

const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';

/**
 * Document annotator class. Extends base annotator class.
 */
@autobind
class DocAnnotator extends Annotator {

    /**
     * Destructor.
     *
     * @returns {void}
     */
    destroy() {
        super.destroy();

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
        super.setScale(scale);

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
        super.setupAnnotations();

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));

        // Set defaults for highlight annotations
        this.hoverAnnotationID = ''; // ID of annotation user is hovered over
        this.activeAnnotationID = ''; // ID of active annotation (clicked)

        this.bindHighlightHandlers();
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     */
    renderAnnotations() {
        super.renderAnnotations();
        this.showHighlightAnnotations();
    }

    /**
     * Right click handler - hides annotations-related dialogs, buttons,
     * and icons.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    contextmenuHandler(event) {
        super.contextmenuHandler();

        // Hide highlight buttons
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

        // Reset highlight
        this.activeAnnotationID = '';
        const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
        this.drawHighlightAnnotationsOnPage(page);
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
                const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(eventTarget);
                if (page === -1) {
                    annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_ICON);
                    return;
                }

                // Point annotation hover behavior
                const dataType = annotatorUtil.findClosestDataType(eventTarget);
                const inPointAnnotationIcon = dataType === 'show-point-annotation-btn';
                const inAnnotationDialog = dataType === 'show-annotation-dialog' || dataType === 'create-annotation-dialog';

                // Show annotation thread when hovering over point icon
                if (inPointAnnotationIcon && !annotatorUtil.isSelectionPresent()) {
                    clearTimeout(this.timeoutHandler);
                    this.timeoutHandler = null;
                    this.showAnnotationDialog(eventTarget.getAttribute('data-thread-id'));
                } else if (inAnnotationDialog) {
                    clearTimeout(this.timeoutHandler);
                    this.timeoutHandler = null;
                } else {
                    if (!this.timeoutHandler) {
                        this.timeoutHandler = setTimeout(() => {
                            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
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
                if (inAnnotationMode && !inAnnotationDialog && !inPointAnnotationIcon) {
                    const pageDimensions = pageEl.getBoundingClientRect();
                    // Shift icon to center on cursor
                    pointAnnotationIconEl.style.left = `${event.clientX - pageDimensions.left - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
                    pointAnnotationIconEl.style.top = `${event.clientY - pageDimensions.top - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
                    annotatorUtil.showElement(pointAnnotationIconEl);
                } else {
                    annotatorUtil.hideElement(pointAnnotationIconEl);
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
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.scale);
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
                const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.scale);
                const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

                // Check if mouse is inside a rectangle of this
                // annotation
                const isPointInPoly = annotatorUtil.isPointInPolyOpt([
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
        if (!annotatorUtil.isSelectionPresent() || annotatorUtil.isDialogOpen()) {
            return;
        }

        // Hide remove highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

        // Use Rangy to save the current selection because using the
        // highlight module can mess with the selection. We restore this
        // selection after we clean up the highlight
        const savedSelection = rangy.saveSelection();

        const pageEl = annotatorUtil.getPageElAndPageNumber(event.target).pageEl;
        if (!pageEl) {
            return;
        }

        const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(pageEl, this.highlighter);
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
        if (annotatorUtil.isSelectionReversed(event, highlightEls)) {
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
        annotatorUtil.showElement(addHighlightButtonEl);
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

        let removeHighlightButtonEl = document.querySelector(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);
        if (!removeHighlightButtonEl) {
            removeHighlightButtonEl = document.createElement('button');
            removeHighlightButtonEl.classList.add(constants.CLASS_HIGHLIGHT_BUTTON_REMOVE);
            removeHighlightButtonEl.innerHTML = ICON_DELETE;

            this.addEventHandler(removeHighlightButtonEl, (event) => {
                event.stopPropagation();

                const annotationID = removeHighlightButtonEl.getAttribute('data-annotation-id');

                this.deleteAnnotation(annotationID, true).then(() => {
                    // Redraw highlights on page
                    const pageNum = parseInt(removeHighlightButtonEl.getAttribute('data-page'), 10);
                    this.drawHighlightAnnotationsOnPage(pageNum);
                    annotatorUtil.hideElement(removeHighlightButtonEl);
                });
            });
        }

        // Create remove highlight button and position it above the upper right corner of the highlight
        const pageHeight = pageEl.getBoundingClientRect().height;
        const upperRightCorner = annotatorUtil.getUpperRightCorner(annotation.location.quadPoints, pageEl);
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace(upperRightCorner, pageHeight, this.scale);

        // Position button
        removeHighlightButtonEl.style.left = `${browserX - 20}px`;
        removeHighlightButtonEl.style.top = `${browserY - 50}px`;
        removeHighlightButtonEl.setAttribute('data-annotation-id', annotation.annotationID);
        removeHighlightButtonEl.setAttribute('data-page', page);
        annotatorUtil.showElement(removeHighlightButtonEl);
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
        if (!annotatorUtil.isSelectionPresent()) {
            annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        }

        // Do nothing if the click was outside a page or a dialog is open
        const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
        if (page === -1 || annotatorUtil.isDialogOpen()) {
            return;
        }

        // Redraw with active annotation if needed
        const clickedAnnotationID = this.getHighlightIDFromMousePoint(event.clientX, event.clientY, page);
        if (this.activeAnnotationID !== clickedAnnotationID) {
            this.activeAnnotationID = clickedAnnotationID;
            this.drawHighlightAnnotationsOnPage(page);
        }

        // Hide any existing remove highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

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
        if (!annotatorUtil.isSelectionPresent()) {
            return;
        }

        const selection = window.getSelection();
        const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(selection.anchorNode.parentNode);
        if (!pageEl) {
            return;
        }

        const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(pageEl, this.highlighter);
        if (highlightEls.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightEls.forEach((element) => {
            quadPoints.push(annotatorUtil.getQuadPoints(element, pageEl, this.scale));
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
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
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
}

export default DocAnnotator;
