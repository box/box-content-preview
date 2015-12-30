'use strict';

import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
//import AnnotationService from '../annotation/annotation-service';
import rangy from 'rangy';

const ANNOTATION_TYPE = {
    HIGHLIGHT: 'highlight',
    POINT: 'point'
};
const TOUCH_EVENT = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) ? 'touchstart' : 'click';

let document = global.document;

/*---------- Helpers ----------*/
/**
 * Recreates rangy's highlighter.serialize() for a single highlight
 *
 * @param {Object} highlight Rangy highlight
 * @returns {string} Serialized highlight string
 */
function serializeHighlight(highlight) {
    return [
        highlight.characterRange.start,
        highlight.characterRange.end,
        highlight.id,
        highlight.classApplier.className,
        highlight.containerElementId
    ].join('$');
}

/**
 * Finds the closest ancestor DOM element with the specified class
 *
 * @param {HTMLElement} element Element to search ancestors of
 * @param {string} className Class name to query
 * @returns {HTMLElement|null} Closest ancestor with given class or null
 */
function findClosestEl(element, className) {
    for (; element && element !== document; element = element.parentNode) {
        if (element.classList.contains(className)) {
            return element;
        }
    }

    return null;
}

/**
 * Escapes HTML
 *
 * @param {string} str Input string
 * @returns {string} HTML escaped string
 */
function htmlEscape(str) {
    return str.replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
}

/**
 * Annotator base class. Viewer-specific annotators should extend this.
 */
@autobind
class DocAnnotator extends Annotator {

    /**
     * Initializes document annotations.
     *
     * @returns {void}
     */
    init() {
        this.handlerMap = new Map();

        this.setupAnnotations();
        this.showAnnotations();
    }

    /**
     * Destructor
     *
     * @returns {void}
     */
    destroy() {
        this.removeAllEventHandlers();
    }

