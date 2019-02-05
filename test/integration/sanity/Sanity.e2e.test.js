// <reference types="Cypress" />
describe('Preview Sanity', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should load a document preview', () => {
        // Show the preview
        cy.showPreview(token, fileId);
        // Assert document content is present
        cy.contains('The Content Platform for Your Apps');
    });
});
