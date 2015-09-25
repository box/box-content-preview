'use strict';

import '../../css/scrubber.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const TEMPLATE = '<div class="box-preview-media-scrubber-wrapper">' +
                    '<div class="box-preview-media-scrubber">' +
                        '<div class="box-preview-media-scrubber-underlay"></div>' +
                        '<div class="box-preview-media-scrubber-played"></div>' +
                        '<div class="box-preview-media-scrubber-buffered"></div>' +
                        '<div class="box-preview-media-scrubber-converted"></div>' +
                        '<div class="box-preview-media-scrubber-handle">' +
                            '<span class="accessibility-hidden">{{accessibilityText}}</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';

let document = global.document;

@autobind
class Scrubber extends EventEmitter {

    /**
     * Service to handle the position and movement of a slider element
     * 
     * @constructor
     * @param {HTMLElement} containerEl
     * @param {string} accessibilityText
     * @param {number} value initial value
     * @param {number} bufferedValue initial buffered value
     * @param {number} convertedValue initial converted value
     * @returns {Scrubber}
     */
    constructor(containerEl, accessibilityText, value, bufferedValue, convertedValue) {

        super();

        // Get the container dom element if selector was passed
        if (typeof containerEl === 'string') {
            containerEl = document.querySelector(containerEl);
        }
        this.containerEl = containerEl;
        
        this.value = value || MIN_VALUE;
        this.convertedValue = typeof convertedValue === 'number' ? convertedValue : MAX_VALUE;
        this.bufferedValue = typeof bufferedValue === 'number' ? bufferedValue : convertedValue;
        this.mouseDownOnScrubber = false;

        this.containerEl.innerHTML = TEMPLATE.replace('{{accessibilityText}}', accessibilityText);
        this.scrubberEl = this.containerEl.querySelector('.box-preview-media-scrubber');
        this.bufferedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-buffered');
        this.convertedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-converted');
        this.playedEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-played');
        this.handleEl = this.scrubberEl.querySelector('.box-preview-media-scrubber-handle');

        // Set the initial values
        this.setScrubberConvertedValue(this.convertedValue);
        this.setScrubberBufferedValue(this.bufferedValue);
        this.setScrubberValue(this.value);

        this.convertedEl.addEventListener('mousedown', this.mouseDownHandler);
        // On old browsers with no css pointer events we need to attach same handler to the scrubber handle
        this.handleEl.addEventListener('mousedown', this.mouseDownHandler);
    }

