/* eslint-disable no-unused-expressions */
import PageControls from '../PageControls';
import Controls from '../Controls';
import { CLASS_HIDDEN } from './../constants';
import fullscreen from '../Fullscreen';
import Browser from '../Browser';
import { decodeKeydown } from '../util';
import { ICON_DROP_DOWN, ICON_DROP_UP } from '../icons/icons';

let pageControls;
let clock;
let stubs = {};

const sandbox = sinon.sandbox.create();

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const RESET_TIMEOUT_CLOCK_TICK = 2001;

const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const CONTROLS_PAGE_NUM_WRAPPER_CLASS = 'bp-page-num-wrapper';
const CONTROLS_CURRENT_PAGE = 'bp-current-page';
const CONTROLS_PAGE_NUM_INPUT_CLASS = 'bp-page-num-input';
const CONTROLS_TOTAL_PAGES = 'bp-total-pages';
const PAGE_NUM = 'bp-page-num';
const PREV_PAGE = 'bp-previous-page';
const NEXT_PAGE = 'bp-next-page';

describe('lib/PageControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/PageControls-test.html');
        const controls = new Controls(document.getElementById('test-page-controls-container'));
        pageControls = new PageControls(controls, sandbox.stub, sandbox.stub);
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (pageControls && typeof pageControls.destroy === 'function') {
            pageControls.destroy();
        }

        pageControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
            expect(pageControls.controlsEl).to.not.be.undefined;
            expect(pageControls.controls.buttonRefs.length).equals(3);
        });
    });

    describe('init()', () => {
        it('should initialize the page number selector', () => {
            const pagesCount = '5';
            pageControls.init(pagesCount);
            const totalPageEl = pageControls.controlsEl.querySelector(`.${CONTROLS_TOTAL_PAGES}`);
            const pageNumInputEl = pageControls.controlsEl.querySelector(`.${CONTROLS_PAGE_NUM_INPUT_CLASS}`);
            expect(pageControls.pagesCount).equals(pagesCount);
            expect(totalPageEl).to.have.text(pagesCount);
            expect(pageNumInputEl).to.have.attr('max', pagesCount);
            expect(pageControls.currentPageEl).to.not.be.undefined;
        });
    });

    describe('showPageNumInput()', () => {
        it('should set the page number input value, focus, select, and add listeners', () => {
            pageControls.currentPageEl = 0;
            pageControls.pageNumInputEl = {
                value: 0,
                focus: sandbox.stub(),
                select: sandbox.stub(),
                addEventListener: sandbox.stub()
            };

            pageControls.showPageNumInput();
            expect(pageControls.controlsEl).to.have.class(SHOW_PAGE_NUM_INPUT_CLASS);
            expect(pageControls.pageNumInputEl.focus).to.be.called;
            expect(pageControls.pageNumInputEl.select).to.be.called;
            expect(pageControls.pageNumInputEl.addEventListener).to.be.calledWith('blur', sinon.match.func);
            expect(pageControls.pageNumInputEl.addEventListener).to.be.calledWith('keydown', sinon.match.func);
        });
    });

    describe('hidePageNumInput()', () => {
        it('should hide the input class and remove event listeners', () => {
            pageControls.pageNumInputEl = {
                removeEventListener: sandbox.stub()
            };

            pageControls.hidePageNumInput();
            expect(pageControls.controlsEl).to.not.have.class(SHOW_PAGE_NUM_INPUT_CLASS);
            expect(pageControls.pageNumInputEl.removeEventListener).to.be.calledWith('blur', sinon.match.func);
            expect(pageControls.pageNumInputEl.removeEventListener).to.be.calledWith('keydown', sinon.match.func);
        });
    });

    describe('checkPaginationButtons()', () => {
        beforeEach(() => {
            stubs.pageNumButtonEl = pageControls.controlsEl.querySelector(`.${PAGE_NUM}`);
            stubs.previousPageButtonEl = pageControls.controlsEl.querySelector(`.${PREV_PAGE}`);
            stubs.nextPageButtonEl = pageControls.controlsEl.querySelector(`.${NEXT_PAGE}`);

            stubs.browser = sandbox.stub(Browser, 'getName').returns('Safari');
            stubs.fullscreen = sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        it('should disable/enable page number button el based on current page and browser type', () => {
            pageControls.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            pageControls.checkPaginationButtons(1, 6);
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            stubs.fullscreen.returns('false');
            stubs.browser.returns('Chrome');
            pageControls.checkPaginationButtons(1, 6);
            expect(stubs.pageNumButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable previous page button el based on current page', () => {
            pageControls.checkPaginationButtons(1, 5);
            expect(stubs.previousPageButtonEl.disabled).to.equal(true);

            pageControls.checkPaginationButtons(20, 20);
            expect(stubs.previousPageButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable next page button el based on current page', () => {
            pageControls.checkPaginationButtons(20, 20);
            expect(stubs.nextPageButtonEl.disabled).to.equal(true);

            pageControls.checkPaginationButtons(1, 20);
            expect(stubs.nextPageButtonEl.disabled).to.equal(false);
        });
    });

    describe('updateCurrentPage()', () => {
        it('should only update the page to a valid value', () => {
            pageControls.pagesCount = 10;
            pageControls.pageNumInputEl = {
                value: 1,
                textContent: 1
            };
            const checkPaginationButtonsStub = sandbox.stub(pageControls, 'checkPaginationButtons');

            pageControls.updateCurrentPage(-5);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(pageControls.pageNumInputEl.value).to.equal(1);

            pageControls.updateCurrentPage(25);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(pageControls.pageNumInputEl.value).to.equal(10);

            pageControls.updateCurrentPage(7);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(pageControls.pageNumInputEl.value).to.equal(7);
        });
    });

    describe('pageNumInputBlurHandler()', () => {
        beforeEach(() => {
            stubs.event = {
                target: {
                    value: 5
                }
            };
            stubs.emit = sandbox.stub(pageControls, 'emit');
            stubs.hidePageNumInputStub = sandbox.stub(pageControls, 'hidePageNumInput');
        });

        it('should hide the page number input and set the page if given valid input', () => {
            pageControls.pageNumInputBlurHandler(stubs.event);
            expect(stubs.emit).to.be.calledWith('setpage', stubs.event.target.value);
            expect(stubs.hidePageNumInputStub).to.be.called;
        });

        it('should hide the page number input but not set the page if given invalid input', () => {
            stubs.event.target.value = 'not a number';

            pageControls.pageNumInputBlurHandler(stubs.event);
            expect(stubs.emit).to.be.not.be.called;
            expect(stubs.hidePageNumInputStub).to.be.called;
        });
    });

    describe('pageNumInputKeydownHandler()', () => {
        beforeEach(() => {
            stubs.event = {
                key: 'Enter',
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub(),
                target: {
                    blur: sandbox.stub()
                }
            };
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Explorer');
            stubs.hidePageNumInput = sandbox.stub(pageControls, 'hidePageNumInput');
        });

        it('should focus the doc element if IE and stop default actions on \'enter\'', () => {
            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.browser).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should blur if not IE and stop default actions on \'enter\'', () => {
            stubs.browser.returns('Chrome');

            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.browser).to.be.called;
            expect(stubs.event.target.blur).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should hide the page number input, focus the document, and stop default actions on \'Esc\'', () => {
            stubs.event.key = 'Esc';

            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.hidePageNumInput).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });
    });
});
