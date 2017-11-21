import EventEmitter from 'events';
import scrubberTemplate from './Scrubber.html';
import Browser from '../../Browser';

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const CLASS_SCRUBBER_HOVER = 'bp-media-scrubber-hover';
const CLASS_SCRUBBER_TOUCH = 'bp-media-scrubber-touch';

class Scrubber extends EventEmitter {
    /**
     * Service to handle the position and movement of a slider element
     *
     * [constructor]
     * @param {HTMLElement} containerEl - Container node
     * @param {string} ariaLabel - Accessibility text
     * @param {string} ariaValuemin - Minimum logical value of scrubber (for accessibility)
     * @param {string} ariaValuemax - Maximum logical value of scrubber (for accessibility)
     * @param {number} [value] - Optional initial value
     * @param {number} [bufferedValue] - Optional initial buffered value
     * @param {number} [convertedValue] - Optional initial converted value
     * @return {Scrubber} Scrubber instance
     */
    constructor(
        containerEl,
        ariaLabel,
        ariaValuemin,
        ariaValuemax,
        value = MIN_VALUE,
        bufferedValue = MAX_VALUE,
        convertedValue = MAX_VALUE
    ) {
        super();

        this.containerEl = containerEl;
        this.containerEl.setAttribute('role', 'slider');
        this.containerEl.setAttribute('aria-label', ariaLabel);
        this.containerEl.setAttribute('title', ariaLabel);
        this.containerEl.setAttribute('aria-valuemin', ariaValuemin);
        this.containerEl.setAttribute('aria-valuemax', ariaValuemax);
        this.containerEl.setAttribute('aria-valuenow', value);

        this.containerEl.innerHTML = scrubberTemplate.replace(/>\s*</g, '><'); // removing new lines

        // This container provides relative positioning. It also helps with adding hover states.
        this.scrubberContainerEl = this.containerEl.querySelector('.bp-media-scrubber-container');

        // This wrapper is absolute positioned 50% to the right.
        this.scrubberWrapperEl = this.containerEl.querySelector('.bp-media-scrubber-wrapper');

        // The scrubber is relative positioned 50% to the left. Since its relative parent is
        // positioned 50% right, it makes this element center aligned.
        this.scrubberEl = this.containerEl.querySelector('.bp-media-scrubber');
        // The actual bars
        this.bufferedEl = this.scrubberEl.querySelector('.bp-media-scrubber-buffered');
        this.convertedEl = this.scrubberEl.querySelector('.bp-media-scrubber-converted');
        this.playedEl = this.scrubberEl.querySelector('.bp-media-scrubber-played');
        this.handleEl = this.scrubberEl.querySelector('.bp-media-scrubber-handle');

        this.hasTouch = Browser.hasTouch();

        // Set the provided initial values
        this.setConvertedValue(convertedValue);
        this.setBufferedValue(bufferedValue);
        this.setValue(value);

        // Bind context for callbacks
        this.pointerUpHandler = this.pointerUpHandler.bind(this);
        this.scrubbingHandler = this.scrubbingHandler.bind(this);
        this.pointerDownHandler = this.pointerDownHandler.bind(this);

        this.playedEl.addEventListener('mousedown', this.pointerDownHandler);
        this.convertedEl.addEventListener('mousedown', this.pointerDownHandler);
        this.handleEl.addEventListener('mousedown', this.pointerDownHandler);

        if (this.hasTouch) {
            this.scrubberContainerEl.addEventListener('touchstart', this.pointerDownHandler);
            this.scrubberWrapperEl.classList.add(CLASS_SCRUBBER_TOUCH);
        }
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.removeAllListeners();
        this.destroyDocumentHandlers();
        this.playedEl.removeEventListener('mousedown', this.pointerDownHandler);
        this.convertedEl.removeEventListener('mousedown', this.pointerDownHandler);
        this.handleEl.removeEventListener('mousedown', this.pointerDownHandler);
        this.scrubberContainerEl.removeEventListener('touchstart', this.pointerDownHandler);

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
     * @param {number} offset - the the value to reduce the scrubber length by
     * @return {void}
     */
    resize(offset) {
        this.scrubberWrapperEl.style.width = `${this.containerEl.clientWidth - offset}px`;
    }

    /**
     * Set aria-valuenow and aria-valuetext attributes
     *
     * @param {number} ariaValuenow - value for aria 'aria-valuenow'
     * @param {string} ariaValuetext - value for aria 'aria-valuetext'
     * @return {void}
     */
    setAriaValues(ariaValuenow, ariaValuetext) {
        this.containerEl.setAttribute('aria-valuenow', ariaValuenow);
        this.containerEl.setAttribute('aria-valuetext', ariaValuetext);
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     *
     * @param {number} value - the the value to save
     * @return {void}
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
        this.handleEl.style.left = `${this.value * 100}%`;
    }

    /**
     * Sets the value of the scrubber buffered position and moves the HTML it to this new position
     *
     * @param {number} value - the the value to save
     * @return {void}
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
     * Sets the value of the scrubber converted position and moves the HTML it to this new position
     *
     * @param {number} value - the the value to save
     * @return {void}
     */
    setConvertedValue(value = MAX_VALUE) {
        if (value === this.convertedValue) {
            return;
        }

        // Set the new scrubber converted value. However this value should be
        //  no more than 1
        //  no less than 0
        //  no less than the last converted value
        this.convertedValue = Math.max(
            Math.min(Math.max(value, this.convertedValue || MIN_VALUE), MAX_VALUE),
            MIN_VALUE
        );
        this.convertedEl.style.width = `${this.convertedValue * 100}%`;
    }

    /**
     * Returns the relative X position of mouse on scrubber
     *
     * @param {number} pageX - Mouse X position
     * @return {number} A float between 0 and 1, for the relative position of pageX
     */
    computeScrubberPosition(pageX) {
        const rect = this.scrubberEl.getBoundingClientRect();
        const relPos = (pageX - rect.left) / rect.width;
        return Math.max(Math.min(relPos, MAX_VALUE), MIN_VALUE);
    }

    /**
     * Calculates the position of the scrubber handle based on mouse action
     *
     * @private
     * @param {Event} event - The mouse event that this handler is subscribed to
     * @return {void}
     */
    scrubbingHandler(event) {
        // Stops vertical scrolling when scrubbing
        event.preventDefault();

        let { pageX } = event;

        // Android Chrome fires both mousedown events and touchstart events. The touch start event
        // does not include pageX, but pageX can be found in the touches list which is present for
        // touch events across all browsers.
        if (event.touches) {
            /* eslint-disable prefer-destructuring */
            pageX = event.touches[0].pageX;
            /* eslint-enable prefer-destructuring */
        }

        const newValue = this.computeScrubberPosition(pageX);

        this.setValue(newValue);
        this.emit('valuechange');
    }

    /**
     * Sets the mouse move state to true and calls the mouse action handler
     * The prevents the default mouse down behavior and the event propagation
     * since the intention of the user is to drag the handle, and not to click on the page
     *
     * @private
     * @param {Event} event - the instance of the class
     * @return {void}
     */
    pointerDownHandler(event) {
        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
            this.scrubbingHandler(event);
            // All events are attached to the document so that the user doesn't have to keep the mouse
            // over the scrubber bar and has wiggle room. If the wiggling causes the mouse to leave
            // the whole view (embed use case) then we stop tracking all events.
            document.addEventListener('mouseup', this.pointerUpHandler);
            document.addEventListener('mouseleave', this.pointerUpHandler);
            document.addEventListener('mousemove', this.scrubbingHandler);

            if (this.hasTouch) {
                document.addEventListener('touchmove', this.scrubbingHandler);
                document.addEventListener('touchend', this.pointerUpHandler);
            } else {
                this.scrubberWrapperEl.classList.add(CLASS_SCRUBBER_HOVER);
            }

            event.preventDefault();
        }
    }

