// <reference types="Cypress" />
describe('Presentation Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_PRESENTATION');

    /* eslint-disable */
    const showControls = () => {
        cy.getByTestId('bp').trigger('mouseover');
        cy.getByTestId('controls-wrapper').should('be.visible');
    };
    /* eslint-enable */

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileId);
    });

    it('Should initialize preview on the same page it was closed on', () => {
        // Assert document content is present
        cy.contains('For Teaching Economics');
        // Get the current dimensions of the page
        showControls();
        // Navigate to the next page
        cy.getByTitle('Next page').click();

        // Refresh the preview
        cy.reload();

        // Page 2 should still be visible
        cy.getPreviewPage(2).should('be.visible');

    });

});
