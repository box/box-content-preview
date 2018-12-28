const { FILE_ID_DOC, FILE_ID_MP3 } = require('./constants');
const { showPreview } = require('./helpers');

Feature('Sanity', { retries: 3 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
});

Scenario('Sanity test', (I) => {
    showPreview(I, FILE_ID_DOC);
    I.waitForText('The Content Platform for Your Apps');
});

Scenario('Sanity test mp3', (I) => {
    showPreview(I, FILE_ID_MP3);
    I.waitForVisible('.bp-media-mp3');
});
