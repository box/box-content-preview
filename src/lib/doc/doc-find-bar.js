import autobind from 'autobind-decorator';
import { decodeKeydown } from '../util.js';
import { CLASS_INVISIBLE } from '../constants';
import {
    ICON_FIND_DROP_DOWN,
    ICON_FIND_DROP_UP,
    ICON_CLOSE,
    ICON_SEARCH
} from '../icons/icons';

const FIND_MATCH_FOUND = 0;
const FIND_MATCH_NOT_FOUND = 1;
const MATCH_SEPARATOR = ' of ';
const MATCH_OFFSET = 13;
const CLASS_FIND_MATCH_NOT_FOUND = 'box-preview-find-match-not-found';

@autobind
class DocFindBar {

    /**
     * @constructor
     * @param  {string|HTML Element} findBar Find Bar node
     * @param  {Object} findController
     * @returns {void}
     */
    constructor(findBar, findController) {
        this.opened = false;
        this.bar = findBar;
        this.findController = findController;
        this.currentMatch = 0;
        this.matchResultCount = 0;

        if (this.findController === null) {
            throw new Error('DocFindBar cannot be used without a PDFFindController instance.');
        }

        // Default hides find bar on load
        this.bar.classList.add(CLASS_INVISIBLE);

        this.createFindField();
        this.createFindButtons();

        this.findPreviousButtonEl = this.bar.querySelector('.box-preview-doc-find-prev');
        this.findNextButtonEl = this.bar.querySelector('.box-preview-doc-find-next');
        this.findCloseButtonEl = this.bar.querySelector('.box-preview-doc-find-close');

        // KeyDown handler to show/hide find bar
        window.addEventListener('keydown', this.displayFindBarHandler);

        // Add event listeners to the DOM elements.
        this.bar.addEventListener('keydown', this.barKeyDownHandler);
        this.findFieldEl.addEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.addEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.addEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.addEventListener('click', this.close);
    }

    /**
     * Creates find input field, search icon and results count elements
     * @returns {void}
     */
    createFindField() {
        // Search Icon
        const findSearchButtonEL = document.createElement('span');
        findSearchButtonEL.classList.add('box-preview-doc-find-search');
        findSearchButtonEL.innerHTML = `${ICON_SEARCH}`.trim();
        this.bar.appendChild(findSearchButtonEL);

        // Find input field
        this.findFieldEl = document.createElement('input');
        this.findFieldEl.classList.add('box-preview-doc-find-field');
        this.bar.appendChild(this.findFieldEl);

        // Match Results Count
        this.findResultsCountEl = document.createElement('span');
        this.findResultsCountEl.classList.add('box-preview-doc-find-results-count');
        this.findResultsCountEl.classList.add(CLASS_INVISIBLE);
        this.bar.appendChild(this.findResultsCountEl);
    }

    /**
     * Creates previous, next, and close buttons for find bar
     * @returns {void}
     */
    createFindButtons() {
        const findPreviousButton = `<button class="box-preview-doc-find-prev">${ICON_FIND_DROP_DOWN}</button>`.trim();
        const findNextButton = `<button class="box-preview-doc-find-next">${ICON_FIND_DROP_UP}</button>`.trim();
        const findCloseButton = `<button class="box-preview-doc-find-close">${ICON_CLOSE}</button>`.trim();

        this.findButtonContainerEl = document.createElement('span');
        this.findButtonContainerEl.classList.add('box-preview-doc-find-controls');
        this.findButtonContainerEl.innerHTML = findPreviousButton + findNextButton + findCloseButton;

        this.bar.appendChild(this.findButtonContainerEl);
    }

    /**
     * Destructor
     *
     * @public
     * @returns {void}
     */
    destroy() {
        this.currentMatch = 0;
        this.matchResultCount = 0;

        // Remove KeyDown handler to show/hide find bar
        window.removeEventListener('keydown', this.displayFindBarHandler);

        // Remove DOM event listeners
        this.bar.removeEventListener('keydown', this.barKeyDownHandler);
        this.findFieldEl.removeEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.removeEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.removeEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.removeEventListener('click', this.close);

        // Clean up the find buttons
        this.findPreviousButtonEl.remove();
        this.findNextButtonEl.remove();
        this.findCloseButtonEl.remove();
        this.findButtonContainerEl.remove();

        // Clean up find bar and controller object
        this.findResultsCountEl.remove();
        this.findFieldEl.remove();
        this.bar.remove();
    }

