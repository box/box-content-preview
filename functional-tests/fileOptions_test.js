const { SELECTOR_BOX_PREVIEW_LOADED, SELECTOR_MEDIA_TIMESTAMP, SELECTOR_DOC_CURRENT_PAGE } = require('./constants');

const { navigateToNextItem, makeNavAppear } = require('./helpers');

const { CI } = process.env;
const DOC_START = '2';
const DASH_START = '0:15';
const MP3_START = '0:03';
const MP4_START = '0:10';

Feature('File Options', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/file-options.html');
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
});

Scenario('Check preview starts at correct spot for all file types @ci', (I) => {
    // document
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
    I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);
    navigateToNextItem(I);

    // video (dash)
    I.waitForElement('video');
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);
    navigateToNextItem(I);

    // mp3
    I.waitForElement('audio');
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(MP3_START, SELECTOR_MEDIA_TIMESTAMP);

    // video (mp4)
    I.executeScript(() => {
        window.disableDash();
    });
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
});
