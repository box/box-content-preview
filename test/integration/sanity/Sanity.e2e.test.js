// <reference types="Cypress" />
describe('Preview Sanity', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should load a document preview', () => {
        cy.showPreview(token, fileId);
        cy.getPreviewPage(1);
        cy.contains('The Content Platform for Your Apps');
    });
});
