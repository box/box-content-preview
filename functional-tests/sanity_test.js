const { FILE_ID_DOC } = require('./constants');
const { showPreview } = require('./helpers');

Feature('Sanity', { retries: 3 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

Scenario('Sanity test', (I) => {
    showPreview(I, FILE_ID_DOC);
    I.waitForText('The Content Platform for Your Apps');
});
