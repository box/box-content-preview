/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotation/annotator';
import Browser from '../browser';
import HighlightAnnotationThread from './highlight-annotation-thread';
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
const MOUSEMOVE_THROTTLE = 50;
const TOUCH_END = Browser.isMobile() ? 'touchend' : 'mouseup';

@autobind
class DocAnnotator extends Annotator {

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
        super._setupAnnotations();

        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(rangy.createClassApplier('highlight', {
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

        this.annotatedElement.addEventListener('click', this._highlightClickHandler);
        this.annotatedElement.addEventListener('mousemove', this._highlightMousemoveHandler());
        this.annotatedElement.addEventListener(TOUCH_END, this._showAddHighlightButtonHandler);

        // Hide annotation dialogs and buttons on right click
        this.annotatedElement.addEventListener('contextmenu', this._contextmenuHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        super._unbindDOMListeners();

        this.annotatedElement.removeEventListener('click', this._highlightClickHandler);
        this.annotatedElement.removeEventListener('mousemove', this._highlightMousemoveHandler());
        this.annotatedElement.removeEventListener(TOUCH_END, this._showAddHighlightButtonHandler);
        this.annotatedElement.removeEventListener('contextmenu', this._contextmenuHandler);
    }

    /**
     * Click handler on annotated element. Delegates to click handlers of
     * highlight threads over all pages since a click on one thread needs
     * to deactivate other threads, which are potentially on other pages.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _highlightClickHandler(event) {
        // Hide add highlight button if there is no current selection
        // If there is a current selection, short-circuit
        if (annotatorUtil.isSelectionPresent()) {
            return;
        }

        // Hide add highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);

        // Do nothing if the click was outside a page or a dialog is open
        const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
        if (page === -1 || annotatorUtil.isDialogOpen()) {
            return;
        }

        Object.keys(this.threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                thread.clickHandler(event);
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
     * Returns the highlight threads on the specified page.
     *
     * @param {Number} page Page to get highlight threads for
     * @returns {HighlightAnnotationThread[]} Highlight annotation threads
     * @private
     */
    _getHighlightThreadsOnPage(page) {
        const threads = this.threads[page] || [];
        return threads.filter((thread) => thread.annotations[0].type === HIGHLIGHT_ANNOTATION_TYPE);
    }

    /**
     * Handler to show the add highlight button. Shown when mouse is
     * released or touch is ended and there is a selection on screen.
     *
     * @returns {void}
     * @private
     */
    _showAddHighlightButtonHandler(event) {
        if (!annotatorUtil.isSelectionPresent() || annotatorUtil.isDialogOpen()) {
            return;
        }

        // Hide remove highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_REMOVE);

        // Use Rangy to save the current selection because using the
        // highlight module can mess with the selection. We restore this
        // selection after we clean up the highlight
        const savedSelection = rangy.saveSelection();

        const pageEl = annotatorUtil.getPageElAndPageNumber(event.target).pageEl;
        if (!pageEl) {
            return;
        }

        const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(this.highlighter);
        if (highlightEls.length === 0) {
            return;
        }

        let addHighlightButtonEl = this.annotatedElement.querySelector(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
        if (!addHighlightButtonEl) {
            addHighlightButtonEl = document.createElement('button');
            addHighlightButtonEl.classList.add(constants.CLASS_HIGHLIGHT_BUTTON_ADD);
            addHighlightButtonEl.innerHTML = ICON_HIGHLIGHT;
            addHighlightButtonEl.addEventListener('click', this._addHighlightHandler);
        }

        // Calculate where to position button
        const pageDimensions = pageEl.getBoundingClientRect();
        let buttonX;
        let buttonY;

        // If selection is reversed, button should be placed before the first line of selection
        if (annotatorUtil.isSelectionReversed(event, highlightEls)) {
            const firstHighlightEl = highlightEls[0];
            const dimensions = firstHighlightEl.getBoundingClientRect();
            buttonX = dimensions.left - pageDimensions.left - 20;
            buttonY = dimensions.top - pageDimensions.top - 50;

        // Otherwise, button should be placed after bottom line of selection
        } else {
            const lastHighlightEl = highlightEls[highlightEls.length - 1];
            const dimensions = lastHighlightEl.getBoundingClientRect();
            buttonX = dimensions.right - pageDimensions.left - 20;
            buttonY = dimensions.top - pageDimensions.top - 50;
        }

        // Position button
        addHighlightButtonEl.style.left = `${buttonX}px`;
        addHighlightButtonEl.style.top = `${buttonY}px`;
        annotatorUtil.showElement(addHighlightButtonEl);
        pageEl.appendChild(addHighlightButtonEl);

        // Clean up rangy highlight and restore selection
        this._removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);
    }

    /**
     * Event handler for adding a highlight annotation. Generates a highlight
     * out of the current window selection and saves it.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _addHighlightHandler(event) {
        event.stopPropagation();


        // Do nothing if there is no selection
        if (!annotatorUtil.isSelectionPresent()) {
            return;
        }

        const selection = window.getSelection();
        const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(selection.anchorNode.parentNode);
        if (!pageEl) {
            return;
        }

        const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(this.highlighter);
        if (highlightEls.length === 0) {
            return;
        }

        // Get quad points for each highlight element
        const quadPoints = [];
        highlightEls.forEach((element) => {
            quadPoints.push(annotatorUtil.getQuadPoints(element, pageEl, this.getScale()));
        });

        // Unselect text and remove rangy highlight
        selection.removeAllRanges();
        this._removeRangyHighlight(highlight);

        // Create annotation
        const thread = this._createAnnotationThread([], {
            page,
            quadPoints
        }, HIGHLIGHT_ANNOTATION_TYPE);

        // Bind events on thread
        this._bindCustomListenersOnThread(thread);

        // Hide add highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);
    }

    /**
     * Right click handler - hide add highlight button and reset highlights.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _contextmenuHandler() {
        // Hide add highlight button
        annotatorUtil.hideElement(constants.SELECTOR_HIGHLIGHT_BUTTON_ADD);

        // Reset highlights
        Object.keys(this.threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                thread.reset();
            });
        });
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
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${page}"]`);
        const annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        const context = annotationLayerEl.getContext('2d');
        context.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);

        this._getHighlightThreadsOnPage(page).forEach((thread) => {
            thread.show();
        });
        // console.log(`Drawing annotations for page ${page} took ${new Date().getTime() - time}ms`);
    }

    /**
     * Creates a new HighlightAnnotationThread.
     *
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {String} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
     * @private
     */
    _createAnnotationThread(annotations, location, type) {
        if (type === HIGHLIGHT_ANNOTATION_TYPE) {
            return new HighlightAnnotationThread({
                annotatedElement: this.annotatedElement,
                annotations,
                annotationService: this.annotationService,
                fileVersionID: this.fileVersionID,
                location,
                user: this.user
            });
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
