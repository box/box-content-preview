const {
    FILE_ID_MP3,
    FILE_ID_VIDEO,
    FILE_ID_VIDEO_SMALL,
    FILE_ID_VIDEO_SUBTITLES_TRACKS,
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_MEDIA_DURATION,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_MP3,
    SELECTOR_BOX_PREVIEW_DASH,
    SELECTOR_BOX_PREVIEW_MP4,
    SELECTOR_MEDIA_CONTAINER,
    SELECTOR_MEDIA_CONTROLS_GEAR,
    SELECTOR_MEDIA_SETTINGS_QUALITY_ITEM,
    SELECTOR_MEDIA_SETTINGS_MENU_QUALITY,
    SELECTOR_MEDIA_SETTINGS_LABEL,
    SELECTOR_MEDIA_CONTROLS_HD,
    SELECTOR_HD_SETTINGS_VALUE,
    SELECTOR_MEDIA_CONTROLS_CC_ICON,
    SELECTOR_MEDIA_SETTINGS_SUBTITLES_ON,
    SELECTOR_MEDIA_SETTINGS_SUBTITLES_ITEM,
    SELECTOR_MEDIA_SETTINGS_AUDIOTRACKS_ITEM,
    SELECTOR_MEDIA_SETTINGS_AUTOPLAY_ITEM,
    SELECTOR_MEDIA_SETTINGS_SPEED_ITEM,
    TEXT_1080P
} = require('./constants');

const { showPreview, showMediaControls, disableDash } = require('./helpers');

const { CI } = process.env;
const DEFAULT_START = '0:00';
const VIDEO_DURATION = '3:52';
const VIDEO_WITH_SUBTITLES_TRACKS_DURATION = '0:46';
const AUDIO_DURATION = '7:47';
const SELECTOR_VIDEO = 'video';

Feature('Media Controls', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

// Exclude IE as it can't handle media files with saucelabs
Scenario(
    'Check that the media controls show the correct time current/total times @ci @chrome @firefox @edge @safari @android @ios',
    { retries: 3 },
    (I) => {
        // Video (DASH)
        showPreview(I, FILE_ID_VIDEO);

        showMediaControls(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_DURATION, SELECTOR_MEDIA_DURATION);

        // Video (tracks and subtitles)
        showPreview(I, FILE_ID_VIDEO_SUBTITLES_TRACKS);

        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        showMediaControls(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_WITH_SUBTITLES_TRACKS_DURATION, SELECTOR_MEDIA_DURATION);

        // MP3
        showPreview(I, FILE_ID_MP3);

        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        showMediaControls(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(AUDIO_DURATION, SELECTOR_MEDIA_DURATION);

        // Video (MP4)
        disableDash(I);
        showPreview(I, FILE_ID_VIDEO);

        I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);
        showMediaControls(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DEFAULT_START, SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_DURATION, SELECTOR_MEDIA_DURATION);
    }
);

// Exclude IE as it can't handle media files with saucelabs
// Exclude iOS because it doesn't HD/subtitles/audiotracks etc.
Scenario(
    'Check that the media controls show the correct settings items @ci @chrome @firefox @edge @safari',
    { retries: 3 },
    (I) => {
        // Video (DASH)
        showPreview(I, FILE_ID_VIDEO);

        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        showMediaControls(I, SELECTOR_VIDEO);

        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_QUALITY_ITEM);
        // Click on the quality item
        I.click(`${SELECTOR_MEDIA_SETTINGS_QUALITY_ITEM} ${SELECTOR_MEDIA_SETTINGS_LABEL}`);
        // Find the 1080 text
        I.waitForText(TEXT_1080P);
        // Click the 1080 text
        I.click(SELECTOR_HD_SETTINGS_VALUE);
        // Check that the HD icon is there
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_HD);

        // Video with tracks
        showPreview(I, FILE_ID_VIDEO_SUBTITLES_TRACKS);

        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        showMediaControls(I, SELECTOR_VIDEO);
        // Wait for the CC button to be visisble
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_CC_ICON);
        // Look for this class bp-media-settings-subtitles-on
        I.seeElement(SELECTOR_MEDIA_SETTINGS_SUBTITLES_ON);
        // Click the CC button
        I.click(SELECTOR_MEDIA_CONTROLS_CC_ICON);
        // Look for this class bp-media-settings-subtitles-on
        I.dontSeeElement(SELECTOR_MEDIA_SETTINGS_SUBTITLES_ON);
        // Click on the Gear
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_GEAR);
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Wait for audio tracks and for subtitles items to be visisble
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_SUBTITLES_ITEM);
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_AUDIOTRACKS_ITEM);

        // MP3
        showPreview(I, FILE_ID_MP3);

        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        // Click on the Gear
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Look for autoplay and speed
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_AUTOPLAY_ITEM);
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_SPEED_ITEM);

        // Video (no HD)
        showPreview(I, FILE_ID_VIDEO_SMALL);

        I.waitForElement(SELECTOR_MEDIA_CONTAINER);
        showMediaControls(I, SELECTOR_VIDEO);
        // Click on the Gear
        I.waitForVisible(SELECTOR_MEDIA_CONTROLS_GEAR);
        I.click(SELECTOR_MEDIA_CONTROLS_GEAR);
        // Look for autoplay and speed
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_AUTOPLAY_ITEM);
        I.waitForVisible(SELECTOR_MEDIA_SETTINGS_SPEED_ITEM);
        I.dontSeeElement(SELECTOR_MEDIA_SETTINGS_MENU_QUALITY);
    }
);
