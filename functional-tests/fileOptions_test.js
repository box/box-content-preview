const {
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_DOC_CURRENT_PAGE,
    SELECTOR_BOX_PREIVIEW_LOGO,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_DOC,
    SELECTOR_BOX_PREVIEW_MP3,
    SELECTOR_BOX_PREVIEW_DASH,
    SELECTOR_BOX_PREVIEW_MP4
} = require('./constants');

const { navigateToNextItem, makeNavAppear, navigateToPrevItem } = require('./helpers');

const { CI } = process.env;
const DOC_START = '2';
const DASH_START = '0:15';
const MP3_START = '0:03';
const MP4_START = '0:10';
const SELECTOR_VIDEO = 'video';

Feature('File Options', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/file-options.html');
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.waitForElement(SELECTOR_BOX_PREIVIEW_LOGO);
    I.waitForElement(SELECTOR_BOX_PREVIEW_DOC);
});

// Excludes ie
Scenario(
    'Check preview starts at correct spot for all file types @ci @chrome @firefox @edge @safari @android @ios',
    (I) => {
        // document
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
        I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);
        navigateToNextItem(I);

        // video (dash)
        I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);
        navigateToNextItem(I);

        // mp3
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP3_START, SELECTOR_MEDIA_TIMESTAMP);

        // video (mp4)
        /* eslint-disable prefer-arrow-callback */
        I.executeScript(function() {
            window.disableDash();
        });
        I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
        /* eslint-enable prefer-arrow-callback */
        I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);

        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
    }
);

// Sacuelabs ie11 doesn't like audio files
Scenario('Check preview starts at correct spot for all file types @ci @ie', (I) => {
    // document
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
    I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);
    navigateToNextItem(I);

    // video (dash)
    I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
    makeNavAppear(I, SELECTOR_VIDEO);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);

    // mp3 is not supported :(
    navigateToPrevItem(I);
    // video (mp4)
    /* eslint-disable prefer-arrow-callback */
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);

    I.executeScript(function() {
        window.disableDash();
    });
    /* eslint-enable prefer-arrow-callback */

    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);

    makeNavAppear(I, SELECTOR_VIDEO);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
});
