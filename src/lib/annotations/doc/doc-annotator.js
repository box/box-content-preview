/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';
import autobind from 'autobind-decorator';
import Annotator from '../annotator';
import Browser from '../../browser';
import DocHighlightThread from './doc-highlight-thread';
import DocPointThread from './doc-point-thread';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';
import * as docAnnotatorUtil from './doc-annotator-util';

const MOUSEMOVE_THROTTLE_MS = 50;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;
const HOVER_TIMEOUT_MS = 75;

@autobind
class DocAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

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
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);

        if (annotationType === constants.ANNOTATION_TYPE_POINT) {
            // If there is a selection, ignore
            if (docAnnotatorUtil.isSelectionPresent()) {
                return location;
            }

            // If click isn't on a page, ignore
            const eventTarget = event.target;
            const { pageEl, page } = docAnnotatorUtil.getPageElAndPageNumber(eventTarget);
            if (!pageEl) {
                return location;
            }

            // If click is inside an annotation dialog, ignore
            const dataType = annotatorUtil.findClosestDataType(eventTarget);
            if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
                return location;
            }

            // Store coordinates at 100% scale in PDF space in PDF units
            const pageDimensions = pageEl.getBoundingClientRect();
            const pageWidth = pageDimensions.width;
            const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
            const browserCoordinates = [event.clientX - pageDimensions.left, event.clientY - pageDimensions.top - PAGE_PADDING_TOP];
            const pdfCoordinates = docAnnotatorUtil.convertDOMSpaceToPDFSpace(browserCoordinates, pageHeight, zoomScale);
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
            if (!docAnnotatorUtil.isSelectionPresent()) {
                return location;
            }

            // Get correct page
            let { pageEl, page } = docAnnotatorUtil.getPageElAndPageNumber(event.target);
            if (page === -1) {
                // The ( .. ) around assignment is required syntax
                ({ pageEl, page } = docAnnotatorUtil.getPageElAndPageNumber(window.getSelection().anchorNode));
            }

            // Use Rangy to save the current selection because using the
            // highlight module can mess with the selection. We restore this
            // selection after we clean up the highlight
            const savedSelection = rangy.saveSelection();

            // Use highlight module to calculate quad points
            const { highlight, highlightEls } = docAnnotatorUtil.getHighlightAndHighlightEls(this._highlighter, pageEl);

            // Do not create highlight annotation if no highlights are detected
            if (highlightEls.length === 0) {
                return location;
            }

            const quadPoints = [];
            highlightEls.forEach((element) => {
                quadPoints.push(docAnnotatorUtil.getQuadPoints(element, pageEl, zoomScale));
            });

            // Remove rangy highlight and restore selection
            this.removeRangyHighlight(highlight);
            rangy.restoreSelection(savedSelection);

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
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
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
            annotatedElement: this._annotatedElement,
            annotations,
            annotationService: this._annotationService,
            fileVersionID: this._fileVersionID,
            locale: this._locale,
            location,
            type
        };

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
            threadParams.thread = annotations[0]._thread;
        }

        if (annotatorUtil.isHighlightAnnotation(type)) {
            thread = new DocHighlightThread(threadParams);
        } else {
            thread = new DocPointThread(threadParams);
        }

        this.addThreadToMap(thread);
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
        this._highlighter = rangy.createHighlighter();
        this._highlighter.addClassApplier(rangy.createClassApplier('rangy-highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));
    }

    /**
     * Binds DOM event listeners.
     *
     * @protected
     * @override
     * @return {void}
     */
    bindDOMListeners() {
        this._annotatedElement.addEventListener('mouseup', this.highlightMouseupHandler);

        if (this._annotationService.canAnnotate) {
            this._annotatedElement.addEventListener('dblclick', this.highlightMouseupHandler);
            this._annotatedElement.addEventListener('mousedown', this.highlightMousedownHandler);
            this._annotatedElement.addEventListener('contextmenu', this.highlightMousedownHandler);
            this._annotatedElement.addEventListener('mousemove', this.highlightMousemoveHandler());
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
        this._annotatedElement.removeEventListener('mouseup', this.highlightMouseupHandler);

        if (this._annotationService.canAnnotate) {
            this._annotatedElement.removeEventListener('dblclick', this.highlightMouseupHandler);
            this._annotatedElement.removeEventListener('mousedown', this.highlightMousedownHandler);
            this._annotatedElement.removeEventListener('contextmenu', this.highlightMousedownHandler);
            this._annotatedElement.removeEventListener('mousemove', this.highlightMousemoveHandler());
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
            mouseInDialog = docAnnotatorUtil.isInDialog(event, thread._dialog.element);
            return mouseInDialog;
        });
        return mouseInDialog;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Gets threads on page
     *
     * @private
     * @param {number} page - Current page number
     * @return {[]} Threads on page
     */
    getThreadsOnPage(page) {
        const threads = this._threads ? this._threads[page] : [];
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
        this._didMouseMove = false;
        this._isCreatingHighlight = true;
        this._mouseX = event.clientX;
        this._mouseY = event.clientY;

        Object.keys(this._threads).forEach((threadPage) => {
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
    highlightMousemoveHandler() {
        if (this._throttledHighlightMousemoveHandler) {
            return this._throttledHighlightMousemoveHandler;
        }

        this._throttledHighlightMousemoveHandler = throttle((event) => {
            // Only filter through highlight threads on the current page
            const page = docAnnotatorUtil.getPageElAndPageNumber(event.target).page;
            const pageThreads = this.getHighlightThreadsOnPage(page);
            const delayThreads = [];

            pageThreads.forEach((thread) => {
                // Determine if any highlight threads on page are pending or active
                // and ignore hover events of any highlights below
                if (thread.state === constants.ANNOTATION_STATE_PENDING || thread.state === constants.ANNOTATION_STATE_ACTIVE) {
                    return;
                }

                // Determine if the mouse is hovering over any highlight threads
                const shouldDelay = thread.onMousemove(event);
                if (shouldDelay) {
                    delayThreads.push(thread);
                }
            });

            // Ignore small mouse movements when figuring out if a mousedown
            // and mouseup was a click
            if (Math.abs(event.clientX - this._mouseX) > 5 ||
                Math.abs(event.clientY - this._mouseY) > 5) {
                this._didMouseMove = true;
            }

            // Determine if the user is creating a new overlapping highlight
            // and ignore hover events of any highlights below
            if (this._isCreatingHighlight) {
                return;
            }

            // If we are hovering over a highlight, we should use a hand cursor
            if (delayThreads.some((thread) => {
                return constants.HOVER_STATES.indexOf(thread.state) > 1;
            })) {
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
            delayThreads.forEach((thread, index) => {
                if (index === 0) {
                    thread.show();
                } else {
                    thread.hideDialog();
                }
            });
        }, MOUSEMOVE_THROTTLE_MS);
        return this._throttledHighlightMousemoveHandler;
    }

    /**
     * Mouseup handler. Switches between creating a highlight and delegating
     * to highlight click handlers depending on whether mouse moved since
     * mousedown.
     *
     * @private
     * @param {Event} event - DOM event
     */
    highlightMouseupHandler(event) {
        // Creating highlights is disabled on mobile for now since the
        // event we would listen to, selectionchange, fires continuously and
        // is unreliable. If the mouse moved or we double clicked text,
        // we trigger the create handler instead of the click handler
        if (!Browser.isMobile() && (this._didMouseMove || event.type === 'dblclick')) {
            this.highlightCreateHandler(event);
        } else {
            this.highlightClickHandler(event);
        }
        this._isCreatingHighlight = false;
    }

    /**
     * Handler for creating a pending highlight thread from the current
     * selection. Default creates highlight threads as ANNOTATION_TYPE_HIGHLIGHT.
     * If the user adds a comment, the type changes to
     * ANNOTATION_TYPE_HIGHLIGHT_COMMENT.
     *
     * @private
     * @param {Event} event - DOM event
     */
    highlightCreateHandler(event) {
        event.stopPropagation();

        // Determine if any highlight threads are pending and ignore the
        // creation of any new highlights
        if (docAnnotatorUtil.hasActiveDialog(this._annotatedElement)) {
            return;
        }

        // Only filter through highlight threads on the current page
        // Reset active highlight threads before creating new highlight
        const page = docAnnotatorUtil.getPageElAndPageNumber(event.target).page;
        const activeThreads = this.getHighlightThreadsOnPage(page).filter((thread) => constants.ACTIVE_STATES.indexOf(thread.state) > -1);
        activeThreads.forEach((thread) => {
            thread.reset();
        });

        // Get annotation location from mouseup event, ignore if location is invalid
        const location = this.getLocationFromEvent(event, constants.ANNOTATION_TYPE_HIGHLIGHT);
        if (!location) {
            return;
        }

        // Create and show pending annotation thread
        const thread = this.createAnnotationThread([], location, constants.ANNOTATION_TYPE_HIGHLIGHT);

        thread.show();

        // Bind events on thread
        this.bindCustomListenersOnThread(thread);
    }

    /**
     * Highlight click handler. Delegates click event to click handlers for
     * threads on the page.
     *
     * @private
     * @param {Event} event - DOM event
     */
    highlightClickHandler(event) {
        let consumed = false;
        let activeThread = null;

        // Destroy any pending highlights on click outside the highlight
        const pendingThreads = this.getThreadsWithStates(constants.PENDING_STATES);
        pendingThreads.forEach((thread) => {
            if (thread.type === constants.ANNOTATION_TYPE_POINT) {
                thread.destroy();
            } else {
                thread.cancelFirstComment();
            }
        });

        // Only filter through highlight threads on the current page
        const page = docAnnotatorUtil.getPageElAndPageNumber(event.target).page;
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

        Object.keys(this._threads).forEach((page) => {
            // Concat threads with a matching state to array we're returning
            [].push.apply(threads, this._threads[page].filter((thread) => {
                return states.indexOf(thread.state) > -1;
            }));
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
        this._annotatedElement.classList.add('bp-use-default-cursor');
    }

    /**
     * Use text cursor.
     *
     * @private
     * @return {void}
     */
    removeDefaultCursor() {
        this._annotatedElement.classList.remove('bp-use-default-cursor');
    }

    /**
     * Returns the highlight threads on the specified page.
     *
     * @private
     * @param {number} page - Page to get highlight threads for
     * @return {DocHighlightThread[]} Highlight annotation threads
     */
    getHighlightThreadsOnPage(page) {
        const threads = this._threads[page] || [];
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
        // let time = new Date().getTime();

        // Clear context if needed
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${page}"]`);
        const annotationLayerEl = pageEl.querySelector('.bp-annotation-layer');
        if (annotationLayerEl) {
            const context = annotationLayerEl.getContext('2d');
            context.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);
        }

        this.getHighlightThreadsOnPage(page).forEach((thread) => {
            thread.show();
        });

        // console.log(`Drawing annotations for page ${page} took ${new Date().getTime() - time}ms`);
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
        const highlights = this._highlighter.highlights;
        if (!Array.isArray(highlights)) {
            return;
        }

        const matchingHighlights = highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this._highlighter.removeHighlights(matchingHighlights);
    }
}

export default DocAnnotator;
