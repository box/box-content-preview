/**
 * @fileoverview The highlight dialog class manages a simple dialog for
 * highlight threads that contains either an add or delete button and
 * broadcasts events.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationDialog from '../annotation-dialog';
import * as annotatorUtil from '../annotator-util';
import * as docAnnotatorUtil from './doc-annotator-util';
import { CLASS_HIDDEN, CLASS_ACTIVE } from '../../constants';
import * as constants from '../annotation-constants';
import { replacePlaceholders, decodeKeydown } from '../../util';
import { ICON_HIGHLIGHT, ICON_HIGHLIGHT_COMMENT } from '../../icons/icons';

const HIGHLIGHT_DIALOG_HEIGHT = 38;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocHighlightDialog extends AnnotationDialog {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Saves an annotation with the associated text or blank if only
     * highlighting. Only adds an annotation to the dialog if it contains text.
     * The annotation is still added to the thread on the server side.
     *
     * @override
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     */
    addAnnotation(annotation) {
        // If annotation is blank then display who highlighted the text
        // Will be displayed as '{name} highlighted'
        if (annotation.text === '' && annotation.user.id !== '0') {
            const highlightLabelEl = this._element.querySelector('.bp-annotation-highlight-label');
            highlightLabelEl.textContent = replacePlaceholders(__('annotation_who_highlighted'), [annotation.user.name]);
            annotatorUtil.showElement(highlightLabelEl);

            // Only reposition if mouse is still hovering over the dialog
            this.position();
        }

        super.addAnnotation(annotation);
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Positions the dialog.
     *
     * @override
     * @return {void}
     */
    position() {
        // Position it below lower right corner or center of the highlight - we need
        // to reposition every time since the DOM could have changed from
        // zooming
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`);
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

        const [browserX, browserY] = this.getScaledPDFCoordinates(pageDimensions, pageHeight);

        pageEl.appendChild(this._element);

        const highlightDialogWidth = this.getDialogWidth();

        let dialogX = browserX - (highlightDialogWidth / 2); // Center dialog
        // Shorten extra transparent border top if showing comments dialog
        let dialogY = this._hasComments ? browserY - 10 : browserY;
        dialogY -= 10;
        if (this._hasComments) {
            this._element.style.borderTopWidth = '30px';
        }

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        dialogX = annotatorUtil.repositionCaret(this._element, dialogX, highlightDialogWidth, browserX, pageDimensions.width);

        if (dialogY < 0) {
            dialogY = 0;
        } else if (dialogY + HIGHLIGHT_DIALOG_HEIGHT > pageHeight) {
            dialogY = pageHeight - HIGHLIGHT_DIALOG_HEIGHT;
        }

        this._element.style.left = `${dialogX}px`;
        this._element.style.top = `${dialogY + PAGE_PADDING_TOP}px`;
        docAnnotatorUtil.fitDialogHeightInPage(this._annotatedElement, this._element, pageDimensions.height, dialogY);
        annotatorUtil.showElement(this._element);
    }

    /**
     * Toggles between the highlight annotations buttons dialog and the
     * highlight comments dialog. Dialogs are toggled based on whether the
     * highlight annotation has text comments or not.
     *
     * @return {void}
     */
    toggleHighlightDialogs() {
        const highlightDialogEl = this._element.querySelector('.bp-annotation-highlight-dialog');
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const commentsDialogIsHidden = commentsDialogEl.classList.contains(CLASS_HIDDEN);

        // Displays comments dialog and hides highlight annotations button
        if (commentsDialogIsHidden) {
            this._element.classList.remove(constants.CLASS_ANNOTATION_DIALOG_HIGHLIGHT);
            annotatorUtil.hideElement(highlightDialogEl);

            this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.showElement(commentsDialogEl);
            this._hasComments = true;

            // Activate comments textarea
            const textAreaEl = this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            textAreaEl.classList.add(CLASS_ACTIVE);

        // Displays the highlight and comment buttons dialog and hides the
        // comments dialog
        } else {
            this._element.classList.remove(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.hideElement(commentsDialogEl);

            this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG_HIGHLIGHT);
            annotatorUtil.showElement(highlightDialogEl);
            this._hasComments = false;
        }

        // Reposition dialog
        this.position();
    }

    /**
     * Toggles between the "Add a comment here" and "Reply" text areas in the
     * comments dialog. This accounts for when a blank highlight is created and
     * then the user tries to add a comment after the fact.
     *
     * @param  {boolean} hasAnnotations Whether or not the dialog has comments
     * @return {void}
     */
    toggleHighlightCommentsReply(hasAnnotations) {
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const replyTextEl = commentsDialogEl.querySelector("[data-section='create']");
        const commentTextEl = commentsDialogEl.querySelector("[data-section='show']");

        // Ensures that "Add a comment here" text area is shown
        if (hasAnnotations) {
            annotatorUtil.hideElement(replyTextEl);
            annotatorUtil.showElement(commentTextEl);
            this._deactivateReply();

        // Ensures that "Reply" text area is shown
        } else {
            annotatorUtil.hideElement(commentTextEl);
            annotatorUtil.showElement(replyTextEl);
            this._activateReply();
        }

        // Reposition dialog
        this.position();
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @override
     * @return {void}
     * @protected
     */
    setup(annotations) {
        // Only create an entirely new dialog, if one doesn't already exist
        if (!this._element) {
            this._element = document.createElement('div');
        }

        if (annotations.length > 0) {
            // Determine if highlight buttons or comments dialog will display
            this._hasComments = annotations[0].text !== '' || annotations.length > 1;

            // Assign thread number
            this._element.dataset.threadNumber = annotations[0]._thread;
        }

        const dialogTypeClass = this._hasComments ? constants.CLASS_ANNOTATION_DIALOG : constants.CLASS_ANNOTATION_DIALOG_HIGHLIGHT;
        this._element.classList.add(dialogTypeClass);

        // Indicate that text is highlighted in the highlight buttons dialog
        if (annotations.length > 0) {
            this._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
        }

        this._element.innerHTML = `
            <div class="bp-annotation-caret"></div>
            <div class="bp-annotation-highlight-dialog ${this._hasComments ? CLASS_HIDDEN : ''}">
                <span class="bp-annotation-highlight-label ${CLASS_HIDDEN}"></span>
                <button class="bp-btn-plain bp-add-highlight-btn"
                    data-type="highlight-btn"
                    title="${__('annotation_highlight_toggle')}">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="bp-btn-plain bp-highlight-comment-btn"
                    data-type="add-highlight-comment-btn"
                    title="${__('annotation_highlight_comment')}">
                    ${ICON_HIGHLIGHT_COMMENT}
                </button>
            </div>
            <div class="annotation-container ${this._hasComments ? '' : CLASS_HIDDEN}">
                <section class="${annotations.length ? CLASS_HIDDEN : ''}" data-section="create">
                    <textarea class="bp-textarea annotation-textarea"
                        placeholder="${__('annotation_add_comment_placeholder')}"></textarea>
                    <div class="button-container">
                        <button class="bp-btn cancel-annotation-btn" data-type="cancel-annotation-btn">
                            ${__('annotation_cancel')}
                        </button>
                        <button class="bp-btn bp-btn-primary post-annotation-btn" data-type="post-annotation-btn">
                            ${__('annotation_post')}
                        </button>
                    </div>
                </section>
                <section class="${annotations.length ? '' : CLASS_HIDDEN}" data-section="show">
                    <div class="annotation-comments"></div>
                    <div class="reply-container">
                        <textarea class="bp-textarea reply-textarea"
                            placeholder="${__('annotation_reply_placeholder')}" data-type="reply-textarea"></textarea>
                        <div class="button-container ${CLASS_HIDDEN}">
                            <button class="bp-btn cancel-annotation-btn" data-type="cancel-reply-btn">
                                ${__('annotation_cancel')}
                            </button>
                            <button class="bp-btn bp-btn-primary post-annotation-btn" data-type="post-reply-btn">
                                ${__('annotation_post')}
                            </button>
                        </div>
                    </div>
                </section>
            </section>`.trim();

        // Checks if highlight is a plain highlight annotation and if user name
        // has been populated. If userID is 0, user name will be 'Some User'
        if (annotatorUtil.isPlainHighlight(annotations) && annotations[0].user.id !== '0') {
            const highlightLabelEl = this._element.querySelector('.bp-annotation-highlight-label');
            highlightLabelEl.textContent = replacePlaceholders(__('annotation_who_highlighted'), [annotations[0].user.name]);
            annotatorUtil.showElement(highlightLabelEl);

            // Hide delete button on plain highlights if user doesn't have
            // permissions
            if (annotations[0].permissions && !annotations[0].permissions.can_delete) {
                const addHighlightBtn = this._element.querySelector('.bp-add-highlight-btn');
                annotatorUtil.hideElement(addHighlightBtn);
            }
        }

        // Add annotation elements
        annotations.forEach((annotation) => {
            this.addAnnotationElement(annotation);
        });

        this.bindDOMListeners();
    }

    /**
     * Binds DOM event listeners.
     *
     * @override
     * @return {void}
     * @protected
     */
    bindDOMListeners() {
        this._element.addEventListener('mousedown', this.mousedownHandler);
        this._element.addEventListener('mouseup', this.mouseupHandler);
        this._element.addEventListener('keydown', this.keydownHandler);
        this._element.addEventListener('mouseenter', this.mouseenterHandler);
        this._element.addEventListener('mouseleave', this.mouseleaveHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        this._element.removeEventListener('mousedown', this.mousedownHandler);
        this._element.removeEventListener('mouseup', this.mouseupHandler);
        this._element.removeEventListener('keydown', this.keydownHandler);
        this._element.removeEventListener('mouseenter', this.mouseenterHandler);
        this._element.removeEventListener('mouseleave', this.mouseleaveHandler);
    }

    /**
     * Keydown handler on dialog. Needed since we are binding to 'mousedown'
     * instead of 'click'.
     *
     * @override
     * @return {void}
     * @protected
     */
    keydownHandler(event) {
        event.stopPropagation();
        if (decodeKeydown(event) === 'Enter') {
            this.mousedownHandler(event);
        }
        super.keydownHandler(event);
    }

    /**
     * Mousedown handler on dialog.
     *
     * @param {Event} event - DOM event
     * @return {void}
     * @protected
     */
    mousedownHandler(event) {
        event.stopPropagation();
        const dataType = annotatorUtil.findClosestDataType(event.target);

        switch (dataType) {
            // Clicking 'Highlight' button to create or remove a highlight
            case 'highlight-btn':
                this.emit('annotationdraw');
                this.toggleHighlight();
                break;

            // Clicking 'Highlight' button to create a highlight
            case 'add-highlight-comment-btn':
                this.emit('annotationdraw');
                this.toggleHighlightCommentsReply(false);
                this.toggleHighlightDialogs();

                // Prevent mousedown from focusing on button clicked
                event.preventDefault();
                this.focusAnnotationsTextArea();
                break;

            default:
                super.clickHandler(event);
                break;
        }
    }

    /**
     * Toggles the highlight icon color to a darker yellow based on if the user
     * is hovering over the highlight to activate it
     *
     * @param {string} fillStyle - RGBA fill style
     * @return {void}
     */
    toggleHighlightIcon(fillStyle) {
        const addHighlightBtn = this._element.querySelector('.bp-add-highlight-btn');
        if (fillStyle === constants.HIGHLIGHT_ACTIVE_FILL_STYLE) {
            addHighlightBtn.classList.add('highlight-active');
        } else {
            addHighlightBtn.classList.remove('highlight-active');
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Saves or deletes the highlight annotation based on the current state of
     * the highlight
     *
     * @private
     * @return {void}
     */
    toggleHighlight() {
        const isTextHighlighted = this._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

        // Creates a blank highlight annotation
        if (!isTextHighlighted) {
            this._hasComments = false;
            this._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            this.emit('annotationcreate');

        // Deletes blank highlight annotation if user has permission
        } else {
            this._hasComments = true;
            this.emit('annotationdelete');
        }
    }

    /**
     * Focuses on "Add a comment" textarea in the annotations dialog
     * @return {void}
     */
    focusAnnotationsTextArea() {
        const textAreaEl = this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
        if (annotatorUtil.isElementInViewport(textAreaEl)) {
            textAreaEl.focus();
        }
    }

    /**
     * Calculates the dialog width if the highlighter's name is to be displayed
     * in the annotations dialog
     * @return {number} Annotations dialog width
     */
    getDialogWidth() {
        // Switches to 'visibility: hidden' to ensure that dialog takes up DOM
        // space while still being invisible
        annotatorUtil.hideElementVisibility(this._element);
        annotatorUtil.showElement(this._element);

        this.highlightDialogWidth = this._element.getBoundingClientRect().width;

        // Switches back to 'display: none' to so that it no longer takes up place
        // in the DOM while remaining hidden
        annotatorUtil.hideElement(this._element);
        annotatorUtil.showInvisibleElement(this._element);

        return this.highlightDialogWidth;
    }

    /**
     * Get scaled coordinates for the lower center point of the highlight if the
     * highlight has comments or the lower right corner of the highlight for
     * plain highlights
     * @param  {DOMRect} pageDimensions Dimensions of the highlight annotations dialog element
     * @param  {number} pageHeight Document page height
     * @return {number[]} [x,y] coordinates in DOM space in CSS
     */
    getScaledPDFCoordinates(pageDimensions, pageHeight) {
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);

        let [x, y] = docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint(this._location.quadPoints);

        // If needed, scale coordinates comparing current dimensions with saved dimensions
        const dimensionScale = annotatorUtil.getDimensionScale(this._location.dimensions, pageDimensions, zoomScale, PAGE_PADDING_TOP + PAGE_PADDING_BOTTOM);
        if (dimensionScale) {
            x *= dimensionScale.x;
            y *= dimensionScale.y;
        }

        return docAnnotatorUtil.convertPDFSpaceToDOMSpace([x, y], pageHeight, zoomScale);
    }


    /**
     * Adds an annotation to the dialog.
     *
     * @override
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     */
    addAnnotationElement(annotation) {
        // If annotation text is blank, don't add to the comments dialog
        if (annotation.text === '') {
            const annotationEl = this._element.querySelector('.bp-annotation-highlight-dialog');
            annotationEl.dataset.annotationId = annotation.annotationID;
        } else {
            super.addAnnotationElement(annotation);
        }
    }
}

export default DocHighlightDialog;
