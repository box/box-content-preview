Cypress.Commands.add('getByTestId', (testId) => cy.get(`[data-testid="${testId}"]`));
Cypress.Commands.add('getByTitle', (title) => cy.get(`[title="${title}"]`));
Cypress.Commands.add('showPreview', (token, fileId) => {
    cy.get('#token-set').type(token);
    cy.get('#token > button').click();
    cy.get('#fileid-set').type(fileId);
    cy.get('#file > button').click();
});
