import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import AnnotationService from './annotation-service';
import Browser from '../browser';

import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/constants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';
import { ICON_DELETE_SMALL } from '../icons/icons';

const POINT_ANNOTATION_ICON_WIDTH = 16;
const POINT_ANNOTATION_TYPE = 'point';
const TOUCH_EVENT = Browser.isMobile() ? 'touchstart' : 'click';

const ANONYMOUS_USER = {
    name: 'Kylo Ren',
    avatarUrl: 'https://i.imgur.com/BcZWDIg.png'
};

/**
 * Annotator base class that implements point annotations. Viewer-specific
 * annotators should extend this for other annotation types and to extend
 * point annotation behavior.
 */
@autobind
class Annotator {

    /* ---------- Generic Public Functions ---------- */
    /**
     * @constructor
     * @param {string} fileID File ID for annotations
     * @param {Object} [options] Optional parameters
     * @param {Object} [options.user] Optional user for annotations
     * @param {AnnotationService} [options.annotationService] Optional
     * annotations service for annotations persistence
     * @returns {void}
     */
    constructor(fileID, options = {}) {
        this.fileID = fileID;
        // Default to anonymous user
        this.user = options.user || ANONYMOUS_USER;
        // @TODO(tjin): new LocalStorageAnnotationService
        // Default to local storage annotations service
        this.annotationService = options.annotationService || new AnnotationService();
    }

    /**
     * Destructor.
     *
     * @returns {void}
     */
    destroy() {
        // Remove managed click event handlers
        this.removeAllEventHandlers();
    }

    /**
     * Initializes annotator.
     *
     * @returns {void}
     */
    init() {
        // Event handler refs for cleanup
        this.handlerRefs = [];

        // Init scale if needed
        this.scale = this.scale || 1;

        this.setupAnnotations();
    }

    /**
     * Sets the zoom scale.
     *
     * @param {Number} scale
     * @returns {void}
     */
    setScale(scale) {
        this.scale = scale;
    }

    /* ---------- Generic Annotation Functions ---------- */
    /**
     * Annotations setup.
     *
     * @returns {void}
     */
    setupAnnotations() {
        // Init in-memory map of annotations: page -> annotations on page
        // Note that this map only includes the first annotation in a thread
        // since we only need to display one annotation per thread and can
        // load the other ones on-demand
        this.annotations = {};

        // Add handler for annotation hover behavior
        document.addEventListener('mousemove', this.mousemoveHandler());

        // Add handler for point annotation click behavior (for mobile)
        document.addEventListener(TOUCH_EVENT, this.pointClickHandler);

        // Hide annotation dialogs and buttons on right click
        document.addEventListener('contextmenu', this.contextmenuHandler);
    }

    /**
     * Fetches saved annotations and stores in-memory.
     *
     * @returns {Promise} Promise for fetching saved annotations
     */
    fetchAnnotations() {
        // @TODO(tjin): Load/unload annotations by page based on pages loaded from document viewer

        // Fetch map of thread ID to annotations, return the promise
        return this.annotationService.getAnnotationsForFile(this.fileID).then((annotationsMap) => {
            // Generate maps of page to annotations
            for (const annotations of annotationsMap.values()) {
                // We only need to show the first annotation in a thread
                const firstAnnotation = annotations[0];
                const page = firstAnnotation.location.page || 1;
                this.annotations[page] = this.annotations[page] || [];
                this.annotations[page].push(firstAnnotation);
            }
        });
    }

