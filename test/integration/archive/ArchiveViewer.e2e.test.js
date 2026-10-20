// <reference types="Cypress" />
describe('Archive Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdLarge = Cypress.env('FILE_ID_ARCHIVE_LARGE');

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should reset scroll when navigating folders', () => {
        cy.showPreview(token, fileIdLarge);

        cy.getByTitle('Collection').within(() => {
            cy.get('button').click();
        });

        cy.get('.ReactVirtualized__Table__Grid').then($tables => {
            const table = $tables[0];
            table.scrollTo(0, 50);

            const tableTop = table.getBoundingClientRect().top;
            cy.get('.ReactVirtualized__Table__row').then($rows => {
                expect($rows[0].getBoundingClientRect().top).not.to.equal(tableTop);
            });

            cy.getByTitle('Collection Child').within(() => {
                cy.get('button').click();
            });

            cy.get('.ReactVirtualized__Table__row').then($rows => {
                expect($rows[0].getBoundingClientRect().top).to.equal(tableTop);
            });
        });
    });
});
