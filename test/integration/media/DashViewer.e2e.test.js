import { runBaseMediaSettingsTests } from '../../support/mediaSettingsTests';

describe('Dash Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO');

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { useReactControls: false } },
                });
            });

            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { useReactControls: true } },
                });
            });

            runBaseMediaSettingsTests();
        });
    });
});
