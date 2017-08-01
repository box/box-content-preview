import autobind from 'autobind-decorator';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as docAnnotatorUtil from './docAnnotatorUtil';
import { CLASS_HIDDEN, CLASS_ACTIVE } from '../../constants';
import { ICON_HIGHLIGHT, ICON_HIGHLIGHT_COMMENT } from '../../icons/icons';
import * as constants from '../annotationConstants';

const CLASS_HIGHLIGHT_DIALOG = 'bp-highlight-dialog';
const CLASS_ANNOTATION_HIGHLIGHT_DIALOG = 'bp-annotation-highlight-dialog';
const CLASS_TEXT_HIGHLIGHTED = 'bp-is-text-highlighted';
const CLASS_HIGHLIGHT_LABEL = 'bp-annotation-highlight-label';

const HIGHLIGHT_DIALOG_HEIGHT = 38;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocHighlightDialog extends AnnotationDialog {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /** D
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
            const highlightLabelEl = this.highlightDialogEl.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            highlightLabelEl.textContent = annotatorUtil.replacePlaceholders(__('annotation_who_highlighted'), [
                annotation.user.name
            ]);
            annotatorUtil.showElement(highlightLabelEl);

            // Only reposition if mouse is still hovering over the dialog
            this.position();
        }

        super.addAnnotation(annotation);
    }

    /**
     * Emit the message to create a highlight and render it.
     *
     * @public
     * @return {void}
     */
    drawAnnotation() {
        this.emit('annotationdraw');
        this.toggleHighlight();
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
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`);
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

        const [browserX, browserY] = this.getScaledPDFCoordinates(pageDimensions, pageHeight);

        pageEl.appendChild(this.element);

        const highlightDialogWidth = this.getDialogWidth();

        let dialogX = browserX - highlightDialogWidth / 2; // Center dialog
        // Shorten extra transparent border top if showing comments dialog
        let dialogY = this.hasComments ? browserY - 10 : browserY;
        dialogY -= 10;
        if (this.hasComments) {
            this.element.style.borderTopWidth = '30px';
        }

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        dialogX = annotatorUtil.repositionCaret(
            this.element,
            dialogX,
            highlightDialogWidth,
            browserX,
            pageDimensions.width
        );

        if (dialogY < 0) {
            dialogY = 0;
        } else if (dialogY + HIGHLIGHT_DIALOG_HEIGHT > pageHeight) {
            dialogY = pageHeight - HIGHLIGHT_DIALOG_HEIGHT;
        }

        this.element.style.left = `${dialogX}px`;
        this.element.style.top = `${dialogY + PAGE_PADDING_TOP}px`;
        docAnnotatorUtil.fitDialogHeightInPage(this.annotatedElement, this.element, pageDimensions.height, dialogY);
        annotatorUtil.showElement(this.element);
    }

    /**
     * Toggles between the highlight annotations buttons dialog and the
     * highlight comments dialog. Dialogs are toggled based on whether the
     * highlight annotation has text comments or not.
     *
     * @return {void}
     */
    toggleHighlightDialogs() {
        const commentsDialogIsHidden = this.commentsDialogEl.classList.contains(CLASS_HIDDEN);

        // Displays comments dialog and hides highlight annotations button
        if (commentsDialogIsHidden) {
            this.element.classList.remove(CLASS_HIGHLIGHT_DIALOG);
            annotatorUtil.hideElement(this.highlightDialogEl);

            this.element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.showElement(this.commentsDialogEl);
            this.hasComments = true;

            // Activate comments textarea
            const textAreaEl = this.dialogEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            textAreaEl.classList.add(CLASS_ACTIVE);
        } else {
            // Displays the highlight and comment buttons dialog and
            // hides the comments dialog
            this.element.classList.remove(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.hideElement(this.commentsDialogEl);

            this.element.classList.add(CLASS_HIGHLIGHT_DIALOG);
            annotatorUtil.showElement(this.highlightDialogEl);
            this.hasComments = false;
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
        const replyTextEl = this.commentsDialogEl.querySelector(constants.SECTION_CREATE);
        const commentTextEl = this.commentsDialogEl.querySelector(constants.SECTION_SHOW);

        // Ensures that "Add a comment here" text area is shown
        if (hasAnnotations) {
            annotatorUtil.hideElement(replyTextEl);
            annotatorUtil.showElement(commentTextEl);
            this.deactivateReply();
        } else {
            // Ensures that "Reply" text area is shown
            annotatorUtil.hideElement(commentTextEl);
            annotatorUtil.showElement(replyTextEl);
            this.activateReply();
        }

        // Reposition dialog
        if (!this.isMobile) {
            this.position();
        }
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
        // Only create an dialog element, if one doesn't already exist
        if (!this.element) {
            this.element = document.createElement('div');
        }

        // Determine if highlight buttons or comments dialog will display
        if (annotations.length > 0) {
            this.hasComments = annotations[0].text !== '' || annotations.length > 1;
        }

        // Generate HTML of highlight dialog
        this.highlightDialogEl = this.generateHighlightDialogEl();
        this.highlightDialogEl.classList.add(CLASS_ANNOTATION_HIGHLIGHT_DIALOG);

        // Generate HTML of comments dialog
        this.commentsDialogEl = this.generateDialogEl(annotations.length);
        this.commentsDialogEl.classList.add(constants.CLASS_ANNOTATION_CONTAINER);

        this.dialogEl = document.createElement('div');
        this.dialogEl.appendChild(this.highlightDialogEl);
        this.dialogEl.appendChild(this.commentsDialogEl);
        if (this.hasComments) {
            this.highlightDialogEl.classList.add(CLASS_HIDDEN);
        } else {
            this.commentsDialogEl.classList.add(CLASS_HIDDEN);
        }

        if (!this.isMobile) {
            this.element.setAttribute('data-type', constants.DATA_TYPE_ANNOTATION_DIALOG);
            this.element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            this.element.innerHTML = `<div class="${constants.CLASS_ANNOTATION_CARET}"></div>`;
            this.element.appendChild(this.dialogEl);

            // Adding thread number to dialog
            if (annotations.length > 0) {
                this.element.dataset.threadNumber = annotations[0].threadNumber;
            }
        }

        // Indicate that text is highlighted in the highlight buttons dialog
        if (annotations.length > 0) {
            this.dialogEl.classList.add(CLASS_TEXT_HIGHLIGHTED);
        }

        // Checks if highlight is a plain highlight annotation and if
        // user name has been populated. If userID is 0, user name will
        // be 'Some User'
        if (annotatorUtil.isPlainHighlight(annotations) && annotations[0].user.id !== '0') {
            const highlightLabelEl = this.highlightDialogEl.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            highlightLabelEl.textContent = annotatorUtil.replacePlaceholders(__('annotation_who_highlighted'), [
                annotations[0].user.name
            ]);
            annotatorUtil.showElement(highlightLabelEl);

            // Hide delete button on plain highlights if user doesn't have
            // permissions
            if (annotations[0].permissions && !annotations[0].permissions.can_delete) {
                const addHighlightBtn = this.highlightDialogEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
                annotatorUtil.hideElement(addHighlightBtn);
            }
        }

        // Add annotation elements
        annotations.forEach((annotation) => {
            this.addAnnotationElement(annotation);
        });

        if (!this.isMobile) {
            this.bindDOMListeners();
        }
    }

    /**
     * Binds DOM event listeners.
     *
     * @override
     * @return {void}
     * @protected
     */
    bindDOMListeners() {
        this.element.addEventListener('mousedown', this.mousedownHandler);
        this.element.addEventListener('keydown', this.keydownHandler);

        if (!this.isMobile) {
            this.element.addEventListener('mouseenter', this.mouseenterHandler);
            this.element.addEventListener('mouseleave', this.mouseleaveHandler);
        }
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        this.element.removeEventListener('mousedown', this.mousedownHandler);
        this.element.removeEventListener('keydown', this.keydownHandler);

        if (!this.isMobile) {
            this.element.removeEventListener('mouseenter', this.mouseenterHandler);
            this.element.removeEventListener('mouseleave', this.mouseleaveHandler);
        }
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
        if (annotatorUtil.decodeKeydown(event) === 'Enter') {
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
            case constants.DATA_TYPE_HIGHLIGHT:
                this.drawAnnotation();
                break;
            // Clicking 'Highlight' button to create a highlight
            case constants.DATA_TYPE_ADD_HIGHLIGHT_COMMENT:
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
        const addHighlightBtn = this.dialogEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
        if (fillStyle === constants.HIGHLIGHT_FILL.active) {
            addHighlightBtn.classList.add(CLASS_ACTIVE);
        } else {
            addHighlightBtn.classList.remove(CLASS_ACTIVE);
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
        const isTextHighlighted = this.dialogEl.classList.contains(CLASS_TEXT_HIGHLIGHTED);

        // Creates a blank highlight annotation
        if (!isTextHighlighted) {
            this.hasComments = false;
            this.dialogEl.classList.add(CLASS_TEXT_HIGHLIGHTED);
            this.emit('annotationcreate');

            // Deletes blank highlight annotation if user has permission
        } else {
            this.hasComments = true;
            this.emit('annotationdelete');
        }
    }

    /**
     * Focuses on "Add a comment" textarea in the annotations dialog
     * @return {void}
     */
    focusAnnotationsTextArea() {
        const textAreaEl = this.dialogEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
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
        annotatorUtil.hideElementVisibility(this.element);
        annotatorUtil.showElement(this.element);

        this.highlightDialogWidth = this.element.getBoundingClientRect().width;

        // Switches back to 'display: none' to so that it no longer takes up place
        // in the DOM while remaining hidden
        annotatorUtil.hideElement(this.element);
        annotatorUtil.showInvisibleElement(this.element);

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
        const zoomScale = annotatorUtil.getScale(this.annotatedElement);

        let [x, y] = docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint(this.location.quadPoints);

        // If needed, scale coordinates comparing current dimensions with saved dimensions
        const dimensionScale = annotatorUtil.getDimensionScale(
            this.location.dimensions,
            pageDimensions,
            zoomScale,
            PAGE_PADDING_TOP + PAGE_PADDING_BOTTOM
        );
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
            this.highlightDialogEl.dataset.annotationId = annotation.annotationID;
        } else {
            super.addAnnotationElement(annotation);
        }
    }

    /**
     * Generates the highlight annotation dialog DOM element
     *
     * @private
     * @return {HTMLElement} Highlight annotation dialog DOM element
     */
    generateHighlightDialogEl() {
        const highlightDialogEl = document.createElement('div');
        highlightDialogEl.innerHTML = `
            <span class="${CLASS_HIGHLIGHT_LABEL} ${CLASS_HIDDEN}"></span>
            <span class="${constants.CLASS_HIGHLIGHT_BTNS} ${this.isMobile ? CLASS_HIDDEN : ''}">
                <button class="bp-btn-plain ${constants.CLASS_ADD_HIGHLIGHT_BTN}"
                    data-type="${constants.DATA_TYPE_HIGHLIGHT}"
                    title="${__('annotation_highlight_toggle')}">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="bp-btn-plain ${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}"
                    data-type="${constants.DATA_TYPE_ADD_HIGHLIGHT_COMMENT}"
                    title="${__('annotation_highlight_comment')}">
                    ${ICON_HIGHLIGHT_COMMENT}
                </button>
            </span>`.trim();
        return highlightDialogEl;
    }
}

export default DocHighlightDialog;
