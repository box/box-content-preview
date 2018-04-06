const {
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_MEDIA_DURATION,
    SELECTOR_BOX_PREVIEW_LOGO,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_MP3,
    SELECTOR_BOX_PREVIEW_DASH,
    SELECTOR_BOX_PREVIEW_MP4,
    SELECTOR_MEDIA_CONTROLS_GEAR,
    SELECTOR_MEDIA_CONTROLS_QUALITY_ITEM
} = require('./constants');

const { navigateToNextItem, makeNavAppear, waitForLoad } = require('./helpers');

const { CI } = process.env;
const DEFAULT_START = '0:00';
const VIDEO_DURATION = '3:52';
const VIDEO_WITH_SUBTITLES_TRACKS_DURATION = '0:46';
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

        // video (tracks and subtitles)
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_WITH_SUBTITLES_TRACKS_DURATION, SELECTOR_MEDIA_DURATION);
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

// Exclude IE as it can't handle media files with saucelabs
// Exclude iOS because it doesn't HD/subtitles/audiotracks etc.
Scenario(
    'Check that the media controls show the correct settings items @ci @chrome @firefox @edge @safari, @android',
    { retries: 3 },
    (I) => {
        // Video (dash)
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_QUALITY_ITEM);
        // Click on the quality item
        I.click(SELECTOR_MEDIA_CONTROLS_QUALITY_ITEM);
        // Find the 1080 text
        I.waitForText('1080p');
        // Click the 1080 text
        I.click('//div[@data-value="hd"]');
        // Check that the HD icon is there
        I.waitForVisible('.bp-media-controls-hd');

        navigateToNextItem(I);

        // Video with tracks
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        // Wait for the CC button to be visisble
        I.waitForVisible('.bp-media-controls-cc-icon-text');

        // Look for this class bp-media-settings-subtitles-on
        I.seeElement('.bp-media-settings-subtitles-on');

        // Click the CC button
        I.click('.bp-media-cc-icon');

        // Look for this class bp-media-settings-subtitles-on
        I.dontSeeElement('.bp-media-settings-subtitles-on');

        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Wait for audio tracks and for subtitles items to be visisble
        I.waitForVisible('//div[@data-type="subtitles"]');
        I.waitForVisible('//div[@data-type="audiotracks"]');

        navigateToNextItem(I);

        // mp3
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Look for autoplay and speed
        I.waitForVisible('//div[@data-type="autoplay"]');
        I.waitForVisible('//div[@data-type="speed"]');

        navigateToNextItem(I);

        // video (no HD)
        I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
        /* eslint-enable prefer-arrow-callback */
        waitForLoad(I);
        I.waitForElement('.bp-media-container');

        makeNavAppear(I, SELECTOR_VIDEO);
        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Look for autoplay and speed
        I.waitForVisible('//div[@data-type="autoplay"]');
        I.waitForVisible('//div[@data-type="speed"]');
        I.waitForNotVisible('.bp-media-settings-menu-quality');
    }
);
