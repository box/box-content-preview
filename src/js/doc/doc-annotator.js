'use strict';

import autobind from 'autobind-decorator';
//import Annotation from '../annotation/annotation';
//import AnnotationService from '../annotation/annotation-service';
import rangy from 'rangy';

//import createDialogTemplate from 'raw!../../html/annotation/create-annotation-dialog.html';
//import updateAnnotationTemplate from 'raw!../../html/annotation/update-annotation-dialog.html';

const ANNOTATION_TYPE = {
    HIGHLIGHT: 'highlight',
    POINT: 'point'
};
const TOUCH_EVENT = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) ? 'touchstart' : 'click';

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
        this.handlerRefs = [];

        this.setupAnnotations();
        this.showAnnotations();
    }

    /**
     * Destructor
     *
     * @returns {void}
     */
    destroy() {
        // Clean up event handler references
        this.handlerRefs.forEach((ref) => {
            if (ref.element && typeof ref.element.removeEventListener === 'function') {
                ref.element.removeEventListener(TOUCH_EVENT, ref.handler);
                // @TODO(tjin): delete ref.element?
            }
        });
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
                element.addEventListener(TOUCH_EVENT, this.showHighlightAnnotationHandler);

                // Maintain handler reference for cleanup
                this.handlerRefs.append({
                    element: element,
                    handler: this.showHighlightAnnotationHandler
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
                data.location = {}; // highlight location is stored in threadID
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
     * Event handler for showing a highlight annotation
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    showHighlightAnnotationHandler(event) {
        let threadID = serializeHighlight(this.highligher.getHighlightForElement(event.target));
        this.showAnnotationDialog(threadID);
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
                x = location.x * this.getScale(),
                y = location.y * this.getScale(),
                page = location.page,
                pageEl = document.querySelector('page[data-page-number="' + page + '"]');

            pageEl.appendChild(pointAnnotationEl);
            pointAnnotationEl.style.left = x + 'px';
            pointAnnotationEl.style.top = y + 'px';
            pointAnnotationEl.addEventListener(TOUCH_EVENT, this.showPointAnnotationHandler);

            // Maintain handler reference for cleanup
            this.handlerRefs.append({
                element: pointAnnotationEl,
                handler: this.showPointAnnotationHandler
            });
        });
    }

    /**
     * Event handler for clicking an existing point annotation
     *
     * @param {Event} event DOM Event
     * @returns {void}
     */
    showPointAnnotationHandler(event) {
        if (event && event.target) {
            let threadID = event.target.dataset.threadId;
            showAnnotationDialog(threadID);
        }
    }

    /**
     * Event handler for aadding a point annotation. Shows a create point
     * annotation dialog at the next location the user clicks.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    addPointAnnotationHandler(event) {
        event.preventDefault();
        event.stopPropagation();


        // think about touch devices - think about edge cases Crenmont guys saw with weird interactions
        // add throttled event handler on page, maintain reference for cleanup
            // page onclick = showCreateAnnotationDialog() with correct params
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
        let dialogEl = document.createElement('div'),
        // @TODO(tjin): fill in HTML stuff here
            postButtonEl = document.createElement('button'),
            cancelButton = document.createElement('button');

        function createAnnotationHandler(event) {
            // Get annotation text and create annotation
            annotationData.text = dialogEl.querySelector('annotation-text').value;
            let annotation = this.createAnnotation(annotationData);

            // Save annotation
            this.annotationService.create(annotation);

            // Clean up event handlers and close dialog
            postButtonEl.removeEventListener(TOUCH_EVENT, createAnnotationHandler);
            cancelButtonEl.removeEventListener(TOUCH_EVENT, cancelAnnotationHandler);
            dialogEl.parentNode.removeChild(dialogEl);
        }

        function cancelAnnotationHandler() {
            // Clean up event handlers and close dialog
            postButtonEl.removeEventListener(TOUCH_EVENT, createAnnotationHandler);
            cancelButtonEl.removeEventListener(TOUCH_EVENT, cancelAnnotationHandler);
            dialogEl.parentNode.removeChild(dialogEl);
        }

        postButtonEl.addEventListener(TOUCH_EVENT, createAnnotationHandler);
        cancelButton.addEventListener(TOUCH_EVENT, cancelAnnotationHandler);

        // Maintain handler references for cleanup
        this.handlerRefs.append({
            element: postButtonEl,
            handler: createAnnotationHandler
        });
        this.handlerRefs.append({
            element: cancelButton,
            handler: cancelAnnotationHandler
        });

        this.positionDialog(dialogEl, locationData);
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {string} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        let annotations = this.annotationsService.getAnnotationsForThread(threadID);

        // Loop through annotations in threadID & generate update dialog with existing annotations
        // Add event listeners, maintain references for cleanup
            // Use event delegation for deleting existing annotations
            // 'delete'.onClick(function() {
                // Find out which annotation this is referring to
                // annotationsService.delete(annotation);
                // remove annotation from dialog
                // docAnnotator.deleteAnnotation(thisAnnotation);


        // if root annotation is deleted, remove event handler on element
    }

    /**
     * Position a dialog at the specified location.
     *
     * @param {HTMLElement} dialogEl Dialog element to position
     * @param {Object} locationData Data about where to position the dialog
     * @returns {void}
     */
    positionDialog(dialogEl, locationData) {

    }
}

export default DocAnnotator;
