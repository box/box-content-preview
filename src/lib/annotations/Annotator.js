import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import AnnotationService from './AnnotationService';
import * as annotatorUtil from './annotatorUtil';
import { ICON_CLOSE } from '../icons/icons';
import './Annotator.scss';
import {
    CLASS_ACTIVE,
    CLASS_HIDDEN,
    SELECTOR_BOX_PREVIEW_BASE_HEADER,
    DATA_TYPE_ANNOTATION_DIALOG,
    CLASS_MOBILE_ANNOTATION_DIALOG,
    CLASS_ANNOTATION_DIALOG,
    CLASS_ANNOTATION_MODE,
    CLASS_ANNNOTATION_DRAWING_BACKGROUND,
    CLASS_MOBILE_DIALOG_HEADER,
    CLASS_DIALOG_CLOSE,
    ID_MOBILE_ANNOTATION_DIALOG,
    SELECTOR_ANNOTATION_DRAWING_HEADER,
    TYPES,
    THREAD_EVENT,
    ANNOTATOR_EVENT
} from './annotationConstants';

@autobind
class Annotator extends EventEmitter {
    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an Annotator.
     * @typedef {Object} AnnotatorData
     * @property {HTMLElement} annotatedElement HTML element to annotate on
     * @property {AnnotationService} [annotationService] Annotations CRUD service
     * @property {string} fileVersionId File version ID
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {Object} options - Options for constructing an Annotator
     * @return {Annotator} Annotator instance
     */
    constructor(options) {
        super();

        this.options = options;
        this.locale = options.location.locale || 'en-US';
        this.validationErrorEmitted = false;
        this.isMobile = options.isMobile || false;
        this.hasTouch = options.hasTouch || false;
        this.annotationModeHandlers = [];
        this.localized = options.localizedStrings;

        const { file } = this.options;
        this.fileVersionId = file.file_version.id;
        this.fileId = file.id;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindModeListeners();

        if (this.threads) {
            Object.keys(this.threads).forEach((page) => {
                const pageThreads = this.getThreadsOnPage(page);

                Object.keys(pageThreads).forEach((threadID) => {
                    const thread = pageThreads[threadID];
                    this.unbindCustomListenersOnThread(thread);
                });
            });
        }

        // Destroy all annotate buttons
        Object.keys(this.modeButtons).forEach((type) => {
            const handler = this.getAnnotationModeClickHandler(type);
            const buttonEl = this.container.querySelector(this.modeButtons[type].selector);

            if (buttonEl) {
                buttonEl.removeEventListener('click', handler);
            }
        });

        this.unbindDOMListeners();
        this.unbindCustomListenersOnService();
        this.removeListener(ANNOTATOR_EVENT.scale, this.scaleAnnotations);
    }

    /**
     * Initializes annotator.
     *
     * @param {number} [initialScale] - The initial scale factor to render the annotations
     * @return {void}
     */
    init(initialScale = 1) {
        // Get the container dom element if selector was passed, in tests
        this.container = this.options.container;
        if (typeof this.options.container === 'string') {
            this.container = document.querySelector(this.options.container);
        }

        // Get annotated element from container
        this.annotatedElement = this.getAnnotatedEl(this.container);

        this.getAnnotationPermissions(this.options.file);
        const { apiHost, file, token } = this.options;
        this.annotationService = new AnnotationService({
            apiHost,
            fileId: file.id,
            token,
            canAnnotate: this.permissions.canAnnotate,
            anonymousUserName: this.localized.anonymousUserName
        });

        // Set up mobile annotations dialog
        if (this.isMobile) {
            this.setupMobileDialog();
        }

        // Get applicable annotation mode controllers
        const { CONTROLLERS } = this.options.annotator || {};
        this.modeControllers = CONTROLLERS || {};

        // Show the annotate button for all enabled types for the
        // current viewer
        this.modeButtons = this.options.modeButtons;
        Object.keys(this.modeButtons).forEach((type) => {
            this.showModeAnnotateButton(type);
        });

        this.setScale(initialScale);
        this.setupAnnotations();
        this.showAnnotations();
    }

