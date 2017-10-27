import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as constants from '../annotationConstants';
import { ICON_DRAW_SAVE, ICON_DRAW_DELETE } from '../../icons/icons';

class DocDrawingDialog extends AnnotationDialog {
    /** @property {boolean} Whether or not the dialog is visible */
    visible = false;

    /**
     * [constructor]
     *
     * @param {AnnotationDialogData} data - Data for constructing drawing dialog
     * @return {DocDrawingDialog} Drawing dialog instance
     */
    constructor(data) {
        super(data);

        this.postDrawing = this.postDrawing.bind(this);
        this.deleteAnnotation = this.deleteAnnotation.bind(this);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();
        this.removeAllListeners();

        if (!this.element) {
            return;
        }

        this.element.removeEventListener('click', annotatorUtil.prevDefAndStopProp);
        if (this.pageEl && this.pageEl.contains(this.element)) {
            this.pageEl.removeChild(this.element);
        }

        this.element = null;
    }

    /**
     * Returns whether or not the dialog is able to be seen
     *
     * @public
     * @return {boolean} Whether or not the dialog is able to be seen
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Save the drawing thread upon clicking save. Will cause a soft commit.
     *
     * @override
     * @protected
     * @return {void}
     */
    addAnnotation() {}

    /**
     * Empty stub to avoid unexpected behavior. Removing a drawing annotation can only be done by deleting the thread.
     *
     * @override
     * @protected
     * @return {void}
     */
    removeAnnotation() {}

    /**
     * Bind dialog button listeners
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        if (this.commitButtonEl) {
            this.commitButtonEl.addEventListener('click', this.postDrawing);

            if (this.hasTouch) {
                this.commitButtonEl.addEventListener('touchend', this.postDrawing);
            }
        }

        if (this.deleteButtonEl) {
            this.deleteButtonEl.addEventListener('click', this.deleteAnnotation);

            if (this.hasTouch) {
                this.deleteButtonEl.addEventListener('touchend', this.deleteAnnotation);
            }
        }
    }

    /**
     * Unbind dialog button listeners
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.commitButtonEl) {
            this.commitButtonEl.removeEventListener('click', this.postDrawing);
            this.commitButtonEl.removeEventListener('touchend', this.postDrawing);
        }

        if (this.deleteButtonEl) {
            this.deleteButtonEl.removeEventListener('click', this.deleteAnnotation);
            this.deleteButtonEl.removeEventListener('touchend', this.deleteAnnotation);
        }
    }

    /**
     * Sets up the drawing dialog element.
     *
     * @protected
     * @param {Annotation[]} annotations - Annotations to show in the dialog
     * @param {HTMLElement} threadEl - Annotation icon element
     * @return {void}
     */
    setup(annotations) {
        // Create outermost element container
        this.element = document.createElement('div');
        this.element.addEventListener('click', annotatorUtil.prevDefAndStopProp);
        this.element.classList.add(constants.CLASS_ANNOTATION_DIALOG);

        // Create the dialog element consisting of a label, save, and delete button
        this.drawingDialogEl = this.generateDialogEl(annotations);

        // Set the newly created buttons from the dialog element
        this.commitButtonEl = this.drawingDialogEl.querySelector(`.${constants.CLASS_ADD_DRAWING_BTN}`);
        this.deleteButtonEl = this.drawingDialogEl.querySelector(`.${constants.CLASS_DELETE_DRAWING_BTN}`);

        this.bindDOMListeners();

        if (annotations.length > 0) {
            this.assignDrawingLabel(annotations[0]);
        }

        this.element.appendChild(this.drawingDialogEl);
    }

