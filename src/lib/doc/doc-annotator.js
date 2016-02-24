'use strict';

import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import Annotator from '../annotation/annotator';
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
 * Returns the coordinates of the quadrilateral representing this element per
 * the PDF text markup annotation spec.
 *
 * We do this by letting the browser figure out the coordinates for us. See:
 * http://stackoverflow.com/a/17098667
 *
 * @param {HTMLElement} element Element to get quad points for
 * @param {HTMLElement} relativeEl Element quad points should be relative to
 * @returns {number[]} Coordinates in the form of [x1, y1, x2, y2, x3, y3, x4,
 * y4] with (x1, y1) being the lower left (untransformed) corner of the element
 * and the other 3 vertices in counterclockwise order
 */
function getQuadPoints(element, relativeEl) {
    // Create zero-size elements that map to 4 corners of quadrilateral around
    // element
    let corner1El = document.createElement('div');
    let corner2El = document.createElement('div');
    let corner3El = document.createElement('div');
    let corner4El = document.createElement('div');

    corner1El.classList.add('box-preview-quad-corner', 'corner1');
    corner2El.classList.add('box-preview-quad-corner', 'corner2');
    corner3El.classList.add('box-preview-quad-corner', 'corner3');
    corner4El.classList.add('box-preview-quad-corner', 'corner4');

    element.appendChild(corner1El);
    element.appendChild(corner2El);
    element.appendChild(corner3El);
    element.appendChild(corner4El);

    const corner1Rect = corner1El.getBoundingClientRect();
    const corner2Rect = corner2El.getBoundingClientRect();
    const conrer3Rect = corner3El.getBoundingClientRect();
    const conrer4Rect = corner4El.getBoundingClientRect();
    const relativeRect = relativeEl.getBoundingClientRect();
    const relativeLeft = relativeRect.left;
    const relativeTop = relativeRect.top;

    // Calculate coordinates of these 4 corners
    const quadPoints = [
        corner1Rect.left - relativeLeft,
        corner1Rect.top - relativeTop,
        corner2Rect.left - relativeLeft,
        corner2Rect.top - relativeTop,
        conrer3Rect.left - relativeLeft,
        conrer3Rect.top - relativeTop,
        conrer4Rect.left - relativeLeft,
        conrer4Rect.top - relativeTop
    ];

    // Clean up corner elements
    element.removeChild(corner1El);
    element.removeChild(corner2El);
    element.removeChild(corner3El);
    element.removeChild(corner4El);

    return quadPoints;
}

