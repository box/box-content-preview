/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotation/annotator';
import Browser from '../browser';
import HighlightThread from './highlight-thread';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';

import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/annotation-constants';
import { ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const HIGHLIGHT_STATE_PENDING = 'pending';
const MOUSEMOVE_THROTTLE = 50;
const IS_MOBILE = Browser.isMobile();
const MOUSEDOWN = IS_MOBILE ? 'touchstart' : 'mousedown';
const MOUSEUP = IS_MOBILE ? 'touchend' : 'mouseup';

@autobind
class DocAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Toggles highlight annotation mode on and off. When highlight mode is on,
     * every selection becomes a highlight.
     *
     * @returns {void}
     */
    toggleHighlightModeHandler() {
        // If in highlight mode, turn it off
        if (this.annotatedElement.classList.contains(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE)) {
            this.emit('highlightmodeexit');
            this.annotatedElement.classList.remove(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
            this._unbindHighlightModeListeners(); // Disable highlight mode
            this._bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable highlight mode
        } else {
            this.emit('highlightmodeenter');
            this.annotatedElement.classList.add(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
            this._unbindDOMListeners(); // Disable other annotations
            this._bindHighlightModeListeners(); // Enable highlight mode
        }
    }

    //--------------------------------------------------------------------------
    // Private functions
    //--------------------------------------------------------------------------

    /**
     * Sets up annotation controls - this is needed if there is no Preview
     * header, where the controls are normally. The doc annotator adds a
     * highlight mode.
     *
     * @returns {void}
     * @private
     */
    _setupControls() {
        super._setupControls();

        // No need to set up controls if Preview header exists
        if (document.querySelector('.box-preview-header')) {
            return;
        }

        // Add highlight mode button
        const annotationButtonContainerEl = this.annotatedElement.querySelector('.box-preview-annotation-controls');
        const highlightModeBtnEl = document.createElement('button');
        highlightModeBtnEl.classList.add('btn');
        highlightModeBtnEl.classList.add('box-preview-btn-highlight');
        highlightModeBtnEl.innerHTML = ICON_HIGHLIGHT;
        highlightModeBtnEl.addEventListener('click', this.toggleHighlightModeHandler);
        annotationButtonContainerEl.appendChild(highlightModeBtnEl);
    }

    /**
     * Annotations setup.
     *
     * @returns {void}
     * @private
     */
    _setupAnnotations() {
        super._setupAnnotations();

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('rangy-highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        super._bindDOMListeners();

        this.annotatedElement.addEventListener(MOUSEDOWN, this._highlightMousedownHandler);
        this.annotatedElement.addEventListener('contextmenu', this._highlightMousedownHandler);
        this.annotatedElement.addEventListener('mousemove', this._highlightMousemoveHandler());
        this.annotatedElement.addEventListener(MOUSEUP, this._highlightMouseupHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        super._unbindDOMListeners();

        this.annotatedElement.removeEventListener(MOUSEDOWN, this._highlightMousedownHandler);
        this.annotatedElement.removeEventListener('contextmenu', this._highlightMousedownHandler);
        this.annotatedElement.removeEventListener('mousemove', this._highlightMousemoveHandler());
        this.annotatedElement.removeEventListener(MOUSEUP, this._highlightMouseupHandler);
    }

    /**
     * Binds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindHighlightModeListeners() {
        this.annotatedElement.addEventListener(MOUSEUP, this._highlightMouseupHandler);
    }

    /**
     * Unbinds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindHighlightModeListeners() {
        this.annotatedElement.removeEventListener(MOUSEUP, this._highlightMouseupHandler);
    }

    /**
     * Mousedown handler on annotated element. Delegates to mousedown handlers
     * of highlight threads over all pages since a mousedown on one thread needs
     * to deactivate other threads, which are potentially on other pages.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _highlightMousedownHandler(event) {
        Object.keys(this.threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                thread.mousedownHandler(event);
            });
        });
    }

    /**
     * Throttled mousemove handler over annotated element. Delegates to
     * mousemove handler of highlight threads on the appropriate page.
     *
     * @returns {Function} mousemove handler
     * @private
     */
    _highlightMousemoveHandler() {
        if (!this.throttledHighlightMousemoveHandler) {
            this.throttledHighlightMousemoveHandler = throttle((event) => {
                const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
                if (page !== -1) {
                    this._getHighlightThreadsOnPage(page).forEach((thread) => {
                        thread.mousemoveHandler(event);
                    });
                }
            }, MOUSEMOVE_THROTTLE);
        }

        return this.throttledHighlightMousemoveHandler;
    }

    /**
     * Mouseup handler. Creates a highlight thread from the current selection.
     *
     * @param {Event} event DOM event
     * @returns {Function} mousemove handler
     * @private
     */
    _highlightMouseupHandler(event) {
        const selectionPresent = annotatorUtil.isSelectionPresent();
        const highlightsPending = this._getPendingHighlightThreads().length > 0;
        if (!selectionPresent || highlightsPending) {
            return;
        }

        let { pageEl, page } = annotatorUtil.getPageElAndPageNumber(event.target);
        if (page === -1) {
            // The ( .. ) around assignment is required syntax
            ({ pageEl, page } = annotatorUtil.getPageElAndPageNumber(window.getSelection().anchorNode));
        }

        // Use Rangy to save the current selection because using the
        // highlight module can mess with the selection. We restore this
        // selection after we clean up the highlight
        const savedSelection = rangy.saveSelection();
        const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(this.highlighter);
        if (highlightEls.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightEls.forEach((element) => {
            quadPoints.push(annotatorUtil.getQuadPoints(element, pageEl, annotatorUtil.getScale(this.annotatedElement)));
        });

        // Remove rangy highlight and restore selection
        this._removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);

        // Create and show pending annotation thread
        const thread = this._createAnnotationThread([], {
            page,
            quadPoints
        }, HIGHLIGHT_ANNOTATION_TYPE);

        // If in highlight mode, save highlight immediately
        const highlightMode = this.annotatedElement.classList.contains(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
        if (highlightMode) {
            // saveAnnotation() shows the annotation afterwards
            thread.saveAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '');
        } else {
            thread.show();
        }

        // Bind events on thread
        this._bindCustomListenersOnThread(thread);
    }

    /**
     * Returns the highlight threads on the specified page.
     *
     * @param {Number} page Page to get highlight threads for
     * @returns {HighlightThread[]} Highlight annotation threads
     * @private
     */
    _getHighlightThreadsOnPage(page) {
        const threads = this.threads[page] || [];
        return threads.filter((thread) => thread instanceof HighlightThread);
    }

    /**
     * Returns pending highlight threads.
     *
     * @param {Number} page Page to get highlight threads for
     * @returns {HighlightThread[]} Pending highlight threads.
     * @private
     */
    _getPendingHighlightThreads() {
        const pendingThreads = [];

        Object.keys(this.threads).forEach((page) => {
            [].push.apply(pendingThreads, this._getHighlightThreadsOnPage(page).filter((thread) => thread.getState() === HIGHLIGHT_STATE_PENDING));
        });

        return pendingThreads;
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnThread(thread) {
        super._bindCustomListenersOnThread(thread);

        // We need to redraw highlights on the page if a thread was deleted
        // since deleting 'cuts' out the highlight, which may have been
        // overlapping with another
        thread.addListener('threaddeleted', () => {
            this._showHighlightsOnPage(thread.location.page);
        });
    }

    /**
     * Shows highlight annotations for the specified page by re-drawing all
     * highlight annotations currently in memory for the specified page.
     *
     * @param {Number} page Page to draw annotations for
     * @returns {void}
     * @private
     */
    _showHighlightsOnPage(page) {
        // let time = new Date().getTime();

        // Clear context if needed
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
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
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {String} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
     * @private
     */
    _createAnnotationThread(annotations, location, type) {
        if (type === HIGHLIGHT_ANNOTATION_TYPE) {
            const highlightThread = new HighlightThread({
                annotatedElement: this.annotatedElement,
                annotations,
                annotationService: this.annotationService,
                fileVersionID: this.fileVersionID,
                location,
                user: this.user
            });
            this._addThreadToMap(highlightThread);
            return highlightThread;
        }

        return super._createAnnotationThread(annotations, location, type);
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
