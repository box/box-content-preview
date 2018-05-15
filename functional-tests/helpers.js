const {
    SELECTOR_BOX_PREVIEW,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_BOX_PREVIEW_NAV_VISIBLE,
    FILE_ID_DOC,
    CLASS_CONTAINER,
    CLASS_CONTROLS_WRAPPER,
    CLASS_CONTROLS_CONTAINER
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

/**
 * Waits for the loaded class to be applied
 *
 * @param {Object} I - the codeceptjs I
 *
 * @return {void}
 */
function waitForLoad(I) {
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.dontSee('didn\'t load');
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
exports.waitForLoad = waitForLoad;

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
    I.executeScript(function() {
        window.preview.disableViewers('Dash');
    });
};
exports.showPreview = (I, fileId = FILE_ID_DOC, options = {}) => {
    const { ACCESS_TOKEN } = process.env;
    I.executeScript(
        function(previewFileId, accessToken, previewOptions) {
            window.showPreview(previewFileId, accessToken, previewOptions);
        },
        fileId,
        ACCESS_TOKEN,
        options
    );

    waitForLoad(I);
};
exports.showMediaControls = (I) => {
    I.executeScript(function(containerClass) {
        var container = document.querySelector(containerClass);
        container.classList.add('bp-media-controls-is-visible');
    }, CLASS_CONTAINER);
    I.waitForVisible(CLASS_CONTROLS_CONTAINER);
};
/**
 * Shows the document controls
 * @param {Object} I - the codeceptjs I
 *
 * @return {void}
 */
function showDocumentControls(I) {
    I.executeScript(function(containerClass) {
        var container = document.querySelector(containerClass);
        container.classList.add('box-show-preview-controls');
    }, CLASS_CONTAINER);
    I.waitForVisible(CLASS_CONTROLS_WRAPPER);
}
exports.showDocumentControls = showDocumentControls;
/* eslint-enable prefer-arrow-callback, no-var */

exports.zoom = (I, selector) => {
    showDocumentControls(I);
    I.waitForVisible(selector);
    I.click(selector);
};
