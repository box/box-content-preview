/* eslint-disable no-unused-expressions */
import * as util from '../../../util';
import Browser from '../../../Browser';
import DocFindBar from '../DocFindBar';
import { CLASS_BOX_PREVIEW_FIND_BAR, CLASS_HIDDEN } from '../../../constants';
import { VIEWER_EVENT, USER_DOCUMENT_FIND_EVENTS } from '../../../events';

const CLASS_FIND_MATCH_NOT_FOUND = 'bp-find-match-not-found';

// Values match FindStates in PDFFindController
const FIND_MATCH_FOUND = 0;
const FIND_MATCH_NOT_FOUND = 1;
const FIND_MATCH_PENDING = 3;

const MATCH_OFFSET = 13;

let containerEl;
let docFindBar;
let eventBus;
let findController;
let stubs = {};

describe('lib/viewers/doc/DocFindBar', () => {
    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocFindBar-test.html');

        containerEl = document.querySelector('.test-container');
        eventBus = { dispatch: jest.fn(), off: jest.fn(), on: jest.fn() };
        findController = {
            executeCommand: jest.fn(),
            linkService: {},
        };
        docFindBar = new DocFindBar(containerEl, findController, eventBus);
    });

    afterEach(() => {
        if (docFindBar && typeof docFindBar.destroy === 'function') {
            docFindBar.destroy();
        }

        docFindBar = null;
        findController = null;

        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        test('should correctly set the object parameters', () => {
            expect(containerEl.querySelector(`.${CLASS_BOX_PREVIEW_FIND_BAR}`)).toBeDefined();
            expect(docFindBar.eventBus).toBe(eventBus);
            expect(docFindBar.findController).toBe(findController);
            expect(docFindBar.opened).toBe(false);
        });

        test('should throw an error if there is no container element', () => {
            docFindBar.destroy();
            containerEl = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).toBe('DocFindBar cannot be used without a container element.');
            }
        });

        test('should throw an error if there is no eventBus', () => {
            docFindBar.destroy();
            eventBus = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).toBe('DocFindBar cannot be used without an EventBus instance.');
            }
        });

        test('should throw an error if there is no findController', () => {
            docFindBar.destroy();
            findController = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).toBe('DocFindBar cannot be used without a PDFFindController instance.');
            }
        });
    });

    describe('createFindField()', () => {
        test('should create the search icon', () => {
            docFindBar.createFindField();

            const searchIconEl = document.querySelector('.bp-doc-find-search');

            expect(searchIconEl.parentNode).toBe(docFindBar.findBarEl);
            expect(searchIconEl.className).toBe('bp-doc-find-search');
        });

        test('should create the input field', () => {
            docFindBar.createFindField();

            const inputFieldEl = document.querySelector('.bp-doc-find-field');

            expect(inputFieldEl.parentNode).toBe(docFindBar.findBarEl);
            expect(inputFieldEl.className).toBe('bp-doc-find-field');
        });

        test('should create the match results count', () => {
            docFindBar.createFindField();

            const resultsCountEl = document.querySelector('.bp-doc-find-results-count');

            expect(resultsCountEl.parentNode).toBe(docFindBar.findBarEl);
            expect(resultsCountEl.classList.contains('bp-doc-find-results-count')).toBe(true);
            expect(resultsCountEl.classList.contains(CLASS_HIDDEN)).toBe(true);
        });
    });

    describe('createFindButtons()', () => {
        test('should create the find buttons with the correct class, and add to the bar', () => {
            docFindBar.createFindButtons();

            expect(docFindBar.findButtonContainerEl.classList.contains('bp-doc-find-controls')).toBe(true);
            expect(docFindBar.findButtonContainerEl.parentNode).toBe(docFindBar.findBarEl);
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.unbindDOMListeners = jest.spyOn(docFindBar, 'unbindDOMListeners').mockImplementation();
            stubs.removeChild = jest.spyOn(docFindBar.findBarEl.parentNode, 'removeChild').mockImplementation();
        });

        test('should unbind DOM listeners', () => {
            docFindBar.destroy();

            expect(stubs.unbindDOMListeners).toBeCalled();
        });

        test('should remove the find bar if it exists', () => {
            docFindBar.destroy();

            expect(stubs.removeChild).toBeCalled();
        });

        test('should not remove the find bar if it does not exist', () => {
            docFindBar.findBarEl = undefined;

            docFindBar.destroy();
            expect(stubs.removeChild).not.toBeCalled();
        });
    });

    describe('dispatchFindEvent()', () => {
        test('should execute the find controller command with the given params on IE', () => {
            jest.spyOn(Browser, 'isIE').mockImplementation(() => true);
            docFindBar.findFieldEl.value = 'value';
            const params = {
                query: docFindBar.findFieldEl.value,
                phraseSearch: true,
                highlightAll: true,
                findPrevious: 'test',
            };

            docFindBar.dispatchFindEvent('string', 'test');
            expect(findController.executeCommand).toBeCalledWith('string', params);
        });

        test('should execute the find controller command with the given params on modern browsers', () => {
            jest.spyOn(Browser, 'isIE').mockImplementation(() => false);
            docFindBar.findFieldEl.value = 'value';
            const params = {
                query: docFindBar.findFieldEl.value,
                phraseSearch: true,
                highlightAll: true,
                findPrevious: 'test',
                type: 'string',
            };

            docFindBar.dispatchFindEvent('string', 'test');
            expect(eventBus.dispatch).toBeCalledWith('find', params);
        });
    });

    describe('updateUIState()', () => {
        beforeEach(() => {
            stubs.updateUIResultsCount = jest.spyOn(docFindBar, 'updateUIResultsCount').mockImplementation();
        });

        test('should update the status and add the correct class if the match is not found', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_NOT_FOUND });

            expect(docFindBar.status).toBe('');
            expect(docFindBar.findFieldEl.classList.contains(CLASS_FIND_MATCH_NOT_FOUND)).toBe(true);
            expect(docFindBar.findFieldEl.getAttribute('data-status')).toBe('');
            expect(stubs.updateUIResultsCount).toBeCalled();
        });

        test('should update the status if the status is pending', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_PENDING });

            expect(docFindBar.status).toBe('pending');
            expect(docFindBar.findFieldEl.getAttribute('data-status')).toBe('pending');
            expect(stubs.updateUIResultsCount).toBeCalled();
        });

        test('should update the status and add the correct class if the status is found', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_FOUND });

            expect(docFindBar.status).toBe('');
            expect(docFindBar.findFieldEl.classList.contains(CLASS_FIND_MATCH_NOT_FOUND)).toBe(false);
            expect(docFindBar.findFieldEl.getAttribute('data-status')).toBe('');
            expect(stubs.updateUIResultsCount).toBeCalled();
        });
    });

    describe('updateUIResultsCount()', () => {
        beforeEach(() => {
            stubs.getBoundingClientRect = jest
                .spyOn(docFindBar.findResultsCountEl, 'getBoundingClientRect')
                .mockReturnValue({
                    width: 5,
                });
        });

        test('should do nothing if there is no find results count element', () => {
            docFindBar.findResultsCountEl = undefined;

            docFindBar.updateUIResultsCount({ matchesCount: { current: 1, total: 2 } });
            expect(stubs.getBoundingClientRect).not.toBeCalled();
        });

        test('should hide the counter if there are no matches', () => {
            docFindBar.updateUIResultsCount({ matchesCount: { current: 0, total: 0 } });

            expect(docFindBar.findResultsCountEl.classList.contains(CLASS_HIDDEN)).toBe(true);
            expect(stubs.getBoundingClientRect).not.toBeCalled();
        });

        test('should adjust padding, and create/show the counter', () => {
            const paddingRight = `${5 + MATCH_OFFSET}px`;

            docFindBar.updateUIResultsCount({ matchesCount: { current: 1, total: 2 } });

            expect(docFindBar.findFieldEl.style.paddingRight).toBe(paddingRight);
            expect(docFindBar.findResultsCountEl.classList.contains(CLASS_HIDDEN)).toBe(false);
            expect(stubs.getBoundingClientRect).toBeCalled();
        });
    });

    describe('setFindFieldElValue()', () => {
        test('should set the findFieldEl value', () => {
            docFindBar.findFieldEl = {
                removeEventListener: jest.fn(),
            };

            docFindBar.setFindFieldElValue('test');

            expect(docFindBar.findFieldEl.value).toBe('test');
        });
    });

    describe('bindDOMListeners()', () => {
        test('should add the correct event listeners', () => {
            const barStub = jest.spyOn(docFindBar.findBarEl, 'addEventListener').mockImplementation();
            const findFieldStub = jest.spyOn(docFindBar.findFieldEl, 'addEventListener').mockImplementation();
            const findPrevStub = jest.spyOn(docFindBar.findPreviousButtonEl, 'addEventListener').mockImplementation();
            const findNextStub = jest.spyOn(docFindBar.findNextButtonEl, 'addEventListener').mockImplementation();
            const findCloseStub = jest.spyOn(docFindBar.findCloseButtonEl, 'addEventListener').mockImplementation();

            docFindBar.bindDOMListeners();
            expect(barStub).toBeCalledWith('keydown', docFindBar.findBarKeyDownHandler);
            expect(findFieldStub).toBeCalledWith('input', docFindBar.findFieldHandler);
            expect(findPrevStub).toBeCalledWith('click', docFindBar.findPreviousHandler);
            expect(findNextStub).toBeCalledWith('click', docFindBar.findNextHandler);
            expect(findCloseStub).toBeCalledWith('click', docFindBar.close);
        });
    });

    describe('unbindDOMListeners()', () => {
        test('should remove the correct event listeners', () => {
            const barStub = jest.spyOn(docFindBar.findBarEl, 'removeEventListener').mockImplementation();
            const findFieldStub = jest.spyOn(docFindBar.findFieldEl, 'removeEventListener').mockImplementation();
            const findPrevStub = jest
                .spyOn(docFindBar.findPreviousButtonEl, 'removeEventListener')
                .mockImplementation();
            const findNextStub = jest.spyOn(docFindBar.findNextButtonEl, 'removeEventListener').mockImplementation();
            const findCloseStub = jest.spyOn(docFindBar.findCloseButtonEl, 'removeEventListener').mockImplementation();

            docFindBar.unbindDOMListeners();
            expect(barStub).toBeCalledWith('keydown', docFindBar.findBarKeyDownHandler);
            expect(findFieldStub).toBeCalledWith('input', docFindBar.findFieldHandler);
            expect(findPrevStub).toBeCalledWith('click', docFindBar.findPreviousHandler);
            expect(findNextStub).toBeCalledWith('click', docFindBar.findNextHandler);
            expect(findCloseStub).toBeCalledWith('click', docFindBar.close);
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = jest.spyOn(util, 'decodeKeydown').mockImplementation();
            stubs.open = jest.spyOn(docFindBar, 'open').mockImplementation();
            stubs.event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
            stubs.close = jest.spyOn(docFindBar, 'close').mockImplementation();
        });

        test('should open and prevent default if meta+f is entered', () => {
            stubs.decodeKeydown.mockReturnValue('meta+f');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should open and prevent default if control+f is entered', () => {
            stubs.decodeKeydown.mockReturnValue('control+f');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should open and prevent default if meta+g is entered', () => {
            stubs.decodeKeydown.mockReturnValue('meta+g');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should open and prevent default if control+g is entered', () => {
            stubs.decodeKeydown.mockReturnValue('control+g');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should open and prevent default if f3 is entered', () => {
            stubs.decodeKeydown.mockReturnValue('f3');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should do nothing if find bar is already closed and escape is entered', () => {
            stubs.decodeKeydown.mockReturnValue('escape');
            docFindBar.opened = false;

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).not.toBeCalled();
            expect(stubs.close).not.toBeCalled();
            expect(stubs.event.preventDefault).not.toBeCalled();
        });
    });

    describe('findFieldHandler()', () => {
        test('should dispatch the find event', () => {
            const dispatchFindEventStub = jest.spyOn(docFindBar, 'dispatchFindEvent').mockImplementation();

            docFindBar.findFieldHandler();
            expect(dispatchFindEventStub).toBeCalledWith('find');
        });
    });

    describe('findBarKeyDownHandler()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = jest.spyOn(util, 'decodeKeydown').mockImplementation();
            stubs.event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
            stubs.findNextHandler = jest.spyOn(docFindBar, 'findNextHandler').mockImplementation();
            stubs.findPreviousHandler = jest.spyOn(docFindBar, 'findPreviousHandler').mockImplementation();
            stubs.close = jest.spyOn(docFindBar, 'close').mockImplementation();
        });

        test('should find the next match if Enter is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Enter');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.findNextHandler).toBeCalled();
        });

        test('should find the previous match if Shift+Enter is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Shift+Enter');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.findNextHandler).not.toBeCalled();
            expect(stubs.findPreviousHandler).toBeCalled();
        });

        test('should do nothing if the find bar is not open and Escape is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Escape');
            docFindBar.opened = false;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).not.toBeCalled();
            expect(stubs.event.stopPropagation).not.toBeCalled();
            expect(stubs.event.preventDefault).not.toBeCalled();
        });

        test('should close, prevent default behavior, and stop propogation if Escape is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Escape');
            docFindBar.opened = true;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should close, prevent default behavior, and stop propogation if Esc is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Esc');
            docFindBar.opened = true;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should stop propogation if Shift++ is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Shift++');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).toBeCalled();
        });

        test('should stop propogation if Shift+_ is entered', () => {
            stubs.decodeKeydown.mockReturnValue('Shift+_');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).toBeCalled();
        });

        test('should stop propogation if [ is entered', () => {
            stubs.decodeKeydown.mockReturnValue('[');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).toBeCalled();
        });

        test('should stop propogation if ] is entered', () => {
            stubs.decodeKeydown.mockReturnValue(']');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).toBeCalled();
        });
    });

    describe('findNextHandler()', () => {
        beforeEach(() => {
            stubs.focus = jest.spyOn(docFindBar.findNextButtonEl, 'focus').mockImplementation();
            stubs.dispatchFindEvent = jest.spyOn(docFindBar, 'dispatchFindEvent').mockImplementation();
            docFindBar.findFieldEl.value = 'test';
            docFindBar.findController.matchCount = 1;
        });

        test('should do nothing if there is nothing to find', () => {
            docFindBar.findFieldEl.value = '';

            docFindBar.findNextHandler(false);
            expect(stubs.focus).not.toBeCalled();
            expect(stubs.dispatchFindEvent).not.toBeCalled();
        });

        test('should focus the next button element if it has not been clicked', () => {
            docFindBar.findNextHandler(false);
            expect(stubs.focus).toBeCalled();
            expect(stubs.dispatchFindEvent).not.toBeCalled();
        });

        test('should find the next match if the next button element has been clicked', () => {
            docFindBar.findNextHandler(true);
            expect(stubs.focus).not.toBeCalled();
            expect(stubs.dispatchFindEvent).toBeCalled();
        });

        test('should emit the find next event', () => {
            jest.spyOn(docFindBar, 'emit').mockImplementation();

            docFindBar.findFieldEl.value = 'test';
            docFindBar.findNextHandler(true);

            expect(docFindBar.emit).toBeCalledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.NEXT,
            });
        });
    });

    describe('findPreviousHandler()', () => {
        beforeEach(() => {
            stubs.focus = jest.spyOn(docFindBar.findPreviousButtonEl, 'focus').mockImplementation();
            stubs.dispatchFindEvent = jest.spyOn(docFindBar, 'dispatchFindEvent').mockImplementation();
            docFindBar.findFieldEl.value = 'test';
            docFindBar.findController.matchCount = 5;
        });

        test('should do nothing if there is nothing to find', () => {
            docFindBar.findFieldEl.value = '';
            docFindBar.findPreviousHandler(false);

            expect(stubs.focus).not.toBeCalled();
            expect(stubs.dispatchFindEvent).not.toBeCalled();
        });

        test('should focus the previous button element if it has not been clicked', () => {
            docFindBar.findPreviousHandler(false);
            expect(stubs.focus).toBeCalled();
            expect(stubs.dispatchFindEvent).not.toBeCalled();
        });

        test('should find the previous match if the previous button element has been clicked', () => {
            docFindBar.findPreviousHandler(true);
            expect(stubs.focus).not.toBeCalled();
            expect(stubs.dispatchFindEvent).toBeCalled();
        });

        test('should emit a find previous metric', () => {
            jest.spyOn(docFindBar, 'emit').mockImplementation();
            docFindBar.findFieldEl.value = 'test';

            docFindBar.findPreviousHandler(true);
            expect(docFindBar.emit).toBeCalledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.PREVIOUS,
            });
        });
    });
    describe('open()', () => {
        beforeEach(() => {
            stubs.findFieldHandler = jest.spyOn(docFindBar, 'findFieldHandler').mockImplementation();
            stubs.remove = jest.spyOn(docFindBar.findBarEl.classList, 'remove').mockImplementation();
            stubs.select = jest.spyOn(docFindBar.findFieldEl, 'select').mockImplementation();
            stubs.focus = jest.spyOn(docFindBar.findFieldEl, 'focus').mockImplementation();
        });

        test('should repopulate and re-highlight the find field with the last search', () => {
            docFindBar.prevSearchQuery = 'test';

            docFindBar.open();
            expect(docFindBar.findFieldEl.value).toBe(docFindBar.prevSearchQuery);
            expect(stubs.findFieldHandler).toBeCalled();
        });

        test('should not repopulate and re-highlight if there is no last search', () => {
            docFindBar.prevSearchQuery = '';

            docFindBar.open();
            expect(stubs.findFieldHandler).not.toBeCalled();
        });

        test('should open the find bar if it is not open', () => {
            jest.spyOn(docFindBar, 'emit').mockImplementation();
            docFindBar.opened = false;

            docFindBar.open();
            expect(docFindBar.opened).toBe(true);
            expect(stubs.remove).toBeCalled();
            expect(docFindBar.emit).toBeCalledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.OPEN,
            });
        });

        test('should not open the find bar if it is already open', () => {
            docFindBar.opened = true;

            docFindBar.open();
            expect(docFindBar.opened).toBe(true);
            expect(stubs.remove).not.toBeCalled();
        });

        test('should select and focus the find bar field', () => {
            docFindBar.opened = true;

            docFindBar.open();
            expect(stubs.select).toBeCalled();
            expect(stubs.focus).toBeCalled();
        });
    });

    describe('close()', () => {
        beforeEach(() => {
            stubs.findFieldHandler = jest.spyOn(docFindBar, 'findFieldHandler').mockImplementation();
            stubs.add = jest.spyOn(docFindBar.findBarEl.classList, 'add').mockImplementation();
        });

        test('should save and clear the current search', () => {
            docFindBar.findFieldEl.value = 'test';
            docFindBar.opened = false;

            docFindBar.close();
            expect(docFindBar.findFieldEl.value).toBe('');
            expect(docFindBar.prevSearchQuery).toBe('test');
            expect(stubs.findFieldHandler).toBeCalled();
        });

        test('should hide the bar if it is open', () => {
            jest.spyOn(docFindBar, 'emit').mockImplementation();

            docFindBar.findFieldEl.value = 'test';
            docFindBar.opened = true;

            docFindBar.close();
            expect(docFindBar.emit).toBeCalledWith('close');
            expect(docFindBar.opened).toBe(false);
            expect(stubs.add).toBeCalledWith(CLASS_HIDDEN);
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.open = jest.spyOn(docFindBar, 'open').mockImplementation();
            stubs.close = jest.spyOn(docFindBar, 'close').mockImplementation();
        });

        test('should open if not currently opened', () => {
            docFindBar.opened = false;

            docFindBar.toggle();

            expect(docFindBar.open).toBeCalled();
            expect(docFindBar.close).not.toBeCalled();
        });

        test('should close if currently opened', () => {
            docFindBar.opened = true;

            docFindBar.toggle();

            expect(docFindBar.open).not.toBeCalled();
            expect(docFindBar.close).toBeCalled();
        });
    });
});
