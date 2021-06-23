import { runBaseMediaSettingsTests } from '../../support/mediaSettingsTests';

describe('MP3 Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdMP3 = Cypress.env('FILE_ID_MP3');

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdMP3, {
                    viewers: { MP3: { useReactControls: false } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdMP3, {
                    viewers: { MP3: { useReactControls: true } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();
        });
    });
});
