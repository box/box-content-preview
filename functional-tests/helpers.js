const { SELECTOR_BOX_PREVIEW, CLASS_BOX_PREVIEW_LOADING_WRAPPER } = require('./constants');

/**
 * Makes the navigation arrows appear in preview
 * This currently doesnt work in firefox
 *
 * @param {Object} I the codeceptjs I
 *
 * @return {void}
 */
function makeNavAppear(I, selector = SELECTOR_BOX_PREVIEW) {
    I.waitForElement(selector);

    /* eslint-disable prefer-arrow-callback, no-var */
    I.executeScript(function(sel) {
        var count = 0;
        var el = document.querySelector(sel);

        /**
         * Simulates click and mousemove events for mobile & desktop browsers for
         * controls to appear
         *
         * @return {void}
         */
        function simulateEvents() {
            /**
             * Cross browswer event creation
             * @param {string} eventName the event name
             * @return {Event} the event
             */
            function createNewEvent(eventName) {
                var event;
                if (typeof Event === 'function') {
                    event = new Event(eventName, { bubbles: true });
                } else {
                    event = document.createEvent('Event');
                    event.initEvent(eventName, true, true);
                }

                return event;
            }

            el.dispatchEvent(createNewEvent('mousemove'));
            el.dispatchEvent(createNewEvent('click'));

            count += 1;
            if (count < 5) {
                simulateEvents();
            }
        }

        setTimeout(simulateEvents, 500);
        simulateEvents();
    }, selector);
}

exports.makeNavAppear = makeNavAppear;
exports.navigateToNextItem = (I) => {
    I.executeScript(function() {
        window.preview.navigateRight();
    });
    I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
};
exports.navigateToPrevItem = (I) => {
    I.executeScript(function() {
        window.preview.navigateLeft();
    });
    I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
};
/* eslint-enable prefer-arrow-callback, no-var */
