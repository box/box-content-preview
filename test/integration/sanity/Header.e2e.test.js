// <reference types="Cypress" />
describe('Preview Header', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdDoc = Cypress.env('FILE_ID_DOC');
    // const urlRegex = /https:\/\/dl[0-9]*\.boxcloud\.com.+\/download/;

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileIdDoc, { showDownload: true });
    });

    it('Should see the download button for the file', () => {
        cy.getByTestId('download-preview').should('be.visible');
        // TODO: no click() is executed because it will cause the Cypress test execution
        // to hang while a dialog waits user input to save the download
        // https://github.com/cypress-io/cypress/issues/949
        // cy.getByTestId('downloadiframe').then((iframe) => expect(urlRegex.test(iframe[0].src)).to.be.true);
    });
});
