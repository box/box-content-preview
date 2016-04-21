/**
 * @fileoverview Highlight annotation thread. This implements a simplified
 * annotation thread that represents a highlight.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation/annotation-thread';

import * as annotatorUtil from '../annotation/annotator-util';
import { ICON_DELETE } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';
const HIGHLIGHT_STATE_ACTIVE = 'active';
const HIGHLIGHT_STATE_HOVER = 'hover';
const HIGHLIGHT_STATE_INACTIVE = 'inactive';
const HIGHLIGHT_DIALOG_DIMENSIONS = 38;

@autobind
class HighlightAnnotationThread extends AnnotationThread {

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        this.hide();
        this._unbindCustomListeners();

        if (this.deleteDialogEl) {
            const deleteButtonEl = this.deleteDialogEl.querySelector('button');
            deleteButtonEl.removeEventListener('click', this._deleteButtonHandler);
            this.deleteDialogEl.parentNode.removeChild(this.deleteDialogEl);
            this.deleteDialogEl = null;
        }
    }

    /**
     * Draws the highlight on canvas.
     *
     * @returns {void}
     */
    show() {
        const context = this._getContext();
        const quadPoints = this.location.quadPoints;
        const pageHeight = this._getPageEl().getBoundingClientRect().height;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, annotatorUtil.getScale(this.annotatedElement));
            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

            // If annotation being drawn is the annotation the mouse is over or
            // the annotation is 'active' or clicked, draw the highlight with
            // a different, darker color
            if (this.state === HIGHLIGHT_STATE_ACTIVE ||
                this.state === HIGHLIGHT_STATE_HOVER) {
                context.fillStyle = HIGHLIGHT_ACTIVE_FILL_STYLE;
            } else {
                context.fillStyle = HIGHLIGHT_NORMAL_FILL_STYLE;
            }

            context.beginPath();
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
            context.lineTo(x3, y3);
            context.lineTo(x4, y4);
            context.closePath();

            // We 'cut out'/erase the highlight rectangle before drawing
            // the actual highlight rectangle to prevent overlapping
            // transparency
            context.save();
            context.globalCompositeOperation = 'destination-out';
            context.fillStyle = HIGHLIGHT_ERASE_FILL_STYLE;
            context.fill();
            context.restore();

            // Draw actual highlight rectangle
            context.fill();
        });
    }

    /**
     * Hides the highlight by cutting out the annotation from context. Note
     * that if there are any overlapping highlights, this will cut out
     * the overlapping portion.
     *
     * @returns {void}
     */
    hide() {
        const context = this._getContext();
        const quadPoints = this.location.quadPoints;
        const pageHeight = this._getPageEl().getBoundingClientRect().height;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, annotatorUtil.getScale(this.annotatedElement));
            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

            context.beginPath();
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
            context.lineTo(x3, y3);
            context.lineTo(x4, y4);
            context.closePath();

            // We erase the highlight rectangle
            context.save();
            context.globalCompositeOperation = 'destination-out';
            context.fillStyle = HIGHLIGHT_ERASE_FILL_STYLE;
            context.fill();
            context.restore();
        });
    }

    /**
     * Reset state to inactive and redraw.
     *
     * @returns {void}
     */
    reset() {
        this.state = HIGHLIGHT_STATE_INACTIVE;
        this.hideDeleteButton();
        this.show();
    }

    /**
     * Position and show delete button.
     *
     * @returns {void}
     */
    showDeleteButton() {
        // Position it below lower right corner of the highlight - we need
        // to reposition every time since the DOM could have changed from
        // zooming
        const pageEl = this._getPageEl();
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height;
        const scale = annotatorUtil.getScale(this.annotatedElement);
        const coordinates = annotatorUtil.getLowerRightCornerOfLastQuadPoint(this.location.quadPoints);
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace(coordinates, pageHeight, scale);

        // Make sure button dialog doesn't go off the page
        let dialogX = browserX - 19;
        let dialogY = browserY + 12;
        if (dialogX < 0) {
            dialogX = 0;
        } else if (dialogX + HIGHLIGHT_DIALOG_DIMENSIONS > pageWidth) {
            dialogX = pageWidth - HIGHLIGHT_DIALOG_DIMENSIONS;
        }

        if (dialogY < 0) {
            dialogY = 0;
        } else if (dialogY + HIGHLIGHT_DIALOG_DIMENSIONS > pageHeight) {
            dialogY = pageHeight - HIGHLIGHT_DIALOG_DIMENSIONS;
        }

        this.deleteDialogEl.style.left = `${dialogX}px`;
        this.deleteDialogEl.style.top = `${dialogY}px`;
        annotatorUtil.showElement(this.deleteDialogEl);
        pageEl.appendChild(this.deleteDialogEl);
    }

    /**
     * Hide delete button.
     *
     * @returns {void}
     */
    hideDeleteButton() {
        annotatorUtil.hideElement(this.deleteDialogEl);
    }

    /**
     * Click handler for thread. If click is inside this highlight, set the
     * state to be active, rerender, and show the delete highlight button. If
     * not, hide the delete highlight button, set state to inactive, and
     * rerender.
     *
     * @TODO(tjin): Hide add highlight button?
     *
     * @param {Event} event Mouse event
     * @returns {void}
     */
    clickHandler(event) {
        // If state is in hover, it means mouse is already over this highlight
        // so we can skip the is in highlight calculation
        if (this.state === HIGHLIGHT_STATE_HOVER || this._isInHighlight(event)) {
            this.state = HIGHLIGHT_STATE_ACTIVE;
            this.show();
            this.showDeleteButton();
        } else if (this.state === HIGHLIGHT_STATE_ACTIVE) {
            this.reset();
        }
    }

    /**
     * Mousemove handler for thread. If mouse is inside this highlgiht, set
     * state to be hover and rerender. If not, set state to be inactive and
     * rerender.
     *
     * @param {Event} event Mouse event
     * @returns {void}
     */
    mousemoveHandler(event) {
        // If state is active, do not override
        if (this.state !== HIGHLIGHT_STATE_ACTIVE && this._isInHighlight(event)) {
            this.state = HIGHLIGHT_STATE_HOVER;
            this.show();
        } else if (this.state === HIGHLIGHT_STATE_HOVER) {
            this.reset();
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets up the thread. We override this since highlight threads have no
     * HTML (they are drawn onto the canvas). Also, we create an annotation
     * when a thread is initialized with no annotation.
     *
     * @returns {void}
     * @private
     */
    _setup() {
        // Set state of highlight
        this.state = HIGHLIGHT_STATE_INACTIVE;

        // Create annotation when thread is initialized with none
        if (this.annotations.length === 0) {
            this._bindCustomListeners();
            this.saveAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '');
        }

        // Setup delete button
        this.deleteDialogEl = document.createElement('div');
        this.deleteDialogEl.classList.add('box-preview-highlight-dialog');
        this.deleteDialogEl.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <button class="box-preview-delete-highlight-btn">${ICON_DELETE}</button>`.trim();
        const deleteButtonEl = this.deleteDialogEl.querySelector('button');
        deleteButtonEl.addEventListener('click', this._deleteButtonHandler);
    }

    /**
     * Click handler for delete highlight button. Deletes the annotation.
     *
     * @returns {void}
     * @private
     */
    _deleteButtonHandler(event) {
        event.stopPropagation();
        this.deleteAnnotation(this.annotations[0].annotationID);
    }

    /**
     * Binds custom listeners onto thread.
     *
     * @returns {void}
     * @private
     */
    _bindCustomListeners() {
        // Show highlight after thread is saved
        this.addListener('threadcreated', this.show);
    }

    /**
     * Unbinds custom listeners from thread.
     *
     * @returns {void}
     * @private
     */
    _unbindCustomListeners() {
        this.removeAllListeners(['threadcreated']);
    }

    /**
     * Checks whether mouse is inside the highlight represented by this thread.
     *
     * @param {Event} event Mouse event
     * @returns {Boolean} Whether or not mouse is inside highlight
     * @private
     */
    _isInHighlight(event) {
        const dimensions = this._getPageEl().getBoundingClientRect();

        // DOM coordinates with respect to the page
        const x = event.clientX - dimensions.left;
        const y = event.clientY - dimensions.top;

        return this.location.quadPoints.some((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, dimensions.height, annotatorUtil.getScale(this.annotatedElement));
            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

            return annotatorUtil.isPointInPolyOpt([
                [x1, y1],
                [x2, y2],
                [x3, y3],
                [x4, y4]
            ], x, y);
        });
    }

    /**
     * Gets the page element this thread is on.
     *
     * @returns {HTMLElement} Page element
     * @private
     */
    _getPageEl() {
        return this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`);
    }

    /**
     * Gets the context this highlight should be drawn on.
     *
     * @returns {RenderingContext} Context
     * @private
     */
    _getContext() {
        // Create annotation layer if one does not exist (e.g. first load or page resize)
        const pageEl = this._getPageEl();
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

        return annotationLayerEl.getContext('2d');
    }
}

export default HighlightAnnotationThread;
