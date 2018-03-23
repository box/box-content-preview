const { showPreview, waitForLoad } = require('./helpers');

Feature('Sanity', { retries: 3 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
    showPreview(I);
    waitForLoad(I);
});

Scenario('Sanity test @ci @chrome @firefox @edge @safari @ie @android @ios', (I) => {
    I.waitForText('The Content Platform for Your Apps');
});
