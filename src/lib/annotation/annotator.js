/**
 * @fileoverview Base annotator class that implements point annotations.
 * Viewer-specific annotations should extend this for other annotation types
 * or to modify point annotation behavior.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationService from './annotation-service';
import AnnotationThread from './annotation-thread';
import throttle from 'lodash.throttle';

import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/constants';

import { CLASS_HIDDEN } from '../constants';

const MOUSEMOVE_THROTTLE = 15;
const POINT_ANNOTATION_ICON_WIDTH = 16;

const ANONYMOUS_USER = {
    name: 'Kylo Ren',
    avatarUrl: 'https://i.imgur.com/BcZWDIg.png'
};

@autobind
class Annotator {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an Annotator.
     *
     * @typedef {Object} AnnotatorData
     * @property {HTMLElement} annotatedElement HTML element to annotate on
     * @property {AnnotationService} [annotationService] Annotations CRUD service
     * @property {String} fileVersionID File version ID
     * @property {Object} [user] User creating the thread
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotatorData} data Data for constructing an Annotator
     * @returns {Annotator} Annotator instance
     */
    constructor(data) {
        this.annotatedElement = data.annotatedElement;
        this.annotationService = data.annotationService || new AnnotationService();
        this.fileVersionID = data.fileVersionID;
        this.user = data.user || ANONYMOUS_USER;
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        Object.keys(this.threads).forEach((page) => {
            this.threads[page].forEach((thread) => {
                this._unbindCustomListenersOnThread(thread);
            });
        });
        this._unbindDOMListeners();
    }

    /**
     * Initializes annotator.
     *
     * @returns {void}
     */
    init() {
        this.setScale(1);
        this._setupAnnotations();
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // Show annotations after we've generated an in-memory map
        this._fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     * @private
     */
    renderAnnotations() {
        this._clearAnnotations();
        this._showAnnotations();
    }

    /**
     * Sets the zoom scale.
     *
     * @param {Number} scale
     * @returns {void}
     */
    setScale(scale) {
        this.annotatedElement.setAttribute('data-scale', scale);
    }

    /**
     * Gets the zoom scale.
     *
     * @returns {Number} Scale
     */
    getScale() {
        return parseInt(this.annotatedElement.getAttribute('data-scale'), 10) || 1;
    }

    /**
     * Toggles point annotation mode on and off. When point annotation mode is
     * on, clicking an area will create a point annotation at that location.
     *
     * @returns {void}
     */
    togglePointAnnotationModeHandler() {
        // If in annotation mode, turn it off
        if (this.annotatedElement.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)) {
            this.annotatedElement.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            this._unbindPointModeListeners();
            this._bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable annotation mode
        } else {
            this.annotatedElement.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            this._bindPointModeListeners();
            this._unbindDOMListeners(); // Disable other annotations
        }
    }

    //--------------------------------------------------------------------------
    // Private functions
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @returns {void}
     * @private
     */
    _setupAnnotations() {
        // Map of page => [threads on page]
        this.threads = {};
        this._bindDOMListeners();
    }

    /**
     * Fetches persisted annotations, create threads as appropriate, and
     * generate an in-memory map of page to threads.
     *
     * @returns {Promise} Promise for fetching saved annotations
     * @private
     */
    _fetchAnnotations() {
        // @TODO(tjin): Load/unload annotations by page based on pages loaded from document viewer

        return this.annotationService.getThreadMapForFileVersionID(this.fileVersionID)
            .then((threadMap) => {
                // Generate map of page to threads
                Object.keys(threadMap).forEach((threadID) => {
                    const annotations = threadMap[threadID];
                    const firstAnnotation = annotations[0];
                    const thread = new AnnotationThread({
                        annotatedElement: this.annotatedElement,
                        annotations,
                        annotationService: this.annotationService,
                        fileVersionID: this.fileVersionID,
                        location: firstAnnotation.location,
                        threadID,
                        user: this.user
                    });

                    const page = firstAnnotation.location.page || 1;
                    this.threads[page] = this.threads[page] || [];
                    this.threads[page].push(thread);

                    // Bind events on thread
                    this._bindCustomListenersOnThread(thread);
                });
            });
    }

    /**
     * Clears annotations.
     *
     * @returns {void}
     * @private
     */
    _clearAnnotations() {
        Object.keys(this.threads).forEach((page) => {
            this.threads[page].forEach((thread) => {
                // @TODO(tjin): move highlights to threads
                if (thread.annotations[0].type === 'point') {
                    thread.hide();
                }
            });
        });
    }

    /**
     * Shows annotations.
     *
     * @returns {void}
     * @private
     */
    _showAnnotations() {
        Object.keys(this.threads).forEach((page) => {
            this.threads[page].forEach((thread) => {
                // @TODO(tjin): move highlights to threads
                if (thread.annotations[0].type === 'point') {
                    thread.show();
                }
            });
        });
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {}

    /**
     * Binds custom event listeners for a thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnThread(thread) {
        // Thread was created, add to thread map
        thread.addListener('threadcreated', () => {
            const page = thread.location.page || 1;
            this.threads[page] = this.threads[page] || [];
            this.threads[page].push(thread);
        });

        // Thread was deleted, remove from thread map and destroy
        thread.addListener('threaddeleted', () => {
            const page = thread.location.page || 1;

            // Remove from map
            this.threads[page] = this.threads[page].filter((searchThread) => searchThread.threadID !== thread.threadID);

            // Unbind listeners
            this._unbindCustomListenersOnThread(thread);

            // Destroy the thread
            thread.destroy();
        });
    }

    /**
     * Unbinds custom event listeners for the thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _unbindCustomListenersOnThread(thread) {
        thread.removeAllListeners(['threadcreated']);
        thread.removeAllListeners(['threaddeleted']);
    }

    /**
     * Binds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindPointModeListeners() {
        this.annotatedElement.addEventListener('click', this._pointClickHandler);
        this.annotatedElement.addEventListener('mousemove', this._pointMousemoveHandler());
    }

    /**
     * Unbinds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindPointModeListeners() {
        this.annotatedElement.removeEventListener('click', this._pointClickHandler);
        this.annotatedElement.removeEventListener('mousemove', this._pointMousemoveHandler());
    }

    /**
     * Event handler for adding a point annotation. Creates a point annotation
     * thread at the clicked location.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _pointClickHandler(event) {
        event.stopPropagation();

        // If click isn't on a page, ignore
        const eventTarget = event.target;
        const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(eventTarget);
        if (!pageEl) {
            return;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        if (dataType === 'annotation-dialog' || dataType === 'annotation-thread') {
            return;
        }

        // Store coordinates at 100% scale in PDF space in PDF units
        const pageDimensions = pageEl.getBoundingClientRect();
        const browserCoordinates = [event.clientX - pageDimensions.left, event.clientY - pageDimensions.top];
        const pdfCoordinates = annotatorUtil.convertDOMSpaceToPDFSpace(browserCoordinates, pageDimensions.height, this.getScale());
        const [x, y] = pdfCoordinates;
        const location = { x, y, page };

        // Create new thread with no annotations
        const thread = new AnnotationThread({
            annotatedElement: this.annotatedElement,
            annotations: [],
            annotationService: this.annotationService,
            fileVersionID: this.fileVersionID,
            location,
            user: this.user
        });

        // Show the thread indicator and dialog
        thread.show();
        thread.showDialog();

        // Bind events on thread
        this._bindCustomListenersOnThread(thread);
    }

    /**
     * Handler for point mousemove behavior over the annotated element. Tracks
     * the mouse with a point icon.
     *
     * @returns {Function} mousemove handler
     * @private
     */
    _pointMousemoveHandler() {
        if (!this.throttledPointMousemoveHandler) {
            this.throttledPointMousemoveHandler = throttle((event) => {
                // Saves mouse position in memory
                this._setMousePosition(event);

                if (!this.pendingAnimation) {
                    this.pendingAnimation = true;
                    window.requestAnimationFrame(this._doPointAnimation);
                }
            }, MOUSEMOVE_THROTTLE);
        }

        return this.throttledPointMousemoveHandler;
    }

    /**
     * Performs annotation animation based on mouse position in memory. This
     * tracks the point annotation icon with the mouse.
     *
     * @returns {void}
     * @private
     */
    _doPointAnimation() {
        const { x, y, page, dataType } = this._getMousePosition();

        // Get or create point annotation mode icon
        let pointAnnotationIconEl = this.annotatedElement.querySelector(constants.SELECTOR_ANNOTATION_POINT_ICON);
        if (!pointAnnotationIconEl) {
            pointAnnotationIconEl = document.createElement('div');
            pointAnnotationIconEl.classList.add(constants.CLASS_ANNOTATION_POINT_ICON);
            pointAnnotationIconEl.classList.add(CLASS_HIDDEN);
        }

        // If we aren't on a page, short circuit the animation
        if (page === -1) {
            annotatorUtil.hideElement(pointAnnotationIconEl);
            this.pendingAnimation = false;
            return;
        }

        // Append point annotation icon to correct parent
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
        if (!pageEl.contains(pointAnnotationIconEl)) {
            pageEl.appendChild(pointAnnotationIconEl);
        }

        // If mouse is on a page and isn't on a dialog or thread, track with point icon
        if (dataType !== 'annotation-dialog' && dataType !== 'annotation-thread') {
            const pageDimensions = pageEl.getBoundingClientRect();
            pointAnnotationIconEl.style.left = `${x - pageDimensions.left - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
            pointAnnotationIconEl.style.top = `${y - pageDimensions.top - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
            annotatorUtil.showElement(pointAnnotationIconEl);

        // Otherwise, hide the icon
        } else {
            annotatorUtil.hideElement(pointAnnotationIconEl);
        }

        // Animation is complete
        this.pendingAnimation = false;
    }
}

export default Annotator;
