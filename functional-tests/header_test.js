const { SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD, SELECTOR_DOWNLOAD_IFRAME } = require('./constants');
const { expect } = require('chai');

Feature('Header');

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

Scenario('Download the file @ci', function*(I) {
    I.waitForVisible(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
    I.click(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
    I.waitForElement(SELECTOR_DOWNLOAD_IFRAME);
    const src = yield I.grabAttributeFrom(SELECTOR_DOWNLOAD_IFRAME, 'src');
    const urlRegex = /https:\/\/dl[0-9]*\.boxcloud\.com.+\/download/;
    expect(urlRegex.test(src)).to.be.true;
});
