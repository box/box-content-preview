import { disableDash } from './helpers';

const {
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_DOC_CURRENT_PAGE,
    SELECTOR_BOX_PREVIEW_LOADED,
    CLASS_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_DOC,
    SELECTOR_BOX_PREVIEW_MP3,
    SELECTOR_BOX_PREVIEW_DASH,
    SELECTOR_BOX_PREVIEW_MP4,
    FILE_ID_DOC,
    FILE_ID_VIDEO,
    FILE_ID_MP3
} = require('./constants');

const { navigateToNextItem, makeNavAppear, navigateToPrevItem, waitForLoad, showPreview } = require('./helpers');

const { CI } = process.env;
const DOC_START = '2';
const DASH_START = '0:15';
const MP3_START = '0:03';
const MP4_START = '0:10';
const SELECTOR_VIDEO = 'video';

Feature('File Options', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');

    const fileOptions = {
        [FILE_ID_DOC]: {
            startAt: {
                value: 2,
                unit: 'pages'
            }
        },
        [FILE_ID_VIDEO]: {
            startAt: {
                value: 15,
                unit: 'seconds'
            }
        },
        [FILE_ID_MP3]: {
            startAt: {
                value: 3,
                unit: 'seconds'
            }
        }
    };

    showPreview(I, FILE_ID_DOC, {
        collection: [FILE_ID_DOC, FILE_ID_VIDEO, FILE_ID_MP3],
        fileOptions
    });

    /* eslint-disable */
    // I.executeScript(function() {
    //     var fileOptions = {};
    //     fileOptions[FILE_ID_DOC] = {
    //         startAt: {
    //             value: 2,
    //             unit: 'pages'
    //         }
    //     };
    //     fileOptions[FILE_ID_VIDEO] = {
    //         startAt: {
    //             value: 15,
    //             unit: 'seconds'
    //         }
    //     };
    //     fileOptions[FILE_ID_MP3] = {
    //         startAt: {
    //             value: 3,
    //             unit: 'seconds'
    //         }
    //     };
    //     window.showPreview(FILE_ID_DOC, {
    //         collection: [FILE_ID_DOC, FILE_ID_VIDEO, FILE_ID_MP3],
    //         fileOptions: fileOptions
    //     });
    // });
    /* eslint-enable */

    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
    I.waitForElement(SELECTOR_BOX_PREVIEW_DOC);
});

// Excludes ie
Scenario(
    'Check preview starts at correct spot for all file types @ci @chrome @firefox @edge @safari @android @ios',
    { retries: 5 },
    (I) => {
        // document
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
        I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);
        navigateToNextItem(I);

        // video (dash)
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);
        navigateToNextItem(I);

        // mp3
        waitForLoad(I);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP3);
        makeNavAppear(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP3_START, SELECTOR_MEDIA_TIMESTAMP);

        // video (mp4)
        disableDash(I);

        I.waitForElement(CLASS_BOX_PREVIEW_LOADING_WRAPPER);
        I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
        I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);

        makeNavAppear(I, SELECTOR_VIDEO);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
    }
);

// Sacuelabs ie11 doesn't like audio files
Scenario('Check preview starts at correct spot for all file types @ci @ie', { retries: 5 }, (I) => {
    // document
    makeNavAppear(I);
    I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
    I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);
    navigateToNextItem(I);

    // video (dash)
    waitForLoad(I);
    I.waitForElement(SELECTOR_BOX_PREVIEW_DASH);
    makeNavAppear(I, SELECTOR_VIDEO);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(DASH_START, SELECTOR_MEDIA_TIMESTAMP);

    // mp3 is not supported :(
    navigateToPrevItem(I);
    // video (mp4)
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);

    disableDash(I);

    waitForLoad(I);
    I.waitForElement(SELECTOR_BOX_PREVIEW_MP4);

    makeNavAppear(I, SELECTOR_VIDEO);
    I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
    I.seeTextEquals(MP4_START, SELECTOR_MEDIA_TIMESTAMP);
});

Scenario();
