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
const HIGHLIGHT_STATE_ACTIVE = 'active'; // clicked
const HIGHLIGHT_STATE_ACTIVE_HOVER = 'active-hover'; // clicked and mouse is over
const HIGHLIGHT_STATE_HOVER = 'hover'; // mouse is over
const HIGHLIGHT_STATE_INACTIVE = 'inactive'; // not clicked and mouse is not over
const HIGHLIGHT_STATE_PENDING = 'pending';
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class HighlightThread extends AnnotationThread {

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        super.destroy();

        if (this._state === HIGHLIGHT_STATE_PENDING) {
            window.getSelection().removeAllRanges();
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
        switch (this._state) {
            case HIGHLIGHT_STATE_PENDING:
                this._dialog.show();
                break;
            case HIGHLIGHT_STATE_INACTIVE:
                this._dialog.hide();
                this._draw(HIGHLIGHT_NORMAL_FILL_STYLE);
                break;
            case HIGHLIGHT_STATE_HOVER:
                this._draw(HIGHLIGHT_ACTIVE_FILL_STYLE);
                break;
            case HIGHLIGHT_STATE_ACTIVE:
            case HIGHLIGHT_STATE_ACTIVE_HOVER:
                this._dialog.show();
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
        this._state = HIGHLIGHT_STATE_INACTIVE;
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
        });
    }

    /**
     * Mousedown handler for thread. Deletes this thread if it is still pending.
     *
     * @returns {void}
     */
    onMousedown() {
        // Destroy pending highlights on mousedown
        if (this._state === HIGHLIGHT_STATE_PENDING) {
            this.destroy();
        }
    }

    /**
     * Click handler for thread. If click is inside this highlight, set the
     * state to be active, and return true. If not, hide the delete highlight
     * button, set state to inactive, and reset. The 'consumed' param tracks
     * whether or not some other click handler activated a highlight. If
     * not, normal behavior occurs. If true, don't set the highlight to active
     * when normally it should be activated. We don't draw active highlights
     * in this method since we want to delay that drawing until all inactive
     * threads have been reset.
     *
     * @param {Event} event Mouse event
     * @param {Boolean} consumed Whether event previously activated another
     * highlight
     * @returns {Boolean} Whether click was in a non-pending highlight
     */
    onClick(event, consumed) {
        // If state is in hover, it means mouse is already over this highlight
        // so we can skip the is in highlight calculation
        if (!consumed && (this._state === HIGHLIGHT_STATE_HOVER ||
            this._state === HIGHLIGHT_STATE_ACTIVE_HOVER ||
            this._isInHighlight(event))) {
            this._state = HIGHLIGHT_STATE_ACTIVE;
            return true;
        }

        // If this highlight was previously active and we clicked out of it or
        // a previous event already activated a highlight, reset
        this.reset();
        return false;
    }

    /**
     * Mousemove handler for thread. If mouse is inside this highlight, set
     * state to be hover and return true. If not, set state to be inactive,
     * and reset. We don't draw hovered highlights in this method since we want
     * to delay that drawing until all inactive threads have been reset.
     *
     * @param {Event} event Mouse event
     * @returns {Boolean} Whether we should delay drawing highlight
     */
    onMousemove(event) {
        // Pending check should be first - do nothing if highlight is pending
        if (this._state === HIGHLIGHT_STATE_PENDING) {
            return false;
        }

        // If mouse is in highlight, change state to hover or active-hover
        if (this._isInHighlight(event)) {
            if (this._state === HIGHLIGHT_STATE_ACTIVE ||
                this._state === HIGHLIGHT_STATE_ACTIVE_HOVER) {
                this._state = HIGHLIGHT_STATE_ACTIVE_HOVER;
            } else {
                this._state = HIGHLIGHT_STATE_HOVER;
            }

        // If mouse is not in highlight, and state was previously active-hover,
        // change state back to active
        } else if (this._state === HIGHLIGHT_STATE_ACTIVE_HOVER) {
            this._state = HIGHLIGHT_STATE_ACTIVE;

        // If mouse is not in highlight, and state is active, do not override
        } else if (this._state === HIGHLIGHT_STATE_ACTIVE) {
            // No-op

        // If mouse is not in highlight and state is not active, reset
        } else {
            this.reset();
            return false; // Do not delay reset draws
        }

        return true;
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
        if (this._annotations.length === 0) {
            this._state = HIGHLIGHT_STATE_PENDING;
        } else {
            this._state = HIGHLIGHT_STATE_INACTIVE;
        }

        this._dialog = new HighlightDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            location: this._location
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
        this._dialog.addListener('annotationcreate', () => {
            this.saveAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '');
        });

        // Annotation deleted
        this._dialog.addListener('annotationdelete', () => {
            this.deleteAnnotation(this._annotations[0].annotationID);
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

        const quadPoints = this._location.quadPoints;
        const pageHeight = this._getPageEl().getBoundingClientRect().height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        quadPoints.forEach((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, annotatorUtil.getScale(this._annotatedElement));
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
        const pageHeight = dimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const pageTop = dimensions.top + PAGE_PADDING_TOP;

        // DOM coordinates with respect to the page
        const x = event.clientX - dimensions.left;
        const y = event.clientY - pageTop;

        return this._location.quadPoints.some((quadPoint) => {
            const browserQuadPoint = annotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, annotatorUtil.getScale(this._annotatedElement));
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
        return this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`);
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
            annotationLayerEl.height = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

            const textLayerEl = pageEl.querySelector('.textLayer');
            pageEl.insertBefore(annotationLayerEl, textLayerEl);
        }

        return annotationLayerEl.getContext('2d');
    }
}

export default HighlightThread;