    /**
     * Returns whether or not the current annotation mode is enabled for
     * the current viewer/annotator.
     *
     * @param {string} type - Type of annotation
     * @return {boolean} Whether or not the annotation mode is enabled
     */
    isModeAnnotatable(type) {
        if (!this.options.annotator) {
            return false;
        }

        const { TYPE: annotationTypes } = this.options.annotator;
        if (type && annotationTypes) {
            if (!annotationTypes.some((annotationType) => type === annotationType)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Shows the annotate button for the specified mode
     *
     * @param {string} currentMode - Annotation mode
     * @return {void}
     */
    showModeAnnotateButton(currentMode) {
        const mode = this.modeButtons[currentMode];
        if (!mode || !this.permissions.canAnnotate || !this.isModeAnnotatable(currentMode)) {
            return;
        }

        const annotateButtonEl = this.container.querySelector(mode.selector);
        if (annotateButtonEl) {
            annotateButtonEl.title = mode.title;
            annotateButtonEl.classList.remove(CLASS_HIDDEN);

            const handler = this.getAnnotationModeClickHandler(currentMode);
            annotateButtonEl.addEventListener('click', handler);

            if (this.modeControllers[currentMode]) {
                this.modeControllers[currentMode].registerAnnotator(this);
            }
        }
    }

    /**
     * Gets the annotation button element.
     *
     * @param {string} annotatorSelector - Class selector for a custom annotation button.
     * @return {HTMLElement|null} Annotate button element or null if the selector did not find an element.
     */
    getAnnotateButton(annotatorSelector) {
        return this.container.querySelector(annotatorSelector);
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @return {void}
     */
    showAnnotations() {
        // Show annotations after we've generated an in-memory map
        this.fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Hides annotations.
     *
     * @return {void}
     */
    hideAnnotations() {
        Object.keys(this.threads).forEach((pageNum) => {
            this.hideAnnotationsOnPage(pageNum);
        });
    }

    /**
     * Hides annotations on a specified page.
     *
     * @param {number} pageNum - Page number
     * @return {void}
     */
    hideAnnotationsOnPage(pageNum) {
        if (!this.threads) {
            return;
        }

        const pageThreads = this.getThreadsOnPage(pageNum);
        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];
            thread.hide();
        });
    }

    /**
     * Sets the zoom scale.
     *
     * @param {number} scale - current zoom scale
     * @return {void}
     */
    setScale(scale) {
        this.annotatedElement.setAttribute('data-scale', scale);
    }

    /**
     * Toggles annotation modes on and off. When an annotation mode is
     * on, annotation threads will be created at that location.
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLEvent} event - DOM event
     * @return {void}
     */
    toggleAnnotationHandler(mode, event = {}) {
        if (!this.isModeAnnotatable(mode)) {
            return;
        }

        this.destroyPendingThreads();

        if (this.createHighlightDialog.isVisible) {
            document.getSelection().removeAllRanges();
            this.createHighlightDialog.hide();
        }

        // No specific mode available for annotation type
        if (!(mode in this.modeButtons)) {
            return;
        }

        const buttonSelector = this.modeButtons[mode].selector;
        const buttonEl = event.target || this.getAnnotateButton(buttonSelector);

        // Exit any other annotation mode
        this.exitAnnotationModesExcept(mode);

        // If in annotation mode, turn it off
        if (this.isInAnnotationMode(mode)) {
            this.disableAnnotationMode(mode, buttonEl);

            // Remove annotation mode
            this.currentAnnotationMode = null;
        } else {
            this.enableAnnotationMode(mode, buttonEl);

            // Update annotation mode
            this.currentAnnotationMode = mode;
        }
    }

    /**
     * Disables the specified annotation mode
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLElement} buttonEl - Annotation button element
     * @return {void}
     */
    disableAnnotationMode(mode, buttonEl) {
        if (!this.isModeAnnotatable(mode)) {
            return;
        } else if (this.isInAnnotationMode(mode)) {
            this.currentAnnotationMode = null;
            this.emit(ANNOTATOR_EVENT.modeExit, { mode, headerSelector: SELECTOR_BOX_PREVIEW_BASE_HEADER });
        }

        this.annotatedElement.classList.remove(CLASS_ANNOTATION_MODE);
        if (buttonEl) {
            buttonEl.classList.remove(CLASS_ACTIVE);

            if (mode === TYPES.draw) {
                this.annotatedElement.classList.remove(CLASS_ANNNOTATION_DRAWING_BACKGROUND);
            }
        }

        this.unbindModeListeners(mode); // Disable mode
        this.bindDOMListeners(); // Re-enable other annotations
    }

    /**
     * Enables the specified annotation mode
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLElement} buttonEl - Annotation button element
     * @return {void}
     */
    enableAnnotationMode(mode, buttonEl) {
        this.emit(ANNOTATOR_EVENT.modeEnter, { mode, headerSelector: SELECTOR_ANNOTATION_DRAWING_HEADER });

        this.annotatedElement.classList.add(CLASS_ANNOTATION_MODE);
        if (buttonEl) {
            buttonEl.classList.add(CLASS_ACTIVE);

            if (mode === TYPES.draw) {
                this.annotatedElement.classList.add(CLASS_ANNNOTATION_DRAWING_BACKGROUND);
            }
        }

        this.unbindDOMListeners(); // Disable other annotations
        this.bindModeListeners(mode); // Enable mode
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to return an annotation location object from the DOM
     * event.
     *
     * @param {Event} event - DOM event
     * @param {string} annotationType - Type of annotation
     * @return {Object} Location object
     */
    /* eslint-disable no-unused-vars */
    getLocationFromEvent(event, annotationType) {}
    /* eslint-enable no-unused-vars */

    /**
     * Must be implemented to create the appropriate new thread, add it to the
     * in-memory map, and return the thread.
     *
     * @param {Annotation[]} annotations - Annotations in thread
     * @param {Object} location - Location object
     * @param {string} type - Annotation type
     * @return {AnnotationThread} Created annotation thread
     */
    /* eslint-disable no-unused-vars */
    createAnnotationThread(annotations, location, type) {}
    /* eslint-enable no-unused-vars */

    /**
    * Must be implemented to determine the annotated element in the viewer.
    *
    * @param {HTMLElement} containerEl - Container element for the viewer
    * @return {HTMLElement} Annotated element in the viewer
    */
    /* eslint-disable no-unused-vars */
    getAnnotatedEl(containerEl) {}
    /* eslint-enable no-unused-vars */

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @protected
     * @return {void}
     */
    setupAnnotations() {
        // Map of page => {threads on page}
        this.threads = {};
        this.bindDOMListeners();
        this.bindCustomListenersOnService(this.annotationService);
        this.addListener(ANNOTATOR_EVENT.scale, this.scaleAnnotations);
    }

    /**
     * Sets up the shared mobile dialog element.
     *
     * @protected
     * @return {void}
     */
    setupMobileDialog() {
        // Generate HTML of dialog
        const mobileDialogEl = document.createElement('div');
        mobileDialogEl.setAttribute('data-type', DATA_TYPE_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_MOBILE_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_HIDDEN);
        mobileDialogEl.id = ID_MOBILE_ANNOTATION_DIALOG;

        mobileDialogEl.innerHTML = `
            <div class="${CLASS_MOBILE_DIALOG_HEADER}">
                <button class="${CLASS_DIALOG_CLOSE}">${ICON_CLOSE}</button>
            </div>`.trim();

        this.container.appendChild(mobileDialogEl);
    }

    /**
     * Fetches persisted annotations, creates threads as needed, and generates
     * an in-memory map of page to threads.
     *
     * @protected
     * @return {Promise} Promise for fetching saved annotations
     */
    fetchAnnotations() {
        this.threads = {};

        // Do not load any pre-existing annotations if the user does not have
        // the correct permissions
        if (!this.permissions.canViewAllAnnotations && !this.permissions.canViewOwnAnnotations) {
            return Promise.resolve(this.threads);
        }

        return this.annotationService.getThreadMap(this.fileVersionId).then((threadMap) => {
            // Generate map of page to threads
            Object.keys(threadMap).forEach((threadID) => {
                const annotations = threadMap[threadID];
                const firstAnnotation = annotations[0];

                if (!firstAnnotation || !this.isModeAnnotatable(firstAnnotation.type)) {
                    return;
                }

                // Bind events on valid annotation thread
                const thread = this.createAnnotationThread(annotations, firstAnnotation.location, firstAnnotation.type);
                this.bindCustomListenersOnThread(thread);

                const { annotator } = this.options;
                if (!annotator) {
                    return;
                }

                if (this.modeControllers[firstAnnotation.type]) {
                    const controller = this.modeControllers[firstAnnotation.type];
                    controller.bindCustomListenersOnThread(thread);
                    controller.registerThread(thread);
                }
            });

            this.emit(ANNOTATOR_EVENT.fetch);
        });
    }

    /**
     * Binds DOM event listeners. Can be overridden by any annotator that
     * needs to bind event listeners to the DOM in the normal state (ie not
     * in any annotation mode).
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners. Can be overridden by any annotator that
     * needs to bind event listeners to the DOM in the normal state (ie not
     * in any annotation mode).
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {}

    /**
     * Binds custom event listeners for the Annotation Service.
     *
     * @protected
     * @return {void}
     */
    bindCustomListenersOnService() {
        const service = this.annotationService;
        if (!service || !(service instanceof AnnotationService)) {
            return;
        }

        /* istanbul ignore next */
        service.addListener(ANNOTATOR_EVENT.error, this.handleServiceEvents);
    }

    /**
     * Unbinds custom event listeners for the Annotation Service.
     *
     * @protected
     * @return {void}
     */
    unbindCustomListenersOnService() {
        const service = this.annotationService;
        if (!service || !(service instanceof AnnotationService)) {
            return;
        }
        service.removeListener(ANNOTATOR_EVENT.error, this.handleServiceEvents);
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    bindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        thread.addListener('threadevent', this.handleAnnotationThreadEvents);
    }

    /**
     * Unbinds custom event listeners for the thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    unbindCustomListenersOnThread(thread) {
        thread.removeListener('threadevent', this.handleAnnotationThreadEvents);
    }

    /**
     * Binds event listeners for annotation modes.
     *
     * @protected
     * @param {string} mode - Current annotation mode
     * @return {void}
     */
    bindModeListeners(mode) {
        const handlers = [];

        if (mode === TYPES.point) {
            handlers.push(
                {
                    type: 'mousedown',
                    func: this.pointClickHandler,
                    eventObj: this.annotatedElement
                },
                {
                    type: 'touchstart',
                    func: this.pointClickHandler,
                    eventObj: this.annotatedElement
                }
            );
        } else if (mode === TYPES.draw && this.modeControllers[mode]) {
            this.modeControllers[mode].bindModeListeners();
        }

        handlers.forEach((handler) => {
            handler.eventObj.addEventListener(handler.type, handler.func, false);
            this.annotationModeHandlers.push(handler);
        });
    }

    /**
     * Event handler for adding a point annotation. Creates a point annotation
     * thread at the clicked location.
     *
     * @protected
     * @param {Event} event - DOM event
     * @return {void}
     */
    pointClickHandler(event) {
        event.stopPropagation();
        event.preventDefault();

        // Determine if a point annotation dialog is already open and close the
        // current open dialog
        const hasPendingThreads = this.destroyPendingThreads();
        if (hasPendingThreads) {
            return;
        }

        // Exits point annotation mode on first click
        const buttonSelector = this.modeButtons[TYPES.point].selector;
        const buttonEl = this.getAnnotateButton(buttonSelector);
        this.disableAnnotationMode(TYPES.point, buttonEl);

        // Get annotation location from click event, ignore click if location is invalid
        const location = this.getLocationFromEvent(event, TYPES.point);
        if (!location) {
            return;
        }

        // Create new thread with no annotations, show indicator, and show dialog
        const thread = this.createAnnotationThread([], location, TYPES.point);

        if (thread) {
            thread.show();

            // Bind events on thread
            this.bindCustomListenersOnThread(thread);
        }

        this.emit(THREAD_EVENT.pending, thread.getThreadEventData());
    }

    /**
     * Unbinds event listeners for annotation modes.
     *
     * @protected
     * @param {string} mode - Annotation mode to be unbound
     * @return {void}
     */
    unbindModeListeners(mode) {
        while (this.annotationModeHandlers.length > 0) {
            const handler = this.annotationModeHandlers.pop();
            handler.eventObj.removeEventListener(handler.type, handler.func);
        }

        if (this.modeControllers[mode]) {
            this.modeControllers[mode].unbindModeListeners();
        }
    }

    /**
     * Adds thread to in-memory map.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to add
     * @return {void}
     */
    addThreadToMap(thread) {
        // Add thread to in-memory map
        const page = thread.location.page || 1; // Defaults to page 1 if thread has no page'
        const pageThreads = this.getThreadsOnPage(page);
        pageThreads[thread.threadID] = thread;
    }

    /**
     * Removes thread to in-memory map.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    removeThreadFromMap(thread) {
        const page = thread.location.page || 1;
        delete this.threads[page][thread.threadID];
    }

    /**
     * Returns whether or not annotator is in the specified annotation mode.
     *
     * @protected
     * @param {string} mode - Current annotation mode
     * @return {boolean} Whether or not in the specified annotation mode
     */
    isInAnnotationMode(mode) {
        return this.currentAnnotationMode === mode;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Renders annotations from memory.
     *
     * @private
     * @return {void}
     */
    renderAnnotations() {
        Object.keys(this.threads).forEach((pageNum) => {
            this.renderAnnotationsOnPage(pageNum);
        });
    }

    /**
     * Renders annotations from memory for a specified page.
     *
     * @private
     * @param {number} pageNum - Page number
     * @return {void}
     */
    renderAnnotationsOnPage(pageNum) {
        if (!this.threads) {
            return;
        }

        const pageThreads = this.getThreadsOnPage(pageNum);
        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];
            if (!this.isModeAnnotatable(thread.type)) {
                return;
            }

            thread.show();
        });
    }

    /**
     * Rotates annotations. Hides point annotation mode button if rotated
     *
     * @private
     * @param {number} [rotationAngle] - current angle image is rotated
     * @param {number} [pageNum] - Page number
     * @return {void}
     */
    rotateAnnotations(rotationAngle = 0, pageNum = 0) {
        // Only render a specific page's annotations unless no page number
        // is specified
        if (pageNum) {
            this.renderAnnotationsOnPage(pageNum);
        } else {
            this.renderAnnotations();
        }

        // Only show/hide point annotation button if user has the
        // appropriate permissions
        if (!this.permissions.canAnnotate) {
            return;
        }

        // Hide create annotations button if image is rotated
        const pointButtonSelector = this.modeButtons[TYPES.point].selector;
        const pointAnnotateButton = this.getAnnotateButton(pointButtonSelector);

        if (rotationAngle !== 0) {
            annotatorUtil.hideElement(pointAnnotateButton);
        } else {
            annotatorUtil.showElement(pointAnnotateButton);
        }
    }

    /**
     * Returns whether or not the current annotation mode is enabled for
     * the current viewer/annotator.
     *
     * @private
     * @param {Object} file - File
     * @return {boolean} Whether or not the annotation mode is enabled
     */
    getAnnotationPermissions(file) {
        const permissions = file.permissions || {};
        this.permissions = {
            canAnnotate: permissions.can_annotate || false,
            canViewAllAnnotations: permissions.can_view_annotations_all || false,
            canViewOwnAnnotations: permissions.can_view_annotations_self || false
        };
    }

    /**
     * Returns click handler for toggling annotation mode.
     *
     * @private
     * @param {string} mode - Target annotation mode
     * @return {Function|null} Click handler
     */
    getAnnotationModeClickHandler(mode) {
        if (!mode || !this.isModeAnnotatable(mode)) {
            return null;
        }

        return () => {
            this.toggleAnnotationHandler(mode);
        };
    }

    /**
     * Orient annotations to the correct scale and orientation of the annotated document.
     *
     * @private
     * @param {Object} data - Scale and orientation values needed to orient annotations.
     * @return {void}
     */
    scaleAnnotations(data) {
        this.setScale(data.scale);
        this.rotateAnnotations(data.rotationAngle, data.pageNum);
    }

    /**
     * Exits all annotation modes except the specified mode
     *
     * @param {string} mode - Current annotation mode
     * @return {void}
     */
    exitAnnotationModesExcept(mode) {
        Object.keys(this.modeButtons).forEach((type) => {
            if (mode === type) {
                return;
            }

            const buttonSelector = this.modeButtons[type].selector;
            if (!this.modeButtons[type].button) {
                this.modeButtons[type].button = this.getAnnotateButton(buttonSelector);
            }

            this.disableAnnotationMode(type, this.modeButtons[type].button);
        });
    }

    /**
     * Gets threads on page
     *
     * @private
     * @param {number} page - Current page number
     * @return {Map|[]} Threads on page
     */
    getThreadsOnPage(page) {
        if (!(page in this.threads)) {
            this.threads[page] = {};
        }

        return this.threads[page];
    }

    /**
     * Gets thread specified by threadID
     *
     * @private
     * @param {number} threadID - Thread ID
     * @return {AnnotationThread} Annotation thread specified by threadID
     */
    getThreadByID(threadID) {
        let thread = null;
        Object.keys(this.threads).forEach((page) => {
            const pageThreads = this.getThreadsOnPage(page);
            if (threadID in pageThreads) {
                thread = pageThreads[threadID];
            }
        });

        return thread;
    }

    /**
     * Scrolls specified annotation into view
     *
     * @private
     * @param {Object} threadID - annotation threadID for thread that should scroll into view
     * @return {void}
     */
    scrollToAnnotation(threadID) {
        if (!threadID) {
            return;
        }

        Object.values(this.threads).forEach((pageThreads) => {
            if (threadID in pageThreads) {
                const thread = pageThreads[threadID];
                thread.scrollIntoView();
            }
        });
    }

    /**
     * Destroys pending threads.
     *
     * @private
     * @return {boolean} Whether or not any pending threads existed on the
     * current file
     */
    destroyPendingThreads() {
        let hasPendingThreads = false;

        Object.keys(this.threads).forEach((page) => {
            const pageThreads = this.getThreadsOnPage(page);

            Object.keys(pageThreads).forEach((threadID) => {
                const thread = pageThreads[threadID];
                if (annotatorUtil.isPending(thread.state)) {
                    hasPendingThreads = true;
                    thread.destroy();
                }
            });
        });
        return hasPendingThreads;
    }

    /**
     * Displays annotation validation error notification once on load. Does
     * nothing if notification was already displayed once.
     *
     * @private
     * @return {void}
     */
    handleValidationError() {
        if (this.validationErrorEmitted) {
            return;
        }

        this.emit(ANNOTATOR_EVENT.error, this.localized.loadError);
        /* eslint-disable no-console */
        console.error('Annotation could not be created due to invalid params');
        /* eslint-enable no-console */
        this.validationErrorEmitted = true;
    }

    /**
     * Handle events emitted by the annotaiton service
     *
     * @private
     * @param {Object} [data] - Annotation service event data
     * @param {string} [data.event] - Annotation service event
     * @param {string} [data.data] -
     * @return {void}
     */
    handleServiceEvents(data) {
        let errorMessage = '';
        switch (data.reason) {
            case 'read':
                errorMessage = this.localized.loadError;
                break;
            case 'create':
                errorMessage = this.localized.createError;
                this.showAnnotations();
                break;
            case 'delete':
                errorMessage = this.localized.deleteError;
                this.showAnnotations();
                break;
            case 'authorization':
                errorMessage = this.localized.authError;
                break;
            default:
        }

        if (data.error) {
            /* eslint-disable no-console */
            console.error(ANNOTATOR_EVENT.error, data.error);
            /* eslint-enable no-console */
        }

        if (errorMessage) {
            this.emit(ANNOTATOR_EVENT.error, errorMessage);
        }
    }

    /**
     * Handles annotation thread events and emits them to the viewer
     *
     * @private
     * @param {Object} [data] - Annotation thread event data
     * @param {string} [data.event] - Annotation thread event
     * @param {string} [data.data] - Annotation thread event data
     * @return {void}
     */
    handleAnnotationThreadEvents(data) {
        if (!data.data || !data.data.threadID) {
            return;
        }

        const thread = this.getThreadByID(data.data.threadID);
        if (!thread) {
            return;
        }

        switch (data.event) {
            case THREAD_EVENT.threadCleanup:
                // Thread should be cleaned up, unbind listeners - we
                // don't do this in annotationdelete listener since thread
                // may still need to respond to error messages
                this.unbindCustomListenersOnThread(thread);
                break;
            case THREAD_EVENT.threadDelete:
                // Thread was deleted, remove from thread map
                this.removeThreadFromMap(thread);
                this.emit(data.event, data.data);
                break;
            case THREAD_EVENT.deleteError:
                this.emit(ANNOTATOR_EVENT.error, this.localized.deleteError);
                this.emit(data.event, data.data);
                break;
            case THREAD_EVENT.createError:
                this.emit(ANNOTATOR_EVENT.error, this.localized.createError);
                this.emit(data.event, data.data);
                break;
            default:
                this.emit(data.event, data.data);
        }
    }

    /**
     * Emits a generic annotator event
     *
     * @private
     * @emits annotatorevent
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @return {void}
     */
    emit(event, data) {
        const { annotator } = this.options;
        super.emit(event, data);
        super.emit('annotatorevent', {
            event,
            data,
            annotatorName: annotator ? annotator.NAME : '',
            fileVersionId: this.fileVersionId,
            fileId: this.fileId
        });
    }
}

export default Annotator;
