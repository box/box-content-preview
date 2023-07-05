// <reference types="Cypress" />
describe('Text Viewers', () => {
    const token = Cypress.env('ACCESS_TOKEN');

    beforeEach(() => {
        cy.visit('/');
    });

    [
        { title: 'html', fileKey: 'FILE_ID_HTML', expectedText: 'Files App' },
        { title: 'js', fileKey: 'FILE_ID_JS', expectedText: 'class PlainText extends TextBase' },
        { title: 'json', fileKey: 'FILE_ID_JSON', expectedText: 'Standard Generalized Markup Language' },
        { title: 'txt', fileKey: 'FILE_ID_TXT', expectedText: 'XSS Locator' },
    ].forEach(testcase => {
        it(`Should load a ${testcase.title} preview`, () => {
            const fileId = Cypress.env(testcase.fileKey);
            cy.showPreview(token, fileId);
            cy.contains(testcase.expectedText);
        });
    });
});