    /**
     * Clears annotations on page.
     *
     * @returns {void}
     */
    clearAnnotations() {
        const pointAnnotationButtonEls = [].slice.call(document.querySelectorAll(constants.SELECTOR_ANNOTATION_POINT), 0);
        pointAnnotationButtonEls.forEach((pointAnnotationButtonEl) => {
            pointAnnotationButtonEl.parentNode.removeChild(pointAnnotationButtonEl);
        });
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     */
    renderAnnotations() {
        this.clearAnnotations();
        this.showPointAnnotations();
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // Show highlight and point annotations after we've generated
        // an in-memory map
        this.fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Create an annotation object from annotation data.
     *
     * @param {String} annotationType Type of annotation
     * @param {String} annotationText Comment text for annotation
     * @param {Object} locationData Location data
     * @returns {Annotation} Annotation
     */
    createAnnotationObject(annotationType, annotationText, locationData) {
        const data = {
            fileID: this.fileID,
            type: annotationType,
            text: annotationText,
            location: locationData,
            user: this.user
        };

        return new Annotation(data);
    }

    /**
     * Adds an annotation to persistant store and in-memory map
     *
     * @param {Annotation} annotation Annotation to add
     * @param {Boolean} addToMap Whether or not to add to in-memory map
     * @returns {Promise} Promise to add annotation, resolves with created
     * annotation
     */
    createAnnotation(annotation, addToMap) {
        if (addToMap) {
            const page = annotation.location.page || 1;
            this.annotations[page] = this.annotations[page] || [];
            this.annotations[page].push(annotation);
        }

        return this.annotationService.create(annotation);
    }

    /**
     * Removes an annotation from persistant store and in-memory map
     *
     * @param {Annotation} annotation Annotation to remove
     * @param {Boolean} removeFromMap Whether or not to remove from in-memory map
     * @returns {Promise} Promise to remove annotation
     */
    deleteAnnotation(annotationID, removeFromMap) {
        // Remove from in-memory map. We use Array.prototype.some to short circuit loop
        if (removeFromMap) {
            Object.keys(this.annotations).some((page) => {
                const pageAnnotations = this.annotations[page];
                return pageAnnotations.some((annot, index) => {
                    if (annot.annotationID === annotationID) {
                        pageAnnotations.splice(index, 1);
                        return true;
                    }
                    return false;
                });
            });
        }

        // Remove from persistant store
        return this.annotationService.delete(annotationID);
    }

    /**
     * Right click handler. Should be overridden.
     *
     * @returns {void}
     */
    contextmenuHandler() {}

    /**
     * Handler for mousemove over the document. Should be overridden.
     *
     * @returns {Function}
     */
    mousemoveHandler() {
        return () => {};
    }

    /* ---------- Point Annotations ---------- */
    /**
     * Shows a single point annotation (annotation on specific points).
     *
     * @param {Annotation} annotation Point annotation to show
     * @returns {void}
     */
    showPointAnnotation(annotation) {
        // Create point annotation HTML
        const pointAnnotationButtonEl = document.createElement('button');
        pointAnnotationButtonEl.classList.add('box-preview-show-point-annotation-btn');
        pointAnnotationButtonEl.setAttribute('data-type', 'show-point-annotation-btn');
        pointAnnotationButtonEl.setAttribute('data-thread-id', annotation.threadID);

        const location = annotation.location;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        pointAnnotationButtonEl.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        pointAnnotationButtonEl.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        pageEl.appendChild(pointAnnotationButtonEl);
    }

    /**
     * Shows point annotations (annotations on specific points).
     *
     * @param {Annotation[]} pointAnnotations Array of point annotations
     * @returns {void}
     */
    showPointAnnotations() {
        Object.keys(this.annotations).forEach((page) => {
            const points = this.annotations[page].filter((annotation) => annotation.type === POINT_ANNOTATION_TYPE);
            points.forEach((annotation) => {
                this.showPointAnnotation(annotation);
            });
        });
    }

    /**
     * Shows a placeholder point annotation icon at the specified location.
     *
     * @param {Object} location Location data for where to place placeholder
     * @returns {void}
     */
    showPlaceholderPointAnnotation(location) {
        let pointPlaceholderEl = document.querySelector(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        if (!pointPlaceholderEl) {
            pointPlaceholderEl = document.createElement('button');
            pointPlaceholderEl.classList.add(constants.CLASS_ANNOTATION_POINT_PLACEHOLDER);
        }

        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        pointPlaceholderEl.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        pointPlaceholderEl.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        annotatorUtil.showElement(pointPlaceholderEl);
        pageEl.appendChild(pointPlaceholderEl);
    }

    /**
     * Handler for click on document for showing and hiding point comments
     * and dialog. This is mainly used for mobile compatibility since on the
     * web, we have a hover interaction.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    pointClickHandler(event) {
        event.stopPropagation();

        const eventTarget = event.target;
        const dataType = annotatorUtil.findClosestDataType(eventTarget);

        if (dataType === 'show-point-annotation-btn') {
            this.showAnnotationDialog(eventTarget.getAttribute('data-thread-id'));
        } else if (dataType === 'show-annotation-dialog') {
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        } else if (dataType === 'create-annotation-dialog') {
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        } else {
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        }
    }

    /**
     * Toggles point annotation mode on and off. When point annotation mode is
     * on, clicking an area will create a point annotation at that location.
     *
     * @returns {void}
     */
    togglePointAnnotationModeHandler() {
        const docEl = document.querySelector('.box-preview-doc');

        // If in annotation mode, turn it off
        if (docEl.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)) {
            docEl.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            this.removeEventHandlers(docEl);

            // Enable highlight-related events
            this.bindHighlightHandlers();

        // Otherwise, enable annotation mode
        } else {
            docEl.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            this.addEventHandler(docEl, this.addPointAnnotationHandler);

            // Disable highlight-related events
            this.unbindHighlightHandlers();
        }
    }

    /**
     * Event handler for adding a point annotation. Shows a create point
     * annotation dialog at the next location the user clicks.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addPointAnnotationHandler(event) {
        event.stopPropagation();

        // If click isn't on a page, ignore
        const eventTarget = event.target;
        const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(eventTarget);
        if (!pageEl) {
            return;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        if (dataType === 'show-annotation-dialog' ||
            dataType === 'create-annotation-dialog' ||
            dataType === 'show-point-annotation-btn') {
            return;
        }

        // Store coordinates at 100% scale in PDF space in PDF units
        const pageDimensions = pageEl.getBoundingClientRect();
        const browserCoordinates = [event.clientX - pageDimensions.left, event.clientY - pageDimensions.top];
        const pdfCoordinates = annotatorUtil.convertDOMSpaceToPDFSpace(browserCoordinates, pageDimensions.height, this.scale);
        const [x, y] = pdfCoordinates;
        const locationData = { x, y, page };

        this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);
    }

    /* ---------- Dialogs ---------- */
    /**
     * Show a dialog that allows a user to create an annotation.
     *
     * @param {Object} locationData Location to place dialog
     * @param {String} annotationType Type of annotation
     * @returns {void}
     */
    createAnnotationDialog(locationData, annotationType) {
        // Show a placeholder & hide point annotation indicator
        this.showPlaceholderPointAnnotation(locationData);
        annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_ICON);

        // Create annotation dialog HTML
        let annotationDialogEl = document.querySelector(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
        if (!annotationDialogEl) {
            annotationDialogEl = document.createElement('div');
            annotationDialogEl.setAttribute('data-type', 'create-annotation-dialog');
            annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG_CREATE);
            const annotationElString = `
                <div class="annotation-container-caret"></div>
                <div class="annotation-container">
                    <textarea class="annotation-textarea ${CLASS_ACTIVE}" placeholder="Add a comment here..."></textarea>
                    <div class="button-container">
                        <button class="btn cancel-annotation-btn">CANCEL</button>
                        <button class="btn btn-primary post-annotation-btn">POST</button>
                    </div>
                </div>`.trim();
            annotationDialogEl.innerHTML = annotationElString;
        }

        const postButtonEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_POST);
        const cancelButtonEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_CANCEL);
        const annotationTextEl = annotationDialogEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);

        // Clean up existing handler
        this.removeEventHandlers(postButtonEl, cancelButtonEl);

        // Clicking 'Post' to add annotation
        this.addEventHandler(postButtonEl, (event) => {
            event.stopPropagation();

            // Get annotation text and create annotation
            const annotationText = annotationTextEl.value;
            if (annotationText.trim() === '') {
                return;
            }

            const annotation = this.createAnnotationObject(annotationType, annotationText, locationData);

            // Save annotation
            this.createAnnotation(annotation, true).then((createdAnnotation) => {
                annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
                annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);

                // Show point annotation icon
                this.showPointAnnotation(createdAnnotation);

                // Show newly created annotation text on top
                this.showAnnotationDialog(createdAnnotation.threadID);
            });
        });

        // Clicking 'Cancel' to cancel annotation
        this.addEventHandler(cancelButtonEl, (event) => {
            event.stopPropagation();
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_CREATE);
            annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_POINT_PLACEHOLDER);
        });

        this.positionDialog(annotationDialogEl, locationData);

        annotationTextEl.value = '';

        // Focus only if in viewport - otherwise, focus forces a scroll
        if (annotatorUtil.isElementInViewport(annotationTextEl)) {
            annotationTextEl.focus();
        }
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {String} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        // Don't regenerate dialog if the appropriate one is open already
        let annotationDialogEl = document.querySelector(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);
        if (annotationDialogEl && !annotationDialogEl.classList.contains(CLASS_HIDDEN) &&
            annotationDialogEl.getAttribute('data-thread-id') === threadID) {
            return;
        }

        this.annotationService.getAnnotationsForThread(threadID).then((annotations) => {
            if (!annotations || annotations.length === 0) {
                return;
            }

            // Create annotation dialog if needed
            if (!annotationDialogEl) {
                annotationDialogEl = document.createElement('div');
                annotationDialogEl.setAttribute('data-type', 'show-annotation-dialog');
                annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG);
                annotationDialogEl.classList.add(constants.CLASS_ANNOTATION_DIALOG_SHOW);
                annotationDialogEl.innerHTML = `
                    <div class="annotation-container-caret"></div>
                    <div class="annotation-container">
                        <div class="annotation-comments"></div>
                        <div class="reply-container">
                            <textarea class="annotation-textarea" placeholder="Post a reply..."></textarea>
                            <div class="button-container ${CLASS_HIDDEN}">
                                <button class="btn cancel-annotation-btn">CANCEL</button>
                                <button class="btn btn-primary post-annotation-btn">POST</button>
                            </div>
                        </div>
                    </div>`.trim();
            }

            annotationDialogEl.setAttribute('data-thread-id', threadID);

            const replyContainerEl = annotationDialogEl.querySelector(constants.SELECTOR_REPLY_CONTAINER);
            const replyButtonContainerEl = replyContainerEl.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
            const replyTextEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            const cancelButtonEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_CANCEL);
            const postButtonEl = replyContainerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_POST);
            const annotationCommentsEl = annotationDialogEl.querySelector(constants.SELECTOR_COMMENTS_CONTAINER);
            const commentButtonEls = [].slice.call(annotationCommentsEl.querySelectorAll('button'), 0);

            // Remove old event handlers for reply buttons and delete-related buttons inside the comment thread
            this.removeEventHandlers(cancelButtonEl, postButtonEl, ...commentButtonEls);

            // Reset thread
            annotationCommentsEl.innerHTML = '';
            annotatorUtil.resetTextarea(replyTextEl);
            annotatorUtil.hideElement(replyButtonContainerEl);

            // Clicking in textarea shows reply buttons
            this.addEventHandler(replyTextEl, (event) => {
                event.stopPropagation();

                replyTextEl.classList.add(CLASS_ACTIVE);
                annotatorUtil.showElement(replyButtonContainerEl);
            });

            // Typing in textarea shows reply buttons
            this.addEventHandler(replyTextEl, (event) => {
                event.stopPropagation();

                replyTextEl.classList.add(CLASS_ACTIVE);
                annotatorUtil.showElement(replyButtonContainerEl);
            }, 'keydown');

            // Clicking 'Cancel' to cancel adding a reply annotation
            this.addEventHandler(cancelButtonEl, (event) => {
                event.stopPropagation();

                annotatorUtil.resetTextarea(replyTextEl);
                annotatorUtil.hideElement(replyButtonContainerEl);
                replyTextEl.focus();
            });

            // Clicking 'Post' to add a reply annotation
            const firstAnnotation = annotations[0];
            this.addEventHandler(postButtonEl, (event) => {
                event.stopPropagation();

                const replyText = replyTextEl.value;
                if (replyText.trim() === '') {
                    return;
                }

                annotatorUtil.resetTextarea(replyTextEl);
                annotatorUtil.hideElement(replyButtonContainerEl);

                // Create annotation, but don't add to in-memory map since a thread already exists
                const newAnnotation = Annotation.copy(firstAnnotation, {
                    text: replyText.trim(),
                    user: this.user
                });
                this.createAnnotation(newAnnotation, false).then((createdAnnotation) => {
                    const annotationEl = this.createAnnotationCommentEl(createdAnnotation);
                    annotationCommentsEl.appendChild(annotationEl);
                });

                // Focus only if in viewport - otherwise, focus forces a scroll
                if (annotatorUtil.isElementInViewport(replyTextEl)) {
                    replyTextEl.focus();
                }
            });

            // Loop through annotation comments to generate comment thread
            annotations.forEach((annotation) => {
                // Create annotation comment boxes per annotation in thread
                const annotationEl = this.createAnnotationCommentEl(annotation);
                annotationCommentsEl.appendChild(annotationEl);
            });

            // All annotations in a thread should have the same location
            const locationData = firstAnnotation.location || {};
            this.positionDialog(annotationDialogEl, locationData);

            // Focus only if in viewport - otherwise, focus forces a scroll
            if (annotatorUtil.isElementInViewport(replyTextEl)) {
                replyTextEl.focus();
            }
        });
    }

    /**
     * Creates a single annotation comment in a thread and binds relevant
     * event handlers for the buttons.
     *
     * @param {Annotation} annotation Annotation to create comment with
     * @returns {HTMLElement} Annotation comment element
     */
    createAnnotationCommentEl(annotation) {
        const avatarUrl = annotatorUtil.htmlEscape(annotation.user.avatarUrl);
        const userName = annotatorUtil.htmlEscape(annotation.user.name);
        const created = new Date(annotation.created).toLocaleDateString(
            'en-US',
            { hour: '2-digit', minute: '2-digit' }
        );
        const text = annotatorUtil.htmlEscape(annotation.text);

        const annotationEl = document.createElement('div');
        annotationEl.classList.add('annotation-comment');
        annotationEl.innerHTML = `
            <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
            <div class="profile-container">
                <div class="user-name">${userName}</div>
                <div class="comment-date">${created}</div>
            </div>
            <div class="comment-text">${text}</div>
            <button class="btn-plain delete-comment-btn">${ICON_DELETE_SMALL}</button>
            <div class="delete-confirmation ${CLASS_HIDDEN}">
                <div class="delete-confirmation-message">Delete this annotation?</div>
                <div class="button-container">
                    <button class="btn cancel-delete-btn">CANCEL</button>
                    <button class="btn btn-primary confirm-delete-btn">DELETE</button>
                </div>
            </div>`.trim();

        // Bind event handlers for delete-related buttons
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
        const confirmDeleteButtonEl = annotationEl.querySelector('.confirm-delete-btn');

        // Clicking delete button to initiate deletion of annotation
        this.addEventHandler(deleteButtonEl, (event) => {
            event.stopPropagation();

            annotatorUtil.showElement(deleteConfirmationEl);
            cancelDeleteButtonEl.focus();
        });

        // Clicking 'No' to cancel deletion of annotation
        this.addEventHandler(cancelDeleteButtonEl, (event) => {
            event.stopPropagation();

            annotatorUtil.hideElement(deleteConfirmationEl);
            deleteButtonEl.focus();
        });

        // Clicking 'Yes' to confirm deletion of annotation
        this.addEventHandler(confirmDeleteButtonEl, (event) => {
            event.stopPropagation();
            const annotationParentEl = annotationEl.parentNode;
            const isRootAnnotation = annotationParentEl.childElementCount === 1;

            // Remove from in-memory map if it is root annotation
            this.deleteAnnotation(annotation.annotationID, isRootAnnotation).then(() => {
                this.removeEventHandlers(deleteButtonEl, cancelDeleteButtonEl, confirmDeleteButtonEl);
                annotationParentEl.removeChild(annotationEl);

                // If this was the root comment in this thread, remove the whole thread
                if (isRootAnnotation) {
                    annotatorUtil.hideElement(constants.SELECTOR_ANNOTATION_DIALOG_SHOW);

                    // Remove point icon when we delete whole thread
                    const pointAnnotationButtonEl = document.querySelector(`[data-thread-id="${annotation.threadID}"]`);
                    if (pointAnnotationButtonEl) {
                        pointAnnotationButtonEl.parentNode.removeChild(pointAnnotationButtonEl);
                    }
                }
            }).catch(() => {
                // console.log('There was an error deleting your annotation');
            });
        });

        return annotationEl;
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} location Annotation location object
     * @returns {void}
     */
    positionDialog(dialogEl, location) {
        // Hide add highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);

        const positionedDialogEl = dialogEl;
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        // Show dialog so we can get width
        pageEl.appendChild(dialogEl);
        annotatorUtil.showElement(positionedDialogEl);
        const dialogDimensions = dialogEl.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;

        // Position 7px below location and transparent border pushes it down
        // further - this coordinate is with respect to the page
        const dialogTopY = browserY + 7;

        // Reposition to avoid sides - left side of page is 0px, right side is ${pageWidth}px
        const dialogPastLeft = dialogLeftX < 0;
        const dialogPastRight = dialogLeftX + dialogWidth > pageWidth;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const annotationCaretEl = dialogEl.querySelector('.annotation-container-caret');
        if (dialogPastLeft && !dialogPastRight) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretLeftX = Math.max(10, browserX);
            annotationCaretEl.style.right = 'initial';
            annotationCaretEl.style.left = `${caretLeftX}px`;

            dialogLeftX = 0;

        // Fix the dialog and move caret appropriately
        } else if (dialogPastRight && !dialogPastLeft) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretRightX = Math.max(10, pageWidth - browserX);
            annotationCaretEl.style.right = `${caretRightX}px`;
            annotationCaretEl.style.left = 'initial';

            dialogLeftX = pageWidth - dialogWidth;

        // Reset caret to center
        } else {
            annotationCaretEl.style.right = 'initial';
            annotationCaretEl.style.left = '50%';
        }

        // Position the dialog
        positionedDialogEl.style.left = `${dialogLeftX}px`;
        positionedDialogEl.style.top = `${dialogTopY}px`;
    }

    /* ---------- Helpers ---------- */
    /**
     * Helper to add event handler to an element and save a reference for
     * cleanup.
     *
     * @param {HTMLElement} element Element to attach handler to
     * @param {Function} handler Event handler
     * @param {String} [eventType] Optional type of event
     * @returns {void}
     */
    addEventHandler(element, handler, eventType = TOUCH_EVENT) {
        element.addEventListener(eventType, handler);

        let handlerRef = this.handlerRefs.find((ref) => {
            return ref.element === element;
        });

        if (!handlerRef) {
            handlerRef = {
                element,
                handlers: [handler]
            };

            this.handlerRefs.push(handlerRef);
        } else {
            handlerRef.handlers.push(handler);
        }
    }

    /**
     * Helper to remove all saved event handlers from an element or multiple
     * elements.
     *
     * @param {...HTMLElement} elements Element(s) to remove handlers from
     * @returns {void}
     */
    removeEventHandlers(...elements) {
        elements.forEach((element) => {
            if (!element || typeof element.removeEventListener !== 'function') {
                return;
            }

            // Find the matching element and handler ref
            const handlerIndex = this.handlerRefs.findIndex((ref) => {
                return ref.element === element;
            });
            if (handlerIndex === -1) {
                return;
            }

            // Remove all the handlers in the handler ref from the element
            this.handlerRefs[handlerIndex].handlers.forEach((handler) => {
                element.removeEventListener(TOUCH_EVENT, handler);
            });

            // Remove handler ref entry
            this.handlerRefs.splice(handlerIndex, 1);
        });
    }

    /**
     * Helper to remove all saved event handlers.
     *
     * @returns {void}
     */
    removeAllEventHandlers() {
        this.handlerRefs.forEach((handlerRef) => {
            const element = handlerRef.element;
            handlerRef.handlers.forEach((handler) => {
                element.removeEventListener(TOUCH_EVENT, handler);
            });
        });
    }
}

export default Annotator;
