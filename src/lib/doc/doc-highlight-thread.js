/**
 * @fileoverview Highlight thread. This implements an annotation thread that
 * contains a single highlight annotation.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation/annotation-thread';
import DocHighlightDialog from './doc-highlight-dialog';
import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/annotation-constants';
import * as docAnnotatorUtil from './doc-annotator-util';

const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';
const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 255, 255, 1)';
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocHighlightThread extends AnnotationThread {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [destructor]
     *
     * @override
     * @returns {void}
     */
    destroy() {
        super.destroy();

        if (this._state === constants.ANNOTATION_STATE_PENDING) {
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * Hides the highlight by cutting out the annotation from context. Note
     * that if there are any overlapping highlights, this will cut out
     * the overlapping portion.
     *
     * @override
     * @returns {void}
     */
    hide() {
        this._draw(HIGHLIGHT_ERASE_FILL_STYLE);
    }

    /**
     * Reset state to inactive and redraw.
     *
     * @override
     * @returns {void}
     */
    reset() {
        this._state = constants.ANNOTATION_STATE_INACTIVE;
        this.show();
    }

    /**
     * Saves an annotation.
     *
     * @override
     * @param {String} type Type of annotation
     * @param {String} text Text of annotation to save
     * @returns {Promise} Promise
     */
    saveAnnotation(type, text) {
        const promise = super.saveAnnotation(type, text);
        window.getSelection().removeAllRanges();
        return promise;
    }

    /**
     * Mousedown handler for thread. Deletes this thread if it is still pending.
     *
     * @returns {void}
     */
    onMousedown() {
        // Destroy pending highlights on mousedown
        if (this._state === constants.ANNOTATION_STATE_PENDING) {
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
        if (!consumed && (this._state === constants.ANNOTATION_STATE_HOVER ||
            this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER ||
            this._isInHighlight(event))) {
            this._state = constants.ANNOTATION_STATE_ACTIVE;
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
        if (this._state === constants.ANNOTATION_STATE_PENDING) {
            return false;
        }

        // If mouse is in highlight, change state to hover or active-hover
        if (this._isInHighlight(event)) {
            if (this._state === constants.ANNOTATION_STATE_ACTIVE ||
                this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER) {
                this._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;
            } else {
                this._state = constants.ANNOTATION_STATE_HOVER;
            }

        // If mouse is not in highlight, and state was previously active-hover,
        // change state back to active
        } else if (this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER) {
            this._state = constants.ANNOTATION_STATE_ACTIVE;

        // If mouse is not in highlight, and state is active, do not override
        } else if (this._state === constants.ANNOTATION_STATE_ACTIVE) {
            // No-op

        // If mouse is not in highlight and state is not active, reset
        } else {
            this.reset();
            return false; // Do not delay reset draws
        }

        return true;
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Shows the highlight thread, which means different things based on the
     * state of the thread. If the thread is pending, we show the 'add' button.
     * If it is inactive, we draw the highlight. If it is active, we draw
     * the highlight in active state and show the 'delete' button.
     *
     * @override
     * @returns {void}
     */
    show() {
        switch (this._state) {
            case constants.ANNOTATION_STATE_PENDING:
                this._dialog.show();
                break;
            case constants.ANNOTATION_STATE_INACTIVE:
                this._dialog.hide();
                this._draw(HIGHLIGHT_NORMAL_FILL_STYLE);
                break;
            case constants.ANNOTATION_STATE_HOVER:
                this._draw(HIGHLIGHT_ACTIVE_FILL_STYLE);
                break;
            case constants.ANNOTATION_STATE_ACTIVE:
            case constants.ANNOTATION_STATE_ACTIVE_HOVER:
                this._dialog.show();
                this._draw(HIGHLIGHT_ACTIVE_FILL_STYLE);
                break;
            default:
                break;
        }
    }

    /**
     * Creates the document highlight annotation dialog for the thread.
     *
     * @override
     * @returns {void}
     */
    createDialog() {
        this._dialog = new DocHighlightDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            location: this._location,
            canAnnotate: this._annotationService.canAnnotate
        });
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * No-op setup element. Highlight threads have no HTML indicator since
     * they are drawn onto the canvas.
     *
     * @override
     * @returns {void}
     * @protected
     */
    setupElement() {}

    /**
     * Binds custom event listeners for the dialog.
     *
     * @override
     * @returns {void}
     * @protected
     */
    bindCustomListenersOnDialog() {
        // Annotation created
        this._dialog.addListener('annotationcreate', () => {
            this.saveAnnotation(constants.ANNOTATION_TYPE_HIGHLIGHT, '');
        });

        // Annotation deleted
        this._dialog.addListener('annotationdelete', () => {
            this.deleteAnnotation(this._annotations[0].annotationID);
        });
    }

    /**
     * Unbinds custom event listeners for the dialog.
     *
     * @override
     * @returns {void}
     * @protected
     */
    unbindCustomListenersOnDialog() {
        this.removeAllListeners('annotationcreate');
        this.removeAllListeners('annotationdelete');
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

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

        const pageDimensions = this._getPageEl().getBoundingClientRect();
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location, pageDimensions, zoomScale);

        this._location.quadPoints.forEach((quadPoint) => {
            let browserQuadPoint = docAnnotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, zoomScale);

            // If needed, scale quad points comparing current dimensions with saved dimensions
            if (dimensionScale) {
                browserQuadPoint = browserQuadPoint.map((val, index) => {
                    return index % 2 ? val * dimensionScale.y : val * dimensionScale.x;
                });
            }

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
        const pageEl = this._getPageEl();
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const pageTop = pageDimensions.top + PAGE_PADDING_TOP;
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location, pageDimensions, zoomScale);

        // DOM coordinates with respect to the page
        const x = event.clientX - pageDimensions.left;
        const y = event.clientY - pageTop;

        return this._location.quadPoints.some((quadPoint) => {
            let browserQuadPoint = docAnnotatorUtil.convertPDFSpaceToDOMSpace(quadPoint, pageHeight, zoomScale);

            // If needed, scale quad points comparing current dimensions with saved dimensions
            if (dimensionScale) {
                browserQuadPoint = browserQuadPoint.map((val, index) => {
                    return index % 2 ? val * dimensionScale.y : val * dimensionScale.x;
                });
            }

            const [x1, y1, x2, y2, x3, y3, x4, y4] = browserQuadPoint;
            return docAnnotatorUtil.isPointInPolyOpt([
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

export default DocHighlightThread;
