// <reference types='Cypress' />
describe('Download disabled while preview is already open', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdBad = Cypress.env('FILE_ID_BAD');

    beforeEach(() => {
        cy.visit('/');
    });

    it('should give generic download error when trying to download and its forbidden', () => {
        cy.showPreview(token, fileIdBad, { showDownload: true });
        cy.intercept('GET', `**/files/${fileIdBad}?fields=download_url`, { statusCode: 403, body: {} });

        cy.getByTestId('preview-error-download-btn').should('be.visible');
        cy.getByTestId('preview-error-download-btn').click();
        cy.contains('Sorry! You can’t download this file.');
    });

    it('should give shield error when trying to download and access policy prevents download', () => {
        cy.showPreview(token, fileIdBad, { showDownload: true });
        cy.intercept('GET', `**/files/${fileIdBad}?fields=download_url`, {
            statusCode: 403,
            body: { code: 'forbidden_by_policy' },
        });

        cy.getByTestId('preview-error-download-btn').should('be.visible');
        cy.getByTestId('preview-error-download-btn').click();
        cy.contains('Downloading of this content has been disabled based on an access policy.');
    });
});
