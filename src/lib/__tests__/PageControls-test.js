/* eslint-disable no-unused-expressions */
import PageControls from '../PageControls';
import Controls from '../Controls';
import fullscreen from '../Fullscreen';
import Browser from '../Browser';
import { BROWSERS } from '../constants';

let pageControls;
let stubs = {};

const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const PAGE_NUM = 'bp-page-num';
const PREV_PAGE = 'bp-previous-page';
const NEXT_PAGE = 'bp-next-page';

describe('lib/PageControls', () => {
    beforeEach(() => {
        fixture.load('__tests__/PageControls-test.html');
        const controls = new Controls(document.getElementById('test-page-controls-container'));
        pageControls = new PageControls(controls, jest.fn(), jest.fn());
    });

    afterEach(() => {
        fixture.cleanup();

        if (pageControls && typeof pageControls.destroy === 'function') {
            pageControls.destroy();
        }

        pageControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should create the correct DOM structure', () => {
            expect(pageControls.controlsEl).toBeDefined();
        });
    });

    describe('add()', () => {
        beforeEach(() => {
            stubs.currentPageNumber = 1;
            stubs.pagesCount = 10;
            stubs.add = jest.spyOn(pageControls.controls, 'add');
            stubs.checkPaginationButtons = jest.spyOn(pageControls, 'checkPaginationButtons');
        });

        test('should add the page number controls', () => {
            pageControls.add(stubs.currentPageNumber, stubs.pagesCount);

            expect(stubs.add).toBeCalledTimes(3);
        });

        test('should initialize the number of total pages', () => {
            pageControls.add(stubs.currentPageNumber, stubs.pagesCount);

            expect(pageControls.controls.buttonRefs.length).toBe(3);
            expect(parseInt(pageControls.totalPagesEl.textContent, 10)).toBe(stubs.pagesCount);
        });

        test('should initialize the current page number', () => {
            pageControls.add(stubs.currentPageNumber, stubs.pagesCount);

            expect(parseInt(pageControls.currentPageEl.textContent, 10)).toBe(stubs.currentPageNumber);
        });

        test('should check the pagination buttons', () => {
            pageControls.add(stubs.currentPageNumber, stubs.pagesCount);
            expect(stubs.checkPaginationButtons).toBeCalled();
        });
    });

    describe('showPageNumInput()', () => {
        test('should set the page number input value, focus, select, and add listeners', () => {
            pageControls.currentPageEl = 0;
            pageControls.pageNumInputEl = {
                value: 0,
                focus: jest.fn(),
                select: jest.fn(),
                addEventListener: jest.fn(),
            };

            pageControls.showPageNumInput();
            expect(pageControls.controlsEl).toHaveClass(SHOW_PAGE_NUM_INPUT_CLASS);
            expect(pageControls.pageNumInputEl.focus).toBeCalled();
            expect(pageControls.pageNumInputEl.select).toBeCalled();
            expect(pageControls.pageNumInputEl.addEventListener).toBeCalledWith('blur', expect.any(Function));
            expect(pageControls.pageNumInputEl.addEventListener).toBeCalledWith('keydown', expect.any(Function));
        });
    });

    describe('hidePageNumInput()', () => {
        test('should hide the input class and remove event listeners', () => {
            pageControls.pageNumInputEl = {
                removeEventListener: jest.fn(),
            };

            pageControls.hidePageNumInput();
            expect(pageControls.controlsEl).not.toHaveClass(SHOW_PAGE_NUM_INPUT_CLASS);
            expect(pageControls.pageNumInputEl.removeEventListener).toBeCalledWith('blur', expect.any(Function));
            expect(pageControls.pageNumInputEl.removeEventListener).toBeCalledWith('keydown', expect.any(Function));
        });
    });

    describe('checkPaginationButtons()', () => {
        beforeEach(() => {
            pageControls.add(1, 10);
            stubs.pageNumButtonEl = pageControls.controlsEl.querySelector(`.${PAGE_NUM}`);
            stubs.previousPageButtonEl = pageControls.controlsEl.querySelector(`.${PREV_PAGE}`);
            stubs.nextPageButtonEl = pageControls.controlsEl.querySelector(`.${NEXT_PAGE}`);

            stubs.browser = jest.spyOn(Browser, 'getName').mockReturnValue('Safari');
            stubs.fullscreen = jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
        });

        test('should disable/enable page number button el based on current page and browser type', () => {
            pageControls.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).toBe(true);

            stubs.browser.mockReturnValue('Chrome');
            pageControls.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).toBe(false);

            stubs.browser.mockReturnValue('Safari');
            stubs.fullscreen.mockReturnValue(false);
            pageControls.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).toBe(false);

            pageControls.totalPagesEl.textContent = '1';
            pageControls.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).toBe(true);
        });

        test('should disable/enable previous page button el based on current page', () => {
            pageControls.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).toBe(true);

            pageControls.setCurrentPageNumber(3);
            pageControls.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).toBe(false);
        });

        test('should disable/enable next page button el based on current page', () => {
            pageControls.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).toBe(false);

            pageControls.setCurrentPageNumber(10);
            pageControls.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).toBe(true);
        });
    });

    describe('updateCurrentPage()', () => {
        test('should update the page to a value', () => {
            pageControls.pagesCount = 10;
            pageControls.pageNumInputEl = {
                value: 1,
                textContent: 1,
            };
            const checkPaginationButtonsStub = jest.spyOn(pageControls, 'checkPaginationButtons');

            pageControls.updateCurrentPage(7);
            expect(checkPaginationButtonsStub).toBeCalled();
            expect(pageControls.pageNumInputEl.value).toBe(7);
        });
    });

    describe('setPreviousPage()', () => {
        test('should emit the page change event for the previous page', () => {
            stubs.emit = jest.spyOn(pageControls, 'emit');
            stubs.getCurrentPageNumber = jest.spyOn(pageControls, 'getCurrentPageNumber').mockReturnValue(3);

            pageControls.setPreviousPage();
            expect(stubs.emit).toBeCalledWith('pagechange', 2);
        });
    });

    describe('setNextPage()', () => {
        test('should emit the page change event for the next page', () => {
            stubs.emit = jest.spyOn(pageControls, 'emit');
            stubs.getCurrentPageNumber = jest.spyOn(pageControls, 'getCurrentPageNumber').mockReturnValue(3);

            pageControls.setNextPage();
            expect(stubs.emit).toBeCalledWith('pagechange', 4);
        });
    });

    describe('currentPageNumber', () => {
        beforeEach(() => {
            pageControls.currentPageEl = {
                textContent: '1',
            };
        });

        describe('getCurrentPageNumber()', () => {
            test('should return the correct page number', () => {
                const currPageNum = pageControls.getCurrentPageNumber();
                expect(currPageNum).toBe(1);
            });
        });

        describe('setCurrentPageNumber()', () => {
            test('should set the correct value', () => {
                pageControls.setCurrentPageNumber(3);
                const currPageNum = pageControls.getCurrentPageNumber();
                expect(currPageNum).toBe(3);
            });
        });
    });

    describe('getTotalPages()', () => {
        test('should return the total number of pages', () => {
            pageControls.add(1, 10);
            expect(pageControls.getTotalPages()).toBe(10);
        });
    });

    describe('pageNumInputBlurHandler()', () => {
        beforeEach(() => {
            stubs.event = {
                target: {
                    value: 5,
                },
            };
            stubs.emit = jest.spyOn(pageControls, 'emit');
            stubs.hidePageNumInputStub = jest.spyOn(pageControls, 'hidePageNumInput').mockImplementation();
        });

        test('should hide the page number input and set the page if given valid input', () => {
            pageControls.pageNumInputBlurHandler(stubs.event);
            expect(stubs.emit).toBeCalledWith('pagechange', stubs.event.target.value);
            expect(stubs.hidePageNumInputStub).toBeCalled();
        });

        test('should hide the page number input but not set the page if given invalid input', () => {
            stubs.event.target.value = 'not a number';

            pageControls.pageNumInputBlurHandler(stubs.event);
            expect(stubs.emit).not.toBeCalled();
            expect(stubs.hidePageNumInputStub).toBeCalled();
        });
    });

    describe('pageNumInputKeydownHandler()', () => {
        beforeEach(() => {
            stubs.event = {
                key: 'Enter',
                stopPropagation: jest.fn(),
                preventDefault: jest.fn(),
                target: {
                    blur: jest.fn(),
                },
            };
            pageControls.contentEl = {
                focus: jest.fn(),
            };
            stubs.browser = jest.spyOn(Browser, 'getName').mockReturnValue(BROWSERS.INTERNET_EXPLORER);
            stubs.hidePageNumInput = jest.spyOn(pageControls, 'hidePageNumInput').mockImplementation();
        });

        test("should focus the doc element and stop default actions on 'enter'", () => {
            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.browser).toBeCalled();
            expect(pageControls.contentEl.focus).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test("should blur if not IE and stop default actions on 'enter'", () => {
            stubs.browser.mockReturnValue('Chrome');

            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.browser).toBeCalled();
            expect(stubs.event.target.blur).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test("should hide the page number input, focus the document, and stop default actions on 'Esc'", () => {
            stubs.event.key = 'Esc';

            pageControls.pageNumInputKeydownHandler(stubs.event);
            expect(stubs.hidePageNumInput).toBeCalled();
            expect(pageControls.contentEl.focus).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });
    });
});
