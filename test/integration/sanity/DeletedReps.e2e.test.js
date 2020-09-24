// <reference types="Cypress" />
describe('Previewing a file with deleted representations', () => {
    const token = Cypress.env('ACCESS_TOKEN');

    const fileIdDoc = Cypress.env('FILE_ID_DOC');
    const fileIdPresentation = Cypress.env('FILE_ID_PRESENTATION');

    const REPS_ERROR = 'error_deleted_reps';

    const helpers = {
        checkDeletedRepError: () => {
            cy.window().then(win => {
                win.preview.addListener('preview_error', data => {
                    cy.expect(data.error.code).to.equal(REPS_ERROR);
                });
            });
        },
    };

    beforeEach(() => {
        cy.server();
        // Make the representation content call to always return a 202 with no body

        // Mocking requests for non original reps
        cy.route({
            method: 'GET',
            url: '**/internal_files/**',
            status: 202,
            response: {},
        });

        // Mocking requests for original reps
        cy.route({
            method: 'GET',
            url: '**/content?**',
            status: 202,
            response: {},
        });

        cy.visit('/', {
            onBeforeLoad(win) {
                // Workaround for fetch detection in cypress mocking. https://github.com/cypress-io/cypress/issues/95
                delete win.fetch; // eslint-disable-line no-param-reassign
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
            helpers.checkDeletedRepError();

            // Temporarily disabling annotations due to a bug in 2.3
            cy.showPreview(token, test.fileId, { showAnnotations: false });
        });
    });
});
