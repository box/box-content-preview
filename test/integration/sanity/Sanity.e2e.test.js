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

    it('Should reload without server update', () => {
        cy.showPreview(token, fileId);
        cy.getPreviewPage(1);
        cy.contains('The Content Platform for Your Apps');
        cy.hasThumbnails();

        cy.window().then(win => {
            win.preview.reload(true);
            cy.getByTestId('bp-content')
                .find('.bp-loading-wrapper')
                .should('be.visible');
            cy.getPreviewPage(1);
            cy.contains('The Content Platform for Your Apps');
            cy.get('@getFileInfo.all').should('have.length', 1);
        });
    });

    it('Should reload with server update', () => {
        cy.showPreview(token, fileId);
        cy.getPreviewPage(1);
        cy.contains('The Content Platform for Your Apps');
        cy.hasThumbnails();
        cy.window().then(win => {
            win.preview.reload();
            cy.getPreviewPage(1);
            cy.contains('The Content Platform for Your Apps');
            cy.get('@getFileInfo.all').should('have.length', 2);
        });
    });
});
