// <reference types="Cypress" />
describe('Presentation Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_PRESENTATION');
    const fileWithLinksId = Cypress.env('FILE_ID_PRESENTATION_WITH_LINKS');

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should initialize preview on the same page it was closed on', () => {
        cy.showPreview(token, fileId);

        // Assert document content is present
        cy.contains('For');
        cy.contains('Teaching Economics');

        cy.showControls();

        // Navigate to the second page so it gets cached
        cy.getByTitle('Next page').click();

        // Refreshes preview
        cy.reload();

        cy.getPreviewPage(2).should('be.visible');
    });

    it('Should navigate to a specified page when an internal link is clicked', () => {
        cy.showPreview(token, fileWithLinksId);

        // Assert document content is present and clickable
        cy.contains('LINK TO PAGE 3');

        // Internal links should be rendered with <a> tags by PDF.js
        cy.getByTestId('bp-content')
            .find('a')
            .click();

        cy.getPreviewPage(3).should('be.visible');
    });

    it('Should keep links clickable when PDF.js inserts the annotation layer before the text layer', () => {
        cy.showPreview(token, fileWithLinksId, {
            enableAnnotationsDiscoverability: true,
            showAnnotations: true,
            showAnnotationsControls: true,
        });

        cy.get('.ba-RegionCreation-creator').should('exist');
        cy.get('.annotationLayer .linkAnnotation > a').then($link => {
            const annotationLayer = $link[0].closest('.annotationLayer');
            const textLayer = annotationLayer.parentElement.querySelector('.textLayer');

            // npm PDF.js inserts the annotation layer earlier than the vendored build.
            annotationLayer.parentElement.insertBefore(annotationLayer, textLayer);
        });
        cy.get('.annotationLayer .linkAnnotation > a').click();

        cy.getPreviewPage(3).should('be.visible');
    });
});
