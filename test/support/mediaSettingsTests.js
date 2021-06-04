// eslint-disable-next-line import/prefer-default-export
export function runBaseMediaSettingsTests() {
    beforeEach(() => {
        cy.showMediaControls();

        // Open the menu
        cy.getByTitle('Settings').click({ force: true });
    });

    describe('Base Media Settings', () => {
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
