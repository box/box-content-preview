import EventEmitter from 'events';
import { decodeKeydown } from '../../util';
import { USER_DOCUMENT_FIND_EVENTS, VIEWER_EVENT } from '../../events';
import { CLASS_BOX_PREVIEW_FIND_BAR, CLASS_HIDDEN } from '../../constants';
import { ICON_FIND_DROP_DOWN, ICON_FIND_DROP_UP, ICON_CLOSE, ICON_SEARCH } from '../../icons';

const MATCH_SEPARATOR = ' of ';
const MATCH_OFFSET = 13;
const CLASS_FIND_MATCH_NOT_FOUND = 'bp-find-match-not-found';

// Values match FindStates in PDFFindController
const FIND_MATCH_FOUND = 0;
const FIND_MATCH_NOT_FOUND = 1;
const FIND_MATCH_PENDING = 3;

class DocFindBar extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {Object} containerEl - Container element to which we append the find bar
     * @param {Object} findController - Document find controller to use
     * @param {Object} eventBus - Document event bus to use
     * @return {DocFindBar} DocFindBar instance
     */
    constructor(containerEl, findController, eventBus) {
        super();

        if (!containerEl) {
            throw new Error('DocFindBar cannot be used without a container element.');
        }

        if (!eventBus) {
            throw new Error('DocFindBar cannot be used without an EventBus instance.');
        }

        if (!findController) {
            throw new Error('DocFindBar cannot be used without a PDFFindController instance.');
        }

        this.eventBus = eventBus;
        this.findBarEl = containerEl.appendChild(document.createElement('div'));
        this.findBarEl.classList.add(CLASS_BOX_PREVIEW_FIND_BAR);
        this.findBarEl.classList.add(CLASS_HIDDEN); // Default hides find bar on load
        this.findBarEl.setAttribute('data-testid', 'document-findbar');
        this.findController = findController;
        this.opened = false;

        // Bind context for callbacks
        this.close = this.close.bind(this);
        this.findBarKeyDownHandler = this.findBarKeyDownHandler.bind(this);
        this.findFieldHandler = this.findFieldHandler.bind(this);
        this.findNextHandler = this.findNextHandler.bind(this);
        this.findPreviousHandler = this.findPreviousHandler.bind(this);
        this.onKeydown = this.onKeydown.bind(this);

        // attaching some listeners to update match count
        this.eventBus.on('updatefindcontrolstate', this.updateUIState.bind(this));
        this.eventBus.on('updatefindmatchescount', this.updateUIResultsCount.bind(this));

        this.createFindField();
        this.createFindButtons();

        this.findCloseButtonEl = this.findBarEl.querySelector('.bp-doc-find-close');
        this.findNextButtonEl = this.findBarEl.querySelector('.bp-doc-find-next');
        this.findPreviousButtonEl = this.findBarEl.querySelector('.bp-doc-find-prev');

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
        this.findBarEl.appendChild(findSearchButtonEL);

        // Find input field
        this.findFieldEl = document.createElement('input');
        this.findFieldEl.classList.add('bp-doc-find-field');
        this.findBarEl.appendChild(this.findFieldEl);

        // Match Results Count
        this.findResultsCountEl = document.createElement('span');
        this.findResultsCountEl.classList.add('bp-doc-find-results-count');
        this.findResultsCountEl.classList.add(CLASS_HIDDEN);
        this.findBarEl.appendChild(this.findResultsCountEl);
    }

    /**
     * Creates previous, next, and close buttons for find bar
     *
     * @return {void}
     */
    createFindButtons() {
        const findPreviousLabel = __('find_previous');
        const findPreviousButton = `<button class="bp-doc-find-prev" title="${findPreviousLabel}" type="button">${ICON_FIND_DROP_UP}</button>`.trim();

        const findNextLabel = __('find_next');
        const findNextButton = `<button class="bp-doc-find-next" title="${findNextLabel}" type="button">${ICON_FIND_DROP_DOWN}</button>`.trim();

        const findCloseLabel = __('find_close');
        const findCloseButton = `<button class="bp-doc-find-close" title="${findCloseLabel}" type="button">${ICON_CLOSE}</button>`.trim();

        this.findButtonContainerEl = document.createElement('span');
        this.findButtonContainerEl.classList.add('bp-doc-find-controls');
        this.findButtonContainerEl.innerHTML = findPreviousButton + findNextButton + findCloseButton;

        this.findBarEl.appendChild(this.findButtonContainerEl);
    }

    /**
     * [destructor]
     *
     * @public
     * @return {void}
     */
    destroy() {
        this.removeAllListeners();
        this.unbindDOMListeners();

        if (this.findBarEl && this.findBarEl.parentNode) {
            this.findBarEl.parentNode.removeChild(this.findBarEl);
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
            findPrevious: findPrev,
        });
    }

    /**
     * Update Find Bar UI to current match state
     *
     * @param {number} matchesCount - total number of matches from find controller
     * @param {number} state - Find state from find controller
     * @return {void}
     */
    updateUIState({ matchesCount, state }) {
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
        this.updateUIResultsCount({ matchesCount });
    }

    /**
     * Update results count to current match count
     *
     * @param {Object} matchesCount - matches from find controller
     * @param {number} matchesCount.current - current match index
     * @param {number} matchesCount.total - current total number of matches
     * @return {void}
     */
    updateUIResultsCount({ matchesCount }) {
        if (!this.findResultsCountEl) {
            return; // no UI control is provided
        }

        // If there are no matches, hide the counter
        if (!matchesCount || !matchesCount.total) {
            this.findResultsCountEl.classList.add(CLASS_HIDDEN);
            return;
        }

        // Adjust find field padding to not overflow over match results counter
        const paddingRight = this.findResultsCountEl.getBoundingClientRect().width + MATCH_OFFSET;
        this.findFieldEl.style.paddingRight = `${paddingRight}px`;

        // Create the match counter
        this.findResultsCountEl.textContent = `${matchesCount.current} ${MATCH_SEPARATOR} ${matchesCount.total}`;

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
        this.findBarEl.addEventListener('keydown', this.findBarKeyDownHandler);
        this.findFieldEl.addEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.addEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.addEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.addEventListener('click', this.close);
    }

    /**
     * Remove event listeners from the DOM elements
     *
     * @private
     * @return {void}
     */
    unbindDOMListeners() {
        this.findBarEl.removeEventListener('keydown', this.findBarKeyDownHandler);
        this.findFieldEl.removeEventListener('input', this.findFieldHandler);
        this.findPreviousButtonEl.removeEventListener('click', this.findPreviousHandler);
        this.findNextButtonEl.removeEventListener('click', this.findNextHandler);
        this.findCloseButtonEl.removeEventListener('click', this.close);
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
    onKeydown(event) {
        // Lowercase keydown so we capture both lower and uppercase
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'meta+f':
            case 'control+f':
            case 'meta+g':
            case 'control+g':
            case 'f3':
                this.open();
                event.preventDefault();
                break;
            default:
                return false;
        }

        return true;
    }

    /**
     * Handler to dispatch find event on input
     * @return {void}
     * @private
     */
    findFieldHandler() {
        this.dispatchFindEvent('find');
    }

    /**
     * Handler for find keyboard short cuts
     *
     * @private
     * @param {Event} event - Key event
     * @return {void}
     */
    findBarKeyDownHandler(event) {
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
            }

            // Emit a metric that the user navigated forward in the find bar
            this.emit(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.NEXT,
            });
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
            }

            // Emit a metric that the user navigated back in the find bar
            this.emit(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.PREVIOUS,
            });
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
            this.findBarEl.classList.remove(CLASS_HIDDEN);
            // Emit a metric that the user opened the find bar
            this.emit(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.OPEN,
            });
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
        this.emit('close');
        this.opened = false;
        this.findBarEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Toggles the Find Bar open and closed
     *
     * @return {void}
     */
    toggle() {
        if (this.opened) {
            this.close();
        } else {
            this.open();
        }
    }
}

export default DocFindBar;
