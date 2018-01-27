const {
    SELECTOR_NAVIGATION_LEFT,
    SELECTOR_NAVIGATION_RIGHT,
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_BOX_PREIVIEW_LOGO
} = require('./constants');

/**
 * Makes the navigation arrows appear in preview
 *
 * @param {Object} I the codeceptjs I
 *
 * @return {void}
 */
function makeNavAppear(I) {
    I.moveCursorTo(SELECTOR_BOX_PREIVIEW_LOGO); // move focus to make nav dissappear
    I.waitForInvisible(SELECTOR_NAVIGATION_LEFT);
    I.waitForInvisible(SELECTOR_NAVIGATION_RIGHT);
    I.moveCursorTo(SELECTOR_BOX_PREVIEW_LOADED, 50, 50); // move focus to make nav appear
}

exports.makeNavAppear = makeNavAppear;
exports.navigateToNextItem = (I) => {
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_NAVIGATION_RIGHT);
    I.click(SELECTOR_NAVIGATION_RIGHT);
};
