import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import scrubberTemplate from 'raw!./scrubber.html';

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const CLASS_SCRUBBER_HOVER = 'box-preview-media-scrubber-hover';

@autobind
class Scrubber extends EventEmitter {

    /**
     * Service to handle the position and movement of a slider element
     *
     * [constructor]
     * @param {HTMLElement} containerEl container node
     * @param {string} accessibilityText text
     * @param {number} [value] optional initial value
     * @param {number} [bufferedValue] optional initial buffered value
     * @param {number} [convertedValue] optional initial converted value
     * @returns {Scrubber} Scrubber instance
     */
    constructor(containerEl, accessibilityText, value = MIN_VALUE, bufferedValue = MAX_VALUE, convertedValue = MAX_VALUE) {
        super();

        this.containerEl = containerEl;

        this.containerEl.innerHTML = scrubberTemplate.replace('{{accessibilityText}}', accessibilityText).replace(/>\s*</g, '><'); // removing new lines

        // This container provides relative positioning. It also helps with adding hover states.
        this.scrubberContainerEl = this.containerEl.querySelector('.box-preview-media-scrubber-container');

        // This wrapper is absolute positioned 50% to the right.
        this.scrubberWrapperEl = this.containerEl.querySelector('.box-preview-media-scrubber-wrapper');

        // The scrubber is relative positioned 50% to the left. Since its relative parent is
        // positioned 50% right, it makes this element center aligned.
        this.scrubberEl = this.containerEl.querySelector('.box-preview-media-scrubber');
        this.scrubberEl.setAttribute('aria-label', accessibilityText);
        this.scrubberEl.setAttribute('title', accessibilityText);
        // The actual bars
        this.bufferedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-buffered');
        this.convertedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-converted');
        this.playedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-played');
        this.handleEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-handle');

        // Set the provided initial values
        this.setConvertedValue(convertedValue);
        this.setBufferedValue(bufferedValue);
        this.setValue(value);

        this.playedEl.addEventListener('mousedown', this.mouseDownHandler);
        this.convertedEl.addEventListener('mousedown', this.mouseDownHandler);
        this.handleEl.addEventListener('mousedown', this.mouseDownHandler);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        this.removeAllListeners();
        this.destroyDocumentHandlers();
        this.playedEl.removeEventListener('mousedown', this.mouseDownHandler);
        this.convertedEl.removeEventListener('mousedown', this.mouseDownHandler);
        this.handleEl.removeEventListener('mousedown', this.mouseDownHandler);
        this.scrubberContainerEl = undefined;
        this.scrubberWrapperEl = undefined;
        this.scrubberEl = undefined;
        this.bufferedEl = undefined;
        this.convertedEl = undefined;
        this.playedEl = undefined;
        this.handleEl = undefined;
        this.containerEl.innerHTML = '';
    }

