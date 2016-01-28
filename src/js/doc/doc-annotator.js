'use strict';

import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import Annotator from '../annotation/annotator';
//import AnnotationService from '../annotation/annotation-service';
import rangy from 'rangy';
// @NOTE(tjin): Workaround npm rangy issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight',
    POINT_ANNOTATION_TYPE = 'point';

const TOUCH_EVENT = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) ? 'touchstart' : 'click';

let document = global.document;

/*---------- Helpers ----------*/
/**
 * Recreates rangy's highlighter.serialize() for a single highlight
 *
 * @param {Highlight} highlight Rangy highlight
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
function findClosestElWithClass(element, className) {
    for (; element && element !== document; element = element.parentNode) {
        if (element.classList && element.classList.contains(className)) {
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
        // Event handler map for cleanup
        this.handlerMap = new Map();
        this.setupAnnotations();
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
                    event.stopPropagation();

                    let currentHighlight = this.highlighter.getHighlightForElement(event.target);
                    if (currentHighlight) {
                        this.showAnnotationDialog(serializeHighlight(currentHighlight));
                    }
                });
            }
        }));
    }

    /**
     * Show saved annotations.
     * @TODO(tjin): Add input for page number here so document viewer can pass
     * in page loaded and then this can show the annotations for that page
     *
     * @returns {void}
     */
    showAnnotations() {
        // @NOTE(tjin): How do we show annotations for pages that aren't loaded yet?... --- answer is above

        // Fetch map of thread ID to annotations
        this.annotationService.getAnnotationsForFile(this.fileID).then((annotationsMap) => {
            let highlightThreads = [];
            let pointAnnotations = [];

            // Generate arrays of highlight and point threads
            for (let [threadID, threadedAnnotations] of annotationsMap) {
                let firstAnnotation = threadedAnnotations[0],
                    annotationType = firstAnnotation.type;

                // Highlights can be shown with just the thread ID since it
                // contains serialized location data
                if (annotationType === HIGHLIGHT_ANNOTATION_TYPE) {
                    highlightThreads.push(threadID);

                // Point annotations need the first annotation in the thread
                // for location data
                } else if (annotationType === POINT_ANNOTATION_TYPE) {
                    pointAnnotations.push(firstAnnotation);
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
     * @param {string} annotationType Type of annotation
     * @param {string} annotationText Comment text for annotation
     * @param {Object} locationData Location data
     * @returns {Annotation} Annotation
     */
    createAnnotation(annotationType, annotationText, locationData) {
        let data = {
            fileID: this.fileID,
            type: annotationType,
            text: annotationText,
            location: locationData,
            user: this.user
        };

        // Highlight annotations have a serialized highlight thread ID. Point
        // annotations have a randomly generated thread ID.
        if (annotationType === HIGHLIGHT_ANNOTATION_TYPE) {
            data.threadID = serializeHighlight(locationData.highlight);
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

        // @NOTE(tjin): how do I build up a highlight map here?
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
            pageEl = findClosestElWithClass(selection.anchorNode.parentNode, 'page'),
            pageDimensions = pageEl.getBoundingClientRect(),
            page = pageEl ? pageEl.dataset.pageNumber : 1,
            pageScale = this.getScale(),
            highlight = this.highlighter.highlightSelection('highlight', {
                containerElementId: pageEl.id
            })[0];

        let x = selectionDimensions.left + selectionDimensions.width / 2 + window.scrollX,
            y = selectionDimensions.top + selectionDimensions.height + window.scrollY;
        x = (x - pageDimensions.left) / pageScale;
        y = (y - pageDimensions.top) / pageScale;

        let locationData = {
            x: x,
            y: y,
            page: page,
            highlight: highlight
        };

        this.createAnnotationDialog(locationData, HIGHLIGHT_ANNOTATION_TYPE);
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
                event.stopPropagation();

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
            event.stopPropagation();

            let pageEl = findClosestElWithClass(event.target, 'page');

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
                locationData = {
                    x: x,
                    y: y,
                    page: page
                };

            this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);
        });
    }

    /*---------- Dialogs ----------*/
    /**
     * Show a dialog that allows a user to create an annotation.
     *
     * @param {Object} locationData Location to place dialog
     * @param {string} annotationType Type of annotation
     * @returns {void}
     */
    createAnnotationDialog(locationData, annotationType) {
        // Create annotation dialog HTML
        let annotationDialogEl = document.createElement('div'),
            annotationElString = `
            <div class="caret-up"></div>
            <div class="annotation-container">
                <textarea class="annotation-textarea"></textarea>
                <div class="button-container">
                    <button class="btn cancel-annotation-btn">
                        <span>Cancel</span>
                    </button>
                    <button class="btn post-annotation-btn">
                        <span>Post</span>
                    </button>
                </div>
            </div>`.trim();
        annotationDialogEl.classList.add('annotation-dialog');
        annotationDialogEl.innerHTML = annotationElString;

        let postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn'),
            cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn'),
            annotationTextEl = annotationDialogEl.querySelector('.annotation-textarea');

        // Function to clean up event handlers and close dialog
        let closeCreateDialog = () => {
            this.removeEventHandlers(document);
            this.removeEventHandlers(postButtonEl);
            this.removeEventHandlers(cancelButtonEl);
            annotationDialogEl.parentNode.removeChild(annotationDialogEl);
        };

        // Clicking 'Post' to add annotation
        this.addEventHandler(postButtonEl, () => {
            event.stopPropagation();

            // Get annotation text and create annotation
            let annotationText = annotationTextEl.value,
                annotation = this.createAnnotation(annotationType, annotationText, locationData);

            // Save annotation
            this.annotationService.create(annotation).then(() => {
                closeCreateDialog();
                // Show newly created annotation
                this.showAnnotationDialog(annotation.threadID);
            });
        });

        // Clicking 'Cancel' to cancel annotation
        this.addEventHandler(cancelButtonEl, (event) => {
            event.stopPropagation();
            closeCreateDialog();

            // Remove Rangy highlight if needed
            if (locationData.highlight) {
                this.removeHighlight(locationData.highlight);
            }
        });

        // Clicking outside to close annotation dialog
        this.addEventHandler(document, (event) => {
            event.stopPropagation();

            // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
            if (!findClosestElWithClass(event.target, 'annotation-dialog')) {
                closeCreateDialog();

                // Remove Rangy highlight if needed
                if (locationData.highlight) {
                    this.removeHighlight(locationData.highlight);
                }
            }
        });

        this.positionDialog(annotationDialogEl, locationData, 260);

        // Save text selection if needed and focus comment textarea
        annotationTextEl.focus();
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {string} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        this.annotationService.getAnnotationsForThread(threadID).then((annotations) => {
            if (!annotations || annotations.length === 0) {
                return;
            }

            // View/reply to existing annotation dialog HTML
            let annotationDialogEl = document.createElement('div'),
                annotationElString = `
                <div class="caret-up"></div>
                <div class="annotation-container">
                    <div class="annotation-comments"></div>
                    <div class="reply-container">
                        <button class="btn-plain add-reply-btn">
                            <span>+ Add Reply</span>
                        </button>
                        <div class="reply-container hidden">
                            <textarea class="reply annotation-textarea"></textarea>
                            <div class="button-container">
                                <button class="btn cancel-annotation-btn">
                                    <span>Cancel</span>
                                </button>
                                <button class="btn post-annotation-btn">
                                    <span>Post</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`.trim();
            annotationDialogEl.classList.add('annotation-dialog');
            annotationDialogEl.innerHTML = annotationElString;

            // Function to create a single comment element
            // @TODO(tjin): move into separate function
            let createAnnotationCommentEl = (annotation) => {
                let avatarUrl = htmlEscape(annotation.user.avatarUrl),
                    userName = htmlEscape(annotation.user.name),
                    created = new Date(annotation.created).toLocaleDateString(
                        'en-US',
                        {hour: '2-digit', minute:'2-digit'}
                    ),
                    text = htmlEscape(annotation.text);

                let annotationElString = `
                    <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
                    <div class="comment-container">
                        <div class="user-name">${userName}</div>
                        <div class="comment-date">${created}</div>
                        <div class="comment-text">${text}</div>
                    </div>
                    <div class="delete-confirmation hidden">
                        <div class="delete-confirmation-message">Delete this annotation?</div>
                        <div class="button-container">
                            <button class="btn cancel-delete-btn">
                                <span>No</span>
                            </button>
                            <button class="btn confirm-delete-btn">
                                <span>Yes</span>
                            </button>
                        </div>
                    </div>
                    <button class="btn-plain delete-comment-btn">
                        <span>D</span>
                    </button>`.trim(),
                    annotationEl = document.createElement('div');
                annotationEl.innerHTML = annotationElString;
                annotationEl.classList.add('annotation-comment');

                let deleteButtonEl = annotationEl.querySelector('.delete-comment-btn'),
                    deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation'),
                    cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn'),
                    confirmDeleteButtonEl = annotationEl.querySelector('.confirm-delete-btn');

                // Clicking 'D' to initiate deletion of annotation
                this.addEventHandler(deleteButtonEl, (event) => {
                    event.stopPropagation();

                    deleteConfirmationEl.classList.remove('hidden');
                    cancelDeleteButtonEl.focus();
                });

                // Clicking 'No' to cancel deletion of annotation
                this.addEventHandler(cancelDeleteButtonEl, (event) => {
                    event.stopPropagation();

                    deleteConfirmationEl.classList.add('hidden');
                    deleteButtonEl.focus();
                });

                // Clicking 'Yes' to confirm deletion of annotation
                this.addEventHandler(confirmDeleteButtonEl, (event) => {
                    event.stopPropagation();

                    this.annotationService.delete(annotation.annotationID).then(() => {
                        this.removeEventHandlers(deleteButtonEl);
                        this.removeEventHandlers(cancelDeleteButtonEl);
                        this.removeEventHandlers(confirmDeleteButtonEl);

                        let annotationParentEl = annotationEl.parentNode;
                        annotationParentEl.removeChild(annotationEl);

                        // If this was the root comment in this thread, remove the whole thread
                        if (annotationParentEl.childElementCount === 0) {
                            let replyButtonEl = annotationDialogEl.querySelector('.add-reply-btn'),
                                cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn'),
                                postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
                            this.removeEventHandlers(document);
                            this.removeEventHandlers(replyButtonEl);
                            this.removeEventHandlers(cancelButtonEl);
                            this.removeEventHandlers(postButtonEl);

                            annotationDialogEl.parentNode.removeChild(annotationDialogEl);

                            // Remove highlight or point element
                            if (annotation.type === HIGHLIGHT_ANNOTATION_TYPE) {
                                this.removeHighlight(annotation.location.highlight);
                            } else if (annotation.type === POINT_ANNOTATION_TYPE) {
                                let pointAnnotationEl = document.querySelector('[data-thread-id="' + annotation.threadID + '"]');

                                if (pointAnnotationEl) {
                                    this.removeEventHandlers(pointAnnotationEl);
                                    pointAnnotationEl.parentNode.removeChild(pointAnnotationEl);
                                }
                            }
                        }
                    });
                });

                return annotationEl;
            };

            // Loop through annotation comments to generate thread
            let locationData = {},
                annotationCommentsEl = annotationDialogEl.querySelector('.annotation-comments');
            annotations.forEach((annotation) => {
                // All annotations in a thread should have the same location
                locationData = annotation.location;

                // Create annotation comment boxes per annotation in thread
                let annotationEl = createAnnotationCommentEl(annotation);
                annotationCommentsEl.appendChild(annotationEl);
            });

            // Add reply event handlers
            let replyEl = annotationDialogEl.querySelector('.reply-container'),
                replyButtonEl = replyEl.querySelector('.add-reply-btn'),
                cancelButtonEl = replyEl.querySelector('.cancel-annotation-btn'),
                postButtonEl = replyEl.querySelector('.post-annotation-btn'),
                replyContainerEl = replyEl.querySelector('.reply-container'),
                replyTextEl = replyEl.querySelector('.annotation-textarea');

            // Clicking '+ Add Reply' to initiate adding a reply annotation
            this.addEventHandler(replyButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.add('hidden');
                replyContainerEl.classList.remove('hidden');

                replyTextEl.value = '';
                replyTextEl.focus();
            });

            // Clicking 'Cancel' to cancel adding a reply annotation
            this.addEventHandler(cancelButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove('hidden');
                replyContainerEl.classList.add('hidden');
            });

            // Clicking 'Post' to add a reply annotation
            this.addEventHandler(postButtonEl, () => {
                event.stopPropagation();
                replyButtonEl.classList.remove('hidden');
                replyContainerEl.classList.add('hidden');

                let newAnnotation = Annotation.copy(annotations[0], {
                    text: replyTextEl.value.trim(),
                    user: this.user
                });

                this.annotationService.create(newAnnotation).then((createdAnnotation) => {
                    let annotationEl = createAnnotationCommentEl(createdAnnotation);
                    annotationCommentsEl.appendChild(annotationEl);
                });
            });

            // Clicking outside to close annotation dialog
            this.addEventHandler(document, (event) => {
                event.stopPropagation();

                // @TODO(tjin): what about other annotation dialogs? (may not be an issue)
                if (!findClosestElWithClass(event.target, 'annotation-dialog')) {
                    this.removeEventHandlers(document);

                    // Remove 'reply' event handlers
                    this.removeEventHandlers(replyButtonEl);
                    this.removeEventHandlers(cancelButtonEl);
                    this.removeEventHandlers(postButtonEl);

                    // Remove 'delete' event handlers
                    if (annotationCommentsEl && annotationCommentsEl.children) {
                        let childrenEls = [].slice.call(annotationCommentsEl.children);
                        childrenEls.forEach((annotationEl) => {
                            let deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
                            this.removeEventHandlers(deleteButtonEl);
                        });
                    }

                    annotationDialogEl.parentNode.removeChild(annotationDialogEl);
                }
            });

            this.positionDialog(annotationDialogEl, locationData, 315);
        });
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} locationData Data about where to position the dialog
     * @param {number} dialogWidth Width of dialog
     * @returns {void}
     */
    positionDialog(dialogEl, locationData, dialogWidth) {
        let page = locationData.page,
            pageEl = document.querySelector('[data-page-number="' + page + '"]');

        pageEl.appendChild(dialogEl);
        dialogEl.style.left = (locationData.x - dialogWidth/2) + 'px';
        dialogEl.style.top = locationData.y + 'px';
        dialogEl.style.transform = 'scale(' + this.getScale() + ')';

        // @TODO(tjin): reposition to avoid sides
    }

    /*---------- Helpers ----------*/
    /**
     * Helper to remove a highlight by deleting the highlight in the internal
     * highlighter list that has a matching ID. We can't directly use the
     * highlighter's removeHighlights since the highlight could possibly not be
     * a true Rangy highlight object.
     *
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     */
    removeHighlight(highlight) {
        let matchingHighlights = this.highlighter.highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this.highlighter.removeHighlights(matchingHighlights);
    }

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
        handlers.push(handler);

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
