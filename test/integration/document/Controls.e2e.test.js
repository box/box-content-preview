// <reference types="Cypress" />
describe('Preview Document Controls', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');

    /* eslint-disable */
    const getPage = (pageNum) => cy.get(`.page[data-page-number=${pageNum}]`);
    const showControls = () => {
        // Hover over the preview to trigger the controls
        cy.getByTestId('bp').trigger('mouseover');
        // Assert that the controls are shown
        cy.getByTestId('controls-wrapper').should('be.visible');
    };
    /* eslint-enable */

    beforeEach(() => {
        cy.visit('/');
        // Show the preview
        cy.showPreview(token, fileId);
    });

    it('Should zoom in and out', () => {
        // Assert document content is present
        cy.contains('The Content Platform for Your Apps');
        // Get the current dimensions of the page
        getPage(1).then(($page) => {
            cy.wrap($page[0].scrollWidth).as('origWidth');
            cy.wrap($page[0].scrollHeight).as('origHeight');
        });

        showControls();
        // Click the zoom out button
        cy.getByTestId('Zoom out').click();

        getPage(1).then(($page) => {
            const zoomedOutWidth = $page[0].scrollWidth;
            const zoomedOutHeight = $page[0].scrollHeight;

            cy.get('@origWidth').then((origWidth) => expect(origWidth).to.be.above(zoomedOutWidth));
            cy.get('@origHeight').then((origHeight) => expect(origHeight).to.be.above(zoomedOutHeight));

            cy.wrap(zoomedOutWidth).as('zoomedOutWidth');
            cy.wrap(zoomedOutHeight).as('zoomedOutHeight');
        });

        // Hover over the preview to trigger the controls
        cy.getByTestId('bp').trigger('mouseover');
        // Assert that the controls are shown
        cy.getByTestId('controls-wrapper').should('be.visible');
        // Click the zoom out button
        cy.getByTestId('Zoom in').click();

        getPage(1).then(($page) => {
            const zoomedInWidth = $page[0].scrollWidth;
            const zoomedInHeight = $page[0].scrollHeight;

            cy.get('@zoomedOutWidth').then((zoomedOutWidth) => expect(zoomedOutWidth).to.be.below(zoomedInWidth));
            cy.get('@zoomedOutHeight').then((zoomedOutHeight) => expect(zoomedOutHeight).to.be.below(zoomedInHeight));
        });
    });

    it('Should handle page navigation via buttons', () => {
        getPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.getByTestId('current-page').invoke('text').should('equal', '1');

        showControls();
        cy.getByTestId('Next page').click();

        getPage(2).should('be.visible');
        cy.contains('Discover how your business can use Box Platform');
        cy.getByTestId('current-page').invoke('text').should('equal', '2');

        showControls();
        cy.getByTestId('Previous page').click();

        getPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.getByTestId('current-page').invoke('text').should('equal', '1');
    });

    it('Should handle page navigation via input', () => {
        getPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.getByTestId('current-page').invoke('text').should('equal', '1');

        showControls();
        cy.getByTestId('Click to enter page number').click();
        cy.getByTestId('page-num-input').should('be.visible').type('2').blur();
        // cy.getByTestId('page-num-input').type('2').blur();

        getPage(2).should('be.visible');
        cy.contains('Discover how your business can use Box Platform');
        cy.getByTestId('current-page').invoke('text').should('equal', '2');
    });

    // Fullscreen won't allow a non user gesture to trigger fullscreen
    // There is an open issue for cypress to allow this
    // https://github.com/cypress-io/cypress/issues/1213
    //
    // it('Should handle going fullscreen', () => {
    //     getPage(1).should('be.visible');
    //     cy.contains('The Content Platform for Your Apps');
    //     showControls();
    //     cy.getByTestId('Enter fullscreen').should('be.visible').click();
    //     cy.getByTestId('Exit fullscreen').should('be.visible');
    // });
});
