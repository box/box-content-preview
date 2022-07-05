// <reference types="Cypress" />
describe('Preview Document Thumbnails', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC_LARGE');
    const badFileId = Cypress.env('FILE_ID_BAD');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    /**
     * Gets the thumbnail with the specified page number
     * @param {number} pageNum - Page number
     * @return {Element} Thumbnail subject
     */
    const getThumbnail = pageNum => cy.get(`.bp-thumbnail[data-bp-page-num=${pageNum}]`);

    /**
     * Gets the thumbnail and ensures the thumbnail image has rendered
     * @param {number} pageNum - Page number
     * @return {Element} Thumbnail subject
     */
    const getThumbnailWithRenderedImage = pageNum =>
        getThumbnail(pageNum).should($thumbnail => {
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
        cy.contains('IN THE HOUSE OF REPRESENTATIVES');
    };

    /**
     * Toggles the thumbnails sidebar
     * @return {Element} The thumbnails sidebar subject
     */
    const toggleThumbnails = () => {
        cy.showControls();

        cy.getByTitle('Toggle thumbnails')
            .should('be.visible')
            .click();

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(301); // Wait for toggle animation to complete

        return cy.getByTestId('thumbnails-sidebar');
    };

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should not see the sidebar button if disabled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: false });

        cy.showControls();
        cy.getByTitle('Toggle thumbnails').should('not.be.visible');
    });

    it('Should see the sidebar button if enabled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        cy.showControls();
        cy.getByTitle('Toggle thumbnails').should('be.visible');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');
    });

    it('Should render thumbnails when toggled', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        toggleThumbnails();
        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');

        toggleThumbnails();
        cy.getByTestId('thumbnails-sidebar').should('be.visible');
    });

    it('Should be able to change page by clicking on the thumbnail', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        // Verify we're on page 1
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 1990');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        // Verify which thumbnail is selected
        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);
        getThumbnailWithRenderedImage(2)
            .click()
            .should('have.class', THUMBNAIL_SELECTED_CLASS);
        getThumbnailWithRenderedImage(1).should('not.have.class', THUMBNAIL_SELECTED_CLASS);
        cy.get('@currentPage').should('have.text', '2 / 1990');
    });

    it('Should reflect the selected page when page is changed', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 1990');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.getByTitle('Next page').click();

        getThumbnailWithRenderedImage(2).should('have.class', THUMBNAIL_SELECTED_CLASS);
        getThumbnailWithRenderedImage(1).should('not.have.class', THUMBNAIL_SELECTED_CLASS);
        cy.get('@currentPage').should('have.text', '2 / 1990');
    });

    it('Should reflect the selected page even when thumbnail was not previously in rendered window', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 1990');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.showControls();
        cy.getByTitle('Click to enter page number').click();
        cy.getByTestId('bp-PageControlsForm-input')
            .should('be.visible')
            .type('200')
            .blur();

        getThumbnailWithRenderedImage(200).should('have.class', THUMBNAIL_SELECTED_CLASS);

        getThumbnail(1).should('not.exist');
        cy.get('@currentPage').should('have.text', '200 / 1990');
    });

    it('Should still reflect the current viewed page when thumbnails sidebar is toggled open', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 1990');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.showControls();
        cy.getByTitle('Click to enter page number').click();
        cy.getByTestId('bp-PageControlsForm-input')
            .should('be.visible')
            .type('200')
            .blur();

        cy.getPreviewPage(200).should('be.visible');
        getThumbnailWithRenderedImage(200).should('have.class', THUMBNAIL_SELECTED_CLASS);

        toggleThumbnails();
        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');

        cy.getByTitle('Click to enter page number').click();
        cy.getByTestId('bp-PageControlsForm-input')
            .should('be.visible')
            .type('1')
            .blur();

        cy.getPreviewPage(1).should('be.visible');

        toggleThumbnails();
        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        getThumbnailWithRenderedImage(1).should('have.class', THUMBNAIL_SELECTED_CLASS);
    });

    it('Should not show the toggle thumbnails button on a small viewport', () => {
        cy.viewport('iphone-6');

        showDocumentPreview({ enableThumbnailsSidebar: true });

        cy.showControls();
        cy.getByTitle('Toggle thumbnails').should('not.be.visible');
    });

    it('Should hide the thumbnails when changing to small viewport', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        cy.showControls();
        cy.getByTitle('Toggle thumbnails').should('be.visible');

        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        // Change to small viewport while thumbnails sidebar is open
        cy.viewport('iphone-6');

        cy.showControls();
        cy.getByTitle('Toggle thumbnails').should('not.be.visible');
        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');
    });

    it('Should keep the thumbnails sidebar toggled open even after refresh', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        cy.reload();

        cy.getByTestId('thumbnails-sidebar').should('be.visible');
        getThumbnailWithRenderedImage(1);
    });

    it('Should keep the thumbnails sidebar toggled closed even after refresh', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        toggleThumbnails();

        cy.reload();

        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');
    });

    it('Should scroll previewed page into view', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('thumbnails-sidebar').should('be.visible');

        cy.getByTitle('Click to enter page number').click();
        cy.getByTestId('bp-PageControlsForm-input')
            .should('be.visible')
            .type('50')
            .blur();

        getThumbnailWithRenderedImage(50).should('have.class', THUMBNAIL_SELECTED_CLASS);

        cy.reload();

        cy.getByTestId('thumbnails-sidebar').should('be.visible');
        getThumbnailWithRenderedImage(50).should('have.class', THUMBNAIL_SELECTED_CLASS);
        cy.getByTestId('thumbnails-sidebar')
            .find('.bp-vs')
            .then($virtualScrollerEl => {
                expect($virtualScrollerEl[0].scrollTop).to.not.equal(0);
            });
    });

    it('Should not show the thumbnails sidebar when a document preview errors', () => {
        cy.showPreview(token, badFileId, { enableThumbnailsSidebar: true });

        cy.getByTestId('thumbnails-sidebar').should('not.exist');
    });

    it('Should not show the thumbnails sidebar for single page documents', () => {
        const singlePageFileId = Cypress.env('FILE_ID_SINGLE_PAGE');
        cy.showPreview(token, singlePageFileId, { enableThumbnailsSidebar: true });

        cy.contains('Single Page Document');
        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');
    });

    it('Should change page on up and down arrow keyboard shortcuts', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });

        getThumbnailWithRenderedImage(2).click();
        cy.focused().type('{downarrow}');
        getThumbnailWithRenderedImage(3).should('have.class', THUMBNAIL_SELECTED_CLASS);
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '3 / 1990');

        getThumbnailWithRenderedImage(3).click();
        cy.focused().type('{uparrow}');

        getThumbnailWithRenderedImage(2).should('have.class', THUMBNAIL_SELECTED_CLASS);
        cy.get('@currentPage').should('have.text', '2 / 1990');
    });
});
