const {
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_MEDIA_DURATION,
    SELECTOR_BOX_PREVIEW_LOGO,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_MP3,
    SELECTOR_BOX_PREVIEW_DASH,
    SELECTOR_BOX_PREVIEW_MP4
} = require('./constants');

const { navigateToNextItem, makeNavAppear, waitForLoad } = require('./helpers');

const { CI } = process.env;
const DEFAULT_START = '0:00';
const VIDEO_DURATION = '3:52';
const AUDIO_DURATION = '7:47';
const SELECTOR_VIDEO = 'video';

Feature('Media Controls', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/media-controls.html');
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOGO);
    waitForLoad(I);
    I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
});

// Exclude IE as it can't handle media files with saucelabs
Scenario(
    'Check that the media controls show the correct time current/total times @ci @chrome @firefox @edge @safari @android @ios',
    { retries: 3 },
    (I) => {
        // video (dash)
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_DURATION, SELECTOR_MEDIA_DURATION);
        navigateToNextItem(I);

        // mp3
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(AUDIO_DURATION, SELECTOR_MEDIA_DURATION);

        // video (mp4)
        /* eslint-disable prefer-arrow-callback */
        I.executeScript(function() {
            window.disableDash();
        });
        I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
        /* eslint-enable prefer-arrow-callback */
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);

        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_DURATION, SELECTOR_MEDIA_DURATION);
    }
);
