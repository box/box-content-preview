Cypress.Commands.add('getByTestId', (testId, options = {}) => cy.get(`[data-testid="${testId}"]`, options));
Cypress.Commands.add('getByTitle', (title, options = {}) => cy.get(`[title="${title}"]`, options));
Cypress.Commands.add('getPreviewPage', pageNum => {
    cy.get(`.page[data-page-number=${pageNum}]`)
        .as('previewPage')
        // Adding timeout here because sometimes it takes more than the Cypress
        // default timeout to render the preview
        .find('.loadingIcon', { timeout: 15000 })
        .should('not.exist');

    return cy.get('@previewPage');
});
Cypress.Commands.add('showPreview', (token, fileId, options) => {
    cy.server();
    cy.route('**/files/*').as('getFileInfo');

    cy.getByTestId('token').type(token);
    cy.getByTestId('token-set').click();
    cy.getByTestId('fileid').type(fileId);
    cy.getByTestId('fileid-set').click();

    cy.window().then(win => {
        win.loadPreview(options);
    });

    cy.wait('@getFileInfo');

    // Wait for .bp to load viewer
    return cy.getByTestId('bp', { timeout: 15000 }).should('have.class', 'bp-loaded');
});

Cypress.Commands.add('showControls', () => {
    cy.getByTestId('bp').trigger('mouseover');
    cy.getByTestId('bp-controls').should('be.visible');
});
