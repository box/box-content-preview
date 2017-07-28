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
    PENDING_STATES
} from '../annotationConstants';

const MOUSEMOVE_THROTTLE_MS = 50;
const HOVER_TIMEOUT_MS = 75;
const MOUSE_MOVE_MIN_DISTANCE = 5;

const SELECTOR_PREVIEW_DOC = '.bp-doc';
const CLASS_DEFAULT_CURSOR = 'bp-use-default-cursor';

/**
 * For filtering out and only showing the first thread in a list of threads.
 *
 * @param {Object} thread - The annotation thread to either hide or show
 * @param {number} index - The index of the annotation thread
 * @return {void}
 */
function showFirstDialogFilter(thread, index) {
    if (index === 0) {
        thread.show();
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
    /**
     * For tracking the most recent event fired by mouse move event.
     *
     * @property {Event}
     */
    mouseMoveEvent;

    /**
     * Event callback for mouse move events with for highlight annotations.
     *
     * @property {Function}
     */
    highlightMousemoveHandler;

    /**
     * Handle to RAF used to throttle highlight collision checks.
     *
     * @property {Function}
     */
    highlightThrottleHandle;

    /**
     * Timer used to throttle highlight event process.
     *
     * @property {number}
     */
    throttleTimer = 0;

    /**
     * UI used to create new highlight annotations.
     *
     * @property {CreateHighlightDialog}
     */
    createHighlightDialog;

    /**
     * For delaying creation of highlight quad points and dialog. Tracks the
     * current selection event, made in a previous event.
     *
     * @property {Event}
     */
    lastHighlightEvent;

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

        // Explicit scoping
        this.highlightCurrentSelection = this.highlightCurrentSelection.bind(this);
        this.createHighlightThread = this.createHighlightThread.bind(this);
        this.createPlainHighlight = this.createPlainHighlight.bind(this);

        this.createHighlightDialog = new CreateHighlightDialog();
        this.createHighlightDialog.addListener(CreateEvents.plain, this.createPlainHighlight);

        this.createHighlightDialog.addListener(CreateEvents.comment, this.highlightCurrentSelection);

        this.createHighlightDialog.addListener(CreateEvents.commentPost, this.createHighlightThread);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        super.destroy();

        this.createHighlightDialog.removeListener(CreateEvents.plain, this.createPlainHighlight);

        this.createHighlightDialog.removeListener(CreateEvents.comment, this.highlightCurrentSelection);

        this.createHighlightDialog.removeListener(CreateEvents.commentPost, this.createHighlightThread);
        this.createHighlightDialog.destroy();
        this.createHighlightDialog = null;
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
            // If there is a selection, ignore
            if (docAnnotatorUtil.isSelectionPresent()) {
                return location;
            }

            // If click isn't on a page, ignore
            const eventTarget = event.target;
            const { pageEl, page } = annotatorUtil.getPageInfo(eventTarget);
            if (!pageEl) {
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
                event.clientX - pageDimensions.left,
                event.clientY - pageDimensions.top - PAGE_PADDING_TOP
            ];
            const pdfCoordinates = docAnnotatorUtil.convertDOMSpaceToPDFSpace(
                browserCoordinates,
                pageHeight,
                zoomScale
            );
            const [x, y] = pdfCoordinates;

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
            let { pageEl, page } = annotatorUtil.getPageInfo(event.target);
            if (page === -1) {
                // The ( .. ) around assignment is required syntax
                ({ pageEl, page } = annotatorUtil.getPageInfo(window.getSelection().anchorNode));
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
     * @param {Annotation[]} annotations - Annotations in thread
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
            locale: this.locale,
            location,
            type
        };

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
            threadParams.threadNumber = annotations[0].threadNumber;
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
        } else {
            throw new Error(`Unhandled document annotation type: ${type}`);
        }

        this.addThreadToMap(thread);
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
        this.createHighlightDialog.hide();

        const location = this.getLocationFromEvent(this.lastHighlightEvent, TYPES.highlight);
        if (!location) {
            return null;
        }

        const annotations = [];
        const thread = this.createAnnotationThread(annotations, location, TYPES.highlight);
        this.lastHighlightEvent = null;

        if (!thread) {
            return null;
        }

        if (!commentText) {
            thread.dialog.drawAnnotation();
        } else {
            thread.dialog.hasComments = true;
        }

        thread.state = STATES.hover;
        thread.show();
        thread.dialog.postAnnotation(commentText);

        this.bindCustomListenersOnThread(thread);

        return thread;
    }

    /**
     * Renders annotations from memory for a specified page.
     *
     * @override
     * @param {number} pageNum - Page number
     * @return {void}
     */
    renderAnnotationsOnPage(pageNum) {
        super.renderAnnotationsOnPage(pageNum);

        // Destroy current pending highlight annotation
        this.getHighlightThreadsOnPage(pageNum).forEach((thread) => {
            if (annotatorUtil.isPending(thread.state)) {
                thread.destroy();
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

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(
            rangy.createClassApplier('rangy-highlight', {
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
        this.annotatedElement.addEventListener('mouseup', this.highlightMouseupHandler);

        if (this.annotationService.canAnnotate) {
            this.annotatedElement.addEventListener('dblclick', this.highlightMouseupHandler);
            this.annotatedElement.addEventListener('mousedown', this.highlightMousedownHandler);
            this.annotatedElement.addEventListener('contextmenu', this.highlightMousedownHandler);
            this.annotatedElement.addEventListener('mousemove', this.getHighlightMouseMoveHandler());
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
        this.annotatedElement.removeEventListener('mouseup', this.highlightMouseupHandler);

        if (this.annotationService.canAnnotate) {
            this.annotatedElement.removeEventListener('dblclick', this.highlightMouseupHandler);
            this.annotatedElement.removeEventListener('mousedown', this.highlightMousedownHandler);
            this.annotatedElement.removeEventListener('contextmenu', this.highlightMousedownHandler);
            this.annotatedElement.removeEventListener('mousemove', this.getHighlightMouseMoveHandler());

            if (this.highlightThrottleHandle) {
                cancelAnimationFrame(this.highlightThrottleHandle);
                this.highlightThrottleHandle = null;
            }
        }
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @protected
     * @override
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    bindCustomListenersOnThread(thread) {
        super.bindCustomListenersOnThread(thread);

        // We need to redraw highlights on the page if a thread was deleted
        // since deleting 'cuts' out the highlight, which may have been
        // overlapping with another
        thread.addListener('threaddeleted', () => {
            this.showHighlightsOnPage(thread.location.page);
        });
    }

    /**
     * Checks whether mouse is inside any dialog on the current page
     *
     * @protected
     * @param {Event} event - Mouse event
     * @param {number} page - Current page number
     * @return {boolean} Whether or not mouse is inside a dialog on the page
     */
    isInDialogOnPage(event, page) {
        const threads = this.getThreadsOnPage(page);
        let mouseInDialog = false;

        threads.some((thread) => {
            mouseInDialog = docAnnotatorUtil.isInDialog(event, thread.dialog.element);
            return mouseInDialog;
        });
        return mouseInDialog;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

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
     * Gets threads on page
     *
     * @private
     * @param {number} page - Current page number
     * @return {[]} Threads on page
     */
    getThreadsOnPage(page) {
        const threads = this.threads ? this.threads[page] : [];
        return threads;
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

        Object.keys(this.threads).forEach((threadPage) => {
            this.getHighlightThreadsOnPage(threadPage).forEach((thread) => {
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

        const event = this.mouseMoveEvent;
        this.mouseMoveEvent = null;
        this.throttleTimer = performance.now();
        // Only filter through highlight threads on the current page
        const { page } = annotatorUtil.getPageInfo(event.target);
        const pageThreads = this.getHighlightThreadsOnPage(page);
        const delayThreads = [];
        let hoverActive = false;

        const threadLength = pageThreads.length;
        for (let i = 0; i < threadLength; ++i) {
            const thread = pageThreads[i];
            // Determine if any highlight threads on page are pending or active
            // and ignore hover events of any highlights below
            if (thread.state === STATES.pending) {
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
        }

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
        delayThreads.forEach(showFirstDialogFilter);
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
        this.createHighlightDialog.hide();
        // Creating highlights is disabled on mobile for now since the
        // event we would listen to, selectionchange, fires continuously and
        // is unreliable. If the mouse moved or we double clicked text,
        // we trigger the create handler instead of the click handler
        if (this.didMouseMove || event.type === 'dblclick') {
            this.highlightCreateHandler(event);
        } else {
            this.highlightClickHandler(event);
        }
        this.isCreatingHighlight = false;
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
        if (selection.rangeCount <= 0 || selection.isCollapsed) {
            return;
        }

        // Only filter through highlight threads on the current page
        // Reset active highlight threads before creating new highlight
        const { pageEl } = annotatorUtil.getPageInfo(event.target);

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

        this.createHighlightDialog.show(pageEl);
        if (!this.isMobile) {
            this.createHighlightDialog.setPosition(right - pageLeft, bottom - pageTop);
        }

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

        // Destroy any pending highlights on click outside the highlight
        const pendingThreads = this.getThreadsWithStates(PENDING_STATES);
        pendingThreads.forEach((thread) => {
            if (thread.type === TYPES.point) {
                thread.destroy();
            } else {
                thread.cancelFirstComment();
            }
        });

        // Only filter through highlight threads on the current page
        const page = annotatorUtil.getPageInfo(event.target).page;
        const pageThreads = this.getHighlightThreadsOnPage(page);
        pageThreads.forEach((thread) => {
            // We use this to prevent a mousedown from activating two different
            // highlights at the same time - this tracks whether a delegated
            // mousedown activated some highlight, and then informs the other
            // keydown handlers to not activate
            const threadActive = thread.onClick(event, consumed);
            if (threadActive) {
                activeThread = thread;
            }

            consumed = consumed || threadActive;
        });

        // Show active thread last
        if (activeThread) {
            activeThread.show();
        }
    }
    /**
     * Returns all threads with a state in the specified states.
     *
     * @private
     * @param {...string} states - States of highlight threads to find
     * @return {AnnotationThread[]} threads with the specified states
     * */
    getThreadsWithStates(...states) {
        const threads = [];

        Object.keys(this.threads).forEach((page) => {
            // Concat threads with a matching state to array we're returning
            [].push.apply(
                threads,
                this.threads[page].filter((thread) => {
                    return states.indexOf(thread.state) > -1;
                })
            );
        });

        return threads;
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
        const threads = this.threads[page] || [];
        return threads.filter((thread) => annotatorUtil.isHighlightAnnotation(thread.type));
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
            thread.show();
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
}

export default DocAnnotator;
