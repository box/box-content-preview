// <reference types="Cypress" />
describe('Preview Document Gallery', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');
    const largeFileId = Cypress.env('FILE_ID_DOC_LARGE');
    const presentationFileId = Cypress.env('FILE_ID_PRESENTATION');
    const singlePageFileId = Cypress.env('FILE_ID_SINGLE_PAGE');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    const showDocumentPreview = ({
        enableThumbnailsSidebar = false,
        galleryEnabled = true,
        targetFileId = fileId,
    } = {}) => {
        const options = {};

        if (galleryEnabled !== null) {
            options.features = {
                galleryView: {
                    enabled: galleryEnabled,
                },
            };
        }
        if (enableThumbnailsSidebar) {
            options.enableThumbnailsSidebar = true;
        }

        cy.showPreview(token, targetFileId, options);
        cy.getPreviewPage(1);
    };

    const openGallery = () => {
        cy.showControls();
        cy.getByTitle('Gallery view')
            .should('be.visible')
            .click();

        cy.get('.bp-gallery-grid').should('be.visible');
    };

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should toggle gallery view with a click and render document thumbnails', () => {
        showDocumentPreview();
        openGallery();

        cy.getByTitle('Gallery view').should('have.attr', 'aria-pressed', 'true');
        cy.get('.bp-gallery-grid[role="listbox"]')
            .find('[role="option"]')
            .should('have.length', 2);
        cy.get('.bp-gallery-tile[data-page="1"] img').should('be.visible');
        cy.getByTitle('Next page').should('not.exist');

        cy.showControls();
        cy.getByTitle('Gallery view')
            .should('be.visible')
            .click();

        cy.get('.bp-gallery-grid').should('not.exist');
        cy.getByTitle('Gallery view').should('have.attr', 'aria-pressed', 'false');
    });

    it('Should navigate to a selected page and close gallery view', () => {
        showDocumentPreview();
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 2');
        openGallery();

        cy.get('[role="option"][aria-label="Page 2"]').click();

        cy.get('.bp-gallery-grid').should('not.exist');
        cy.getPreviewPage(2).should('be.visible');
        cy.get('@currentPage').should('have.text', '2 / 2');
    });

    it('Should navigate a presentation from gallery view', () => {
        showDocumentPreview({ targetFileId: presentationFileId });
        openGallery();

        cy.get('[role="option"][aria-label="Page 2"]').click();

        cy.get('.bp-gallery-grid').should('not.exist');
        cy.getPreviewPage(2).should('be.visible');
        cy.getByTestId('bp-PageControlsForm-button')
            .invoke('text')
            .should('match', /^2 \/ \d+$/);
    });

    it('Should close gallery view with Escape without changing pages', () => {
        showDocumentPreview();
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 2');
        openGallery();

        cy.get('[role="option"][aria-label="Page 1"]').type('{esc}');

        cy.get('.bp-gallery-grid').should('not.exist');
        cy.get('@currentPage').should('have.text', '1 / 2');
        cy.getByTitle('Gallery view')
            .should('have.focus')
            .and('have.attr', 'aria-pressed', 'false');
    });

    [null, false].forEach(galleryEnabled => {
        const flagState = galleryEnabled === null ? 'omitted' : 'disabled';

        it(`Should hide the gallery toggle when the feature flag is ${flagState}`, () => {
            showDocumentPreview({ galleryEnabled });

            cy.showControls();
            cy.getByTitle('Gallery view').should('not.exist');
        });
    });

    it('Should hide the gallery toggle for a single-page document', () => {
        showDocumentPreview({ targetFileId: singlePageFileId });

        cy.showControls();
        cy.getByTitle('Gallery view').should('not.exist');
    });

    it('Should hide the gallery toggle for a document above the page limit', () => {
        showDocumentPreview({ targetFileId: largeFileId });

        cy.showControls();
        cy.getByTitle('Gallery view').should('not.exist');
    });

    it('Should restore and synchronize the thumbnails sidebar after gallery navigation', () => {
        showDocumentPreview({ enableThumbnailsSidebar: true });
        cy.getByTestId('thumbnails-sidebar').should('be.visible');
        cy.get('.bp-thumbnail[data-bp-page-num="1"] .bp-thumbnail-image').should('exist');

        openGallery();
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(301); // Wait for the thumbnails sidebar transition to complete
        cy.getByTestId('thumbnails-sidebar').should('not.be.visible');
        cy.get('[role="option"][aria-label="Page 2"]').click();

        cy.getPreviewPage(2).should('be.visible');
        cy.getByTestId('thumbnails-sidebar').should('be.visible');
        cy.get('.bp-thumbnail[data-bp-page-num="2"]')
            .should('have.class', THUMBNAIL_SELECTED_CLASS)
            .find('.bp-thumbnail-image')
            .should('exist');
    });
});
