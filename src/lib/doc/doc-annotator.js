import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import Annotator from '../annotation/annotator';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
/* eslint-enable no-unused-vars */

const document = global.document;

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const POINT_ANNOTATION_TYPE = 'point';

/* eslint-disable no-undef */
// Taken from Modernizr https://github.com/Modernizr/Modernizr/blob/master/feature-detects/touchevents.js
const TOUCH_EVENT = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) ? 'touchstart' : 'click';
/* eslint-enable no-undef */

/* ---------- Helpers ---------- */
/**
 * Finds the closest ancestor DOM element with the specified class
 *
 * @param {HTMLElement} element Element to search ancestors of
 * @param {String} className Class name to query
 * @returns {HTMLElement|null} Closest ancestor with given class or null
 */
function findClosestElWithClass(element, className) {
    /* eslint-disable */
    for (; element && element !== document; element = element.parentNode) {
        if (element.classList && element.classList.contains(className)) {
            return element;
        }
    }
    /* eslint-enable */

    return null;
}

/**
 * Creates a highlight DIV with corners corresponding to the supplied quad
 * points
 *
 * @param {Number[]} quadPoints Quad points corresponding to corners
 * @returns {HTMLElement} Highlight div
 */
function createHighlightEl(quadPoints) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints;

    // Rotation radians = arctan(opposite/adj) = arctan((y3-y4)/(x3-x4))
    const rotationRad = Math.atan((y3 - y4) / (x3 - x4));

    // Calculate dimensions of highlight rectangle
    const newRectWidth = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
    const newRectHeight = Math.sqrt(Math.pow(y4 - y1, 2) + Math.pow(x4 - x1, 2));

    // Construct highlight div with same width and height as the rectangle
    // represented by the quad points at the top left quad point and perform
    // the appropriate rotation about the top left corner as the origin
    const highlightEl = document.createElement('div');
    highlightEl.style.left = `${x4}px`;
    highlightEl.style.top = `${y4}px`;
    highlightEl.style.width = `${newRectWidth}px`;
    highlightEl.style.height = `${newRectHeight}px`;
    highlightEl.style.transform = `rotate(${rotationRad}rad)`;
    highlightEl.style.transformOrigin = 'top left';
    highlightEl.classList.add('box-preview-highlight');

    return highlightEl;
}

