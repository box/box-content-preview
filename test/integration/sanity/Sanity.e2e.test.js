// <reference types="Cypress" />
describe('Preview Sanity', () => {
    let token;

    beforeEach(() => {
        token = Cypress.env('ACCESS_TOKEN');
        cy.visit('/');
    });

    it('Should load a document preview', () => {
        const fileId = Cypress.env('FILE_ID_DOC');

        // Show the preview
        cy.showPreview(token, fileId);
        // Wait for .bp to load viewer
        cy.getByTestId('bp').should('have.class', 'bp-loaded')
        // Assert document content is present
        cy.contains('The Content Platform for Your Apps');
    });
});
