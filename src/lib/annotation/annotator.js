import autobind from 'autobind-decorator';
import Annotation from '../annotation/annotation';
import AnnotationDialog from '../annotation/annotation-dialog';
import AnnotationService from './annotation-service';
import Browser from '../browser';
import EventEmitter from 'events';

import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/constants';

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
class Annotator extends EventEmitter {

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
        super();
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
        this.unbindAnnotationHandlers();
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

        this.bindAnnotationHandlers();

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

    /**
     * Binds annotation handlers for non-point annotations. Should be
     * overridden.
     *
     * @returns {void}
     */
    bindAnnotationHandlers() {}

    /**
     * Unbinds annotation handlers for non-point annotations. Should be
     * overridden.
     *
     * @returns {void}
     */
    unbindAnnotationHandlers() {}

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
            docEl.removeEventListener(TOUCH_EVENT, this.addPointAnnotationHandler);

            // Re-enable other annotations
            this.bindAnnotationHandlers();

        // Otherwise, enable annotation mode
        } else {
            docEl.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            docEl.addEventListener(TOUCH_EVENT, this.addPointAnnotationHandler);

            // Disable other annotations
            this.unbindAnnotationHandlers();
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
}

export default Annotator;