/**
 * Escapes HTML
 *
 * @param {String} str Input string
 * @returns {String} HTML escaped string
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

    /* ---------- Generic Annotations ---------- */
    /**
     * Annotations setup.
     *
     * @returns {void}
     */
    setupAnnotations() {
        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));

        const docEl = document.querySelector('.box-preview-doc');

        this.addEventHandler(docEl, () => {
            docEl.classList.add('box-preview-doc-mousedown');
        }, 'mousedown');

        this.addEventHandler(docEl, () => {
            docEl.classList.remove('box-preview-doc-mousedown');
        }, 'mouseup');

        // @TODO(tjin): clean up these handlers
    }

    /**
     * Show saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // @NOTE(tjin): Need to figure out how to load annotations by page...
        // That will be difficult since deserialize does everything in one go

        // Fetch map of thread ID to annotations
        this.annotationService.getAnnotationsForFile(this.fileID).then((annotationsMap) => {
            const highlightAnnotations = [];
            const pointAnnotations = [];

            // Generate arrays of highlight and point threads
            for (const threadedAnnotations of annotationsMap.values()) {
                const firstAnnotation = threadedAnnotations[0];
                const annotationType = firstAnnotation.type;

                // We only need to show the first annotation in a thread
                if (annotationType === HIGHLIGHT_ANNOTATION_TYPE) {
                    highlightAnnotations.push(firstAnnotation);
                } else if (annotationType === POINT_ANNOTATION_TYPE) {
                    pointAnnotations.push(firstAnnotation);
                }
            }

            // Show highlight and point annotations
            this.showHighlightAnnotations(highlightAnnotations);
            this.showPointAnnotations(pointAnnotations);
        });
    }

    /**
     * Create an annotation object from annotation data.
     *
     * @param {String} annotationType Type of annotation
     * @param {String} annotationText Comment text for annotation
     * @param {Object} locationData Location data
     * @returns {Annotation} Annotation
     */
    createAnnotation(annotationType, annotationText, locationData) {
        const data = {
            fileID: this.fileID,
            type: annotationType,
            text: annotationText,
            location: locationData,
            user: this.user
        };

        return new Annotation(data);
    }


    /* ---------- Highlight Annotations ---------- */
    /**
     * Shows a single highlight annotation (annotations on selected text).
     *
     * @param {Annotation} annotation Highlight annotation to show
     * @returns {void}
     */
    showHighlightAnnotation(annotation) {
        const location = annotation.location;
        if (!location || !location.quadPoints) {
            return;
        }

        const page = location.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        // Create an annotation layer on the page if it doesn't exist
        let annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (!annotationLayerEl) {
            annotationLayerEl = document.createElement('div');
            annotationLayerEl.classList.add('box-preview-annotation-layer');
            pageEl.appendChild(annotationLayerEl);
        }

        // Delete highlight button should be in upper right of the highlight in the upper right
        let upperRightX = 0;
        let upperRightY = pageEl.getBoundingClientRect().height;
        const highlightContainerEl = document.createElement('div');
        highlightContainerEl.classList.add('box-preview-highlight-container');
        highlightContainerEl.dataset.annotationId = annotation.annotationID;

        location.quadPoints.forEach((quadPoints) => {
            const [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints;
            upperRightX = Math.max(upperRightX, Math.max(x1, x2, x3, x4));
            upperRightY = Math.min(upperRightY, Math.min(y1, y2, y3, y4));

            /* eslint-disable no-console */
            console.log(`Quadpoints for highlight "${annotation.annotationID}": (${x1.toFixed(2)}, ${y1.toFixed(2)}) (${x2.toFixed(2)}, ${y2.toFixed(2)}) (${x3.toFixed(2)}, ${y3.toFixed(2)}) (${x4.toFixed(2)}, ${y4.toFixed(2)})`);
            /* eslint-enable no-console */

            // Create highlight div from quadpoints
            const highlightEl = createHighlightEl(quadPoints);
            highlightContainerEl.appendChild(highlightEl);

            // Set group of highlight elements to active when mouse enters a
            // highlight element and we are not just leaving a highlight element
            this.addEventHandler(highlightEl, (event) => {
                if (event.relatedTarget && event.relatedTarget.classList.contains('box-preview-highlight')) {
                    return;
                }

                event.target.parentNode.classList.add('box-preview-highlight-active');
            }, 'mouseenter');

            // Set group of highlight elements to inactive when mouse leaves a
            // highlight element and we are not entering a highlight element
            this.addEventHandler(highlightEl, (event) => {
                if (event.relatedTarget && event.relatedTarget.classList.contains('box-preview-highlight')) {
                    return;
                }

                event.target.parentNode.classList.remove('box-preview-highlight-active');
            }, 'mouseleave');

            // @TODO(tjin): clean up annotation layer event handlers
        });

        // Insert highlight into annotation layer
        annotationLayerEl.appendChild(highlightContainerEl);

        // Construct delete highlight button
        const removeHighlightButtonEl = document.createElement('button');
        removeHighlightButtonEl.textContent = 'x';
        removeHighlightButtonEl.style.left = `${upperRightX - 8}px`; // move 'x' slightly into highlight
        removeHighlightButtonEl.style.top = `${upperRightY - 8}px`; // move 'x' slightly into highlight
        removeHighlightButtonEl.classList.add('box-preview-remove-highlight-btn');
        pageEl.appendChild(removeHighlightButtonEl);

        // Delete highlight button deletes the highlight and removes highlights from DOM
        this.addEventHandler(removeHighlightButtonEl, (event) => {
            event.stopPropagation();

            this.annotationService.delete(annotation.annotationID).then(() => {
                this.removeHighlight(annotation.annotationID);
                this.removeEventHandlers(removeHighlightButtonEl);
                removeHighlightButtonEl.parentNode.removeChild(removeHighlightButtonEl);
            });
        });
    }

    /**
     * Shows highlight annotations (annotations on selected text).
     *
     * @param {Annotation[]} highlightAnnotations Array of highlight annotations
     * @returns {void}
     */
    showHighlightAnnotations(highlightAnnotations) {
        highlightAnnotations.forEach((highlightAnnotation) => {
            this.showHighlightAnnotation(highlightAnnotation);
        });
    }

    /**
     * Event handler for adding a highlight annotation. Shows a create
     * highlight annotation dialog with the currently selected text.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addHighlightAnnotationHandler(event) {
        event.stopPropagation();

        // Get selection location and dimensions
        const selection = window.getSelection();
        if (selection.rangeCount < 1) {
            return;
        }

        const pageEl = findClosestElWithClass(selection.anchorNode.parentNode, 'page');
        const page = pageEl ? pageEl.dataset.pageNumber : 1;

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        const highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        const highlightElements = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightElements.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightElements.forEach((element) => {
            quadPoints.push(this.getQuadPoints(element, pageEl));
        });

        // Unselect text and remove rangy highlight
        selection.removeAllRanges();
        this.removeRangyHighlight(highlight);

        // Create annotation
        const annotation = this.createAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '', {
            page,
            quadPoints
        });

        // Save and show annotation
        this.annotationService.create(annotation).then((createdAnnotation) => {
            this.showHighlightAnnotation(createdAnnotation);
        });
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
        const pointAnnotationEl = document.createElement('div');
        const annotationElString = `
            <div class="caret-up"></div>
            <div class="annotation-container">
                <button class="btn show-point-annotation-btn">
                    <span>P</span>
                </button>
            </div>`.trim();
        pointAnnotationEl.classList.add('annotation-dialog');
        // Note casing of threadId translates to data-thread-id
        pointAnnotationEl.dataset.threadId = annotation.threadID;
        pointAnnotationEl.innerHTML = annotationElString;

        const location = annotation.location;
        const pageScale = this.getScale();
        const x = location.x * pageScale;
        const y = location.y * pageScale;
        const page = location.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        pageEl.appendChild(pointAnnotationEl);
        pointAnnotationEl.style.left = `${x - 25}px`;
        pointAnnotationEl.style.top = `${y}px`;

        const showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
        this.addEventHandler(showPointAnnotationButtonEl, (event) => {
            event.stopPropagation();
            this.showAnnotationDialog(annotation.threadID);
        });
    }

    /**
     * Shows point annotations (annotations on specific points).
     *
     * @param {Annotation[]} pointAnnotations Array of point annotations
     * @returns {void}
     */
    showPointAnnotations(pointAnnotations) {
        pointAnnotations.forEach((annotation) => {
            this.showPointAnnotation(annotation);
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
        event.stopPropagation();

        // @TODO(tjin): Close existing open annotations

        // @TODO(tjin): Investigate edge cases with existing highlights in 'bindOnClickCreateComment'

        this.addEventHandler(document, (clickOutEvent) => {
            clickOutEvent.stopPropagation();

            const pageEl = findClosestElWithClass(clickOutEvent.target, 'page');

            // If click isn't on a page, disregard
            if (!pageEl) {
                return;
            }

            // Generate annotation parameters and location data to store
            const pageDimensions = pageEl.getBoundingClientRect();
            const page = pageEl.dataset.pageNumber;
            const pageScale = this.getScale();
            const x = (clickOutEvent.clientX - pageDimensions.left) / pageScale;
            const y = (clickOutEvent.clientY - pageDimensions.top) / pageScale;
            const locationData = { x, y, page };

            this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);

            // Cleanup handler
            this.removeEventHandlers(document);
        });
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
        // Create annotation dialog HTML
        const annotationDialogEl = document.createElement('div');
        const annotationElString = `
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

        const postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
        const cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn');
        const annotationTextEl = annotationDialogEl.querySelector('.annotation-textarea');

        // Function to clean up event handlers and close dialog
        const closeCreateDialog = () => {
            this.removeEventHandlers(document);
            this.removeEventHandlers(postButtonEl);
            this.removeEventHandlers(cancelButtonEl);
            annotationDialogEl.parentNode.removeChild(annotationDialogEl);
        };

        // Clicking 'Post' to add annotation
        this.addEventHandler(postButtonEl, () => {
            event.stopPropagation();

            // Get annotation text and create annotation
            const annotationText = annotationTextEl.value;
            const annotation = this.createAnnotation(annotationType, annotationText, locationData);

            // Save annotation
            this.annotationService.create(annotation).then(() => {
                closeCreateDialog();

                // If annotation is a point annotation, show the point
                // annotation indicator
                if (annotation.type === POINT_ANNOTATION_TYPE) {
                    // @TODO(tjin): Only show point annotation if one doesn't exist already
                    this.showPointAnnotation(annotation);
                }

                // Show newly created annotation text on top
                this.showAnnotationDialog(annotation.threadID);
            });
        });

        // Clicking 'Cancel' to cancel annotation
        this.addEventHandler(cancelButtonEl, (event) => {
            event.stopPropagation();
            closeCreateDialog();

            // Remove Rangy highlight if needed
            if (locationData.highlight) {
                this.removeRangyHighlight(locationData.highlight);
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
                    this.removeRangyHighlight(locationData.highlight);
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
     * @param {String} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        this.annotationService.getAnnotationsForThread(threadID).then((annotations) => {
            if (!annotations || annotations.length === 0) {
                return;
            }

            // View/reply to existing annotation dialog HTML
            const annotationDialogEl = document.createElement('div');
            const annotationElString = `
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
            const createAnnotationCommentEl = (annotation) => {
                const avatarUrl = htmlEscape(annotation.user.avatarUrl);
                const userName = htmlEscape(annotation.user.name);
                const created = new Date(annotation.created).toLocaleDateString(
                    'en-US',
                    { hour: '2-digit', minute: '2-digit' }
                );
                const text = htmlEscape(annotation.text);

                const newAnnotationElString = `
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
                    </button>`.trim();
                const annotationEl = document.createElement('div');
                annotationEl.innerHTML = newAnnotationElString;
                annotationEl.classList.add('annotation-comment');

                const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
                const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
                const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
                const confirmDeleteButtonEl = annotationEl.querySelector('.confirm-delete-btn');

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

                        const annotationParentEl = annotationEl.parentNode;
                        annotationParentEl.removeChild(annotationEl);

                        // If this was the root comment in this thread, remove the whole thread
                        if (annotationParentEl.childElementCount === 0) {
                            const replyButtonEl = annotationDialogEl.querySelector('.add-reply-btn');
                            const cancelButtonEl = annotationDialogEl.querySelector('.cancel-annotation-btn');
                            const postButtonEl = annotationDialogEl.querySelector('.post-annotation-btn');
                            this.removeEventHandlers(document);
                            this.removeEventHandlers(replyButtonEl);
                            this.removeEventHandlers(cancelButtonEl);
                            this.removeEventHandlers(postButtonEl);

                            annotationDialogEl.parentNode.removeChild(annotationDialogEl);

                            // Remove highlight or point element when we delete the whole thread
                            if (annotation.type === HIGHLIGHT_ANNOTATION_TYPE) {
                                this.removeRangyHighlight(annotation.location.highlight);
                            } else if (annotation.type === POINT_ANNOTATION_TYPE) {
                                const pointAnnotationEl = document.querySelector(`[data-thread-id="${annotation.threadID}"]`);

                                if (pointAnnotationEl) {
                                    const showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
                                    this.removeEventHandlers(showPointAnnotationButtonEl);
                                    pointAnnotationEl.parentNode.removeChild(pointAnnotationEl);
                                }
                            }
                        }
                    });
                });

                return annotationEl;
            };


            // All annotations in a thread should have the same location
            const firstAnnotation = annotations[0];
            const locationData = firstAnnotation.location || {};

            // Loop through annotation comments to generate thread
            const annotationCommentsEl = annotationDialogEl.querySelector('.annotation-comments');
            annotations.forEach((annotation) => {
                // Create annotation comment boxes per annotation in thread
                const annotationEl = createAnnotationCommentEl(annotation);
                annotationCommentsEl.appendChild(annotationEl);
            });

            // Add reply event handlers
            const replyEl = annotationDialogEl.querySelector('.reply-container');
            const replyButtonEl = replyEl.querySelector('.add-reply-btn');
            const cancelButtonEl = replyEl.querySelector('.cancel-annotation-btn');
            const postButtonEl = replyEl.querySelector('.post-annotation-btn');
            const replyContainerEl = replyEl.querySelector('.reply-container');
            const replyTextEl = replyEl.querySelector('.annotation-textarea');

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

                const newAnnotation = Annotation.copy(firstAnnotation, {
                    text: replyTextEl.value.trim(),
                    user: this.user
                });

                this.annotationService.create(newAnnotation).then((createdAnnotation) => {
                    const annotationEl = createAnnotationCommentEl(createdAnnotation);
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
                        const childrenEls = [].slice.call(annotationCommentsEl.children);
                        childrenEls.forEach((annotationEl) => {
                            const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
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
     * @param {Number} dialogWidth Width of dialog
     * @returns {void}
     */
    positionDialog(dialogEl, locationData, dialogWidth) {
        const page = locationData.page;
        const pageEl = document.querySelector(`[data-page-number="${page}"]`);

        pageEl.appendChild(dialogEl);
        dialogEl.style.left = `${(locationData.x - dialogWidth / 2)}px`;
        dialogEl.style.top = `${locationData.y}px`;
        dialogEl.style.transform = `scale(${this.getScale()})`;

        // @TODO(tjin): reposition to avoid sides
    }

    /* ---------- Helpers ---------- */
    /**
     * Removes a highlight by finding all highlight divs corresponding to the
     * provided annotation ID and removing them
     *
     * @param {Number} annotationID Annotation ID of highlight to remove
     * @returns {void}
     */
    removeHighlight(annotationID) {
        const highlightContainerEl = document.querySelector(`[data-annotation-id="${annotationID}"]`);
        while (highlightContainerEl.firstChild) {
            highlightContainerEl.removeChild(highlightContainerEl.firstChild);
        }
        highlightContainerEl.parentNode.removeChild(highlightContainerEl);
    }

    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the internal
     * highlighter list that has a matching ID. We can't directly use the
     * highlighter's removeHighlights since the highlight could possibly not be
     * a true Rangy highlight object.
     *
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     */
    removeRangyHighlight(highlight) {
        const matchingHighlights = this.highlighter.highlights.filter((internalHighlight) => {
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
     * @param {String} [eventType] Optional type of event, defaults to a click or touch
     * @returns {void}
     */
    addEventHandler(element, handler, eventType) {
        eventType = eventType || TOUCH_EVENT;
        element.addEventListener(eventType, handler);

        const handlers = this.handlerMap.get(element) || [];
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
        const handlers = this.handlerMap.get(element) || [];

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
        for (const [element, handlers] of this.handlerMap) {
            if (element && typeof element.removeEventListener === 'function') {
                handlers.forEach((handler) => {
                    element.removeEventListener(TOUCH_EVENT, handler);
                });
            }

            this.handlerMap.delete(element);
        }
    }

    /**
     * Returns the coordinates of the quadrilateral representing this element per
     * the PDF text markup annotation spec.
     *
     * We do this by letting the browser figure out the coordinates for us. See:
     * http://stackoverflow.com/a/17098667
     *
     * @param {HTMLElement} element Element to get quad points for
     * @param {HTMLElement} relativeEl Element quad points should be relative to
     * @returns {Number[]} Coordinates in the form of [x1, y1, x2, y2, x3, y3, x4,
     * y4] with (x1, y1) being the lower left (untransformed) corner of the element
     * and the other 3 vertices in counterclockwise order
     */
    getQuadPoints(element, relativeEl) {
        // Create quad point helper elements once if needed
        if (!this.quadCornerContainerEl) {
            this.quadCornerContainerEl = document.createElement('div');
            this.quadCornerContainerEl.classList.add('box-preview-quad-corner-container');

            // Create zero-size elements that can be styled to the 4 corners of
            // quadrilateral around element - using 4 divs is faster than using
            // one div and moving it around
            this.quadCorner1El = document.createElement('div');
            this.quadCorner2El = document.createElement('div');
            this.quadCorner3El = document.createElement('div');
            this.quadCorner4El = document.createElement('div');

            this.quadCorner1El.classList.add('box-preview-quad-corner', 'corner1');
            this.quadCorner2El.classList.add('box-preview-quad-corner', 'corner2');
            this.quadCorner3El.classList.add('box-preview-quad-corner', 'corner3');
            this.quadCorner4El.classList.add('box-preview-quad-corner', 'corner4');

            this.quadCornerContainerEl.appendChild(this.quadCorner1El);
            this.quadCornerContainerEl.appendChild(this.quadCorner2El);
            this.quadCornerContainerEl.appendChild(this.quadCorner3El);
            this.quadCornerContainerEl.appendChild(this.quadCorner4El);
        }

        // Insert helper into element to calculate quad points for
        element.appendChild(this.quadCornerContainerEl);

        const corner1Rect = this.quadCorner1El.getBoundingClientRect();
        const corner2Rect = this.quadCorner2El.getBoundingClientRect();
        const corner3Rect = this.quadCorner3El.getBoundingClientRect();
        const corner4Rect = this.quadCorner4El.getBoundingClientRect();
        const relativeRect = relativeEl.getBoundingClientRect();
        const relativeLeft = relativeRect.left;
        const relativeTop = relativeRect.top;

        // Cleanup helper element
        element.removeChild(this.quadCornerContainerEl);

        // Calculate coordinates of these 4 corners
        const quadPoints = [
            corner1Rect.left - relativeLeft,
            corner1Rect.top - relativeTop,
            corner2Rect.left - relativeLeft,
            corner2Rect.top - relativeTop,
            corner3Rect.left - relativeLeft,
            corner3Rect.top - relativeTop,
            corner4Rect.left - relativeLeft,
            corner4Rect.top - relativeTop
        ];

        return quadPoints;
    }
}

export default DocAnnotator;
