/**
 * @fileoverview Highlight thread. This implements an annotation thread that
 * contains a single highlight annotation.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation/annotation-thread';
import HighlightDialog from './highlight-dialog';

import * as annotatorUtil from '../annotation/annotator-util';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';
const HIGHLIGHT_STATE_ACTIVE = 'active';
const HIGHLIGHT_STATE_HOVER = 'hover';
const HIGHLIGHT_STATE_INACTIVE = 'inactive';
const HIGHLIGHT_STATE_PENDING = 'pending';

@autobind
class HighlightThread extends AnnotationThread {

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        super.destroy();

        if (this.state === HIGHLIGHT_STATE_PENDING) {
            window.getSelection().removeAllRanges();
        } else {
            this.hide();
        }
    }

    /**
     * Shows the highlight thread, which means different things based on the
     * state of the thread. If the thread is pending, we show the 'add' button.
     * If it is inactive, we draw the highlight. If it is active, we draw
     * the highlight in active state and show the 'delete' button.
     *
     * @returns {void}
     */
    show() {
        switch (this.state) {
            case HIGHLIGHT_STATE_PENDING:
                this.dialog.show();
                break;
            case HIGHLIGHT_STATE_INACTIVE:
                this.dialog.hide();
                this._draw(HIGHLIGHT_NORMAL_FILL_STYLE);
                break;
            case HIGHLIGHT_STATE_HOVER:
                this._draw(HIGHLIGHT_ACTIVE_FILL_STYLE);
                break;
            case HIGHLIGHT_STATE_ACTIVE:
                this.dialog.show();
                this._draw(HIGHLIGHT_ACTIVE_FILL_STYLE);
                break;
            default:
                break;
        }
    }

    /**
     * Hides the highlight by cutting out the annotation from context. Note
     * that if there are any overlapping highlights, this will cut out
     * the overlapping portion.
     *
     * @returns {void}
     */
    hide() {
        this._draw(HIGHLIGHT_ERASE_FILL_STYLE);
    }

    /**
     * Reset state to inactive and redraw.
     *
     * @returns {void}
     */
    reset() {
        this.state = HIGHLIGHT_STATE_INACTIVE;
        this.show();
    }

    /**
     * Saves an annotation.
     *
     * @param {String} type Type of annotation
     * @param {String} text Text of annotation to save
     * @returns {Promise} Promise
     */
    saveAnnotation(type, text) {
        return super.saveAnnotation(type, text).then(() => {
            window.getSelection().removeAllRanges();
            this.reset();
        });
    }

    /**
     * Gets highlight state.
     *
     * @returns {String} Thread states
     */
    getState() {
        return this.state;
    }

    /**
     * Mousedown handler for thread. If click is inside this highlight, set the
     * state to be active, rerender, and show the delete highlight button. If
     * not, hide the delete highlight button, set state to inactive, and
     * rerender.
     *
     *
     * @param {Event} event Mouse event
     * @returns {void}
     */
    mousedownHandler(event) {
        // Pending check should be first - if we clicked and highlight is still
        // pending, destroy it
        if (this.state === HIGHLIGHT_STATE_PENDING) {
            this.destroy();

        // If state is in hover, it means mouse is already over this highlight
        // so we can skip the is in highlight calculation
        } else if (this.state === HIGHLIGHT_STATE_HOVER || this._isInHighlight(event)) {
            this.state = HIGHLIGHT_STATE_ACTIVE;
            this.show();
            this.dialog.show();
        // If this highlight was previously active and we clicked out of it, reset
        } else if (this.state === HIGHLIGHT_STATE_ACTIVE) {
            this.reset();
        }
    }

    /**
     * Mousemove handler for thread. If mouse is inside this highlight, set
     * state to be hover and rerender. If not, set state to be inactive and
     * rerender.
     *
     * @param {Event} event Mouse event
     * @returns {void}
     */
    mousemoveHandler(event) {
        // Pending check should be first - do nothing if highlight is pending
        if (this.state === HIGHLIGHT_STATE_PENDING) {
            return;
        }

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
     * Sets up the thread. Highlight threads have no HTML element since they
     * are drawn onto the canvas, but do have a dialog for adding/deleting.
     *
     * @returns {void}
     * @private
     */
    _setup() {
        if (this.annotations.length === 0) {
            this.state = HIGHLIGHT_STATE_PENDING;
        } else {
            this.state = HIGHLIGHT_STATE_INACTIVE;
        }

        this.dialog = new HighlightDialog({
            annotatedElement: this.annotatedElement,
            annotations: this.annotations,
            location: this.location
        });
        this._bindCustomListenersOnDialog();
    }

    /**
     * Binds custom event listeners for the dialog.
     *
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnDialog() {
        // Annotation created
        this.dialog.addListener('annotationcreate', () => {
            this.saveAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '');
        });

        // Annotation deleted
        this.dialog.addListener('annotationdelete', () => {
            this.deleteAnnotation(this.annotations[0].annotationID);
        });
    }

    /**
     * Unbinds custom event listeners for the dialog.
     *
     * @returns {void}
     * @private
     */
    _unbindCustomListenersOnDialog() {
        this.removeAllListeners(['annotationcreate']);
        this.removeAllListeners(['annotationdelete']);
    }

    /**
     * Draws the highlight with the specified fill style.
     *
     * @param {String} fillStyle RGBA fill style
     * @returns {void}
     * @private
     */
    _draw(fillStyle) {
        const context = this._getContext();
        if (!context) {
            return;
        }

        const quadPoints = this.location.quadPoints;
        const pageHeight = this._getPageEl().getBoundingClientRect().height;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, annotatorUtil.getScale(this.annotatedElement));
            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;

            context.fillStyle = fillStyle;
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

            // Draw actual highlight rectangle if needed
            if (fillStyle !== HIGHLIGHT_ERASE_FILL_STYLE) {
                context.fill();
            }
        });
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
     * @returns {RenderingContext|null} Context
     * @private
     */
    _getContext() {
        // Create annotation layer if one does not exist (e.g. first load or page resize)
        const pageEl = this._getPageEl();
        if (!pageEl) {
            return null;
        }

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

export default HighlightThread;
