const {
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_DOC_CURRENT_PAGE,
    SELECTOR_BOX_PREIVIEW_LOGO
} = require('./constants');

const { navigateToNextItem, makeNavAppear, navigateToPrevItem } = require('./helpers');

const { CI } = process.env;
const DOC_START = '2';
const DASH_START = '0:15';
const MP3_START = '0:03';
const MP4_START = '0:10';

Feature('File Options', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/file-options.html');
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.waitForElement(SELECTOR_BOX_PREIVIEW_LOGO);
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
        I.waitForElement('video');
        makeNavAppear(I, 'video');
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);
        navigateToNextItem(I);

        // mp3
        I.waitForElement('.bp-media-controls-container');
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP3_START, SELECTOR_MEDIA_TIMESTAMP);

        // video (mp4)
        I.executeScript(() => {
            window.disableDash();
        });
        I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);

        makeNavAppear(I, 'video');
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
    I.waitForElement('video');
    makeNavAppear(I, 'video');
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

    makeNavAppear(I, 'video');
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
});
