// <reference types="Cypress" />
describe('Presentation Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_PRESENTATION');


    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileId);
    });

    it('Should initialize preview on the same page it was closed on', () => {
        // Assert document content is present
        cy.contains('For Teaching Economics');

        cy.showControls();

        // Navigate to the second page so it gets cached
        cy.getByTitle('Next page').click();

        // Refreshes preview
        cy.reload();

        cy.getPreviewPage(2).should('be.visible');

    });

});
