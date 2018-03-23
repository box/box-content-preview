const {
    SELECTOR_BOX_PREVIEW,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_BOX_PREVIEW_NAV_VISIBLE,
    FILE_ID_VIDEO,
    FILE_ID_DOC
} = require('./constants');

const { BROWSER_PLATFORM } = process.env;

const isMobile = BROWSER_PLATFORM === 'iOS' || BROWSER_PLATFORM === 'Android';

/**
 * Makes the navigation arrows appear in preview
 * This currently doesnt work in firefox
 *
 * @param {Object} I - the codeceptjs I
 * @param {string} selector - the selector to use
 *
 * @return {void}
 */
function makeNavAppear(I, selector = SELECTOR_BOX_PREVIEW) {
    I.waitForElement(selector);

    /* eslint-disable prefer-arrow-callback, no-var */
    I.executeScript(
        function(sel, isMobileBrowser, navSelector) {
            var count = 0;
            var NUM_TIMES_TO_RUN = 5;
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
                if (isMobileBrowser) {
                    el.dispatchEvent(createNewEvent('click'));
                }

                count += 1;
                if (!document.querySelector(navSelector) && count < NUM_TIMES_TO_RUN) {
                    simulateEvents();
                }
            }

            simulateEvents();
        },
        selector,
        isMobile,
        SELECTOR_BOX_PREVIEW_NAV_VISIBLE
    );
}

exports.getIsFullscreen = function() {
    return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
};

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
exports.disableDash = (I) => {
    I.executeScript(function(videoId) {
        var fileOptions = {};
        window.preview.disableViewers('Dash');
        fileOptions[videoId] = {
            startAt: {
                value: 10,
                unit: 'seconds'
            }
        };

        window.showPreview(videoId, {
            container: '.preview-container',
            fileOptions: fileOptions // eslint-disable-line object-shorthand
        });
    }, FILE_ID_VIDEO);
};
exports.showPreview = (I, fileId = FILE_ID_DOC, options = {}) => {
    I.executeScript(
        function(previewFileId, previewOptions) {
            window.showPreview(previewFileId, previewOptions);
        },
        fileId,
        options
    );
};
/* eslint-enable prefer-arrow-callback, no-var */

exports.zoom = (I, selector) => {
    makeNavAppear(I);
    I.waitForVisible(selector);
    I.click(selector);
};

exports.waitForLoad = (I) => {
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.dontSee('didn\'t load');
};
