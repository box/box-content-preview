import autobind from 'autobind-decorator';

const FindStates = {
    FIND_FOUND: 0,
    FIND_NOTFOUND: 1,
    FIND_WRAPPED: 2,
    FIND_PENDING: 3
};
const matchSeparator = ' of ';
const matchOffset = 5;
const pixelSuffix = 'px';

@autobind
class PDFFindBar {
    /**
     * @constructor
     * @param {String|HTMLElement} container Container node
     * @param {Object} [options] Configuration options
     */
    constructor(container, options) {
        this.opened = false;
        this.bar = options.bar || null;
        this.findField = options.findField || null;
        this.findMsg = options.findMsg || null;
        this.findResultsCount = options.findResultsCount || null;
        this.findStatusIcon = options.findStatusIcon || null;
        this.findPreviousButton = options.findPreviousButton || null;
        this.findNextButton = options.findNextButton || null;
        this.findCloseButton = options.findCloseButton || null;
        this.findController = options.findController || null;
        this.currentMatch = 0;
        this.matchResultCount = 0;

        if (this.findController === null) {
            throw new Error('PDFFindBar cannot be used without a ' +
                          'PDFFindController instance.');
        }

        // Add event listeners to the DOM elements.
        const self = this;
        this.bar.classList.add('box-preview-is-invisible');

        self.findField.addEventListener('input', self.findFieldHandler);

        self.bar.addEventListener('keydown', this.barHandler);

        self.findPreviousButton.addEventListener('click', this.findPreviousHandler);
        self.findNextButton.addEventListener('click', this.findNextHandler);
        self.findCloseButton.addEventListener('click', this.close);
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
    }

    findFieldHandler() {
        this.dispatchEvent('find');
        this.currentMatch = 1;
    }

    barHandler(evt) {
        switch (evt.keyCode) {
            case 13: // Enter
                if (evt.shiftKey) {
                    this.findPreviousHandler();
                } else {
                    this.findNextHandler();
                }
                break;
            case 27: // Escape
                this.close();
                break;
            default:
                break;
        }
    }

    findPreviousHandler() {
        if (this.findField.value) {
            this.dispatchEvent('findagain', true);
            this.currentMatch = this.currentMatch - 1;

            if (this.currentMatch <= 0) {
                this.currentMatch = this.matchResultCount;
            }
        }
    }

    findNextHandler() {
        if (this.findField.value) {
            this.dispatchEvent('findagain', false);
            this.currentMatch = this.currentMatch + 1;

            if (this.currentMatch >= this.matchResultCount) {
                this.currentMatch = 1;
            }
        }
    }

    dispatchEvent(type, findPrev) {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(type, true, true, {
            query: this.findField.value,
            highlightAll: true, // true by default
            findPrevious: findPrev
        });

        return window.dispatchEvent(event);
    }

    updateUIState(state, previous, matchCount) {
        this.notFound = false;
        this.statusText = '';
        this.matchResultCount = matchCount;

        switch (state) {
            case FindStates.FIND_FOUND:
                break;

            case FindStates.FIND_PENDING:
                this.statusText = 'pending';
                break;

            case FindStates.FIND_NOTFOUND:
                this.notFound = true;
                break;
            default:
                break;
        }

        if (this.notFound) {
            this.findField.classList.add('notFound');
        } else {
            this.findField.classList.remove('notFound');
        }
        this.findField.setAttribute('data-status', this.statusText);

        this.updateResultsCount(matchCount);
    }

    updateResultsCount(matchCount) {
        if (!this.findResultsCount) {
            return; // no UI control is provided
        }

        // If there are no matches, hide the counter
        if (!matchCount) {
            this.findResultsCount.classList.add('box-preview-is-invisible');
            return;
        }

        this.findField.style.paddingRight = this.findResultsCount.getBoundingClientRect().width + matchOffset + pixelSuffix;

        // Create the match counter
        this.findResultsCount.textContent = this.currentMatch + matchSeparator + matchCount.toLocaleString();

        // Show the counter
        this.findResultsCount.classList.remove('box-preview-is-invisible');
    }

    open() {
        if (!this.opened) {
            this.opened = true;
            this.bar.classList.remove('box-preview-is-invisible');
        }
        this.findField.select();
        this.findField.focus();
    }

    close() {
        if (!this.opened) {
            return;
        }
        this.opened = false;
        this.bar.classList.add('box-preview-is-invisible');
        this.findController.active = false;
    }
}

export default PDFFindBar;
