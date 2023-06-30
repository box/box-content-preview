Cypress.Commands.add('getByTestId', (testId, options = {}) => cy.get(`[data-testid="${testId}"]`, options));
Cypress.Commands.add('getByTitle', (title, options = {}) => cy.get(`[title="${title}"]`, options));
Cypress.Commands.add('getPreviewPage', pageNum => {
    cy.get(`.page[data-page-number=${pageNum}]`)
        .as('previewPage')
        .find('.loadingIcon')
        .should('not.exist');

    return cy.get('@previewPage');
});

Cypress.Commands.add('hasThumbnails', () => {
    cy.get('.bp-thumbnail').each($ele => {
        cy.wrap($ele).should('have.class', 'bp-thumbnail-image-loaded');
    });
});

Cypress.Commands.add('showPreview', (token, fileId, options) => {
    cy.intercept('GET', '**/files/*').as('getFileInfo');

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
    cy.getByTestId('bp-content').trigger('mousemove');
    cy.getByTestId('bp-controls').should('be.visible');
});

Cypress.Commands.add('showMediaControls', () => {
    // Hover over the preview to trigger the controls
    cy.getByTestId('bp').trigger('mouseover');
    // Assert that the controls are shown
    return cy.getByTestId('media-controls-wrapper').should('be.visible');
});
