Cypress.Commands.add('getByTestId', (testId) => cy.get(`[data-testid="${testId}"]`));
Cypress.Commands.add('getByTitle', (title) => cy.get(`[title="${title}"]`));
Cypress.Commands.add('showPreview', (token, fileId) => {
    cy.get('[data-cy="token"]').type(token);
    cy.get('[data-cy="token-set"]').click();
    cy.get('[data-cy="fileid"]').type(fileId);
    cy.get('[data-cy="fileid-set"]').click();
});
