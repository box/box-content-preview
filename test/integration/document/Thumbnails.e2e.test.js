// <reference types="Cypress" />
describe('Preview Document Thumbnails', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    /* eslint-disable */
    const getThumbnail = (pageNum) => cy.get(`.bp-thumbnail[data-bp-page-num=${pageNum}]`);
    const showDocumentPreview = ({ enableThumbnailsSidebar } = {}) => {
        cy.showPreview(token, fileId, { enableThumbnailsSidebar });
        cy.getPreviewPage(1);
        cy.contains('The Content Platform for Your Apps');
    };
    const toggleThumbnails = () => {
        cy.showDocumentControls();

        cy
            .getByTitle('Toggle thumbnails')
            .should('be.visible')
            .click();

        cy.wait(301); // Wait for toggle animation to complete

        return cy.getByTestId('thumbnails-sidebar');
    };
    /* eslint-enable */

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should not see the sidebar button if disabled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: false });

        cy.showDocumentControls();
        cy.getByTitle('Toggle thumbnails').should('not.be.visible');
    });

    it('Should see the sidebar button if enabled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        cy.showDocumentControls();
        cy.getByTitle('Toggle thumbnails').should('be.visible');
    });

    it('Should render thumbnails when toggled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        toggleThumbnails().should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)'); // translateX(0)

        toggleThumbnails().should('have.css', 'transform', 'matrix(1, 0, 0, 1, -201, 0)'); // translateX(-201px)
    });

    it('Should be able to change page by clicking on the thumbnail', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        // Verify we're on page 1
        cy.getByTestId('current-page').as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().should('be.visible');

        // Verify which thumbnail is selected
        getThumbnail(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS)
            .as('thumbOne');
        getThumbnail(2)
            .click()
            .should('have.class', THUMBNAIL_SELECTED_CLASS);
        cy.get('@thumbOne').should('not.have.class', THUMBNAIL_SELECTED_CLASS);
        cy
            .get('@currentPage')
            .invoke('text')
            .should('equal', '2');
    });

    it('Should reflect the selected page when page is changed', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy
            .getByTestId('current-page')
            .as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().should('be.visible');

        getThumbnail(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS)
            .as('thumbOne');

        cy.getByTitle('Next page').click();

        getThumbnail(2).should('have.class', THUMBNAIL_SELECTED_CLASS);
        cy.get('@thumbOne').should('not.have.class', THUMBNAIL_SELECTED_CLASS);
        cy
            .get('@currentPage')
            .invoke('text')
            .should('equal', '2');
    });
});
