import { runAnnotationsTests, runBaseMediaSettingsTests } from '../../support/mediaSettingsTests';

describe('MP4 Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO');

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { disabled: true }, MP4: { useReactControls: false } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            it('react controls should not be visible', () => {
                cy.get('.bp-VideoControls').should('not.exist');
            });
            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { disabled: true }, MP4: { useReactControls: true } },
                    features: {
                        videoAnnotations: {
                            enabled: true,
                        },
                    },
                    showAnnotations: true,
                    showAnnotationsControls: true,
                    showAnnotationsDrawingCreate: true,
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            it('react controls should be visible', () => {
                cy.get('.bp-VideoControls').should('exist');
            });

            runAnnotationsTests();
            runBaseMediaSettingsTests();
        });
    });
});
