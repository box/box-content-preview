/* eslint-disable no-unused-expressions */
import PageControls from '../PageControls';
import { CLASS_HIDDEN } from './../constants';
import fullscreen from '../Fullscreen';
import Browser from '../Browser';
import { decodeKeydown } from '../util';
import { ICON_DROP_DOWN, ICON_DROP_UP } from '../icons/icons';

let controls;
let clock;

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
        controls = new PageControls(document.getElementById('test-page-controls-container'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
        });
    });

    describe('checkPaginationButtons()', () => {
        beforeEach(() => {
            const pageNumButtonEl = document.createElement('div');
            pageNumButtonEl.className = 'bp-doc-page-num';
            pageNumButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(pageNumButtonEl);

            const previousPageButtonEl = document.createElement('div');
            previousPageButtonEl.className = 'bp-previous-page';
            previousPageButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(previousPageButtonEl);

            const nextPageButtonEl = document.createElement('div');
            nextPageButtonEl.className = 'bp-next-page';
            nextPageButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(nextPageButtonEl);

            docBase.pdfViewer = {
                pagesCount: 0,
                currentPageNumber: 1
            };

            stubs.pageNumButtonEl = pageNumButtonEl;
            stubs.previousPageButtonEl = previousPageButtonEl;
            stubs.nextPageButtonEl = nextPageButtonEl;
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Safari');
            stubs.fullscreen = sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        afterEach(() => {
            docBase.containerEl.innerHTML = '';
            docBase.pdfViewer = undefined;
        });

        it('should disable/enable page number button el based on current page and browser type', () => {
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.pagesCount = 6;
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            stubs.fullscreen.returns('false');
            stubs.browser.returns('Chrome');
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable previous page button el based on current page', () => {
            docBase.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.currentPageNumber = 20;
            docBase.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable next page button el based on current page', () => {
            docBase.pdfViewer.currentPageNumber = 20;
            docBase.pdfViewer.pagesCount = 20;

            docBase.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.currentPageNumber = 1;
            docBase.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).to.equal(false);
        });
    });

    describe('initPageNumEl()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                pagesCount: 5
            };
            stubs.totalPageEl = {
                textContent: 0,
                setAttribute: sandbox.stub()
            };
            stubs.querySelector = {
                querySelector: sandbox.stub().returns(stubs.totalPageEl)
            };
            docBase.controls = {
                controlsEl: {
                    querySelector: sandbox.stub().returns(stubs.querySelector)
                }
            };
        });

        it('should set the text content on the total page element', () => {
            docBase.initPageNumEl();

            expect(docBase.controls.controlsEl.querySelector).to.be.called;
            expect(stubs.querySelector.querySelector).to.be.called;
            expect(stubs.totalPageEl.textContent).to.equal(5);
        });

        it('should keep track of the page number input and current page elements', () => {
            docBase.initPageNumEl();

            expect(docBase.pageNumInputEl).to.equal(stubs.totalPageEl);
            expect(docBase.currentPageEl).to.equal(stubs.totalPageEl);
        });
    });

    describe('showPageNumInput()', () => {
        it('should set the page number input value, focus, select, and add listeners', () => {
            docBase.controls = {
                controlsEl: {
                    classList: {
                        add: sandbox.stub()
                    }
                }
            };
            docBase.currentPageEl = 0;
            docBase.pageNumInputEl = {
                value: 0,
                focus: sandbox.stub(),
                select: sandbox.stub(),
                addEventListener: sandbox.stub()
            };

            docBase.showPageNumInput();
            expect(docBase.pageNumInputEl.focus).to.be.called;
            expect(docBase.pageNumInputEl.select).to.be.called;
            expect(docBase.pageNumInputEl.addEventListener).to.be.called.twice;
        });
    });

    describe('hidePageNumInput()', () => {
        it('should hide the input class and remove event listeners', () => {
            docBase.controls = {
                controlsEl: {
                    classList: {
                        remove: sandbox.stub()
                    }
                }
            };
            docBase.pageNumInputEl = {
                removeEventListener: sandbox.stub()
            };

            docBase.hidePageNumInput();
            expect(docBase.controls.controlsEl.classList.remove).to.be.called;
            expect(docBase.pageNumInputEl.removeEventListener).to.be.called;
        });
    });

    describe('updateCurrentPage()', () => {
        it('should only update the page to a valid value', () => {
            docBase.pdfViewer = {
                pagesCount: 10
            };
            docBase.pageNumInputEl = {
                value: 1,
                textContent: 1
            };
            const checkPaginationButtonsStub = sandbox.stub(docBase, 'checkPaginationButtons');

            docBase.updateCurrentPage(-5);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(1);

            docBase.updateCurrentPage(25);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(10);

            docBase.updateCurrentPage(7);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(7);
        });
    });

    describe('pageNumInputBlurHandler()', () => {
        beforeEach(() => {
            docBase.event = {
                target: {
                    value: 5
                }
            };
            stubs.setPageStub = sandbox.stub(docBase, 'setPage');
            stubs.hidePageNumInputStub = sandbox.stub(docBase, 'hidePageNumInput');
        });

        it('should hide the page number input and set the page if given valid input', () => {
            docBase.pageNumInputBlurHandler(docBase.event);
            expect(stubs.setPageStub).to.be.calledWith(docBase.event.target.value);
            expect(stubs.hidePageNumInputStub).to.be.called;
        });

        it('should hide the page number input but not set the page if given invalid input', () => {
            docBase.event.target.value = 'not a number';

            docBase.pageNumInputBlurHandler(docBase.event);
            expect(stubs.setPageStub).to.not.be.called;
            expect(stubs.hidePageNumInputStub).to.be.called;
        });
    });

    describe('pageNumInputKeydownHandler()', () => {
        beforeEach(() => {
            docBase.event = {
                key: 'Enter',
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub(),
                target: {
                    blur: sandbox.stub()
                }
            };
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Explorer');
            stubs.focus = sandbox.stub(docBase.docEl, 'focus');
            stubs.hidePageNumInput = sandbox.stub(docBase, 'hidePageNumInput');
        });

        it('should focus the doc element if IE and stop default actions on \'enter\'', () => {
            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.browser).to.be.called;
            expect(stubs.focus).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });

        it('should blur if not IE and stop default actions on \'enter\'', () => {
            stubs.browser.returns('Chrome');

            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.browser).to.be.called;
            expect(docBase.event.target.blur).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });

        it('should hide the page number input, focus the document, and stop default actions on \'Esc\'', () => {
            docBase.event.key = 'Esc';

            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.hidePageNumInput).to.be.called;
            expect(stubs.focus).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });
    });
});
