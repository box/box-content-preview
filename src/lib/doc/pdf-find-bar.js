import autobind from 'autobind-decorator';

const FindStates = {
    FIND_FOUND: 0,
    FIND_NOTFOUND: 1,
    FIND_WRAPPED: 2,
    FIND_PENDING: 3
};

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
        this.findController = options.findController || null;

        if (this.findController === null) {
            throw new Error('PDFFindBar cannot be used without a ' +
                          'PDFFindController instance.');
        }

        // Add event listeners to the DOM elements.
        const self = this;
        this.bar.classList.add('box-preview-is-invisible');
        self.findField.addEventListener('input', self.findFieldHandler);

        self.bar.addEventListener('keydown', this.barHandler);
    }

    /**
     * Destructor
     *
     * @public
     * @returns {void}
     */
    destroy() {
    }

    findFieldHandler() {
        this.dispatchEvent('find');
        this.dispatchEvent('highlightallchange');
    }

    barHandler(evt) {
        switch (evt.keyCode) {
            case 13: // Enter
                this.dispatchEvent('findagain', evt.shiftKey);
                break;
            case 27: // Escape
                this.close();
                break;
            default:
                break;
        }
    }

    dispatchEvent(type, findPrev) {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(type, true, true, {
            query: this.findField.value,
            // todo(@spramod) messes up on angled/curved text
            // works on pdf.js so its something w/ us
            highlightAll: false,
            findPrevious: findPrev
        });

        return window.dispatchEvent(event);
    }

    updateUIState(state, previous, matchCount) {
        this.notFound = false;
        this.statusText = '';

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

        // Create the match counter
        this.findResultsCount.textContent = matchCount.toLocaleString();

        // // Show the counter
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
