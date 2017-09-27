import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import autobind from 'autobind-decorator';
import Annotator from '../Annotator';
import DocHighlightThread from './DocHighlightThread';
import DocPointThread from './DocPointThread';
import DocDrawingThread from './DocDrawingThread';
import CreateHighlightDialog, { CreateEvents } from './CreateHighlightDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as docAnnotatorUtil from './docAnnotatorUtil';
import {
    STATES,
    TYPES,
    DATA_TYPE_ANNOTATION_DIALOG,
    DATA_TYPE_ANNOTATION_INDICATOR,
    PAGE_PADDING_TOP,
    PAGE_PADDING_BOTTOM,
    CLASS_ANNOTATION_LAYER_HIGHLIGHT,
    CLASS_ANNOTATION_LAYER_DRAW,
    THREAD_EVENT,
    ANNOTATOR_EVENT
} from '../annotationConstants';

const MOUSEMOVE_THROTTLE_MS = 50;
const HOVER_TIMEOUT_MS = 75;
const MOUSE_MOVE_MIN_DISTANCE = 5;
const CLASS_RANGY_HIGHLIGHT = 'rangy-highlight';

const SELECTOR_PREVIEW_DOC = '.bp-doc';
const CLASS_DEFAULT_CURSOR = 'bp-use-default-cursor';

// Required by rangy highlighter
const ID_ANNOTATED_ELEMENT = 'bp-rangy-annotated-element';

const ANNOTATION_LAYER_CLASSES = [CLASS_ANNOTATION_LAYER_HIGHLIGHT, CLASS_ANNOTATION_LAYER_DRAW];

/**
 * For filtering out and only showing the first thread in a list of threads.
 *
 * @param {Object} thread - The annotation thread to either hide or show
 * @param {number} index - The index of the annotation thread
 * @return {void}
 */
function showFirstDialogFilter(thread, index) {
    if (index === 0) {
        thread.show(this.plainHighlightEnabled, this.commentHighlightEnabled); // TODO(@jholdstock): remove flags on refactor.
    } else {
        thread.hideDialog();
    }
}

/**
 * Check if a thread is in a hover state.
 *
 * @param {Object} thread - The thread to check the state of
 * @return {boolean} True if the thread is in a state of hover
 */
function isThreadInHoverState(thread) {
    return thread.state === STATES.hover;
}

@autobind
class DocAnnotator extends Annotator {
    /** @property {Event} - For tracking the most recent event fired by mouse move event. */
    mouseMoveEvent;

    /** @property {Function} - Event callback for mouse move events with for highlight annotations. */
    highlightMousemoveHandler;

    /** @property {Function} - Handle to RAF used to throttle highlight collision checks. */
    highlightThrottleHandle;

    /** @property {number} - Timer used to throttle highlight event process. */
    throttleTimer = 0;

    /** @property {CreateHighlightDialog} - UI used to create new highlight annotations. */
    createHighlightDialog;

    /** @property {Event} - For delaying creation of highlight quad points and dialog. Tracks the
     * current selection event, made in a previous event. */
    lastHighlightEvent;

    /** @property {Selection} - For tracking diffs in text selection, for mobile highlights creation. */
    lastSelection;

    /** @property {boolean} - True if regular highlights are allowed to be read/written */
    plainHighlightEnabled;

    /** @property {boolean} - True if comment highlights are allowed to be read/written */
    commentHighlightEnabled;

    /** @property {Function} - Reference to filter function that has been bound TODO(@jholdstock): remove on refactor. */
    showFirstDialogFilter;