    /**
     * Dispatch custom find event based specified type
     * @param  {string} type
     * @param  {Boolean} findPrev
     * @returns {Boolean} whether the default action of the event was not canceled
     */
    dispatchFindEvent(type, findPrev) {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(type, true, true, {
            query: this.findFieldEl.value,
            highlightAll: true, // true by default
            findPrevious: findPrev
        });

        return window.dispatchEvent(event);
    }

    /**
     * Update Find Bar UI to current match state
     * @param  {Number} state FindState from PDFFindController
     * @param  {Number} previous Previous FindState from PDFFindController
     * @param  {Number} matchCount
     * @returns {void}
     */
    updateUIState(state, previous, matchCount) {
        this.notFound = false;
        this.matchResultCount = matchCount;

        switch (state) {
            case FIND_MATCH_FOUND:
                break;

            case FIND_MATCH_NOT_FOUND:
                this.notFound = true;
                break;

            default:
                break;
        }

        if (this.notFound) {
            this.findFieldEl.classList.add(CLASS_FIND_MATCH_NOT_FOUND);
        } else {
            this.findFieldEl.classList.remove(CLASS_FIND_MATCH_NOT_FOUND);
        }

        this.updateResultsCount(matchCount);
    }

    /**
     * Update results count to current match count
     * @param  {Number} matchCount
     * @returns {void}
     */
    updateResultsCount(matchCount) {
        if (!this.findResultsCountEl) {
            return; // no UI control is provided
        }

        // If there are no matches, hide the counter
        if (!matchCount) {
            this.findResultsCountEl.classList.add(CLASS_INVISIBLE);
            return;
        }

        const paddingRight = this.findResultsCountEl.getBoundingClientRect().width + MATCH_OFFSET;
        this.findFieldEl.style.paddingRight = `${paddingRight}px`;

        // Create the match counter
        this.findResultsCountEl.textContent = this.currentMatch + MATCH_SEPARATOR + matchCount;

        // Show the counter
        this.findResultsCountEl.classList.remove(CLASS_INVISIBLE);
    }

    /* ----- Event Handlers ----- */
    /**
     * Handler to show/hide find bar
     * @param  {Event} event
     * @returns {void}
     */
    displayFindBarHandler(event) {
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'meta+f':
            case 'control+f':
            case 'meta+g':
            case 'control+g':
                this.open();
                event.preventDefault();
                return;

            default:
                return;
        }
    }

    /**
     * Handler to dispatch find event on input
     * @returns {void}
     */
    findFieldHandler() {
        this.dispatchFindEvent('find');
        this.currentMatch = 1;
    }

    /**
     * Handler for find keyboard short cuts
     * @param  {Event} event
     * @returns {void}
     */
    barKeyDownHandler(event) {
        const key = decodeKeydown(event);
        switch (key) {
            case 'Enter':
                this.findNextHandler();
                break;
            case 'Shift+Enter':
                this.findPreviousHandler();
                break;
            case 'Escape':
                this.close();
                break;
            default:
                break;
        }
    }

    /**
     * Handler to find previous match and update match count accordingly
     *
     * @returns {void}
     */
    findPreviousHandler() {
        if (this.findFieldEl.value) {
            this.findPreviousButtonEl.focus();
            this.dispatchFindEvent('findagain', true);
            this.currentMatch = this.currentMatch - 1;

            // Loops search to last match in document
            if (this.currentMatch <= 0) {
                this.currentMatch = this.matchResultCount;
            }
        }
    }

    /**
     * Handler to find next match count and update match count accordingly
     *
     * @returns {void}
     */
    findNextHandler() {
        if (this.findFieldEl.value) {
            this.findNextButtonEl.focus();
            this.dispatchFindEvent('findagain', false);
            this.currentMatch = this.currentMatch + 1;

            // Loops search to first match in document
            if (this.currentMatch >= this.matchResultCount) {
                this.currentMatch = 1;
            }
        }
    }

    /**
     * Unhide Find Bar
     * @returns {void}
     */
    open() {
        // Repopulate and re-highlight find field with last search
        if (this.prevSearchQuery) {
            this.findFieldEl.value = this.prevSearchQuery;
            this.findFieldHandler();
        }

        if (!this.opened) {
            this.opened = true;
            this.bar.classList.remove(CLASS_INVISIBLE);
        }
        this.findFieldEl.select();
        this.findFieldEl.focus();
    }

    /**
     * Hide Find Bar
     * @returns {void}
     */
    close() {
        if (!this.opened) {
            return;
        }
        this.opened = false;
        this.bar.classList.add(CLASS_INVISIBLE);
        this.findController.active = false;

        // Save and clear current search to hide highlights
        this.prevSearchQuery = this.findFieldEl.value;
        this.findFieldEl.value = '';
        this.findFieldHandler();
    }
}

export default DocFindBar;
