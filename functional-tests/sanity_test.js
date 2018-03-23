const { FILE_ID_DOC, SELECTOR_BOX_PREVIEW_LOADED } = require('./constants');

Feature('Sanity', { retries: 3 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

Scenario('Sanity test @ci @chrome @firefox @edge @safari @ie @android @ios', (I) => {
    Before(() => {
        /* eslint-disable */
        I.executeScript(function() {
            window.showPreview(FILE_ID_DOC, {});
        });
        /* eslint-enable */
    });
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);

    I.waitForText('The Content Platform for Your Apps');
});
