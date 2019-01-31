Cypress.Commands.add('getByTestId', (testId) => cy.get(`[data-testid="${testId}"]`));
Cypress.Commands.add('getByTitle', (title) => cy.get(`[title="${title}"]`));
Cypress.Commands.add('showPreview', (token, fileId) => {
    cy.get('[data-testid="token"]').type(token);
    cy.get('[data-testid="token-set"]').click();
    cy.get('[data-testid="fileid"]').type(fileId);
    cy.get('[data-testid="fileid-set"]').click();
});
