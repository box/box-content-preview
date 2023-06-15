import {
    runAudioTracksTests,
    runBaseMediaSettingsTests,
    runLowQualityMenuTests,
    runQualityMenuTests,
    runSubtitlesTests,
} from '../../support/mediaSettingsTests';

describe('Dash Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO_SUBTITLES_TRACKS');
    const fileIdVideoSmall = Cypress.env('FILE_ID_VIDEO_SMALL');

    const setupTest = (fileId, useReactControls) => {
        cy.visit('/');
        cy.showPreview(token, fileId, {
            viewers: { Dash: { useReactControls } },
        });

        cy.showMediaControls();

        // Open the menu
        cy.getByTitle('Settings').click();
    };

    describe('HD Video with Subtitles', () => {
        describe('Media Settings Controls', () => {
            describe('Without react controls', () => {
                beforeEach(() => setupTest(fileIdVideo, false));

                runBaseMediaSettingsTests();

                runQualityMenuTests(false);

                runAudioTracksTests();

                runSubtitlesTests();
            });

            describe('With react controls', () => {
                beforeEach(() => setupTest(fileIdVideo, true));

                runBaseMediaSettingsTests();

                runQualityMenuTests(true);

                runAudioTracksTests();

                runSubtitlesTests();
            });
        });
    });

    describe('Non HD Video', () => {
        describe('Media Settings Controls', () => {
            describe('Without react controls', () => {
                beforeEach(() => setupTest(fileIdVideoSmall, false));

                runLowQualityMenuTests(false);
            });

            describe('With react controls', () => {
                beforeEach(() => setupTest(fileIdVideoSmall, true));

                runLowQualityMenuTests(true);
            });
        });
    });
});
