/**
 * @fileoverview Highlight thread. This implements an annotation thread that
 * contains a single highlight annotation.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Browser from '../../browser';
import AnnotationThread from '../annotation-thread';
import DocHighlightDialog from './doc-highlight-dialog';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';
import * as docAnnotatorUtil from './doc-annotator-util';

const IS_MOBILE = Browser.isMobile();
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocHighlightThread extends AnnotationThread {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Cancels the first comment on the thread
     *
     * @returns {void}
     */
    cancelFirstComment() {
        if (annotatorUtil.isPlainHighlight(this._annotations)) {
            this._dialog.toggleHighlightDialogs();
            this.reset();

            // Reset type from highlight-comment to highlight
            this._type = constants.ANNOTATION_TYPE_HIGHLIGHT;

            // Clear text area when comment is cancelled
            const annotationTextEl = this._annotatedElement.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            annotationTextEl.value = '';
        } else {
            this.destroy();
        }
    }

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
        this._draw(constants.HIGHLIGHT_ERASE_FILL_STYLE);
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
     * @param {string} type Type of annotation
     * @param {string} text Text of annotation to save
     * @returns {void}
     */
    saveAnnotation(type, text) {
        super.saveAnnotation(type, text);
        window.getSelection().removeAllRanges();

        // Hide annotations dialog if only a highlight was created
        if (text === '') {
            this._state = constants.ANNOTATION_STATE_INACTIVE;
        } else {
            this._state = constants.ANNOTATION_STATE_HOVER;
        }
    }

    /**
     * Deletes an annotation.
     *
     * @param {string} annotationID ID of annotation to delete
     * @param {boolean} [useServer] Whether or not to delete on server, default true
     * @returns {void}
     */
    deleteAnnotation(annotationID, useServer = true) {
        super.deleteAnnotation(annotationID, useServer);

        // Hide delete button on plain highlights if user doesn't have
        // permissions
        if (this._annotations.length && this._annotations[0].permissions && !this._annotations[0].permissions.can_delete) {
            const addHighlightBtn = this._dialog._element.querySelector('.box-preview-add-highlight-btn');
            annotatorUtil.hideElement(addHighlightBtn);
        }
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
     * @param {boolean} consumed Whether event previously activated another
     * highlight
     * @returns {boolean} Whether click was in a non-pending highlight
     */
    onClick(event, consumed) {
        // Don't show any dialog if on a mobile device, if this highlight is a
        // plain highlight
        if (IS_MOBILE && this._type === constants.ANNOTATION_TYPE_HIGHLIGHT) {
            return false;
        }

        // If state is in hover, it means mouse is already over this highlight
        // so we can skip the is in highlight calculation
        if (!consumed && (this._state === constants.ANNOTATION_STATE_HOVER ||
            this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER ||
            this.isOnHighlight(event))) {
            this._state = constants.ANNOTATION_STATE_ACTIVE;
            return true;
        }

        // If this highlight was previously active and we clicked out of it or
        // a previous event already activated a highlight, reset
        this.reset();
        return false;
    }

    /**
     * Checks if Mouse event is either over the text highlight or the annotations
     * dialog
     *
     * @param  {Event} event Mouse event
     * @return {boolean} Whether or not Mouse event is in highlight or over
     * the annotations dialog
     */
    isOnHighlight(event) {
        return this._isInDialog(event) || this._isInHighlight(event);
    }

    /**
     * Mousemove handler for thread. If mouse is inside this highlight, set
     * state to be hover and return true. If not, set state to be inactive,
     * and reset. We don't draw hovered highlights in this method since we want
     * to delay that drawing until all inactive threads have been reset.
     *
     * @param {Event} event Mouse event
     * @returns {boolean} Whether we should delay drawing highlight
     */
    onMousemove(event) {
        // Pending check should be first - do nothing if highlight is pending
        if (this._state === constants.ANNOTATION_STATE_PENDING ||
            this._state === constants.ANNOTATION_STATE_PENDING_ACTIVE) {
            return false;
        }

        // If mouse is in highlight, change state to hover or active-hover
        if (this.isOnHighlight(event)) {
            if (this._state === constants.ANNOTATION_STATE_ACTIVE ||
                this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER) {
                this._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;
            } else {
                this._state = constants.ANNOTATION_STATE_HOVER;
            }
            this._dialog.mouseenterHandler();

        // If mouse is not in highlight, and state was previously active-hover,
        // change state back to active
        } else if (this._state === constants.ANNOTATION_STATE_ACTIVE_HOVER) {
            this._state = constants.ANNOTATION_STATE_ACTIVE;

        // If mouse is not in highlight, and state is active, do not override
        } else if (this._state === constants.ANNOTATION_STATE_ACTIVE) {
            // No-op

        // If mouse is not in highlight and state is not already inactive, reset
        } else if (this._state !== constants.ANNOTATION_STATE_INACTIVE) {
            this.reset();
            return false;

        // If state is already inactive, don't delay or reset
        } else {
            return false;
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
                this.showDialog();
                break;
            case constants.ANNOTATION_STATE_INACTIVE:
                this.hideDialog();
                this._draw(constants.HIGHLIGHT_NORMAL_FILL_STYLE);
                break;
            case constants.ANNOTATION_STATE_HOVER:
            case constants.ANNOTATION_STATE_ACTIVE:
            case constants.ANNOTATION_STATE_PENDING_ACTIVE:
            case constants.ANNOTATION_STATE_ACTIVE_HOVER:
                this.showDialog();
                this._draw(constants.HIGHLIGHT_ACTIVE_FILL_STYLE);
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
            locale: this._locale,
            location: this._location,
            canAnnotate: this._annotationService.canAnnotate
        });

        // Ensures that previously created annotations have the right type
        if (this._annotations.length) {
            if ((this._annotations[0].text !== '' || this._annotations.length > 1) &&
                this._type === constants.ANNOTATION_TYPE_HIGHLIGHT) {
                this._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            }
        }
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
        // Annotation drawn
        this._dialog.addListener('annotationdraw', () => {
            this._state = constants.ANNOTATION_STATE_PENDING_ACTIVE;
            window.getSelection().removeAllRanges();
            this.show();
        });

        // Annotation created
        this._dialog.addListener('annotationcreate', (data) => {
            if (data) {
                this._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
                this._dialog.toggleHighlightCommentsReply(this._annotations.length);
            } else {
                this._type = constants.ANNOTATION_TYPE_HIGHLIGHT;
            }

            this.saveAnnotation(this._type, data ? data.text : '');
        });

        // Annotation canceled
        this._dialog.addListener('annotationcancel', () => {
            this.cancelFirstComment();
        });

        // Annotation deleted
        this._dialog.addListener('annotationdelete', (data) => {
            if (data) {
                this.deleteAnnotation(data.annotationID);
            } else {
                this.deleteAnnotation(this._annotations[0].annotationID);
            }
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
        this.removeAllListeners('annotationdraw');
        this.removeAllListeners('annotationcreate');
        this.removeAllListeners('annotationcancel');
        this.removeAllListeners('annotationdelete');
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Draws the highlight with the specified fill style.
     *
     * @param {string} fillStyle RGBA fill style
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
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location.dimensions, pageDimensions, zoomScale);

        this._location.quadPoints.forEach((quadPoint) => {
            // If needed, scale quad points comparing current dimensions with saved dimensions
            let scaledQuadPoint = quadPoint;
            if (dimensionScale) {
                scaledQuadPoint = quadPoint.map((val, index) => {
                    return index % 2 ? val * dimensionScale.y : val * dimensionScale.x;
                });
            }

            const browserQuadPoint = docAnnotatorUtil.convertPDFSpaceToDOMSpace(scaledQuadPoint, pageHeight, zoomScale);
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
            context.fillStyle = constants.HIGHLIGHT_ERASE_FILL_STYLE;
            context.fill();
            context.restore();

            // Draw actual highlight rectangle if needed
            if (fillStyle !== constants.HIGHLIGHT_ERASE_FILL_STYLE) {
                context.fill();

                // Update highlight icon hover to appropriate color
                this._dialog.toggleHighlightIcon(fillStyle);
            }
        });
    }

    /**
     * Checks whether mouse is inside the highlight represented by this thread.
     *
     * @param {Event} event Mouse event
     * @returns {boolean} Whether or not mouse is inside highlight
     * @private
     */
    _isInHighlight(event) {
        const pageEl = this._getPageEl();
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const pageTop = pageDimensions.top + PAGE_PADDING_TOP;
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location.dimensions, pageDimensions, zoomScale);

        // DOM coordinates with respect to the page
        const x = event.clientX - pageDimensions.left;
        const y = event.clientY - pageTop;

        return this._location.quadPoints.some((quadPoint) => {
            // If needed, scale quad points comparing current dimensions with saved dimensions
            let scaledQuadPoint = quadPoint;
            if (dimensionScale) {
                scaledQuadPoint = quadPoint.map((val, index) => {
                    return index % 2 ? val * dimensionScale.y : val * dimensionScale.x;
                });
            }

            const browserQuadPoint = docAnnotatorUtil.convertPDFSpaceToDOMSpace(scaledQuadPoint, pageHeight, zoomScale);
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
     * Checks whether mouse is inside the dialog represented by this thread.
     *
     * @param {Event} event Mouse event
     * @returns {boolean} Whether or not mouse is inside dialog
     * @private
     */
    _isInDialog(event) {
        // DOM coordinates with respect to the page
        const x = event.clientX;
        const y = event.clientY;

        // Get dialog dimensions
        const dialogDimensions = this._dialog.getDimensions();

        if (y >= dialogDimensions.top && y <= dialogDimensions.bottom &&
            x >= dialogDimensions.left && x <= dialogDimensions.right) {
            return true;
        }
        return false;
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
