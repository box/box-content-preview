/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

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
import { ICON_DELETE, ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const MOUSEMOVE_THROTTLE = 50;
const TOUCH_END = Browser.isMobile() ? 'touchend' : 'mouseup';

const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';

@autobind
class DocAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------
    // Private functions
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @returns {void}
     * @private
     */
    _setupAnnotations() {
        super._setupAnnotations();

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));

        // Set defaults for highlight annotations
        this.hoverAnnotationID = ''; // ID of annotation user is hovered over
        this.activeAnnotationID = ''; // ID of active annotation (clicked)
    }

    /**
     * Shows annotations.
     *
     * @returns {void}
     * @private
     */
    _showAnnotations() {
        super._showAnnotations();
        this._showHighlightAnnotations();
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        super._bindDOMListeners();

        // Activate highlights on hover
        this.annotatedElement.addEventListener('mousemove', this._highlightMousemoveHandler());

        // Hide annotation dialogs and buttons on right click
        this.annotatedElement.addEventListener('contextmenu', this._contextmenuHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        super._unbindDOMListeners();

        this.annotatedElement.removeEventListener('mousemove', this._highlightMousemoveHandler());
        this.annotatedElement.removeEventListener('contextmenu', this._contextmenuHandler);
    }

    //--------------------------------------------------------------------------
    // Private highlight annotation functions
    //--------------------------------------------------------------------------

    /**
     * Handler for highlight mousemove over the document. 'Activates' a
     * highlight by making it darker during mouseover.
     *
     * @returns {Function} mousemove handler
     * @private
     */
    _highlightMousemoveHandler() {
        if (!this.throttledMousemoveHandler) {
            this.throttledMousemoveHandler = throttle((event) => {
                // Saves mouse position in memory
                this._setMousePosition(event);

                const { x, y, page } = this._getMousePosition();
                if (page === -1 || this._getHighlightsOnPage(page).length === 0) {
                    return; // Short circuit - we aren't on a page or no highlights on page
                }

                // Redraw annotations only if annotation we're currently over has changed
                const hoverAnnotationID = this._getHighlightIDFromMousePoint(x, y, page);
                if (hoverAnnotationID !== this.hoverAnnotationID) {
                    // Cache which annotation we're currently over
                    this.hoverAnnotationID = hoverAnnotationID;
                    this._drawHighlightAnnotationsOnPage(page);
                }
            }, MOUSEMOVE_THROTTLE);
        }

        return this.throttledMousemoveHandler;
    }

    /**
     * Right click handler - resets highlight state and hides highlight buttons.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _contextmenuHandler(event) {
        // Hide highlight buttons
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

        // Reset highlight
        this.activeAnnotationID = '';
        const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
        this._drawHighlightAnnotationsOnPage(page);
    }

    /**
    * Draws a single highlight annotation on the provided context.
    *
    * @param {Annotation} annotation Highlight annotation to show
    * @param {RenderingContext} contex 2D drawing context to use
    * @private
    * @returns {void}
    */
    _drawHighlightAnnotation(annotation, context) {
        const ctx = context;
        const annotationID = annotation.annotationID;
        const quadPoints = annotation.location.quadPoints;
        const pageHeight = context.canvas.getBoundingClientRect().height;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.getScale());
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
     * @private
     */
    _drawHighlightAnnotationsOnPage(page) {
        // let time = new Date().getTime();
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
        if (!pageEl) {
            return;
        }

        // Create an annotation layer on the page if it doesn't exist
        let annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (!annotationLayerEl) {
            annotationLayerEl = document.createElement('canvas');
            annotationLayerEl.classList.add('box-preview-annotation-layer');
            const pageDimensions = pageEl.getBoundingClientRect();
            annotationLayerEl.width = pageDimensions.width;
            annotationLayerEl.height = pageDimensions.height;

            const textLayerEl = pageEl.querySelector('.textLayer');
            pageEl.insertBefore(annotationLayerEl, textLayerEl);
        }

        // Clear canvas
        const ctx = annotationLayerEl.getContext('2d');
        ctx.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);

        // Draw highlights
        const highlights = this._getHighlightsOnPage(page);
        highlights.forEach((highlight) => {
            this._drawHighlightAnnotation(highlight, ctx);
        });

        // console.log(`Drawing annotations for page ${page} took ${new Date().getTime() - time}ms`);
    }

    /**
     * Shows highlight annotations (annotations on selected text).
     *
     * @param {Annotation[]} highlightAnnotations Array of highlight annotations
     * @returns {void}
     */
    _showHighlightAnnotations() {
        Object.keys(this.threads).forEach((page) => {
            // Draw highlights if there are any on the page
            if (this._getHighlightsOnPage(page).length > 0) {
                this._drawHighlightAnnotationsOnPage(page);
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
     * @private
     */
    _getHighlightIDFromMousePoint(mouseX, mouseY, page) {
        const highlights = this._getHighlightsOnPage(page);
        if (!highlights) {
            return '';
        }

        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
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
                const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, this.getScale());
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
     * Returns the highlight annotations on the specified page.
     *
     * @param {Number} page Page to get highlights for
     * @returns {Annotation[]} Highlight annotations on page
     * @private
     */
    _getHighlightsOnPage(page) {
        const threads = this.threads[page] || [];
        return threads.filter((thread) => {
            return thread.annotations[0].type === HIGHLIGHT_ANNOTATION_TYPE;
        }).map((thread) => thread.annotations[0]);
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        super._bindDOMListeners();

        // Add click handlers for activating a highlight or showing and hiding point comments
        this.annotatedElement.addEventListener('click', this._highlightClickHandler);

        // Add mouseup/touchend event for showing the add highlight button
        this.annotatedElement.addEventListener(TOUCH_END, this._showAddHighlightButtonHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        super._unbindDOMListeners();

        this.annotatedElement.removeEventListener('click', this._highlightClickHandler);
        this.annotatedElement.removeEventListener(TOUCH_END, this._showAddHighlightButtonHandler);
    }

    /**
     * Document click handler for handling highlights. Activates highlights
     * when they are clicked on by changing style to be a darker shade and
     * showing the delete highlight button. Also hides any existing add or
     * remove highlight buttons beforehand.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _highlightClickHandler(event) {
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
        const clickedAnnotationID = this._getHighlightIDFromMousePoint(event.clientX, event.clientY, page);
        if (this.activeAnnotationID !== clickedAnnotationID) {
            this.activeAnnotationID = clickedAnnotationID;
            this._drawHighlightAnnotationsOnPage(page);
        }

        // Hide any existing remove highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

        // Show remove highlight button if we clicked on an annotation
        if (this.activeAnnotationID) {
            const highlight = this._getHighlightsOnPage(page).find((annotation) => annotation.annotationID === this.activeAnnotationID);
            if (highlight) {
                this._showRemoveHighlightButton(highlight);
            }
        }
    }

    /**
     * Shows the remove highlight button for an annotation.
     *
     * @param {Annotation} annotation Annotation to show remove button for
     * @returns {void}
     * @private
     */
    _showRemoveHighlightButton(annotation) {
        const page = annotation.location.page;
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);

        let removeHighlightButtonEl = this.annotatedElement.querySelector(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);
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
                    this._drawHighlightAnnotationsOnPage(pageNum);
                    annotatorUtil.hideElement(removeHighlightButtonEl);
                });
            });
        }

        // Create remove highlight button and position it above the upper right corner of the highlight
        const pageHeight = pageEl.getBoundingClientRect().height;
        const coordinates = annotatorUtil.getUpperRightCorner(annotation.location.quadPoints, pageEl);
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace(coordinates, pageHeight, this.getScale());

        // Position button
        removeHighlightButtonEl.style.left = `${browserX - 20}px`;
        removeHighlightButtonEl.style.top = `${browserY - 50}px`;
        removeHighlightButtonEl.setAttribute('data-annotation-id', annotation.annotationID);
        removeHighlightButtonEl.setAttribute('data-page', page);
        annotatorUtil.showElement(removeHighlightButtonEl);
        pageEl.appendChild(removeHighlightButtonEl);
    }

    /**
     * Handler to show the add highlight button. Shown when mouse is
     * released or touch is ended and there is a selection on screen.
     *
     * @returns {void}
     * @private
     */
    _showAddHighlightButtonHandler(event) {
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

        let addHighlightButtonEl = this.annotatedElement.querySelector(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        if (!addHighlightButtonEl) {
            addHighlightButtonEl = document.createElement('button');
            addHighlightButtonEl.classList.add(constants.CLASS_HIGHLIGHT_BUTTON_ADD);
            addHighlightButtonEl.innerHTML = ICON_HIGHLIGHT;
            addHighlightButtonEl.addEventListener('click', this._addHighlightAnnotationHandler);
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
        this._removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);
    }

    /**
     * Event handler for adding a highlight annotation. Generates a highlight
     * out of the current window selection and saves it.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _addHighlightAnnotationHandler(event) {
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
            quadPoints.push(annotatorUtil.getQuadPoints(element, pageEl, this.getScale()));
        });

        // Unselect text and remove rangy highlight
        selection.removeAllRanges();
        this._removeRangyHighlight(highlight);

        // Create annotation
        const annotation = this.createAnnotationObject(HIGHLIGHT_ANNOTATION_TYPE, '', {
            page,
            quadPoints
        });

        // Save and show annotation
        this.createAnnotation(annotation, true).then(() => {
            // Redraw annotations to show new annotation
            this._drawHighlightAnnotationsOnPage(page);
        });

        // Hide add highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
    }

    /**
     * Saves mouse position from event in memory.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    _setMousePosition(event) {
        const eventTarget = event.target;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.mousePage = annotatorUtil.getPageElAndPageNumber(eventTarget).page;
        this.mouseDataType = annotatorUtil.findClosestDataType(eventTarget);
    }

    /**
     * Gets mouse position from memory.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _getMousePosition() {
        return {
            x: this.mouseX || 0,
            y: this.mouseY || 0,
            page: this.mousePage || 1,
            dataType: this.mouseDataType || ''
        };
    }

    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the
     * internal highlighter list that has a matching ID. We can't directly use
     * the highlighter's removeHighlights since the highlight could possibly
     * not be a true Rangy highlight object.
     *
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     * @private
     */
    _removeRangyHighlight(highlight) {
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
