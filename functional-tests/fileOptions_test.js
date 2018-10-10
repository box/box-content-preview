const {
    SELECTOR_MEDIA_TIMESTAMP,
    SELECTOR_DOC_CURRENT_PAGE,

    FILE_ID_DOC,
    FILE_ID_VIDEO,
    FILE_ID_MP3
} = require('./constants');

const { showMediaControls, showDocumentControls, disableDash, showPreview } = require('./helpers');

const { CI } = process.env;
const DOC_START = '2';
const VIDEO_START = '0:15';
const MP3_START = '0:03';

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

Feature('File Options', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

// Excludes ie
Scenario(
    'Check preview starts at correct spot for all file types @ci @chrome @firefox @edge @safari @android @ios',
    { retries: 5 },
    (I) => {
        // Document
        showPreview(I, FILE_ID_DOC, { fileOptions });

        showDocumentControls(I);
        I.waitForVisible(SELECTOR_DOC_CURRENT_PAGE);
        I.seeTextEquals(DOC_START, SELECTOR_DOC_CURRENT_PAGE);

        // Video (DASH)
        showPreview(I, FILE_ID_VIDEO, { fileOptions });

        showMediaControls(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_START, SELECTOR_MEDIA_TIMESTAMP);

        // MP3
        showPreview(I, FILE_ID_MP3, { fileOptions });

        showMediaControls(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(MP3_START, SELECTOR_MEDIA_TIMESTAMP);

        // Video (MP4)
        disableDash(I);
        showPreview(I, FILE_ID_VIDEO, { fileOptions });

        showMediaControls(I);
        I.waitForVisible(SELECTOR_MEDIA_TIMESTAMP);
        I.seeTextEquals(VIDEO_START, SELECTOR_MEDIA_TIMESTAMP);
    }
);
