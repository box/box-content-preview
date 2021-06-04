function runBaseMediaSettingsTests() {
    beforeEach(() => {
        cy.showMediaControls();

        // Open the menu
        cy.getByTitle('Settings').click({ force: true });
    });

    describe('Media Settings', () => {
        it('Should be able to toggle media settings menu', () => {
            cy.getByTestId('bp-settings-flyout').should('be.visible');
            cy.getByTestId('bp-media-settings-autoplay').contains('Disabled');
            cy.getByTestId('bp-media-settings-speed').contains('Normal');

            // Close the menu
            cy.getByTitle('Settings').click({ force: true });
            cy.getByTestId('bp-settings-flyout').should('not.be.visible');
        });

        it('Should be able to click away from media settings menu to close it', () => {
            cy.getByTestId('bp-settings-flyout').should('be.visible');
            cy.getByTestId('bp-media-settings-autoplay').contains('Disabled');
            cy.getByTestId('bp-media-settings-speed').contains('Normal');

            // Click away from menu
            cy.getByTestId('bp').click();
            cy.getByTestId('bp-settings-flyout').should('not.be.visible');
        });

        it('Should be able to change the Autoplay setting', () => {
            cy.getByTestId('bp-media-settings-autoplay')
                .contains('Disabled')
                .click();

            cy.get('[role="menuitem"]').contains('Autoplay');

            cy.getByTestId('bp-settings-flyout')
                .contains('Enabled')
                .click();

            cy.getByTestId('bp-media-settings-autoplay').contains('Enabled');
        });

        it('Should be able to change the Speed setting', () => {
            cy.getByTestId('bp-media-settings-speed')
                .contains('Normal')
                .click();

            cy.get('[role="menuitem"]').contains('Speed');

            cy.getByTestId('bp-settings-flyout')
                .contains('0.5')
                .click();

            cy.getByTestId('bp-media-settings-speed').contains('0.5');
        });
    });
}

describe('Media Settings Base', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO');
    const fileIdVideo360 = Cypress.env('FILE_ID_VIDEO_360');
    const fileIdMP3 = Cypress.env('FILE_ID_MP3');

    describe('MP4 Viewer', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { disabled: true }, MP4: { useReactControls: false } },
                });
            });

            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo, {
                    viewers: { Dash: { disabled: true }, MP4: { useReactControls: true } },
                });
            });

            runBaseMediaSettingsTests();
        });
    });

    describe('Dash Viewer', () => {
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

    describe('MP3 Viewer', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdMP3, {
                    viewers: { MP3: { useReactControls: false } },
                });
            });

            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdMP3, {
                    viewers: { MP3: { useReactControls: true } },
                });
            });

            runBaseMediaSettingsTests();
        });
    });

    describe('Video360 Viewer', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                cy.visit('/');
                cy.showPreview(token, fileIdVideo360, {
                    viewers: { Video360: { useReactControls: false } },
                });
            });

            runBaseMediaSettingsTests();
        });
    });
});