    /*---------- Generic Annotations ----------*/
    /**
     * Annotations setup.
     *
     * @returns {void}
     */
    setupAnnotations() {
        // Init rangy
        this.highlighter = rangy.createHighlighter();

        // Init rangy highlight classapplier
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a'],
            // When highlight element is created, add an event handler to show the annotation
            onElementCreate: (element) => {
                this.addEventHandler(element, (event) => {
                    let threadID = serializeHighlight(this.highligher.getHighlightForElement(event.target));
                    this.showAnnotationDialog(threadID);
                });
            }
        }));
    }

    /**
     * Show saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // Fetch map of thread ID to annotations
        this.annotationService.getAnnotationsForFile(this.fileID).then((annotationsMap) => {
            let highlightThreads = [];
            let pointAnnotations = [];

            // Generate arrays of highlight and point threads
            for (let [threadID, threadedAnnotations] of annotationsMap) {
                let annotationType = threadedAnnotations[0].type;

                // Highlights can be shown with just the thread ID since it
                // contains serialized location data
                if (annotationType === ANNOTATION_TYPE.HIGHLIGHT) {
                    highlightThreads.push(threadID);

                // Point annotations need the first annotation in the thread
                // for location data
                } else if (annotationType === ANNOTATION_TYPE.POINT) {
                    pointAnnotations.push(threadedAnnotations[0]);
                }
            }

            // Show highlight and point annotations
            this.showHighlightAnnotations(highlightThreads);
            this.showPointAnnotations(pointAnnotations);
        });
    }

    /**
     * Create an annotation object from annotation data.
     *
     * @param {Object} annotationData Data to create annotation with
     * @returns {Annotation} Annotation
     */
    createAnnotation(annotationData) {
        let data = {
            fileID: this.fildID,
            type: annotationData.type,
            text: annotationData.text,
            user: this.user
        };
        switch (annotationData.type) {
            case ANNOTATION_TYPE.HIGHLIGHT:
                data.threadID = annotationData.threadID;
                data.location = { highlight: highlight };
                break;
            case ANNOTATION_TYPE.POINT:
                // Point thread ID is generated
                data.location = annotationData.location;
                break;
        }

        return new Annotation(data);
    }


    /*---------- Highlight Annotations ----------*/

    /**
     * Shows highlight annotations (annotations on selected text).
     *
     * @param {string[]} highlightThreads Array of highlight thread IDs
     * @returns {void}
     */
    showHighlightAnnotations(highlightThreads) {
        // Recreate rangy highlight serialization format from thread IDs and
        // then deserialize to show highlights
        highlightThreads.unshift('type:textContent');
        let serializedHighlights = highlightThreads.join('|');
        this.highlighter.deserialize(serializedHighlights);
    }

    /**
     * Event handler for adding a highlight annotation. Shows a create
     * highlight annotation dialog with the currently selected text.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addHighlightAnnotationHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        // Get selection location and dimensions
        let selection = window.getSelection();
        if (selection.rangeCount < 1) {
            return;
        }
        let selectionDimensions = selection.getRangeAt(0).getBoundingClientRect(),
            pageEl = findClosestEl(selection.anchorNode, 'page'),
            pageDimensions = pageEl.getBoundingClientRect(),
            page = pageEl ? pageEl.dataset.pageNumber : 1,
            pageScale = this.getScale(),
            highlight = this.highlighter.highlightSelection('highlight', {
                containerElementId: pageEl.id
            })[0]; // get the newest highlight

        let x = selectionDimensions.left + selectionDimensions.width / 2 + window.scrollX,
            y = selectionDimensions.top + selectionDimensions.height + window.scrollY;
        x = (x - pageDimensions.left) / pageScale;
        y = (y - pageDimensions.top) / pageScale;

        // Generate annotation parameters and location data to store
        let annotationData = {
                type: ANNOTATION_TYPE.HIGHLIGHT,
                threadID: serializeHighlight(highlight)
            },
            locationData = {
                x: x,
                y: y,
                page: page
            };

        this.createAnnotationDialog(annotationData, locationData);
    }

    /*---------- Point Annotations ----------*/

    /**
     * Shows point annotations (annotations on specific points).
     *
     * @param {Annotation[]} pointAnnotations Array of point annotations
     * @returns {void}
     */
    showPointAnnotations(pointAnnotations) {
        pointAnnotations.forEach((annotation) => {
            // Create point annotation HTML
            let pointAnnotationEl = document.createElement('span');
            pointAnnotation.classList.add('point-annotation');
            // Note casing of threadId translates to data-thread-id
            pointAnnotation.dataset.threadId = annotation.threadID;

            let location = annotation.location,
                pageScale = this.getScale(),
                x = location.x * pageScale,
                y = location.y * pageScale,
                page = location.page,
                pageEl = document.querySelector('[data-page-number="' + page + '"]');

            pageEl.appendChild(pointAnnotationEl);
            pointAnnotationEl.style.left = x + 'px';
            pointAnnotationEl.style.top = y + 'px';

            this.addEventHandler(pointAnnotationEl, (event) => {
                let threadID = event.target.dataset.threadId;
                showAnnotationDialog(threadID);
            });
        });
    }

    /**
     * Event handler for adding a point annotation. Shows a create point
     * annotation dialog at the next location the user clicks.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addPointAnnotationHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        // @TODO(tjin): Investigate edge cases with existing highlights in 'bindOnClickCreateComment'

        this.addEventHandler(document, (event) => {
            let pageEl = findClosestEl(event.target, 'page');

            // If click isn't on a page, disregard
            if (!pageEl) {
                return;
            }

            // Remove handler so we don't create multiple point annotations
            this.removeEventHandlers(document);

            // Generate annotation parameters and location data to store
            let pageDimensions = pageEl.getBoundingClientRect(),
                page = pageEl.dataset.pageNumber,
                pageScale = this.getScale(),
                x = (e.offsetX + pageDimensions.left) / pageScale,
                y = (e.offsetY + pageDimensions.top) / pageScale,
                annotationData = { type: ANNOTATION_TYPE.POINT },
                locationData = {
                    x: x,
                    y: y,
                    page: page
                };

            this.createAnnotationDialog(annotationData, locationData);
        });
    }

    /*---------- Dialogs ----------*/
    /**
     * Show a dialog that allows a user to create an annotation.
     *
     * @param {Object} annotationData Annotation data
     * @param {Object} locationData Location to place dialog
     * @returns {void}
     */
    createAnnotationDialog(annotationData, locationData) {
        // Create dialog element
        let annotationDialogEl = document.createElement('div'),
            annotationElString = `
            <div class="annotation-container">
                <textarea class="annotation-text"></textarea>
                <button class="cancel-annotation"></button>
                <button class="post-annotation"></button>
            </div>`.trim();
        annotationDialogEl.classList.add('annotation-dialog');
        annotationDialogEl.innerHTML = annotationElString;

        let postButtonEl = annotationDialogEl.querySelector('post-annotation'),
            cancelButtonEl = annotationDialogEl.querySelector('cancel-annotation');

        this.addEventHandler(postButtonEl, () => {
            // Get annotation text and create annotation
            annotationData.text = annotationDialogEl.querySelector('annotation-text').value;
            let annotation = this.createAnnotation(annotationData);

            // Save annotation
            this.annotationService.create(annotation).then(() => {
                // Clean up event handlers and close dialog
                this.removeEventHandlers(postButtonEl);
                this.removeEventHandlers(cancelButtonEl);
                annotationDialogEl.parentNode.removeChild(annotationDialogEl);

                // Show newly created annotation
                this.showAnnotationDialog(annotation.threadID);
            });
        });

        this.addEventHandler(cancelButtonEl, () => {
            // Clean up event handlers and close dialog
            this.removeEventHandlers(postButtonEl);
            this.removeEventHandlers(cancelButtonEl);
            annotationDialogEl.parentNode.removeChild(annotationDialogEl);
        });

        this.positionDialog(annotationDialogEl, locationData);

        // Close annotation dialog when user clicks outside
        this.addEventHandler(document, (event) => {
            // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
            if (!findClosestEl(event.target, 'annotation-dialog')) {
                this.removeEventHandlers(document);
                this.removeEventHandlers(postButtonEl);
                this.removeEventHandlers(cancelButtonEl);
                annotationDialogEl.parentNode.removeChild(annotationDialogEl);
            }
        });
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {string} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        let annotations = this.annotationService.getAnnotationsForThread(threadID);

        if (annotations.length === 0) {
            return;
        }

        let annotationDialogEl = document.createElement('div'),
            annotationCommentsEl = document.createElement('div'),
            locationData = {};

        annotationDialogEl.classList.add('annotation-dialog');
        annotationCommentsEl.classList.add('annotation-comments');
        annotationDialogEl.appendChild(annotationCommentsEl);

        // Creates an annotation comment element
        // @TODO(tjin): move into separate function
        function createAnnotationCommentEl(annotation) {
            let avatarUrl = htmlEscape(annotation.user.avatarUrl),
                userName = htmlEscape(annotation.user.name),
                created = new Date(annotation.created).toLocaleDateString('en-US'),
                text = htmlEscape(annotation.text);

            let annotationElString = `
                <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
                <div class="comment-container">
                    <div class="user-name">${userName}<div>
                    <div class="comment-date">${created}</div>
                    <div class="comment-text">${text}</div>
                    <div class="delete-confirmation"></div>
                    <button class="delete-comment"></button>
                </div>`.trim(),
                annotationEl = document.createElement('div');
            annotationEl.innerHTML = annotationElString;
            annotationEl.classList.add('annotation-comment');

            let deleteButtonEl = annotationEl.querySelector('.delete-comment');
            this.addEventHandler(deleteButtonEl, () => {
                // Delete annotation and then remove HTML element
                this.annotationService.delete(annotation.id).then(() => {
                    this.removeEventHandlers(deleteButtonEl);
                    annotationEl.parentNode.removeChild(annotationEl);

                    // If this was the root comment in this thread, remove the whole thread
                    if (annotationEl.parentNode.childElementCount === 0) {
                        let replyButtonEl = annotationDialogEl.querySelector('.add-reply'),
                            cancelButtonEl = annotationDialogEl.querySelector('.cancel-reply'),
                            postButtonEl = annotationDialogEl.querySelector('.post-reply');
                        this.removeEventHandlers(replyButtonEl);
                        this.removeEventHandlers(cancelButtonEl);
                        this.removeEventHandlers(postButtonEl);

                        annotationDialogEl.parentNode.removeChild(annotationDialogEl);

                        // Remove highlight or point element
                        if (annotation.type === ANNOTATION_TYPE.HIGHLIGHT) {
                            this.highlighter.removeHighlights([annotation.location.highlight]);
                        } else if (annotation.type === ANNOTATION_TYPE.POINT) {
                            let pointAnnotationEl = document.querySelector('[data-thread-id="' + annotation.threadID + '"]');
                            if (pointAnnotationEl) {
                                this.removeEventHandlers(pointAnnotationEl);
                                pointAnnotationEl.parentNode.removeChild(pointAnnotationEl);
                            }
                        }
                    }
                });
            });
        }

        annotations.forEach((annotation) => {
            // All annotations in a thread should have the same location
            if (!locationData) {
                locationData = annotation.location;
            }

            // Create annotation comment boxes per annotation in thread
            let annotationEl = createAnnotationCommentEl(annotation);
            annotationCommentsEl.appendChild(annotationEl);
        });

        // Create annotation reply box
        let replyElString = `
            <button class="add-reply"></button>
            <div class="reply-container hidden">
                <textarea class="reply-text"></textarea>
                <button class="cancel-reply"></button>
                <button class="post-reply"></button>
            </div>`.trim(),
            replyEl = document.createElement('div');
        replyEl.innerHTML = replyElString;
        replyEl.classList.add('annotation-reply');

        let replyButtonEl = replyEl.querySelector('.add-reply'),
            cancelButtonEl = replyEl.querySelector('.cancel-reply'),
            postButtonEl = replyEl.querySelector('.post-reply'),
            replyContainerEl = replyEl.querySelector('.reply-container'),
            replyTextEl = replyEl.querySelector('.reply-text');

        this.addEventHandler(replyButtonEl, () => {
            replyContainerEl.classList.remove('hidden');
        });

        this.addEventHandler(cancelButtonEl, () => {
            replyContainerEl.classList.add('hidden');
        });

        this.addEventHandler(postButtonEl, () => {
            replyContainerEl.classList.add('hidden');

            let newAnnotation = Annotation.copy(annotations[0], {
                text: replyTextEl.value.trim(),
                user: this.user
            });

            this.annotationService.create(newAnnotation).then((createdAnnotation) => {
                let annotationEl = createAnnotationCommentEl(createdAnnotation);
                annotationCommentsEl.parentNode.insertBefore(annotationEl, replyEl);
            });
        });

        annotationDialogEl.appendChild(replyEl);

        this.positionDialog(dialogEl, locationData);

        // Close annotation dialog when user clicks outside
        this.addEventHandler(document, (event) => {
            // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
            if (!findClosestEl(event.target, 'annotation-dialog')) {
                this.removeEventHandlers(document);

                // Remove 'reply' event handlers
                this.removeEventHandlers(replyButtonEl);
                this.removeEventHandlers(cancelButtonEl);
                this.removeEventHandlers(postButtonEl);

                // Remove 'delete' event handlers
                if (annotationCommentsEl && annotationCommentsEl.children) {
                    annotationCommentsEl.children.forEach((annotationEl) => {
                        let deleteButtonEl = annotationEl.querySelector('.delete-comment');
                        this.removeEventHandlers(deleteButtonEl);
                    });
                }

                annotationDialogEl.parentNode.removeChild(annotationDialogEl);
            }
        });
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} locationData Data about where to position the dialog
     * @returns {void}
     */
    positionDialog(dialogEl, locationData) {
        let page = locationData.page,
            pageEl = document.querySelector('[data-page-number="' + page + '"]');

        pageEl.child(dialogEl);
        pageEl.style.left = locationData.x + 'px';
        pageEl.style.top = locationData.y + 'px';
        pageEl.style.transform = 'scale(' + this.getScale() + ')';

        // @TODO(tjin): reposition to avoid sides
    }

    /*---------- Helpers ----------*/
    /**
     * Helper to add event handler to an element and save a reference for
     * cleanup.
     *
     * @param {HTMLElement} element Element to attach handler to
     * @param {Function} handler Event handler
     * @returns {void}
     */
    addEventHandler(element, handler) {
        element.addEventListener(TOUCH_EVENT, handler);

        let handlers = this.handlerMap.get(element) || [];
        handlers.append(handler);

        this.handlerMap.set(element, handlers);
    }

    /**
     * Helper to remove all saved event handlers from an element.
     *
     * @param {HTMLElement} element Element to remove handlers from
     * @returns {void}
     */
    removeEventHandlers(element) {
        let handlers = this.handlerMap.get(element) || [];

        if (element && typeof element.removeEventListener === 'function') {
            handlers.forEach((handler) => {
                element.removeEventListener(TOUCH_EVENT, handler);
            });
        }

        this.handlerMap.delete(element);
    }

    /**
     * Helper to remove all saved event handlers.
     *
     * @returns {void}
     */
    removeAllEventHandlers() {
        for (let [element, handlers] of this.handlerMap) {
            if (element && typeof element.removeEventListener === 'function') {
                handlers.forEach((handler) => {
                    element.removeEventListener(TOUCH_EVENT, handler);
                });
            }

            this.handlerMap.delete(element);
        }
    }
}

export default DocAnnotator;