    /**
     * Creates and mananges plain highlight and comment highlight and point annotations
     * on document files.
     *
     * [constructor]
     *
     * @inheritdoc
     * @return {DocAnnotator} DocAnnotator instance
     */
    constructor(data) {
        super(data);

        this.plainHighlightEnabled = this.isModeAnnotatable(TYPES.highlight);
        this.commentHighlightEnabled = this.isModeAnnotatable(TYPES.highlight_comment);

        // Don't bind to highlight specific handlers if we cannot highlight
        if (!this.plainHighlightEnabled && !this.commentHighlightEnabled) {
            return;
        }

        // Explicit scoping
        this.highlightCreateHandler = this.highlightCreateHandler.bind(this);
        this.drawingSelectionHandler = this.drawingSelectionHandler.bind(this);
        this.showFirstDialogFilter = showFirstDialogFilter.bind(this);

        this.createHighlightDialog = new CreateHighlightDialog(this.container, {
            isMobile: this.isMobile,
            hasTouch: this.hasTouch,
            allowComment: this.commentHighlightEnabled,
            allowHighlight: this.plainHighlightEnabled
        });

        if (this.commentHighlightEnabled) {
            this.highlightCurrentSelection = this.highlightCurrentSelection.bind(this);
            this.createHighlightDialog.addListener(CreateEvents.comment, this.highlightCurrentSelection);

            this.createHighlightThread = this.createHighlightThread.bind(this);
            this.createHighlightDialog.addListener(CreateEvents.commentPost, this.createHighlightThread);
        }

        if (this.plainHighlightEnabled) {
            this.createPlainHighlight = this.createPlainHighlight.bind(this);
            this.createHighlightDialog.addListener(CreateEvents.plain, this.createPlainHighlight);
        }
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        super.destroy();
        if (!this.createHighlightDialog) {
            return;
        }

        if (this.commentHighlightEnabled) {
            this.createHighlightDialog.removeListener(CreateEvents.comment, this.highlightCurrentSelection);
            this.createHighlightDialog.removeListener(CreateEvents.commentPost, this.createHighlightThread);
        }

        if (this.plainHighlightEnabled) {
            this.createHighlightDialog.removeListener(CreateEvents.plain, this.createPlainHighlight);
        }

        this.createHighlightDialog.destroy();
        this.createHighlightDialog = null;
    }

