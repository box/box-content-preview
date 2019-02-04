Cypress.Commands.add('getByTestId', (testId) => cy.get(`[data-testid="${testId}"]`));
Cypress.Commands.add('getByTitle', (title) => cy.get(`[title="${title}"]`));
Cypress.Commands.add('showPreview', (token, fileId, options) => {
    cy.getByTestId('token').type(token);
    cy.getByTestId('token-set').click();
    cy.getByTestId('fileid').type(fileId);
    cy.getByTestId('fileid-set').click();

    if (options) {
        cy.window().then((win) => {
            win.loadPreview(options);
        });
    }

    // Wait for .bp to load viewer
    cy.getByTestId('bp').should('have.class', 'bp-loaded')
});
