export function runBaseMediaSettingsTests() {
    describe('Toggle Settings', () => {
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
    });

    describe('Autoplay Menu', () => {
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
    });

    describe('Speed Menu', () => {
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

export function runQualityMenuTests() {
    describe('Quality Menu', () => {
        it('Should be able to change the Quality setting', () => {
            cy.getByTestId('bp-media-settings-quality')
                .contains('Auto')
                .click();

            cy.getByTestId('bp-media-controls-hd').should('be.visible');

            cy.get('[role="menuitem"]').contains('Quality');

            cy.getByTestId('bp-settings-flyout')
                .contains('480p')
                .click();

            cy.getByTestId('bp-media-settings-quality').contains('480p');

            cy.getByTestId('bp-media-controls-hd').should('not.be.visible');
        });
    });
}

export function runAudioTracksTests() {
    describe('Audiotracks Menu', () => {
        it('Should be able to change the Audiotrack setting', () => {
            cy.getByTestId('bp-media-settings-audiotracks')
                .contains('Track 1')
                .click();

            cy.get('[role="menuitem"]').contains('Audio');

            cy.getByTestId('bp-settings-flyout')
                .contains('Track 2')
                .click();

            cy.getByTestId('bp-media-settings-audiotracks').contains('Track 2');
        });
    });
}

export function runSubtitlesTests() {
    describe('Subtitles', () => {
        it('Should be able to change the Subtitle setting', () => {
            cy.getByTestId('bp-media-settings-subtitles')
                .contains('English')
                .click();

            cy.get('[role="menuitem"]').contains('Subtitles/CC');

            cy.getByTestId('bp-settings-flyout')
                .contains('Spanish')
                .click();

            cy.getByTestId('bp-media-settings-subtitles').contains('Spanish');
        });

        it('Should be able to turn off subtitles via the button', () => {
            cy.getByTitle('Subtitles/Closed Captions')
                .as('subtitlesBtn')
                .should('be.visible')
                .should('have.attr', 'aria-pressed', 'true');

            cy.getByTestId('bp-media-settings-subtitles').contains('English');

            cy.get('@subtitlesBtn')
                .click()
                .should('have.attr', 'aria-pressed', 'false');

            cy.getByTestId('bp-media-settings-subtitles').contains('Off');
        });

        it('Should be able to turn off subtitles via the menu', () => {
            cy.getByTitle('Subtitles/Closed Captions')
                .as('subtitlesBtn')
                .should('be.visible')
                .should('have.attr', 'aria-pressed', 'true');

            cy.getByTestId('bp-media-settings-subtitles')
                .contains('English')
                .click();

            cy.getByTestId('bp-settings-flyout')
                .contains('Off')
                .click();

            cy.get('@subtitlesBtn').should('have.attr', 'aria-pressed', 'false');

            cy.getByTestId('bp-media-settings-subtitles').contains('Off');
        });
    });
}
