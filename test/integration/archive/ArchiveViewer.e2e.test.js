// <reference types="Cypress" />
describe('Archive Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_ARCHIVE');

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileId);
    });

    it('Should render correct item list', () => {
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
});
