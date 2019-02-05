Cypress.Commands.add('getByTestId', (testId) => cy.get(`[data-testid="${testId}"]`));
Cypress.Commands.add('getByTitle', (title) => cy.get(`[title="${title}"]`));
Cypress.Commands.add('getPreviewPage', (pageNum) => {
    cy
        .get(`.page[data-page-number=${pageNum}]`)
        .as('previewPage')
        // Adding 10s timeout here because there's no reliable way to wait for
        // the page to finish rendering
        .find('[data-testid="page-loading-indicator"]', { timeout: 10000 })
        .should('not.exist');

    return cy.get('@previewPage');
});
Cypress.Commands.add('showDocumentControls', () => {
    cy.getByTestId('bp').trigger('mousemove');
    return cy.getByTestId('controls-wrapper').should('be.visible');
});
Cypress.Commands.add('showPreview', (token, fileId, options) => {
    cy.getByTestId('token').type(token);
    cy.getByTestId('token-set').click();
    cy.getByTestId('fileid').type(fileId);
    cy.getByTestId('fileid-set').click();

    if (options) {
        cy.window().then((win) => {
            win.loadPreview(options);
        });
    } else {
        cy.getByTestId('load-preview').click();
    }

    // Wait for .bp to load viewer
    return cy.getByTestId('bp').should('have.class', 'bp-loaded');
});