    /**
     * Sets the mouse move state to false thus stopping mouse action handling
     *
     * @private
     * @return {void}
     */
    pointerUpHandler() {
        this.scrubberWrapperEl.classList.remove(CLASS_SCRUBBER_HOVER);
        this.destroyDocumentHandlers();
    }

    /**
     * Cleanup method for the Class
     *
     * @return {void}
     */
    destroyDocumentHandlers() {
        document.removeEventListener('mousemove', this.scrubbingHandler);
        document.removeEventListener('mouseup', this.pointerUpHandler);
        document.removeEventListener('mouseleave', this.pointerUpHandler);

        if (this.hasTouch) {
            document.removeEventListener('touchmove', this.scrubbingHandler);
            document.removeEventListener('touchend', this.pointerUpHandler);
        }
    }

    /**
     * Getter for the value of the scrubber handle position
     *
     * @return {number} The scrubber handle position
     */
    getValue() {
        return this.value;
    }

    /**
     * Returns the dom element for the scrubber handle
     *
     * @return {HTMLElement} The dom element
     */
    getHandleEl() {
        return this.handleEl;
    }

    /**
     * Returns the dom element for the scrubber conversion bar
     *
     * @return {HTMLElement} The dom element
     */
    getConvertedEl() {
        return this.convertedEl;
    }
}

export default Scrubber;
