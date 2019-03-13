// <reference types="Cypress" />
describe('Preview Document Thumbnails', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC_LARGE');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    /* eslint-disable */
    const getThumbnail = (pageNum) => {
        return cy
            .get(`.bp-thumbnail[data-bp-page-num=${pageNum}]`, { timeout: 5000 })
            .as('foundThumbnail')
    };

    const getThumbnailWithRenderedImage = (pageNum) => {
        getThumbnail(pageNum).find('.bp-thumbnail-image').should('exist');

        return cy.get('@foundThumbnail');
    };

    const showDocumentPreview = ({ enableThumbnailsSidebar } = {}) => {
        cy.showPreview(token, fileId, { enableThumbnailsSidebar });
        cy.getPreviewPage(1);
        cy.contains('IN  THE  HOUSE  OF  REPRESENTATIVES');
    };

    const toggleThumbnails = () => {
        cy.showDocumentControls();

        cy
            .getByTitle('Toggle thumbnails')
            .should('be.visible')
            .click();

        cy.wait(301); // Wait for toggle animation to complete

        const thumbnailSubject = cy.getByTestId('thumbnails-sidebar');

        return {
            ...thumbnailSubject,
            shouldBeVisible: () => thumbnailSubject.should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)'), // translateX(0)
            shouldNotBeVisible: () => thumbnailSubject.should('have.css', 'transform', 'matrix(1, 0, 0, 1, -201, 0)') // translateX(-201px)
        };
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

        toggleThumbnails().shouldBeVisible();

        toggleThumbnails().shouldNotBeVisible();
    });

    it('Should be able to change page by clicking on the thumbnail', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        // Verify we're on page 1
        cy
            .getByTestId('current-page')
            .as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().shouldBeVisible();

        // Verify which thumbnail is selected
        getThumbnailWithRenderedImage(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS)
        getThumbnailWithRenderedImage(2)
            .click()
            .should('have.class', THUMBNAIL_SELECTED_CLASS);
        getThumbnailWithRenderedImage(1).should('not.have.class', THUMBNAIL_SELECTED_CLASS);
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

        toggleThumbnails().shouldBeVisible();

        getThumbnailWithRenderedImage(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.getByTitle('Next page').click();

        getThumbnailWithRenderedImage(2).should('have.class', THUMBNAIL_SELECTED_CLASS);
        getThumbnailWithRenderedImage(1).should('not.have.class', THUMBNAIL_SELECTED_CLASS);
        cy
            .get('@currentPage')
            .invoke('text')
            .should('equal', '2');
    });

    it('Should reflect the selected page even when thumbnail was not previously in rendered window', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy
            .getByTestId('current-page')
            .as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().shouldBeVisible();

        getThumbnailWithRenderedImage(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.showDocumentControls();
        cy.getByTitle('Click to enter page number').click();
        cy
            .getByTestId('page-num-input')
            .should('be.visible')
            .type('200')
            .blur();

        getThumbnailWithRenderedImage(200).should('have.class', THUMBNAIL_SELECTED_CLASS);

        getThumbnail(1).should('not.exist');
        cy
            .get('@currentPage')
            .invoke('text')
            .should('equal', '200');
    });

    it('Should still reflect the current viewed page when thumbnails sidebar is toggled open', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy
            .getByTestId('current-page')
            .as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().shouldBeVisible();

        getThumbnailWithRenderedImage(1)
            .should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.showDocumentControls();
        cy.getByTitle('Click to enter page number').click();
        cy
            .getByTestId('page-num-input')
            .should('be.visible')
            .type('200')
            .blur();

        cy.getPreviewPage(200).should('be.visible');
        getThumbnailWithRenderedImage(200).should('have.class', THUMBNAIL_SELECTED_CLASS);

        toggleThumbnails().shouldNotBeVisible();

        cy.getByTitle('Click to enter page number').click();
        cy
            .getByTestId('page-num-input')
            .should('be.visible')
            .type('1')
            .blur();

        cy.getPreviewPage(1).should('be.visible');

        toggleThumbnails().shouldBeVisible();

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);
    });
});
