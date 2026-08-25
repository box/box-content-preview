// <reference types="Cypress" />
describe('Preview Document Gallery', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');
    const largeFileId = Cypress.env('FILE_ID_DOC_LARGE');
    const presentationFileId = Cypress.env('FILE_ID_PRESENTATION');
    const singlePageFileId = Cypress.env('FILE_ID_SINGLE_PAGE');
    const THUMBNAIL_SELECTED_CLASS = 'bp-thumbnail-is-selected';

    const showDocumentPreview = ({
        collection,
        enableThumbnailsSidebar = false,
        galleryEnabled = true,
        enhancedGalleryEnabled = true,
        pinchToZoomEnabled = false,
        targetFileId = fileId,
    } = {}) => {
        const options = {};

        if (galleryEnabled !== null) {
            options.features = {
                galleryView: {
                    enabled: galleryEnabled,
                },
                galleryViewV2: {
                    enabled: enhancedGalleryEnabled,
                },
                pinchToZoom: {
                    enabled: pinchToZoomEnabled,
                },
            };
        }
        if (enableThumbnailsSidebar) {
            options.enableThumbnailsSidebar = true;
        }
        if (collection) {
            options.collection = collection;
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

    const showGalleryWithRenderedThumbnails = (options = {}) => {
        showDocumentPreview({ ...options, enableThumbnailsSidebar: true });
        cy.get('.bp-thumbnail[data-bp-page-num="1"] .bp-thumbnail-image').should('exist');
        openGallery();
        cy.get('.bp-gallery-tile img').should('have.length', 2);
    };

    const expectReleasedResources = viewer => {
        expect(viewer.destroyed).to.be.true;
        expect(viewer.pdfViewer.pdfDocument).to.be.null;
        // PDF.js private state is asserted intentionally: this retained page-view array caused the regression.
        expect(viewer.pdfViewer._pages).to.be.empty;
        expect(viewer.pdfLinkService.pdfDocument).to.be.null;
        expect(viewer.doc).to.be.null;
        expect(viewer.galleryController.galleryThumbnail).to.be.null;
        expect(viewer.thumbnailsSidebar.thumbnail).to.be.null;
    };

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should toggle gallery view with a click and render document thumbnails', () => {
        showDocumentPreview();
        openGallery();

        cy.getByTitle('Gallery view').should('have.attr', 'aria-pressed', 'true');
        cy.get('.bp-gallery-grid[role="grid"]')
            .find('[role="gridcell"]')
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

    it('Should measure the responsive column count and clamp vertical navigation', () => {
        // Default 1600px viewport: both pages fit side by side, so the measured grid is
        // 2 columns x 1 row — distinguishable from the pre-measurement default of 1 column.
        showDocumentPreview();
        openGallery();

        cy.get('.bp-gallery-grid[role="grid"]')
            .should('have.attr', 'aria-colcount', '2')
            .and('have.attr', 'aria-rowcount', '1');
        cy.get('.bp-gallery-grid [role="row"]').should('have.length', 1);
        cy.get('[role="gridcell"][aria-label="Page 1"]').should('have.attr', 'aria-colindex', '1');
        cy.get('[role="gridcell"][aria-label="Page 2"]').should('have.attr', 'aria-colindex', '2');

        // The display: contents row wrapper must not generate a box: tiles share a visual row
        cy.get('.bp-gallery-tile[data-page="1"]').then($first => {
            cy.get('.bp-gallery-tile[data-page="2"]').then($second => {
                expect($first[0].getBoundingClientRect().top).to.equal($second[0].getBoundingClientRect().top);
            });
        });

        // Single row: Down/Up are no-ops (the 1-D listbox would have moved); Right still moves ±1
        cy.get('[role="gridcell"][aria-label="Page 1"]').type('{downArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 1');
        cy.focused().type('{rightArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 2');
        cy.focused().type('{upArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 2');
    });

    it('Should stack rows on a narrow viewport and navigate vertically', () => {
        // Narrow viewport → single column → the 2-page doc stacks into 2 rows
        cy.viewport(500, 800);
        showDocumentPreview();
        openGallery();

        cy.get('.bp-gallery-grid[role="grid"]')
            .should('have.attr', 'aria-colcount', '1')
            .and('have.attr', 'aria-rowcount', '2');
        cy.get('.bp-gallery-grid [role="row"]').should('have.length', 2);
        cy.get('[role="gridcell"][aria-label="Page 1"]').should('have.attr', 'aria-colindex', '1');
        cy.get('[role="gridcell"][aria-label="Page 2"]').should('have.attr', 'aria-colindex', '1');

        // Down/Up move by a row; Right keeps moving ±1 page across row edges
        cy.get('[role="gridcell"][aria-label="Page 1"]').type('{downArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 2');
        cy.focused().type('{upArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 1');
        cy.focused().type('{rightArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 2');
    });

    it('Should keep listbox semantics and 1D arrows when the enhanced gallery flag is off', () => {
        showDocumentPreview({ enhancedGalleryEnabled: false });
        openGallery();

        cy.get('.bp-gallery-grid[role="listbox"]').should('not.have.attr', 'aria-rowcount');
        cy.get('.bp-gallery-grid[role="listbox"]')
            .find('[role="option"]')
            .should('have.length', 2);

        cy.get('[role="option"][aria-label="Page 1"]').type('{downArrow}');
        cy.focused().should('have.attr', 'aria-label', 'Page 2');
    });

    it('Should zoom the gallery independently of the document and persist across reopen', () => {
        showDocumentPreview();
        cy.showControls();
        cy.getByTestId('bp-ZoomControls-current')
            .invoke('text')
            .then(documentScale => {
                openGallery();
                cy.getByTestId('bp-ZoomControls-current').should('have.text', '100%');

                cy.get('.bp-gallery-tile[data-page="1"]').then($tile => {
                    const initialWidth = $tile[0].getBoundingClientRect().width;
                    cy.get('.bp-gallery-tile[data-page="1"] img')
                        .invoke('attr', 'src')
                        .then(initialSrc => {
                            cy.getByTitle('Zoom in').click();
                            cy.getByTestId('bp-ZoomControls-current').should('have.text', '110%');
                            cy.get('.bp-gallery-tile[data-page="1"]').should($zoomedTile => {
                                expect($zoomedTile[0].getBoundingClientRect().width).to.be.greaterThan(initialWidth);
                            });
                            cy.get('.bp-gallery-tile[data-page="1"] img').should('have.attr', 'src', initialSrc);
                        });
                });

                cy.getByTitle('Gallery view').click();
                cy.getByTestId('bp-ZoomControls-current').should('have.text', documentScale);

                openGallery();
                cy.getByTestId('bp-ZoomControls-current').should('have.text', '110%');
            });
    });

    it('Should hide gallery zoom controls when the enhanced gallery flag is off', () => {
        showDocumentPreview({ enhancedGalleryEnabled: false });
        openGallery();

        cy.getByTitle('Zoom in').should('not.exist');
        cy.getByTitle('Zoom out').should('not.exist');
    });

    it('Should update gallery zoom from a trackpad pinch gesture', () => {
        showDocumentPreview({ pinchToZoomEnabled: true });
        openGallery();

        cy.get('.bp-gallery-grid').trigger('wheel', {
            clientX: 300,
            clientY: 300,
            ctrlKey: true,
            deltaY: -10,
            eventConstructor: 'WheelEvent',
        });

        cy.getByTestId('bp-ZoomControls-current').should('have.text', '110%');
    });

    it('Should navigate to a selected page and close gallery view', () => {
        showDocumentPreview();
        cy.getByTestId('bp-PageControlsForm-button')
            .as('currentPage')
            .should('have.text', '1 / 2');
        openGallery();

        cy.get('.bp-gallery-tile[data-page="2"]').click();

        cy.get('.bp-gallery-grid').should('not.exist');
        cy.getPreviewPage(2).should('be.visible');
        cy.get('@currentPage').should('have.text', '2 / 2');
    });

    it('Should navigate a presentation from gallery view', () => {
        showDocumentPreview({ targetFileId: presentationFileId });
        openGallery();

        cy.get('.bp-gallery-tile[data-page="2"]').click();

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

        cy.get('.bp-gallery-tile[data-page="1"]').type('{esc}');

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

    it('Should show the gallery toggle for a large document when enhanced gallery is on', () => {
        showDocumentPreview({ targetFileId: largeFileId });

        cy.showControls();
        cy.getByTitle('Gallery view').should('be.visible');
    });

    it('Should hide the gallery toggle for a document above the page limit when enhanced gallery is off', () => {
        showDocumentPreview({ enhancedGalleryEnabled: false, targetFileId: largeFileId });

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
        cy.get('.bp-gallery-tile[data-page="2"]').click();

        cy.getPreviewPage(2).should('be.visible');
        cy.getByTestId('thumbnails-sidebar').should('be.visible');
        cy.get('.bp-thumbnail[data-bp-page-num="2"]')
            .should('have.class', THUMBNAIL_SELECTED_CLASS)
            .find('.bp-thumbnail-image')
            .should('exist');
    });

    it('Should release document and thumbnail resources when Preview is destroyed', () => {
        showGalleryWithRenderedThumbnails();

        cy.window().then(win => {
            const viewer = win.preview.getCurrentViewer();

            expect(viewer.pdfViewer.pdfDocument).to.exist;
            expect(viewer.pdfViewer._pages).to.have.length(2);
            expect(viewer.galleryController.galleryThumbnail).to.exist;
            expect(viewer.thumbnailsSidebar.thumbnail).to.exist;

            win.preview.hide();

            expectReleasedResources(viewer);
        });
    });

    it('Should release previous document resources when Preview reloads', () => {
        showGalleryWithRenderedThumbnails();

        cy.window().then(win => {
            const viewer = win.preview.getCurrentViewer();
            win.preview.reload(true);
            expectReleasedResources(viewer);
        });

        cy.getPreviewPage(1).should('be.visible');
    });

    it('Should release previous document resources when navigating to the next file', () => {
        showGalleryWithRenderedThumbnails({ collection: [fileId, singlePageFileId] });
        cy.get('.bp-gallery-tile[data-page="1"]').type('{esc}');
        cy.showControls();

        cy.window().then(win => {
            cy.wrap(win.preview.getCurrentViewer()).as('previousViewer');
        });
        cy.getByTitle('Next file').click();
        cy.get('@previousViewer').then(viewer => {
            expectReleasedResources(viewer);
        });

        cy.window()
            .its('preview.file.id')
            .should('equal', singlePageFileId);
    });
});
