const {
    SELECTOR_BOX_PREVIEW_LOADED,
    SELECTOR_DOC_CURRENT_PAGE,
    SELECTOR_BOX_PREVIEW_ZOOM_OUT_BUTTON,
    SELECTOR_DOC_FIRST_PAGE,
    SELECTOR_BOX_PREVIEW_ZOOM_IN_BUTTON,
    SELECTOR_BOX_PREVIEW_NEXT_PAGE,
    SELECTOR_BOX_PREVIEW_PREVIOUS_PAGE,
    SELECTOR_BOX_PREVIEW_NUM_INPUT,
    SELECTOR_BOX_PREVIEW_ENTER_FULLSCREEN_ICON,
    SELECTOR_BOX_PREVIEW_EXIT_FULLSCREEN_ICON,
    SELECTOR_BOX_PREVIEW_PAGE_NUM_WRAPPER
} = require('./constants');
const assert = require('assert');

const { makeNavAppear, zoom, getIsFullscreen } = require('./helpers');

const { CI } = process.env;

Feature('Controls', { retries: CI ? 3 : 0 });

Before((I) => {
    I.amOnPage('/functional-tests/index.html');
    I.waitForElement(SELECTOR_BOX_PREVIEW_LOADED);
});

Scenario('Check document preview zoom @ci @chrome @firefox @edge @ie @safari @android @ios', function*(I) {
    // zoom out
    const origWidth = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollWidth');
    const origHeight = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollHeight');

    zoom(I, SELECTOR_BOX_PREVIEW_ZOOM_OUT_BUTTON);

    const zoomedOutWidth = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollWidth');
    const zoomedOutHeight = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollHeight');

    assert.ok(parseInt(origWidth, 10) > parseInt(zoomedOutWidth, 10));
    assert.ok(parseInt(origHeight, 10) > parseInt(zoomedOutHeight, 10));

    // zoom in
    zoom(I, SELECTOR_BOX_PREVIEW_ZOOM_IN_BUTTON);

    const zoomedInWidth = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollWidth');
    const zoomedInHeight = yield I.grabAttributeFrom(SELECTOR_DOC_FIRST_PAGE, 'scrollHeight');

    assert.ok(parseInt(zoomedOutWidth, 10) < parseInt(zoomedInWidth, 10));
    assert.ok(parseInt(zoomedOutHeight, 10) < parseInt(zoomedInHeight, 10));
});

Scenario('Check document preview navigation @ci @chrome @firefox @edge @ie @safari @android @ios', function*(I) {
    const FIRST_PAGE = '#bp-page-1';
    const SECOND_PAGE = '#bp-page-2';

    makeNavAppear(I);

    // go to page 2
    I.waitForVisible(SELECTOR_BOX_PREVIEW_NEXT_PAGE);
    const origPage = yield I.grabTextFrom(SELECTOR_DOC_CURRENT_PAGE);
    assert.equal(origPage, '1');
    I.seeElement(FIRST_PAGE);
    const isPreviousDisabled = yield I.grabAttributeFrom(SELECTOR_BOX_PREVIEW_PREVIOUS_PAGE, 'disabled');
    assert.ok(isPreviousDisabled);
    I.click(SELECTOR_BOX_PREVIEW_NEXT_PAGE);
    let newPage = yield I.grabTextFrom(SELECTOR_DOC_CURRENT_PAGE);
    assert.equal(newPage, '2');
    I.seeElement(SECOND_PAGE);

    // go to page 1
    makeNavAppear(I);
    const isNextDisabled = yield I.grabAttributeFrom(SELECTOR_BOX_PREVIEW_NEXT_PAGE, 'disabled');
    assert.ok(isNextDisabled);
    I.click(SELECTOR_BOX_PREVIEW_PREVIOUS_PAGE);
    newPage = yield I.grabTextFrom(SELECTOR_DOC_CURRENT_PAGE);
    assert.equal(newPage, '1');
    I.seeElement(FIRST_PAGE);

    // go to page 2 by typing into input
    makeNavAppear(I);
    I.click(SELECTOR_BOX_PREVIEW_PAGE_NUM_WRAPPER);
    I.waitForVisible(SELECTOR_BOX_PREVIEW_NUM_INPUT);
    I.click(SELECTOR_BOX_PREVIEW_NUM_INPUT);
    I.pressKey('2');
    I.pressKey('Enter');
    I.waitForVisible(SELECTOR_BOX_PREVIEW_NEXT_PAGE);
    I.seeElement(SECOND_PAGE);
});

Scenario('Check document preview fullscreen @ci @chrome @firefox @edge @ie @safari @android @ios', function*(I) {
    makeNavAppear(I);

    // Enter fullscreem
    I.waitForVisible(SELECTOR_BOX_PREVIEW_ENTER_FULLSCREEN_ICON);
    I.click(SELECTOR_BOX_PREVIEW_ENTER_FULLSCREEN_ICON);
    I.waitForInvisible(SELECTOR_BOX_PREVIEW_ENTER_FULLSCREEN_ICON);

    let isFullscreen = yield I.executeScript(getIsFullscreen);

    assert.ok(isFullscreen);

    makeNavAppear(I);

    // Exit fullscreem
    I.waitForVisible(SELECTOR_BOX_PREVIEW_EXIT_FULLSCREEN_ICON);
    I.click(SELECTOR_BOX_PREVIEW_EXIT_FULLSCREEN_ICON);
    isFullscreen = yield I.executeScript(getIsFullscreen);
    I.waitForInvisible(SELECTOR_BOX_PREVIEW_EXIT_FULLSCREEN_ICON);

    assert.equal(!!isFullscreen, false);
});
