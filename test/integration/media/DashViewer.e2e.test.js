import {
    runAudioTracksTests,
    runBaseMediaSettingsTests,
    runQualityMenuTests,
    runSubtitlesTests,
} from '../../support/mediaSettingsTests';

describe('Dash Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO_SUBTITLES_TRACKS');

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { useReactControls: false } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();

            runQualityMenuTests();

            runAudioTracksTests();

            runSubtitlesTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { useReactControls: true } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();

            runQualityMenuTests();

            runAudioTracksTests();

            runSubtitlesTests();
        });
    });
});
