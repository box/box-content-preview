// <reference types="Cypress" />
describe('Preview File Options', () => {
    const token = Cypress.env('ACCESS_TOKEN');

    const fileIdDoc = Cypress.env('FILE_ID_DOC');
    const fileIdVideo = Cypress.env('FILE_ID_VIDEO');
    const fileIdMp3 = Cypress.env('FILE_ID_MP3');

    const fileOptions = {
        [fileIdDoc]: {
            startAt: {
                value: 2,
                unit: 'pages',
            },
        },
        [fileIdVideo]: {
            startAt: {
                value: 15,
                unit: 'seconds',
            },
        },
        [fileIdMp3]: {
            startAt: {
                value: 3,
                unit: 'seconds',
            },
        },
    };

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should open document preview on the specified page', () => {
        cy.showPreview(token, fileIdDoc, { fileOptions });

        cy.getPreviewPage(2).should('be.visible');
        cy.contains('Discover how your business can use Box Platform');
        cy.getByTestId('bp-PageControlsForm-button').should('have.text', '2 / 2');
    });

    it('Should open video(DASH) to the specified timestamp', () => {
        cy.showPreview(token, fileIdVideo, { fileOptions });

        cy.showMediaControls().contains('0:15');
    });

    it('Should open video(MP4) to the specified timestamp', () => {
        cy.showPreview(token, fileIdVideo, { fileOptions, viewers: { Dash: { disabled: true } } });

        cy.showMediaControls().contains('0:15');
    });

    it('Should open MP3 to the specified timestamp', () => {
        cy.showPreview(token, fileIdMp3, { fileOptions });

        cy.showMediaControls().contains('0:03');
    });
});
