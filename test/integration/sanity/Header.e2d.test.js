// <reference types="Cypress" />
describe('Preview Header', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdDoc = Cypress.env('FILE_ID_DOC');
    const urlRegex = /https:\/\/dl[0-9]*\.boxcloud\.com.+\/download/;

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileIdDoc, { showDownload: true });
    });

    it('Should be able to download the file', () => {
        cy.getByTestId('download-preview').should('be.visible').click();
        cy.getByTestId('downloadiframe').then((iframe) => expect(urlRegex.test(iframe[0].src)).to.be.true);
    });
});