    /**
     * Resizes the scrubber on demand by reducing the size from container
     *
     * @public
     * @param {number} offset the the value to reduce the scrubber length by
     * @returns {void}
     */
    resize(offset) {
        this.scrubberWrapperEl.style.width = `${this.containerEl.clientWidth - offset}px`;
        this.adjustScrubberHandle();
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     *
     * @public
     * @param {number} value the the value to save
     * @returns {void}
     */
    adjustScrubberHandle() {
        // When setting widths and lefts, take into account that the handle is round
        // and has its own width that needs to be accounted for.
        //
        // So the scrubber handle's left can go from
        // all the way to the left of scrubber and additionally width / 2 so
        // that the scrubber center aligns at position 0 for the bar.
        // to
        // all the way on the right minus its own width / 2.

        const handleWidth = 16; // 16px from the CSS
        const scrubberWidth = this.scrubberEl.clientWidth;
        const handlePosition = (((this.value * scrubberWidth) - (handleWidth / 2)) * 100) / scrubberWidth;

        this.handleEl.style.left = `${handlePosition}%`;
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     *
     * @public
     * @param {number} value the the value to save
     * @returns {void}
     */
    setValue(value = MIN_VALUE) {
        if (value === this.value) {
            return;
        }

        // Set the new scrubber value. However this value should be
        //  no less than 0
        //  no greater than the converted value
        this.value = Math.max(Math.min(value, this.convertedValue), MIN_VALUE);

        // The played values should ignore the handle width since we don't care about it.
        this.playedEl.style.width = `${this.value * 100}%`;
        this.adjustScrubberHandle();
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     *
     * @public
     * @param {number} value the the value to save
     * @returns {void}
     */
    setBufferedValue(value = MAX_VALUE) {
        if (value === this.bufferedValue) {
            return;
        }

        // Set the new scrubber buffered value. However this value should be
        //  no more than 1
        //  no less than actual value
        //  no more than converted value
        this.bufferedValue = Math.max(Math.min(value, this.convertedValue), this.value || MIN_VALUE);
        this.bufferedEl.style.width = `${this.bufferedValue * 100}%`;
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     *
     * @public
     * @param {number} value the the value to save
     * @returns {void}
     */
    setConvertedValue(value = MAX_VALUE) {
        if (value === this.convertedValue) {
            return;
        }

        // Set the new scrubber converted value. However this value should be
        //  no more than 1
        //  no less than 0
        //  no less than the last converted value
        this.convertedValue = Math.max(Math.min(Math.max(value, this.convertedValue || MIN_VALUE), MAX_VALUE), MIN_VALUE);
        this.convertedEl.style.width = `${this.convertedValue * 100}%`;
    }

    /**
     * Calculates the position of the scrubber handle based on mouse action
     *
     * @private
     * @param {Event} event the instance of the class
     * @returns {void}
     */
    scrubbingHandler(event) {
        const rect = this.scrubberEl.getBoundingClientRect();
        const pageX = event.pageX;
        let newValue = (pageX - rect.left) / rect.width;

        newValue = Math.max(Math.min(newValue, MAX_VALUE), MIN_VALUE);

        this.setValue(newValue);
        this.emit('valuechange', newValue);
    }

    /**
     * Sets the mouse move state to true and calls the mouse action handler
     * The prevents the default mouse down behavior and the event propagation
     * since the intension of the user is to drag the handle, and not to click on the page
     *
     * @private
     * @param {Scrubber} ctx the instance of the class
     * @returns {void}
     */
    mouseDownHandler(event) {
        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
            this.scrubbingHandler(event);
            // All events are attached to the document so that the user doesn't have to keep the mouse
            // over the scrubber bar and has wiggle room. If the wiggling causes the mouse to leave
            // the whole view (embed use case) then we stop tracking all events.
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mouseleave', this.mouseUpHandler);
            document.addEventListener('mousemove', this.scrubbingHandler);

            this.scrubberWrapperEl.classList.add(CLASS_SCRUBBER_HOVER);
            event.preventDefault();
        }
    }

    /**
     * Sets the mouse move state to false thus stopping mouse action handling
     *
     * @private
     * @returns {void}
     */
    mouseUpHandler() {
        this.scrubberWrapperEl.classList.remove(CLASS_SCRUBBER_HOVER);
        this.destroyDocumentHandlers();
    }

    /**
     * Cleanup method for the Class
     * @public
     * @returns {void}
     */
    destroyDocumentHandlers() {
        document.removeEventListener('mousemove', this.scrubbingHandler);
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mouseleave', this.mouseUpHandler);
    }

    /**
     * Getter for the value of the scrubber handle position
     * @public
     * @returns {number} The scrubber handle position
     */
    getValue() {
        return this.value;
    }

    /**
     * Returns the dom element for the scrubber handle
     *
     * @public
     * @returns {HTMLElement} The dom element
     */
    getHandleEl() {
        return this.handleEl;
    }

    /**
     * Returns the dom element for the scrubber conversion bar
     *
     * @public
     * @returns {HTMLElement} The dom element
     */
    getConvertedEl() {
        return this.convertedEl;
    }
}

export default Scrubber;
