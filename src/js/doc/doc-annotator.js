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
        this.setupAnnotations();
        this.showAnnotations();
    }

    /**
     * Annotations setup.
     *
     * @returns {void}
     */
    setupAnnotations() {
        // Init rangy
        this.highlighter = rangy.createHighlighter();

        // Init rangy highlight classapplier and add onclick per rangy highlight
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a'],
            elementProperties: {
                onclick: () => {
                    let threadID = rangy.serialize([this.highligher.getHighlightForElement(this)]);
                    this.showAnnotationDialog(threadID);
                }
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
     * Hook to add an annotation. Shows a create annotation dialog with the
     * currently selected text.
     *
     * @returns {void}
     */
    addHighlightAnnotation() {
        // get selection from window
        // get location based on selection
        // call createAnnotationDialog() with correct params
    }

    /*---------- Point Annotations ----------*/

    /**
     * Shows point annotations (annotations on specific points).
     *
     * @param {Annotation[]} pointAnnotations Array of point annotations
     * @returns {void}
     */
    showPointAnnotations(pointAnnotations) {
        for (let annotation in pointAnnotations) {
            // Create point annotation HTML
            let pointAnnotationEl = document.createElement('span');
            pointAnnotation.classList.add('point-annotation');
            // Note casing of threadId translates to data-thread-id
            pointAnnotation.dataset.threadid = annotation.threadID;

            let location = annotation.location,
                x = location.x * this.getScale(),
                y = location.y * this.getScale(),
                page = location.page,
                pageEl = document.querySelector('page[data-page-number="' + page + '"]');

            pageEl.appendChild(pointAnnotationEl);
            pointAnnotationEl.style.left = x + 'px';
            pointAnnotationEl.style.top = y + 'px';

            let listener = () => {
                // @NOTE(tjin): Do I need to pass in thread ID here or can I fetch from DOM node?
                showAnnotationDialog(annotation.threadID);
            };
            pointAnnotationEl.addEventListener(TOUCH_EVENT, listener);

            // Maintain listener reference for cleanup
            this.listenerRefs.append({
                element: pointAnnotationEl,
                handler: listener
            });
        }
    }

    /**
     * Hook to add a point annotation. The next user click will indicate the
     * location to annotate.
     *
     * @returns {void}
     */
    addPointAnnotation() {
        // think about touch devices - think about edge cases Crenmont guys saw with weird interactions
        // add throttled event handler on page, maintain reference for cleanup
            // page onclick = showCreateAnnotationDialog() with correct params
    }

    /*---------- Dialogs ----------*/
    /**
     * Show a dialog that allows a user to create an annotation.
     *
     * @param {Object} data Data for dialog
     * @param {Object} data.location Location to place dialog
     * @returns {void}
     */
    createAnnotationDialog(data) {
        // Get template & convert to DOM element
        // Position dom element given location blob - individual annotators should implement this
            // docAnnotator.positionDialog(location);
        // Add event listeners, maintain references for cleanup (see controls.js)
            // 'post'.onClick(function() {
                // docAnnotator.createAnnotation(this);
                // annotationsService.save(annotation);
                // })
            // 'cancel'.onClick(function() {
                // remove event handlers
                // remove saved references
                // remove dialog
                // })
    }

    /**
     * Show an existing annotation dialog that allows the user to delete and/or
     * reply to annotations on a thread if they have permissions to do so.
     *
     * @param {string} threadID Thread ID of annotations to display
     * @returns {void}
     */
    showAnnotationDialog(threadID) {
        // Loop through annotations in threadID & generate update dialog with existing annotations
        // Add event listeners, maintain references for cleanup
            // Use event delegation for deleting existing annotations
            // 'delete'.onClick(function() {
                // Find out which annotation this is referring to
                // annotationsService.delete(annotation);
                // remove annotation from dialog
                // docAnnotator.deleteAnnotation(thisAnnotation);

        // NOT SURE I NEED TWO FUNCTIONS - a showAnnotationDialog(data) with optional threadID param
        // could differentiate between the two:
        // no threadID = new annotation thread
        // threadID = existing annotation thread
        // add reply ~ equal to add first annotation
    }

    /*---------- Helper Functions ----------*/
    // z-index-changer?
    // other helper functions
}

export default DocAnnotator;
