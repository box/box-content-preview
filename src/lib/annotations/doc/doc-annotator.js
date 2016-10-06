/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotator';
import Browser from '../../browser';
import DocHighlightThread from './doc-highlight-thread';
import DocPointThread from './doc-point-thread';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';
import * as docAnnotatorUtil from './doc-annotator-util';

const MOUSEMOVE_THROTTLE_MS = 50;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocAnnotator extends Annotator {

    /**
     * Initializes annotator.
     *
     * @override
     * @returns {void}
     */
    init() {
        super.init();

        // On mobile, we want to disable user-scaling since we want users to use
        // the document zoom controls
        /* Unclear whether we want this behavior or not
        if (Browser.isMobile()) {
            const metaEl = document.createElement('meta');
            metaEl.setAttribute('name', 'viewport');
            metaEl.setAttribute('content', 'user-scalable=no');
            document.getElementsByTagName('head')[0].appendChild(metaEl);
        }
        */
    }

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
     * @param {Event} event DOM event
     * @param {string} annotationType Type of annotation
     * @returns {Object|null} Location object
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
        } else if (docAnnotatorUtil.isHighlightAnnotation(annotationType)) {
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
            this._removeRangyHighlight(highlight);
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
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {string} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
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
        }

        if (docAnnotatorUtil.isHighlightAnnotation(type)) {
            thread = new DocHighlightThread(threadParams);
        } else {
            thread = new DocPointThread(threadParams);
        }

        this.addThreadToMap(thread);
        return thread;
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @override
     * @returns {void}
     * @protected
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
     * @override
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {
        this._annotatedElement.addEventListener('mouseup', this._highlightMouseupHandler);

        if (this._annotationService.canAnnotate) {
            this._annotatedElement.addEventListener('dblclick', this._highlightMouseupHandler);
            this._annotatedElement.addEventListener('mousedown', this._highlightMousedownHandler);
            this._annotatedElement.addEventListener('contextmenu', this._highlightMousedownHandler);
            this._annotatedElement.addEventListener('mousemove', this._highlightMousemoveHandler());
        }
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        this._annotatedElement.removeEventListener('mouseup', this._highlightMouseupHandler);

        if (this._annotationService.canAnnotate) {
            this._annotatedElement.removeEventListener('dblclick', this._highlightMouseupHandler);
            this._annotatedElement.removeEventListener('mousedown', this._highlightMousedownHandler);
            this._annotatedElement.removeEventListener('contextmenu', this._highlightMousedownHandler);
            this._annotatedElement.removeEventListener('mousemove', this._highlightMousemoveHandler());
        }
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @override
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @protected
     */
    bindCustomListenersOnThread(thread) {
        super.bindCustomListenersOnThread(thread);

        // We need to redraw highlights on the page if a thread was deleted
        // since deleting 'cuts' out the highlight, which may have been
        // overlapping with another
        thread.addListener('threaddeleted', () => {
            this._showHighlightsOnPage(thread.location.page);
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Mousedown handler on annotated element. Initializes didDrag to false -
     * this way, on the mouseup handler, we can check if didDrag was set to
     * true by the mousemove handler, and if not, delegate to click handlers
     * for highlight threads. Also delegates to mousedown handler for each
     * thread.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _highlightMousedownHandler(event) {
        this._didMouseMove = false;
        this._isCreatingHighlight = true;
        this._mouseX = event.clientX;
        this._mouseY = event.clientY;

        Object.keys(this._threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                thread.onMousedown();
            });
        });
    }

    /**
     * Throttled mousemove handler over annotated element. Delegates to
     * mousemove handler of highlight threads on the page.
     *
     * @returns {Function} mousemove handler
     * @private
     */
    _highlightMousemoveHandler() {
        if (!this._throttledHighlightMousemoveHandler) {
            this._throttledHighlightMousemoveHandler = throttle((event) => {
                // Determine if any highlight threads are pending and ignore the
                // hover events of other annotations
                const pendingThreads = this._getHighlightThreadsWithStates(
                    constants.ANNOTATION_STATE_PENDING,
                    constants.ANNOTATION_STATE_ACTIVE,
                    constants.ANNOTATION_STATE_ACTIVE_HOVER);

                if (pendingThreads.length) {
                    return;
                }

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

                const delayThreads = [];
                const page = docAnnotatorUtil.getPageElAndPageNumber(event.target).page;
                if (page !== -1) {
                    this._getHighlightThreadsOnPage(page).forEach((thread) => {
                        const shouldDelay = thread.onMousemove(event);
                        if (shouldDelay) {
                            delayThreads.push(thread);
                        }
                    });
                }

                // Hide all other threads that are open besides the one currently being hovered over
                const pendingHideThreads = this._getHighlightThreadsWithStates(constants.ANNOTATION_STATE_INACTIVE);
                if (delayThreads.length) {
                    pendingHideThreads.forEach((thread) => {
                        thread.hideDialog(true);
                    });
                }

                // If we are hovering over a highlight, we should use a hand cursor
                if (delayThreads.some((thread) => {
                    return thread.state === constants.ANNOTATION_STATE_HOVER ||
                        thread.state === constants.ANNOTATION_STATE_ACTIVE_HOVER;
                })) {
                    this._useDefaultCursor();
                } else {
                    this._removeDefaultCursor();
                }

                // Delayed threads (threads that should be in active or hover
                // state) should be drawn last. If multiple highlights are
                // hovered over at the same time, only the last highlight
                // dialog will be displayed and the others will be hidden
                // without delay
                for (let i = 0; i < delayThreads.length; i++) {
                    if (i === 0) {
                        delayThreads[i].show();
                    } else {
                        delayThreads[i].hideDialog(true);
                    }
                }
            }, MOUSEMOVE_THROTTLE_MS);
        }

        return this._throttledHighlightMousemoveHandler;
    }

    /**
     * Mouseup handler. Switches between creating a highlight and delegating
     * to highlight click handlers depending on whether mouse moved since
     * mousedown.
     *
     * @param {Event} event DOM event
     * @private
     */
    _highlightMouseupHandler(event) {
        // Creating highlights is disabled on mobile for now since the
        // event we would listen to, selectionchange, fires continuously and
        // is unreliable. If the mouse moved or we double clicked text,
        // we trigger the create handler instead of the click handler
        if (!Browser.isMobile() && (this._didMouseMove || event.type === 'dblclick')) {
            this._highlightCreateHandler(event);
        } else {
            this._highlightClickHandler(event);
        }
        this._isCreatingHighlight = false;
    }

    /**
     * Handler for creating a pending highlight thread from the current
     * selection. Default creates highlight threads as ANNOTATION_TYPE_HIGHLIGHT.
     * If the user adds a comment, the type changes to
     * ANNOTATION_TYPE_HIGHLIGHT_COMMENT.
     *
     * @param {Event} event DOM event
     * @private
     */
    _highlightCreateHandler(event) {
        event.stopPropagation();

        // Determine if any highlight threads are pending and ignore the
        // creation of any new highlights
        const pendingThreads = this._getHighlightThreadsWithStates(constants.ANNOTATION_STATE_PENDING, constants.ANNOTATION_STATE_PENDING_ACTIVE);
        if (pendingThreads.length) {
            return;
        }

        // Reset active highlight threads before creating new highlight
        const threads = this._getHighlightThreadsWithStates(constants.ANNOTATION_STATE_ACTIVE, constants.ANNOTATION_STATE_ACTIVE_HOVER);
        threads.forEach((thread) => {
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
     * @param {Event} event DOM event
     * @private
     */
    _highlightClickHandler(event) {
        // Destroy any pending highlights on click outside the highlight
        const pendingThreads = this._getHighlightThreadsWithStates(constants.ANNOTATION_STATE_PENDING);
        pendingThreads.forEach((thread) => {
            thread.cancelFirstComment();
        });

        // We use this to prevent a mousedown from activating two different
        // highlights at the same time - this tracks whether a delegated
        // mousedown activated some highlight, and then informs the other
        // keydown handlers to not activate
        let consumed = false;
        let activeThread = null;
        Object.keys(this._threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                const threadActive = thread.onClick(event, consumed);
                if (threadActive) {
                    activeThread = thread;
                }

                consumed = consumed || threadActive;
            });
        });

        // Show active thread last
        if (activeThread) {
            activeThread.show();
        }
    }

    /**
     * Show normal cursor instead of text cursor.
     *
     * @returns {void}
     * @private
     */
    _useDefaultCursor() {
        this._annotatedElement.classList.add('box-preview-use-default-cursor');
    }

    /**
     * Use text cursor.
     *
     * @returns {void}
     * @private
     */
    _removeDefaultCursor() {
        this._annotatedElement.classList.remove('box-preview-use-default-cursor');
    }

    /**
     * Returns the highlight threads on the specified page.
     *
     * @param {number} page Page to get highlight threads for
     * @returns {DocHighlightThread[]} Highlight annotation threads
     * @private
     */
    _getHighlightThreadsOnPage(page) {
        const threads = this._threads[page] || [];
        return threads.filter((thread) => docAnnotatorUtil.isHighlightAnnotation(thread.type));
    }

    /**
     * Returns highlight threads with a state in the specified states.
     *
     * @param {...string} states States of highlight threads to find
     * @returns {DocHighlightThread[]} Highlight threads with the specified states
     * @private
     */
    _getHighlightThreadsWithStates(...states) {
        const threads = [];

        Object.keys(this._threads).forEach((page) => {
            // Append pending highlight threads on page to array of threads
            [].push.apply(threads, this._threads[page].filter((thread) => {
                let matchedState = false;
                states.forEach((state) => {
                    matchedState = matchedState || (thread.state === state);
                });

                return matchedState && docAnnotatorUtil.isHighlightAnnotation(thread.type);
            }));
        });

        return threads;
    }

    /**
     * Shows highlight annotations for the specified page by re-drawing all
     * highlight annotations currently in memory for the specified page.
     *
     * @param {number} page Page to draw annotations for
     * @returns {void}
     * @private
     */
    _showHighlightsOnPage(page) {
        // let time = new Date().getTime();

        // Clear context if needed
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${page}"]`);
        const annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (annotationLayerEl) {
            const context = annotationLayerEl.getContext('2d');
            context.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);
        }

        this._getHighlightThreadsOnPage(page).forEach((thread) => {
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
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     * @private
     */
    _removeRangyHighlight(highlight) {
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
