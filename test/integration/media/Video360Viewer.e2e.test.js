import { runBaseMediaSettingsTests, runQualityMenuTests } from '../../support/mediaSettingsTests';

describe('Video360 Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo360 = Cypress.env('FILE_ID_VIDEO_360');

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo360, {
                    viewers: { Video360: { useReactControls: false } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();

            runQualityMenuTests();
        });
    });
});
