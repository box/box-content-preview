// <reference types="Cypress" />
describe('Archive Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdLarge = Cypress.env('FILE_ID_ARCHIVE_LARGE');
    // Keeps the folder button clickable without auto-scroll
    const SCROLL_OFFSET_PX = 10;

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should reset scroll when navigating folders', () => {
        cy.showPreview(token, fileIdLarge);

        cy.getByTitle('Collection').within(() => {
            cy.get('button').click();
        });

        cy.getByTitle('Collection Child').should('be.visible');
        cy.get('.ReactVirtualized__Table__Grid').scrollTo(0, SCROLL_OFFSET_PX);
        cy.get('.ReactVirtualized__Table__Grid').should($grid => {
            expect($grid[0].scrollTop).to.equal(SCROLL_OFFSET_PX);
        });

        cy.getByTitle('Collection Child').within(() => {
            cy.get('button').click({ scrollBehavior: false });
        });

        cy.getByTestId('bp-archive-breadcrumbs').should('contain', 'Collection Child');
        cy.get('.ReactVirtualized__Table__Grid').should($grid => {
            expect($grid[0].scrollHeight).to.be.greaterThan($grid[0].clientHeight);
            expect($grid[0].scrollTop).to.equal(0);
        });
    });
});
