Feature('Sanity', { retries: 3 });
const bpLoaded = '.bp-loaded';
const FILE_ID_DOC = '93392244621';

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

Scenario('Sanity test @ci @chrome @firefox @edge @safari @ie @android @ios', (I) => {
    Before(() => {
        I.executeScript(() => {
            window.showPreview(FILE_ID_DOC, {
                showDownload: true
            });
        });
    });
    I.waitForElement(bpLoaded);
    I.waitForVisible(bpLoaded);
    I.waitForText('The Content Platform for Your Apps');
});

Scenario('Sanity error test @ci @chrome @firefox @edge @safari @ie @android @ios', (I) => {
    I.waitForElement(bpLoaded);
    I.waitForVisible(bpLoaded);
    I.waitForText('The Content Platform for Your Apps');
});