/**
 * Creates a highlight DIV with corners corresponding to the supplied quad
 * points
 *
 * @param {number[]} quadPoints Quad points corresponding to corners
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
    let highlightEl = document.createElement('div');
    highlightEl.style.left = x4 + 'px';
    highlightEl.style.top = y4 + 'px';
    highlightEl.style.width = newRectWidth + 'px';
    highlightEl.style.height = newRectHeight + 'px';
    highlightEl.style.transform = 'rotate(' + rotationRad + 'rad)';
    highlightEl.style.transformOrigin = 'top left';
    highlightEl.classList.add('box-preview-highlight');

    return highlightEl;
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
            tagNames: ['span', 'a']
        }));
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
            let highlightAnnotations = [];
            let pointAnnotations = [];

            // Generate arrays of highlight and point threads
            for (let threadedAnnotations of annotationsMap.values()) {
                let firstAnnotation = threadedAnnotations[0],
                    annotationType = firstAnnotation.type;

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

        return new Annotation(data);
    }


    /*---------- Highlight Annotations ----------*/
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
        const pageEl = document.querySelector('[data-page-number="' + page + '"]');
        const textLayerEl = pageEl.querySelector('.textLayer');

        // Delete highlight button should be in upper right of the highlight in the upper right
        let upperRightX = 0;
        let upperRightY = pageEl.getBoundingClientRect().height;

        location.quadPoints.forEach((quadPoints) => {
            let [x1, y1, x2, y2, x3, y3, x4, y4] = quadPoints;
            upperRightX = Math.max(upperRightX, Math.max(x1, x2, x3, x4));
            upperRightY = Math.min(upperRightY, Math.min(y1, y2, y3, y4));

            console.log(`Quadpoints for highlight "${annotation.annotationID}": (${x1},${y1}) (${x2},${y2}) (${x3},${y3}) (${x4},${y4})`);

            // Create highlight div from quadpoints and save reference to annotation
            let highlightEl = createHighlightEl(quadPoints);
            highlightEl.dataset.annotationId = annotation.annotationID;
            textLayerEl.insertBefore(highlightEl, textLayerEl.firstChild);
        });

        // Construct delete highlight button
        let removeHighlightButtonEl = document.createElement('button');
        removeHighlightButtonEl.textContent = 'x';
        removeHighlightButtonEl.style.left = upperRightX - 8 + 'px'; // move 'x' slightly into highlight
        removeHighlightButtonEl.style.top = upperRightY - 8 + 'px'; // move 'x' slightly into highlight
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
        let selection = window.getSelection();
        if (selection.rangeCount < 1) {
            return;
        }

        const pageEl = findClosestElWithClass(selection.anchorNode.parentNode, 'page');
        const page = pageEl ? pageEl.dataset.pageNumber : 1;

        // We use Rangy to turn the selection into a highlight, which creates
        // spans around the selection that we can then turn into quadpoints
        let highlight = this.highlighter.highlightSelection('highlight', {
            containerElementId: pageEl.id
        })[0];
        let highlightElements = [].slice.call(document.querySelectorAll('.highlight'), 0);
        if (highlightElements.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        let highlightQuadPoints = [];
        highlightElements.forEach((element) => {
            highlightQuadPoints.push(getQuadPoints(element, pageEl));
        });

        // Unselect text and remove rangy highlight
        selection.removeAllRanges();
        this.removeRangyHighlight(highlight);

        // Create annotation
        const annotation = this.createAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '', {
            page: page,
            quadPoints: highlightQuadPoints
        });

        // Save and show annotation
        this.annotationService.create(annotation).then((annotation) => {
            this.showHighlightAnnotation(annotation);
        });
    }

    /*---------- Point Annotations ----------*/
    /**
     * Shows a single point annotation (annotation on specific points).
     *
     * @param {Annotation} annotation Point annotation to show
     * @returns {void}
     */
    showPointAnnotation(annotation) {
        // Create point annotation HTML
        let pointAnnotationEl = document.createElement('div'),
            annotationElString = `
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

        let location = annotation.location,
            pageScale = this.getScale(),
            x = location.x * pageScale,
            y = location.y * pageScale,
            page = location.page,
            pageEl = document.querySelector('[data-page-number="' + page + '"]');

        pageEl.appendChild(pointAnnotationEl);
        pointAnnotationEl.style.left = (x - 25) + 'px';
        pointAnnotationEl.style.top = y + 'px';

        let showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
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

        this.addEventHandler(document, (event) => {
            event.stopPropagation();

            let pageEl = findClosestElWithClass(event.target, 'page');

            // If click isn't on a page, disregard
            if (!pageEl) {
                return;
            }

            // Generate annotation parameters and location data to store
            let pageDimensions = pageEl.getBoundingClientRect(),
                page = pageEl.dataset.pageNumber,
                pageScale = this.getScale(),
                x = (event.clientX - pageDimensions.left) / pageScale,
                y = (event.clientY - pageDimensions.top) / pageScale,
                locationData = {
                    x: x,
                    y: y,
                    page: page
                };

            this.createAnnotationDialog(locationData, POINT_ANNOTATION_TYPE);

            // Cleanup handler
            this.removeEventHandlers(document);
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

                            // Remove highlight or point element when we delete the whole thread
                            if (annotation.type === HIGHLIGHT_ANNOTATION_TYPE) {
                                this.removeRangyHighlight(annotation.location.highlight);
                            } else if (annotation.type === POINT_ANNOTATION_TYPE) {
                                let pointAnnotationEl = document.querySelector('[data-thread-id="' + annotation.threadID + '"]');

                                if (pointAnnotationEl) {
                                    let showPointAnnotationButtonEl = pointAnnotationEl.querySelector('.show-point-annotation-btn');
                                    this.removeEventHandlers(showPointAnnotationButtonEl);
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
     * Removes a highlight by finding all highlight divs corresponding to the
     * provided annotation ID and removing them
     *
     * @param {number} annotationId Annotation ID of highlight to remove
     * @returns {void}
     */
    removeHighlight(annotationId) {
        let matchingHighlights = [].slice.call(document.querySelectorAll('[data-annotation-id="' + annotationId + '"]'));

        matchingHighlights.forEach((highlightEl) => {
            highlightEl.parentNode.removeChild(highlightEl);
        });
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