    /**
     * Position the drawing dialog with an x,y browser coordinate
     *
     * @protected
     * @param {number} x - The x position to position the dialog with
     * @param {number} y - The y position to position the dialog with
     * @return {void}
     */
    position(x, y) {
        if (!this.pageEl) {
            this.pageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`);
        }

        // Reinsert when the dialog is removed from the page
        if (!this.pageEl.contains(this.element)) {
            this.pageEl.appendChild(this.element);
        }

        // NOTE: (@pramodsum) Add the annotationDialog.flipDialog implementation here
        // Show dialog so we can get width
        const clientRect = this.element.getBoundingClientRect();
        this.element.style.left = `${x - clientRect.width}px`;
        this.element.style.top = `${y}px`;
    }

    /**
     * Hide the dialog in the browser
     *
     * @protected
     * @return {void}
     */
    hide() {
        annotatorUtil.hideElement(this.element);
        this.visible = false;
    }

    /**
     * Display the dialog in the browser
     *
     * @protected
     * @return {void}
     */
    show() {
        annotatorUtil.showElement(this.element);
        this.visible = true;
    }

    /**
     * Generate the dialog HTMLElement consisting of a label, save, and delete button
     *
     * @private
     * @param {Array} annotations - Array of annotations. A non-empty array means there are saved drawings.
     * @return {HTMLElement} The drawing dialog element
     */
    generateDialogEl(annotations) {
        const canCommit = annotations.length === 0;
        const canDelete = canCommit || (annotations[0].permissions && annotations[0].permissions.can_delete);

        const drawingButtonsEl = document.createElement('span');
        drawingButtonsEl.classList.add(constants.CLASS_ANNOTATION_DRAWING_BTNS);

        const labelTemplate = document.createElement('span');
        labelTemplate.classList.add(constants.CLASS_ANNOTATION_DRAWING_LABEL);
        labelTemplate.classList.add(constants.CLASS_HIDDEN);
        drawingButtonsEl.appendChild(labelTemplate);

        if (canCommit) {
            const commitButton = annotatorUtil.generateBtn(
                constants.CLASS_ADD_DRAWING_BTN,
                this.localized.drawSave,
                `${ICON_DRAW_SAVE} ${this.localized.saveButton}`
            );
            drawingButtonsEl.appendChild(commitButton);
        }

        if (canDelete) {
            const deleteButton = annotatorUtil.generateBtn(
                constants.CLASS_DELETE_DRAWING_BTN,
                this.localized.drawDelete,
                `${ICON_DRAW_DELETE} ${this.localized.deleteButton}`
            );
            drawingButtonsEl.appendChild(deleteButton);
        }

        const drawingDialogEl = document.createElement('div');
        drawingDialogEl.classList.add(constants.CLASS_ANNOTATION_DRAWING_DIALOG);
        drawingDialogEl.appendChild(drawingButtonsEl);

        return drawingDialogEl;
    }

    /**
     * Fill out the drawing dialog label with the name of the user who drew the drawing. Will use anonymous if
     * the username does not exist.
     *
     * @private
     * @param {Annotation} savedAnnotation - The annotation data to populate the label with.
     * @return {void}
     */
    assignDrawingLabel(savedAnnotation) {
        if (!savedAnnotation || !this.drawingDialogEl) {
            return;
        }

        const drawingLabelEl = this.drawingDialogEl.querySelector(`.${constants.CLASS_ANNOTATION_DRAWING_LABEL}`);
        const username = savedAnnotation.user ? savedAnnotation.user.name : constants.USER_ANONYMOUS;
        drawingLabelEl.textContent = annotatorUtil.replacePlaceholders(this.localized.whoDrew, [username]);

        annotatorUtil.showElement(drawingLabelEl);
    }

    /**
     * Broadcasts message to save the drawing in progress
     *
     * @private
     * @param {event} event - The event object from an event emitter
     * @return {void}
     */
    postDrawing(event) {
        event.stopPropagation();
        event.preventDefault();
        this.emit('annotationcreate');
    }

    /**
     * Broadcasts message to delete a drawing.
     *
     * @private
     * @param {event} event - The event object from an event emitter
     * @return {void}
     */
    deleteAnnotation(event) {
        event.stopPropagation();
        event.preventDefault();
        this.emit('annotationdelete');
    }
}

export default DocDrawingDialog;
