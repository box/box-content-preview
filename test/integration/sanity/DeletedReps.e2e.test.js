// <reference types="Cypress" />
describe('Previewing a file with deleted representations', () => {
    const fileIdDoc = Cypress.env('FILE_ID_DOC');
    const fileIdPresentation = Cypress.env('FILE_ID_PRESENTATION');
    const token = Cypress.env('ACCESS_TOKEN');

    beforeEach(() => {
        cy.intercept('GET', '**/files/*');

        cy.visit('/', {
            onBeforeLoad(win) {
                // Workaround for fetch detection in cypress mocking. https://github.com/cypress-io/cypress/issues/95
                cy.stub(win, 'fetch').resolves({
                    ok: false,
                    json: () => [],
                    status: 202,
                });
            },
        });
    });

    [
        {
            viewer: 'Document',
            fileId: fileIdDoc,
        },
        {
            viewer: 'Presentation',
            fileId: fileIdPresentation,
        },
    ].forEach(test => {
        it(test.viewer, () => {
            cy.window().then(win => {
                win.preview.addListener('preview_error', data => {
                    cy.expect(data.error.code).to.equal('error_deleted_reps');
                });
            });

            // Temporarily disabling annotations due to a bug in 2.3
            cy.showPreview(token, test.fileId, { showAnnotations: false });
        });
    });
});
