// <reference types="Cypress" />
describe('Preview Sanity', () => {
    let token;

    beforeEach(() => {
        token = Cypress.env('ACCESS_TOKEN');
        cy.visit('/');
    });

    it('Should load a document preview', () => {
        const fileId = Cypress.env('FILE_ID_DOC');
        cy.showPreview(token, fileId);
        cy.contains('The Content Platform for Your Apps');
    });
});
