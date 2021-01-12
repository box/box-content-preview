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

    /* eslint-disable */
    const showMediaControls = () => {
        // Hover over the preview to trigger the controls
        cy.getByTestId('bp').trigger('mouseover');
        // Assert that the controls are shown
        return cy.getByTestId('media-controls-wrapper').should('be.visible');
    };
    /* eslint-enable */

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

        showMediaControls().contains('0:15');
    });

    it('Should open video(MP4) to the specified timestamp', () => {
        cy.showPreview(token, fileIdVideo, { fileOptions, viewers: { Dash: { disabled: true } } });

        showMediaControls().contains('0:15');
    });

    it('Should open MP3 to the specified timestamp', () => {
        cy.showPreview(token, fileIdMp3, { fileOptions });

        showMediaControls().contains('0:03');
    });
});
