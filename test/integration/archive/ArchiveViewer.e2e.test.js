// <reference types="Cypress" />
describe('Archive Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_ARCHIVE');
    const fileIdLarge = Cypress.env('FILE_ID_ARCHIVE_LARGE');

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should render correct item list', () => {
        cy.showPreview(token, fileId);
        // clicking folder
        cy.getByTitle('Preview SDK Sample Archive').within(() => {
            cy.get('button').click();
        });
        cy.contains('Level 1 Folder').click();
        cy.contains('XSS.txt');
        cy.contains('Level 2 Folder').click();
        cy.contains('Video (Normal).mp4');
        // clicking breadcrumb
        cy.contains('Level 1 Folder').click();
        cy.contains('XSS.txt');
    });

    it('Should sort items when column header is clicked', () => {
        cy.showPreview(token, fileId);
        cy.getByTitle('Preview SDK Sample Archive').within(() => {
            cy.get('button').click();
        });
        // folders are in front of files
        cy.get('.ReactVirtualized__Table__row')
            .first()
            .contains('Level 1 Folder');

        // default sort by name
        cy.get('.ReactVirtualized__Table__row')
            .eq(1)
            .contains('Audio.mp3');

        // reverse
        cy.getByTitle('Name').click();
        cy.get('.ReactVirtualized__Table__row')
            .eq(1)
            .contains('Preview SDK Sample Excel.xlsx');
    });

    it('Should show matched item list based on search query', () => {
        cy.showPreview(token, fileId);
        cy.getByTitle('Preview SDK Sample Archive').within(() => {
            cy.get('button').click();
        });

        cy.getByTestId('search-input').type('level');
        cy.contains('Level 2 Folder');

        cy.getByTestId('search-input').clear();
        cy.contains('Preview SDK Sample Excel.xlsx');

        // fuzzy search
        cy.getByTestId('search-input').type('vido');
        cy.contains('Video (Normal).mp4');
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
