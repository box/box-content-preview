// <reference types="Cypress" />
describe('Preview Document Thumbnails', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC_LARGE');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    /**
     * Gets the thumbnail with the specified page number
     * @param {number} pageNum - Page number
     * @return {Element} Thumbnail subject
     */
    const getThumbnail = (pageNum) => cy.get(`.bp-thumbnail[data-bp-page-num=${pageNum}]`);

    /**
     * Gets the thumbnail and ensures the thumbnail image has rendered
     * @param {number} pageNum - Page number
     * @return {Element} Thumbnail subject
     */
    const getThumbnailWithRenderedImage = (pageNum) => getThumbnail(pageNum).should(($thumbnail) => {
        expect($thumbnail.find('.bp-thumbnail-image')).to.exist;
        return $thumbnail;
    });

    /**
     * Shows the document preview
     * @param {Object} options - Preview options
     * @return {void}
     */
    const showDocumentPreview = ({ enableThumbnailsSidebar } = {}) => {
        cy.showPreview(token, fileId, { enableThumbnailsSidebar });
        cy.getPreviewPage(1);
        cy.contains('IN  THE  HOUSE  OF  REPRESENTATIVES');
    };

    /**
     * Toggles the thumbnails sidebar
     * @return {Element} The thumbnails sidebar subject
     */
    const toggleThumbnails = () => {
        cy.showDocumentControls();

        cy
            .getByTitle('Toggle thumbnails')
            .should('be.visible')
            .click();

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(301); // Wait for toggle animation to complete

        return cy.getByTestId('thumbnails-sidebar');
    };

    /**
     * Asserts that the thumbnails sidebar object is visible
     * @param {Element} $thumbnailsSidebar - The thumbnails sidebar subject
     * @return {Assertion} Chai Assertion
     */
    const beVisible = ($thumbnailsSidebar) =>
        expect($thumbnailsSidebar).to.have.css('transform', 'matrix(1, 0, 0, 1, 0, 0)'); // translateX(0)

    /**
     * Asserts that the thumbnails sidebar object is not visible
     * @param {Element} $thumbnailsSidebar - The thumbnails sidebar subject
     * @return {Assertion} Chai Assertion
     */
    const notBeVisible = ($thumbnailsSidebar) =>
        expect($thumbnailsSidebar).to.have.css('transform', 'matrix(1, 0, 0, 1, -226, 0)'); // translateX(-226px)

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

        toggleThumbnails().should(beVisible);

        toggleThumbnails().should(notBeVisible);
    });

    it('Should be able to change page by clicking on the thumbnail', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        // Verify we're on page 1
        cy
            .getByTestId('current-page')
            .as('currentPage')
            .invoke('text')
            .should('equal', '1');

        toggleThumbnails().should(beVisible);

        // Verify which thumbnail is selected
        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);
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

        toggleThumbnails().should(beVisible);

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

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

        toggleThumbnails().should(beVisible);

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

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

        toggleThumbnails().should(beVisible);

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.showDocumentControls();
        cy.getByTitle('Click to enter page number').click();
        cy
            .getByTestId('page-num-input')
            .should('be.visible')
            .type('200')
            .blur();

        cy.getPreviewPage(200).should('be.visible');
        getThumbnailWithRenderedImage(200).should('have.class', THUMBNAIL_SELECTED_CLASS);

        toggleThumbnails().should(notBeVisible);

        cy.getByTitle('Click to enter page number').click();
        cy
            .getByTestId('page-num-input')
            .should('be.visible')
            .type('1')
            .blur();

        cy.getPreviewPage(1).should('be.visible');

        toggleThumbnails().should(beVisible);

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);
    });
});