    /** @inheritdoc */
    init(initialScale) {
        super.init(initialScale);

        // Allow rangy to highlight this
        this.annotatedElement.id = ID_ANNOTATED_ELEMENT;

        if (!this.createHighlightDialog) {
            return;
        }

        this.createHighlightDialog.addListener(CreateEvents.init, () =>
            this.emit(THREAD_EVENT.pending, TYPES.highlight)
        );
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Determines the annotated element in the viewer
     *
     * @param {HTMLElement} containerEl - Container element for the viewer
     * @return {HTMLElement} Annotated element in the viewer
     */
    getAnnotatedEl(containerEl) {
        return containerEl.querySelector(SELECTOR_PREVIEW_DOC);
    }

    /**
     * Returns an annotation location on a document from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates and page the
     * point is on in PDF units with the lower left corner of the document as
     * the origin. For highlight annotations, we return the PDF quad points
     * as defined by the PDF spec and page the highlight is on.
     *
     * @override
     * @param {Event} event - DOM event
     * @param {string} annotationType - Type of annotation
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event, annotationType) {
        let location = null;
        const zoomScale = annotatorUtil.getScale(this.annotatedElement);

        if (annotationType === TYPES.point) {
            let clientEvent = event;
            if (this.isMobile) {
                if (!event.targetTouches || event.targetTouches.length === 0) {
                    return location;
                }
                clientEvent = event.targetTouches[0];
            }

            // If click isn't on a page, ignore
            const eventTarget = clientEvent.target;
            const { pageEl, page } = annotatorUtil.getPageInfo(eventTarget);
            if (!pageEl) {
                return location;
            }

            // If there is a selection, ignore
            if (docAnnotatorUtil.isSelectionPresent()) {
                return location;
            }

            // If click is inside an annotation dialog, ignore
            const dataType = annotatorUtil.findClosestDataType(eventTarget);
            if (dataType === DATA_TYPE_ANNOTATION_DIALOG || dataType === DATA_TYPE_ANNOTATION_INDICATOR) {
                return location;
            }

            // Store coordinates at 100% scale in PDF space in PDF units
            const pageDimensions = pageEl.getBoundingClientRect();
            const pageWidth = pageDimensions.width;
            const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
            const browserCoordinates = [
                clientEvent.clientX - pageDimensions.left,
                clientEvent.clientY - pageDimensions.top - PAGE_PADDING_TOP
            ];
            let [x, y] = browserCoordinates;

            // Do not create annotation if event doesn't have coordinates
            if (isNaN(x) || isNaN(y)) {
                this.emit(ANNOTATOR_EVENT.error, __('annotations_create_error'));
                return location;
            }

            const pdfCoordinates = docAnnotatorUtil.convertDOMSpaceToPDFSpace(
                browserCoordinates,
                pageHeight,
                zoomScale
            );
            [x, y] = pdfCoordinates;

            // We save the dimensions of the annotated element scaled to 100%
            // so we can compare to the annotated element during render time
            // and scale if needed (in case the representation changes size)
            const dimensions = {
                x: pageWidth / zoomScale,
                y: pageHeight / zoomScale
            };

            location = { x, y, page, dimensions };
        } else if (annotatorUtil.isHighlightAnnotation(annotationType)) {
            if (!this.highlighter || !this.highlighter.highlights.length) {
                return location;
            }

            // Get correct page
            let { pageEl, page } = annotatorUtil.getPageInfo(window.getSelection().anchorNode);
            if (!pageEl) {
                // The ( .. ) around assignment is required syntax
                ({ pageEl, page } = annotatorUtil.getPageInfo(
                    this.annotatedElement.querySelector(`.${CLASS_RANGY_HIGHLIGHT}`)
                ));
            }

            // Use highlight module to calculate quad points
            const { highlightEls } = docAnnotatorUtil.getHighlightAndHighlightEls(this.highlighter, pageEl);

            // Do not create highlight annotation if no highlights are detected
            if (highlightEls.length === 0) {
                return location;
            }

            const quadPoints = [];
            highlightEls.forEach((element) => {
                quadPoints.push(docAnnotatorUtil.getQuadPoints(element, pageEl, zoomScale));
            });

            // We save the dimensions of the annotated element scaled to 100%
            // so we can compare to the annotated element during render time
            // and scale if needed (in case the representation changes size)
            const pageDimensions = pageEl.getBoundingClientRect();
            const pageWidth = pageDimensions.width;
            const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
            const dimensions = {
                x: pageWidth / zoomScale,
                y: pageHeight / zoomScale
            };

            location = { page, quadPoints, dimensions };
        }

        return location;
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns it.
     *
     * @override
     * @param {Object} annotations - Annotations in thread
     * @param {Object} location - Location object
     * @param {string} [type] - Optional annotation type
     * @return {AnnotationThread} Created annotation thread
     */
    createAnnotationThread(annotations, location, type) {
        let thread;
        const threadParams = {
            annotatedElement: this.annotatedElement,
            annotations,
            annotationService: this.annotationService,
            container: this.container,
            fileVersionId: this.fileVersionId,
            isMobile: this.isMobile,
            hasTouch: this.hasTouch,
            locale: this.locale,
            location,
            type,
            permissions: this.permissions
        };

        // Set existing thread ID if created with annotations
        if (Object.keys(annotations).length > 0) {
            const firstAnnotation = annotatorUtil.getFirstAnnotation(annotations);
            threadParams.threadID = firstAnnotation.threadID;
            threadParams.threadNumber = firstAnnotation.threadNumber;
        }

        if (!annotatorUtil.validateThreadParams(threadParams)) {
            this.handleValidationError();
            return thread;
        }

        if (annotatorUtil.isHighlightAnnotation(type)) {
            thread = new DocHighlightThread(threadParams);
        } else if (type === TYPES.draw) {
            thread = new DocDrawingThread(threadParams);
        } else if (type === TYPES.point) {
            thread = new DocPointThread(threadParams);
        }

        if (!thread && this.notification) {
            this.emit(ANNOTATOR_EVENT.error, __('annotations_create_error'));
        } else if (thread && (type !== TYPES.draw || location.page)) {
            this.addThreadToMap(thread);
        }

        return thread;
    }

    /**
     * Creates a plain highlight annotation.
     *
     * @private
     * @return {void}
     */
    createPlainHighlight() {
        this.highlightCurrentSelection();
        this.createHighlightThread();
    }

    /**
     * Creates an highlight annotation thread, adds it to in-memory map, and returns it.
     *
     * @override
     * @param {string} [commentText] - If provided, this will save a highlight comment annotation, with commentText
     * being the text as the first comment in the thread.
     * @return {DocHighlightThread} Created doc highlight annotation thread
     */
    createHighlightThread(commentText) {
        // Empty string will be passed in if no text submitted in comment
        if (commentText === '' || !this.lastHighlightEvent) {
            return null;
        }

        if (this.createHighlightDialog) {
            this.createHighlightDialog.hide();
        }

        this.isCreatingHighlight = false;

        const highlightType = commentText ? TYPES.highlight_comment : TYPES.highlight;
        const location = this.getLocationFromEvent(this.lastHighlightEvent, highlightType);
        this.highlighter.removeAllHighlights();
        if (!location) {
            return null;
        }

        const annotations = {};
        const thread = this.createAnnotationThread(annotations, location, highlightType);
        this.lastHighlightEvent = null;
        this.lastSelection = null;

        if (!thread) {
            return null;
        }

        if (!commentText) {
            thread.dialog.drawAnnotation();
        } else {
            thread.dialog.hasComments = true;
        }

        thread.state = STATES.hover;
        thread.show(this.plainHighlightEnabled, this.commentHighlightEnabled);
        thread.dialog.postAnnotation(commentText);

        this.bindCustomListenersOnThread(thread);

        this.emit(THREAD_EVENT.threadSave, thread.getThreadEventData());
        return thread;
    }

    /**
     * Override to factor in highlight types being filtered out, if disabled. Also scales annotation canvases.
     *
     * @override
     * @param {number} pageNum - Page number
     * @return {void}
     */
    renderAnnotationsOnPage(pageNum) {
        // Scale existing canvases on re-render
        this.scaleAnnotationCanvases(pageNum);

        if (!this.threads) {
            return;
        }

        // TODO (@jholdstock|@spramod) remove this if statement, and make super call, upon refactor.
        const pageThreads = this.getThreadsOnPage(pageNum);
        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];
            if (!this.isModeAnnotatable(thread.type)) {
                return;
            }

            thread.show(this.plainHighlightEnabled, this.commentHighlightEnabled);
        });

        // Destroy current pending highlight annotation
        const highlightThreads = this.getHighlightThreadsOnPage(pageNum);
        highlightThreads.forEach((thread) => {
            if (annotatorUtil.isPending(thread.state)) {
                /* eslint-disable no-console */
                console.error('Pending annotation thread destroyed', thread.threadNumber);
                /* eslint-enable no-console */
                thread.destroy();
            }
        });
    }

    /**
     * Scales all annotation canvases for a specified page.
     *
     * @override
     * @param {number} pageNum - Page number
     * @return {void}
     */
    scaleAnnotationCanvases(pageNum) {
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${pageNum}"]`);

        ANNOTATION_LAYER_CLASSES.forEach((annotationLayerClass) => {
            const annotationLayerEl = pageEl.querySelector(`.${annotationLayerClass}`);
            if (annotationLayerEl) {
                docAnnotatorUtil.scaleCanvas(pageEl, annotationLayerEl);
            }
        });
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @protected
     * @override
     * @return {void}
     */
    setupAnnotations() {
        super.setupAnnotations();

        if (!this.plainHighlightEnabled && !this.commentHighlightEnabled) {
            return;
        }

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(
            rangy.createClassApplier(CLASS_RANGY_HIGHLIGHT, {
                ignoreWhiteSpace: true,
                tagNames: ['span', 'a']
            })
        );
    }

    /**
     * Binds DOM event listeners.
     *
     * @protected
     * @override
     * @return {void}
     */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.annotatedElement.addEventListener('mouseup', this.highlightMouseupHandler);

        // Prevent all forms of highlight annotations if annotating (or plain AND comment highlights) is disabled
        if (!this.permissions.canAnnotate) {
            return;
        }

        if (this.hasTouch && this.isMobile) {
            this.annotatedElement.addEventListener('touchstart', this.drawingSelectionHandler);

            // Highlight listeners
            if (this.plainHighlightEnabled || this.commentHighlightEnabled) {
                document.addEventListener('selectionchange', this.onSelectionChange);
            }
        } else {
            this.annotatedElement.addEventListener('click', this.drawingSelectionHandler);

            // Highlight listeners
            if (this.plainHighlightEnabled || this.commentHighlightEnabled) {
                this.annotatedElement.addEventListener('dblclick', this.highlightMouseupHandler);
                this.annotatedElement.addEventListener('mousedown', this.highlightMousedownHandler);
                this.annotatedElement.addEventListener('contextmenu', this.highlightMousedownHandler);
                this.annotatedElement.addEventListener('mousemove', this.getHighlightMouseMoveHandler());
            }
        }
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @protected
     * @override
     * @return {void}
     */
    unbindDOMListeners() {
        super.unbindDOMListeners();

        this.annotatedElement.removeEventListener('mouseup', this.highlightMouseupHandler);

        if (this.highlightThrottleHandle) {
            cancelAnimationFrame(this.highlightThrottleHandle);
            this.highlightThrottleHandle = null;
        }

        Object.keys(this.modeControllers).forEach((mode) => {
            const controller = this.modeControllers[mode];
            controller.removeSelection();
        });

        if (this.hasTouch && this.isMobile) {
            document.removeEventListener('selectionchange', this.onSelectionChange);
            this.annotatedElement.removeEventListener('touchstart', this.drawingSelectionHandler);
        } else {
            this.annotatedElement.removeEventListener('click', this.drawingSelectionHandler);
            this.annotatedElement.removeEventListener('dblclick', this.highlightMouseupHandler);
            this.annotatedElement.removeEventListener('mousedown', this.highlightMousedownHandler);
            this.annotatedElement.removeEventListener('contextmenu', this.highlightMousedownHandler);
            this.annotatedElement.removeEventListener('mousemove', this.highlightMousemoveHandler);
            this.highlightMousemoveHandler = null;
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Handles changes in text selection. Used for mobile highlight creation.
     *
     * @param {Event} event - The DOM event coming from interacting with the element.
     * @return {void}
     */
    onSelectionChange(event) {
        // Do nothing if in a text area
        if (document.activeElement.nodeName.toLowerCase() === 'textarea') {
            return;
        }

        const selection = window.getSelection();

        // If we're creating a new selection, make sure to clear out to avoid
        // incorrect text being selected
        if (!this.lastSelection || (this.lastSelection && selection.anchorNode !== this.lastSelection.anchorNode)) {
            this.highlighter.removeAllHighlights();
        }

        // Bail if mid highlight and tapping on the screen
        if (!docAnnotatorUtil.isValidSelection(selection)) {
            this.lastSelection = null;
            this.lastHighlightEvent = null;
            this.createHighlightDialog.hide();
            this.highlighter.removeAllHighlights();
            return;
        }

        if (!this.createHighlightDialog.isVisble) {
            this.createHighlightDialog.show(this.container);
        }

        // Set all annotations that are in the 'hover' state to 'inactive'
        Object.keys(this.threads).forEach((page) => {
            const pageThreads = this.getThreadsOnPage(page);
            const highlightThreads = this.getHighlightThreadsOnPage(pageThreads);
            highlightThreads.filter(isThreadInHoverState).forEach((thread) => {
                thread.reset();
            });
        });

        this.lastSelection = selection;
        this.lastHighlightEvent = event;
    }

    /**
     * Highlight the current range of text that has been selected.
     *
     * @private
     * @return {void}
     */
    highlightCurrentSelection() {
        if (!this.highlighter) {
            return;
        }

        this.highlighter.highlightSelection('rangy-highlight', {
            containerElementId: this.annotatedElement.id
        });
    }

    /**
     * Mousedown handler on annotated element. Initializes didDrag to false -
     * this way, on the mouseup handler, we can check if didDrag was set to
     * true by the mousemove handler, and if not, delegate to click handlers
     * for highlight threads. Also delegates to mousedown handler for each
     * thread.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    highlightMousedownHandler(event) {
        this.didMouseMove = false;
        this.isCreatingHighlight = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        Object.keys(this.threads).forEach((page) => {
            const pageThreads = this.getThreadsOnPage(page);
            const highlightThreads = this.getHighlightThreadsOnPage(pageThreads);
            highlightThreads.forEach((thread) => {
                thread.onMousedown();
            });
        });
    }

    /**
     * Throttled mousemove handler over annotated element. Delegates to
     * mousemove handler of highlight threads on the page.
     *
     * @private
     * @return {Function} mousemove handler
     */
    getHighlightMouseMoveHandler() {
        if (this.highlightMousemoveHandler) {
            return this.highlightMousemoveHandler;
        }

        this.highlightMousemoveHandler = this.onHighlightMouseMove.bind(this);

        /**
         * Highlight event loop
         *
         * @return {void}
         */
        const highlightLoop = () => {
            this.highlightThrottleHandle = requestAnimationFrame(highlightLoop);
            this.onHighlightCheck();
        };

        // Kickstart event process loop.
        highlightLoop();

        return this.highlightMousemoveHandler;
    }

    /**
     * Throttled processing of the most recent mouse move event.
     *
     * @return {void}
     */
    onHighlightCheck() {
        const dt = performance.now() - this.throttleTimer;
        // Bail if no mouse events have occurred OR the throttle delay has not been met.
        if (!this.mouseMoveEvent || dt < MOUSEMOVE_THROTTLE_MS) {
            return;
        }

        // Determine if user is in the middle of creating a highlight
        // annotation and ignore hover events of any highlights below
        if (this.isCreatingHighlight) {
            return;
        }

        // Determine if mouse is over any highlight dialog
        // and ignore hover events of any highlights below
        const event = this.mouseMoveEvent;
        if (docAnnotatorUtil.isDialogDataType(event.target)) {
            return;
        }

        this.mouseMoveEvent = null;
        this.throttleTimer = performance.now();
        // Only filter through highlight threads on the current page
        const { page } = annotatorUtil.getPageInfo(event.target);
        const delayThreads = [];
        let hoverActive = false;

        const pageThreads = this.getThreadsOnPage(page);
        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];

            // Determine if any highlight threads on page are pending or active
            // and ignore hover events of any highlights below
            if (!annotatorUtil.isHighlightAnnotation(thread.type) || thread.state === STATES.pending) {
                return;
            }

            // Determine if the mouse is hovering over any highlight threads
            const shouldDelay = thread.onMousemove(event);
            if (shouldDelay) {
                delayThreads.push(thread);

                if (!hoverActive) {
                    hoverActive = isThreadInHoverState(thread);
                }
            }
        });

        // If we are hovering over a highlight, we should use a hand cursor
        if (hoverActive) {
            this.useDefaultCursor();
            clearTimeout(this.cursorTimeout);
        } else {
            // Setting timeout on cursor change so cursor doesn't
            // flicker when hovering on line spacing
            this.cursorTimeout = setTimeout(() => {
                this.removeDefaultCursor();
            }, HOVER_TIMEOUT_MS);
        }

        // Delayed threads (threads that should be in active or hover
        // state) should be drawn last. If multiple highlights are
        // hovered over at the same time, only the top-most highlight
        // dialog will be displayed and the others will be hidden
        // without delay
        delayThreads.forEach(this.showFirstDialogFilter);
    }

    /**
     * Mouse move handler. Paired with throttle mouse move handler to check for annotation highlights.
     *
     * @param {Event} event - DDOM event fired by mouse move event
     * @return {void}
     */
    onHighlightMouseMove(event) {
        if (
            !this.didMouseMove &&
            (Math.abs(event.clientX - this.mouseX) > MOUSE_MOVE_MIN_DISTANCE ||
                Math.abs(event.clientY - this.mouseY) > MOUSE_MOVE_MIN_DISTANCE)
        ) {
            this.didMouseMove = true;
        }

        // Determine if the user is creating a new overlapping highlight
        // and ignore hover events of any highlights below
        if (this.isCreatingHighlight) {
            return;
        }

        this.mouseMoveEvent = event;
    }

    /**
     * Drawing selection handler. Delegates to the drawing controller
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    drawingSelectionHandler(event) {
        if (this.modeControllers[TYPES.draw]) {
            this.modeControllers[TYPES.draw].handleSelection(event);
        }
    }

    /**
     * Mouseup handler. Switches between creating a highlight and delegating
     * to highlight click handlers depending on whether mouse moved since
     * mousedown.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    highlightMouseupHandler(event) {
        if (this.highlighter) {
            this.highlighter.removeAllHighlights();
        }

        if (this.createHighlightDialog) {
            this.createHighlightDialog.hide();
        }

        this.isCreatingHighlight = false;

        // Creating highlights is disabled on mobile for now since the
        // event we would listen to, selectionchange, fires continuously and
        // is unreliable. If the mouse moved or we double clicked text,
        // we trigger the create handler instead of the click handler
        if (this.createHighlightDialog && (this.didMouseMove || event.type === 'dblclick')) {
            this.highlightCreateHandler(event);
        } else {
            this.highlightClickHandler(event);
        }
    }

    /**
     * Handler for creating a pending highlight thread from the current
     * selection. Default creates highlight threads as ANNOTATION_TYPE_HIGHLIGHT.
     * If the user adds a comment, the type changes to
     * ANNOTATION_TYPE_HIGHLIGHT_COMMENT.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    highlightCreateHandler(event) {
        event.stopPropagation();

        const selection = window.getSelection();
        if (!docAnnotatorUtil.isValidSelection(selection)) {
            return;
        }

        // Select page of first node selected
        const { pageEl } = annotatorUtil.getPageInfo(selection.anchorNode);
        if (!pageEl) {
            return;
        }

        const lastRange = selection.getRangeAt(selection.rangeCount - 1);
        const rects = lastRange.getClientRects();
        if (rects.length === 0) {
            return;
        }

        const { right, bottom } = rects[rects.length - 1];
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageLeft = pageDimensions.left;
        const pageTop = pageDimensions.top + PAGE_PADDING_TOP;
        const dialogParentEl = this.isMobile ? this.container : pageEl;

        this.createHighlightDialog.show(dialogParentEl);

        if (!this.isMobile) {
            this.createHighlightDialog.setPosition(right - pageLeft, bottom - pageTop);
        }

        this.isCreatingHighlight = true;
        this.lastHighlightEvent = event;
    }

    /**
     * Highlight click handler. Delegates click event to click handlers for
     * threads on the page.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    highlightClickHandler(event) {
        let consumed = false;
        let activeThread = null;

        const page = annotatorUtil.getPageInfo(event.target).page;
        const pageThreads = this.getThreadsOnPage(page);

        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];

            if (annotatorUtil.isPending(thread.state)) {
                // Destroy any pending highlights on click outside the highlight
                if (thread.type === TYPES.point) {
                    thread.destroy();
                } else {
                    thread.cancelFirstComment();
                }
            } else if (annotatorUtil.isHighlightAnnotation(thread.type)) {
                // We use this to prevent a mousedown from activating two different
                // highlights at the same time - this tracks whether a delegated
                // mousedown activated some highlight, and then informs the other
                // keydown handlers to not activate
                const threadActive = thread.onClick(event, consumed);
                if (threadActive) {
                    activeThread = thread;
                }

                consumed = consumed || threadActive;
            }
        });

        // Show active thread last
        if (activeThread) {
            activeThread.show(this.plainHighlightEnabled, this.commentHighlightEnabled);
        }
    }

    /**
     * Show normal cursor instead of text cursor.
     *
     * @private
     * @return {void}
     */
    useDefaultCursor() {
        this.annotatedElement.classList.add(CLASS_DEFAULT_CURSOR);
    }

    /**
     * Use text cursor.
     *
     * @private
     * @return {void}
     */
    removeDefaultCursor() {
        this.annotatedElement.classList.remove(CLASS_DEFAULT_CURSOR);
    }

    /**
     * Returns the highlight threads on the specified page.
     *
     * @private
     * @param {number} page - Page to get highlight threads for
     * @return {DocHighlightThread[]} Highlight annotation threads
     */
    getHighlightThreadsOnPage(page) {
        const threads = [];
        const pageThreads = this.getThreadsOnPage(page);

        Object.keys(pageThreads).forEach((threadID) => {
            const thread = pageThreads[threadID];
            if (annotatorUtil.isHighlightAnnotation(thread.type)) {
                threads.push(thread);
            }
        });

        return threads;
    }

    /**
     * Shows highlight annotations for the specified page by re-drawing all
     * highlight annotations currently in memory for the specified page.
     *
     * @private
     * @param {number} page - Page to draw annotations for
     * @return {void}
     */
    showHighlightsOnPage(page) {
        // Clear context if needed
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
        const annotationLayerEl = pageEl.querySelector(`.${CLASS_ANNOTATION_LAYER_HIGHLIGHT}`);
        if (annotationLayerEl) {
            const context = annotationLayerEl.getContext('2d');
            context.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);
        }

        this.getHighlightThreadsOnPage(page).forEach((thread) => {
            thread.show(this.plainHighlightEnabled, this.commentHighlightEnabled);
        });
    }

    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the
     * internal highlighter list that has a matching ID. We can't directly use
     * the highlighter's removeHighlights since the highlight could possibly
     * not be a true Rangy highlight object.
     *
     * @private
     * @param {Object} highlight - Highlight to delete.
     * @return {void}
     */
    removeRangyHighlight(highlight) {
        const highlights = this.highlighter.highlights;
        if (!Array.isArray(highlights)) {
            return;
        }

        const matchingHighlights = highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this.highlighter.removeHighlights(matchingHighlights);
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

        super.handleAnnotationThreadEvents(data);

        switch (data.event) {
            case THREAD_EVENT.threadDelete:
                this.showHighlightsOnPage(thread.location.page);
                break;
            default:
        }
    }
}

export default DocAnnotator;