    /**
     * Checks if the mouse position is inside the range of the scrubber
     * 
     * @private
     * @param {object} rect The bounding client rectangle of the scrubber
     * @param {number} pageX position of the mouse on the window
     * @returns {boolean} is the mouse is within the horizontal range
     */
    mousePositionWithinScrubberRange(rect, pageX) {
        return pageX >= rect.left && pageX <= rect.right;
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     * 
     * @private
     * @param {number} value the the value to save
     * @returns {void}
     */
    setScrubberValue(value) {
        // Set the new scrubber value. However this value should be
        //  no less than 0
        //  no greater than the converted value
        this.value = Math.max(Math.min(value, this.convertedValue), MIN_VALUE);

        // When setting widths and lefts, take into account that the handle is round
        // and has its own width that needs to be accounted for.
        // 
        // So the scrubber handle's left can go from
        // all the way to the left of scrubber and additionally width / 2 so
        // that the scrubber center aligns at position 0 for the bar.
        // to
        // all the way on the right minus its own width / 2.
        // 
        // The played values should ignore the handle width since we don't care about it.        
        
        let handleWidth = 16; // 16px from the CSS
        let scrubberWidth = this.scrubberEl.getBoundingClientRect().width
        let handlePosition = ((this.value * scrubberWidth) - (handleWidth / 2)) * 100 / scrubberWidth;

        this.handleEl.style.left = handlePosition + '%';
        this.playedEl.style.width = this.value * 100 + '%';
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     * 
     * @private
     * @param {number} value the the value to save
     * @returns {void}
     */
    setScrubberBufferedValue(value) {
        // Set the new scrubber buffered value. However this value should be
        //  no more than 1
        //  no less than 0
        //  no less than the last buffered value
        this.bufferedValue = Math.max(Math.min(Math.max(value, this.bufferedValue), this.convertedValue), MIN_VALUE);
        this.bufferedEl.style.width = this.bufferedValue * 100 + '%';
    }

    /**
     * Sets the value of the scrubber handle position and moves the HTML it to this new position
     * 
     * @private
     * @param {number} value the the value to save
     * @returns {void}
     */
    setScrubberConvertedValue(value) {
        // Set the new scrubber converted value. However this value should be
        //  no more than 1
        //  no less than 0
        //  no less than the last converted value
        this.convertedValue = Math.max(Math.min(Math.max(value, this.convertedValue), MAX_VALUE), MIN_VALUE);
        this.convertedEl.style.width = this.convertedValue * 100 + '%';
    }

    /**
     * Calculates the position of the scrubber handle based on mouse action
     * 
     * @private
     * @param {Event} event the instance of the class
     * @returns {void}
     */
    scrubbingHandler(event) {
        var rect = this.scrubberEl.getBoundingClientRect(),
            pageX = event.pageX;

        if (this.mouseDownOnScrubber && this.mousePositionWithinScrubberRange(rect, pageX)) {
            this.setScrubberValue((pageX - rect.left) / rect.width);
            this.emit('slide');
        }
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
            this.mouseDownOnScrubber = true;
            this.scrubbingHandler(event);
            // All events are attached to the document so that the user doesn't have to keep the mouse
            // over the scrubber bar and has wiggle room. If the wiggling causes the mouse to leave
            // the whole view (embed use case) then we stop tracking all events.
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mouseleave', this.mouseUpHandler);
            document.addEventListener('mousemove', this.scrubbingHandler);
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
        this.mouseDownOnScrubber = false;
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mouseleave', this.mouseUpHandler);
        document.removeEventListener('mousemove', this.scrubbingHandler);
    }

    /**
     * Cleanup method for the Class
     * @public
     * @returns {void}
     */
    destroy() {
        document.removeEventListener('mousemove', this.scrubbingHandler);
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mouseleave', this.mouseUpHandler);
        
        this.convertedEl.removeEventListener('mousedown', this.mouseDownHandler);
        this.handleEl.removeEventListener('mousedown', this.mouseDownHandler);
        
        this.containerEl.innerHTML = '';
        this.convertedEl = undefined;
        this.bufferedEl = undefined;
        this.playedEl = undefined;
        this.handleEl = undefined;
        this.scrubberEl = undefined;
        this.containerEl = undefined;
    }

    /**
     * Sets the value of the scrubber handle position
     *
     * @public
     * @param {number} value the scrubber handle position
     * @returns {void}
     */
    setValue(value) {
        this.setScrubberValue(this, value);
        this.emit('value-set');
    }

    /**
     * Sets the buffered value for the buffer bar
     *
     * @public
     * @param {number} value the scrubber handle position
     * @returns {void}
     */
    setBufferedValue(value) {
        this.setScrubberBufferedValue(this, value);
        this.emit('buffered-value-set');
    }

    /**
     * Sets the converted value for the buffer bar
     *
     * @public
     * @param {number} value the scrubber handle position
     * @returns {void}
     */
    setConvertedValue(value) {
        this.setScrubberConvertedValue(this, value);
        this.emit('scrubber-value-set');
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
    getScrubberHandleEl() {
        return this.handleEl;
    }

    /**
     * Returns the dom element for the scrubber conversion bar
     * 
     * @public
     * @returns {HTMLElement} The dom element
     */
    getConvertedBarEl() {
        return this.convertedEl;
    }
}

global.Scrubber = Scrubber;
export default Scrubber;
