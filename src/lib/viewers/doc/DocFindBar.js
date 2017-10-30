import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import { decodeKeydown } from '../../util';
import { CLASS_HIDDEN } from '../../constants';
import { ICON_FIND_DROP_DOWN, ICON_FIND_DROP_UP, ICON_CLOSE, ICON_SEARCH } from '../../icons/icons';

const MATCH_SEPARATOR = ' of ';
const MATCH_OFFSET = 13;
const CLASS_FIND_MATCH_NOT_FOUND = 'bp-find-match-not-found';

// Values match FindStates in PDFFindController
const FIND_MATCH_FOUND = 0;
const FIND_MATCH_NOT_FOUND = 1;
const FIND_MATCH_PENDING = 3;

@autobind
class DocFindBar extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {string|HTMLElement} findBar - Find bar selector or element
     * @param {Object} findController - Document find controller to use
     * @param {boolean} canDownload - Whether user can download document or not
     * @return {DocFindBar} DocFindBar instance
     */
    constructor(findBar, findController, canDownload) {
        super();

        this.opened = false;
        this.bar = findBar;
        this.findController = findController;
        this.currentMatch = 0;
        this.canDownload = canDownload;

        if (this.findController === null) {
            throw new Error('DocFindBar cannot be used without a PDFFindController instance.');
        }

        // overriding some find controller methods to update match count
        this.findController.updateUIState = this.updateUIState;
        this.findController.updateUIResultsCount = this.updateUIResultsCount;

        // Default hides find bar on load
        this.bar.classList.add(CLASS_HIDDEN);

        this.createFindField();
        this.createFindButtons();

        this.findPreviousButtonEl = this.bar.querySelector('.bp-doc-find-prev');
        this.findNextButtonEl = this.bar.querySelector('.bp-doc-find-next');
        this.findCloseButtonEl = this.bar.querySelector('.bp-doc-find-close');

        this.bindDOMListeners();
    }

    /**
     * Creates find input field, search icon and results count elements
     *
     * @return {void}
     */
    createFindField() {
        // Search Icon
        const findSearchButtonEL = document.createElement('span');
        findSearchButtonEL.classList.add('bp-doc-find-search');
        findSearchButtonEL.innerHTML = ICON_SEARCH.trim();
        this.bar.appendChild(findSearchButtonEL);

        // Find input field
        this.findFieldEl = document.createElement('input');
        this.findFieldEl.classList.add('bp-doc-find-field');
        this.bar.appendChild(this.findFieldEl);

        // Match Results Count
        this.findResultsCountEl = document.createElement('span');
        this.findResultsCountEl.classList.add('bp-doc-find-results-count');
        this.findResultsCountEl.classList.add(CLASS_HIDDEN);
        this.bar.appendChild(this.findResultsCountEl);
    }

    /**
     * Creates previous, next, and close buttons for find bar
     *
     * @return {void}
     */
    createFindButtons() {
        const findPreviousButton = `<button class="bp-doc-find-prev">${ICON_FIND_DROP_UP}</button>`.trim();
        const findNextButton = `<button class="bp-doc-find-next">${ICON_FIND_DROP_DOWN}</button>`.trim();
        const findCloseButton = `<button class="bp-doc-find-close">${ICON_CLOSE}</button>`.trim();

        this.findButtonContainerEl = document.createElement('span');
        this.findButtonContainerEl.classList.add('bp-doc-find-controls');
        this.findButtonContainerEl.innerHTML = findPreviousButton + findNextButton + findCloseButton;

        this.bar.appendChild(this.findButtonContainerEl);
    }

    /**
     * [destructor]
     *
     * @public
     * @return {void}
     */
    destroy() {
        this.currentMatch = 0;
        this.unbindDOMListeners();

        if (this.bar && this.bar.parentNode) {
            this.bar.parentNode.removeChild(this.bar);
        }
    }

    /**
     * Dispatch custom find event based specified type
     *
     * @param {string} type - Find event type
     * @param {boolean} findPrev - Whether or not to find previous occurrence
     * @return {void}
     */
    dispatchFindEvent(type, findPrev) {
        this.findController.executeCommand(type, {
            query: this.findFieldEl.value,
            phraseSearch: true, // true by default
            highlightAll: true, // true by default
            findPrevious: findPrev
        });
    }

    /**
     * Update Find Bar UI to current match state
     *
     * @param  {number} state FindState from PDFFindController
     * @return {void}
     */
    updateUIState(state) {
        this.status = '';

        switch (state) {
            case FIND_MATCH_NOT_FOUND:
                this.findFieldEl.classList.add(CLASS_FIND_MATCH_NOT_FOUND);
                break;

            case FIND_MATCH_PENDING:
                this.status = 'pending';
                break;

            case FIND_MATCH_FOUND:
                this.findFieldEl.classList.remove(CLASS_FIND_MATCH_NOT_FOUND);
                break;

            default:
                break;
        }

        this.findFieldEl.setAttribute('data-status', this.status);
        this.updateUIResultsCount();
    }

    /**
     * Update results count to current match count
     *
     * @return {void}
     */
    updateUIResultsCount() {
        if (!this.findResultsCountEl) {
            return; // no UI control is provided
        }

        // If there are no matches, hide the counter
        if (!this.findController.matchCount) {
            this.findResultsCountEl.classList.add(CLASS_HIDDEN);
            return;
        }

        // Adjust find field padding to not overflow over match results counter
        const paddingRight = this.findResultsCountEl.getBoundingClientRect().width + MATCH_OFFSET;
        this.findFieldEl.style.paddingRight = `${paddingRight}px`;

        // Create the match counter
        this.findResultsCountEl.textContent = this.currentMatch + MATCH_SEPARATOR + this.findController.matchCount;

        // Show the counter
        this.findResultsCountEl.classList.remove(CLASS_HIDDEN);
    }

    /**
     * Sets the findFieldEl value
     *
     * @param {string} phrase - Phrase to set the find field el value to
     * @return {void}
     */
    setFindFieldElValue(phrase) {
        this.findFieldEl.value = phrase;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    /**
     * Add event listeners to the DOM elements
     *
     * @private
     * @return {void}
     */
    bindDOMListeners() {
        this.bar.addEventListener('keydown', this.barKeyDownHandler);
        this.findFieldEl.addEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.addEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.addEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.addEventListener('click', this.close);

        // KeyDown handler to show/hide find bar
        document.addEventListener('keydown', this.displayFindBarHandler);
    }

    /**
     * Remove event listeners from the DOM elements
     *
     * @private
     * @return {void}
     */
    unbindDOMListeners() {
        this.bar.removeEventListener('keydown', this.barKeyDownHandler);
        this.findFieldEl.removeEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.removeEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.removeEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.removeEventListener('click', this.close);

        // Remove KeyDown handler to show/hide find bar
        document.removeEventListener('keydown', this.displayFindBarHandler);
    }

    //--------------------------------------------------------------------------
    // Event Handlers
    //--------------------------------------------------------------------------
    /**
     * Handler to show/hide find bar
     *
     * @private
     * @param {Event} event - Key event
     * @return {void}
     */
    displayFindBarHandler(event) {
        // Lowercase keydown so we capture both lower and uppercase
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'meta+f':
            case 'control+f':
            case 'meta+g':
            case 'control+g':
            case 'f3':
                if (this.canDownload) {
                    this.open();
                }
                event.preventDefault();
                break;
            default:
                break;
        }
    }

    /**
     * Handler to dispatch find event on input
     * @return {void}
     * @private
     */
    findFieldHandler() {
        this.dispatchFindEvent('find');
        this.currentMatch = 1;
    }

    /**
     * Handler for find keyboard short cuts
     *
     * @private
     * @param {Event} event - Key event
     * @return {void}
     */
    barKeyDownHandler(event) {
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'enter':
                this.findNextHandler(false);
                break;
            case 'shift+enter':
                this.findPreviousHandler(false);
                break;
            case 'escape':
            case 'esc':
                // Ignore if findbar is not open
                if (!this.opened) {
                    return;
                }

                this.close();
                event.stopPropagation();
                event.preventDefault();
                break;
            case 'shift++':
            case 'shift+_':
            case '[':
            case ']':
                event.stopPropagation();
                break;
            default:
                break;
        }
    }

    /**
     * Handler to find next match count and update match count accordingly
     *
     * @private
     * @param  {boolean} clicked False when triggered through keyboard shortcut
     * @return {void}
     */
    findNextHandler(clicked) {
        if (this.findFieldEl.value) {
            if (!clicked) {
                this.findNextButtonEl.focus();
            } else {
                this.dispatchFindEvent('findagain', false);
                this.currentMatch = this.currentMatch + 1;

                // Loops search to first match in document
                if (this.currentMatch > this.findController.matchCount) {
                    this.currentMatch = 1;
                }
            }
        }
    }

    /**
     * Handler to find previous match and update match count accordingly
     *
     * @private
     * @param  {boolean} clicked False when triggered through keyboard shortcut
     * @return {void}
     */
    findPreviousHandler(clicked) {
        if (this.findFieldEl.value) {
            if (!clicked) {
                this.findPreviousButtonEl.focus();
            } else {
                this.dispatchFindEvent('findagain', true);
                this.currentMatch = this.currentMatch - 1;

                // Loops search to last match in document
                if (this.currentMatch <= 0) {
                    this.currentMatch = this.findController.matchCount;
                }
            }
        }
    }

    /**
     * Unhide Find Bar
     *
     * @private
     * @return {void}
     */
    open() {
        // Repopulate and re-highlight find field with last search
        if (this.prevSearchQuery) {
            this.setFindFieldElValue(this.prevSearchQuery);
            this.findFieldHandler();
        }

        if (!this.opened) {
            this.opened = true;
            this.bar.classList.remove(CLASS_HIDDEN);
        }
        this.findFieldEl.select();
        this.findFieldEl.focus();
    }

    /**
     * Hide Find Bar
     *
     * @private
     * @return {void}
     */
    close() {
        // Save and clear current search to hide highlights
        this.prevSearchQuery = this.findFieldEl.value;
        this.setFindFieldElValue('');
        this.findFieldHandler();

        if (!this.opened) {
            return;
        }
        this.opened = false;
        this.bar.classList.add(CLASS_HIDDEN);
        this.findController.active = false;
    }
}

export default DocFindBar;
