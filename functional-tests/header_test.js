const { SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD, SELECTOR_DOWNLOAD_IFRAME, FILE_ID_DOC } = require('./constants');
const { expect } = require('chai');

const { CI } = process.env;

Feature('Header', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
    /* eslint-disable */
    I.executeScript(function() {
        window.showPreview(FILE_ID_DOC, {
            showDownload: true
        });
    });
    /* eslint-enable */
});

Scenario('Download the file @ci @chrome @firefox @edge @safari @ie', function*(I) {
    I.waitForVisible(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
    I.click(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
    I.waitForElement(SELECTOR_DOWNLOAD_IFRAME);
    const src = yield I.grabAttributeFrom(SELECTOR_DOWNLOAD_IFRAME, 'src');
    const urlRegex = /https:\/\/dl[0-9]*\.boxcloud\.com.+\/download/;
    expect(urlRegex.test(src)).to.be.true;
});
