// <reference types="Cypress" />
describe('Preview Document Controls', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileId);
        cy.getByTestId('bp-PageControlsForm-button').as('currentPage');
        cy.getPreviewPage(1);
    });

    describe('Zoom controls', () => {
        const zoom = inOrOut => {
            cy.getByTestId('bp-ZoomControls-current').then($zoom => {
                const originalZoom = $zoom.text();

                cy.getByTitle(`Zoom ${inOrOut}`).click();
                cy.getByTestId('bp-ZoomControls-current').should('not.have.text', originalZoom);
            });
        };

        it('Should zoom in and out', () => {
            // Assert document content is present
            cy.contains('The Content Platform for Your Apps');
            // Get the current dimensions of the page
            cy.getPreviewPage(1).then($page => {
                cy.wrap($page[0].scrollWidth).as('originalWidth');
                cy.wrap($page[0].scrollHeight).as('originalHeight');
            });

            cy.showControls();

            zoom('out');

            cy.getPreviewPage(1).then($page => {
                const zoomedOutWidth = $page[0].scrollWidth;
                const zoomedOutHeight = $page[0].scrollHeight;

                cy.get('@originalWidth').then(originalWidth => expect(originalWidth).to.be.above(zoomedOutWidth));
                cy.get('@originalHeight').then(originalHeight => expect(originalHeight).to.be.above(zoomedOutHeight));

                cy.wrap(zoomedOutWidth).as('zoomedOutWidth');
                cy.wrap(zoomedOutHeight).as('zoomedOutHeight');
            });

            cy.showControls();

            zoom('in');

            cy.getPreviewPage(1).then($page => {
                const zoomedInWidth = $page[0].scrollWidth;
                const zoomedInHeight = $page[0].scrollHeight;

                cy.get('@zoomedOutWidth').then(zoomedOutWidth => expect(zoomedOutWidth).to.be.below(zoomedInWidth));
                cy.get('@zoomedOutHeight').then(zoomedOutHeight => expect(zoomedOutHeight).to.be.below(zoomedInHeight));
            });
        });
    });

    describe('Document page controls', () => {
        it('Should handle page navigation via buttons', () => {
            cy.getPreviewPage(1).should('be.visible');
            cy.contains('The Content Platform for Your Apps');
            cy.get('@currentPage').should('have.text', '1 / 2');

            cy.showControls();
            cy.getByTitle('Next page').click();

            cy.getPreviewPage(2).should('be.visible');
            cy.contains('Discover how your business can use Box Platform');
            cy.get('@currentPage').should('have.text', '2 / 2');

            cy.showControls();
            cy.getByTitle('Previous page').click();

            cy.getPreviewPage(1).should('be.visible');
            cy.contains('The Content Platform for Your Apps');
            cy.get('@currentPage').should('have.text', '1 / 2');
        });

        it('Should handle page navigation via input', () => {
            cy.getPreviewPage(1).should('be.visible');
            cy.contains('The Content Platform for Your Apps');
            cy.get('@currentPage').should('have.text', '1 / 2');

            cy.showControls();
            cy.getByTitle('Click to enter page number').click();
            cy.getByTestId('bp-PageControlsForm-input').should('be.visible');
            cy.getByTestId('bp-PageControlsForm-input').type('2');
            cy.getByTestId('bp-PageControlsForm-input').blur();

            cy.getPreviewPage(2).should('be.visible');
            cy.contains('Discover how your business can use Box Platform');
            cy.get('@currentPage').should('have.text', '2 / 2');
        });
    });

    describe('Document find bar control', () => {
        it('Should open the findbar', () => {
            cy.getPreviewPage(1).should('be.visible');
            cy.contains('The Content Platform for Your Apps');

            cy.getByTestId('document-findbar').should('not.be.visible');

            cy.showControls();
            cy.getByTitle('Toggle findbar').click();
            cy.getByTestId('document-findbar').should('be.visible');

            cy.showControls();
            cy.getByTitle('Toggle findbar').click();
            cy.getByTestId('document-findbar').should('not.be.visible');
        });
    });

    // Fullscreen won't allow a non user gesture to trigger fullscreen
    // There is an open issue for cypress to allow this
    // https://github.com/cypress-io/cypress/issues/1213
    //
    // it('Should handle going fullscreen', () => {
    //     cy.getPreviewPage(1).should('be.visible');
    //     cy.contains('The Content Platform for Your Apps');
    //     cy.showControls();
    //     cy.getByTitle('Enter fullscreen').should('be.visible').click();
    //     cy.getByTitle('Exit fullscreen').should('be.visible');
    // });
});
