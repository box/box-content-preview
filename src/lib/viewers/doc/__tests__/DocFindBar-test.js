/* eslint-disable no-unused-expressions */
import * as util from '../../../util';
import DocFindBar from '../DocFindBar';
import { CLASS_BOX_PREVIEW_FIND_BAR, CLASS_HIDDEN } from '../../../constants';
import { VIEWER_EVENT, USER_DOCUMENT_FIND_EVENTS } from '../../../events';

const CLASS_FIND_MATCH_NOT_FOUND = 'bp-find-match-not-found';

// Values match FindStates in PDFFindController
const FIND_MATCH_FOUND = 0;
const FIND_MATCH_NOT_FOUND = 1;
const FIND_MATCH_PENDING = 3;

const MATCH_OFFSET = 13;

const sandbox = sinon.sandbox.create();
let containerEl;
let docFindBar;
let eventBus;
let findController;
let stubs = {};

describe('lib/viewers/doc/DocFindBar', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocFindBar-test.html');

        containerEl = document.querySelector('.test-container');
        eventBus = { off: sandbox.stub(), on: sandbox.stub() };
        findController = {
            executeCommand: sandbox.stub(),
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

        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        it('should correctly set the object parameters', () => {
            expect(containerEl.querySelector(`.${CLASS_BOX_PREVIEW_FIND_BAR}`)).to.exist;
            expect(docFindBar.eventBus).to.equal(eventBus);
            expect(docFindBar.findController).to.equal(findController);
            expect(docFindBar.opened).to.be.false;
        });

        it('should throw an error if there is no container element', () => {
            docFindBar.destroy();
            containerEl = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).to.equal('DocFindBar cannot be used without a container element.');
            }
        });

        it('should throw an error if there is no eventBus', () => {
            docFindBar.destroy();
            eventBus = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).to.equal('DocFindBar cannot be used without an EventBus instance.');
            }
        });

        it('should throw an error if there is no findController', () => {
            docFindBar.destroy();
            findController = null;
            try {
                docFindBar = new DocFindBar(containerEl, findController, eventBus);
            } catch (e) {
                expect(e.message).to.equal('DocFindBar cannot be used without a PDFFindController instance.');
            }
        });
    });

    describe('createFindField()', () => {
        it('should create the search icon', () => {
            docFindBar.createFindField();

            const searchIconEl = document.querySelector('.bp-doc-find-search');

            expect(searchIconEl.parentNode).to.equal(docFindBar.findBarEl);
            expect(searchIconEl.className).to.equal('bp-doc-find-search');
        });

        it('should create the input field', () => {
            docFindBar.createFindField();

            const inputFieldEl = document.querySelector('.bp-doc-find-field');

            expect(inputFieldEl.parentNode).to.equal(docFindBar.findBarEl);
            expect(inputFieldEl.className).to.equal('bp-doc-find-field');
        });

        it('should create the match results count', () => {
            docFindBar.createFindField();

            const resultsCountEl = document.querySelector('.bp-doc-find-results-count');

            expect(resultsCountEl.parentNode).to.equal(docFindBar.findBarEl);
            expect(resultsCountEl.classList.contains('bp-doc-find-results-count')).to.be.true;
            expect(resultsCountEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });
    });

    describe('createFindButtons()', () => {
        it('should create the find buttons with the correct class, and add to the bar', () => {
            docFindBar.createFindButtons();

            expect(docFindBar.findButtonContainerEl.classList.contains('bp-doc-find-controls')).to.be.true;
            expect(docFindBar.findButtonContainerEl.parentNode).to.equal(docFindBar.findBarEl);
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.unbindDOMListeners = sandbox.stub(docFindBar, 'unbindDOMListeners');
            stubs.removeChild = sandbox.stub(docFindBar.findBarEl.parentNode, 'removeChild');
        });

        it('should unbind DOM listeners', () => {
            docFindBar.destroy();

            expect(stubs.unbindDOMListeners).to.be.called;
        });

        it('should remove the find bar if it exists', () => {
            docFindBar.destroy();

            expect(stubs.removeChild).to.be.called;
        });

        it('should not remove the find bar if it does not exist', () => {
            docFindBar.findBarEl = undefined;

            docFindBar.destroy();
            expect(stubs.removeChild).to.not.be.called;
        });
    });

    describe('dispatchFindEvent()', () => {
        it('should execute the find controller command with the given params', () => {
            docFindBar.findFieldEl.value = 'value';
            const params = {
                query: docFindBar.findFieldEl.value,
                phraseSearch: true,
                highlightAll: true,
                findPrevious: 'test',
            };

            docFindBar.dispatchFindEvent('string', 'test');
            expect(findController.executeCommand).to.be.calledWith('string', params);
        });
    });

    describe('updateUIState()', () => {
        beforeEach(() => {
            stubs.updateUIResultsCount = sandbox.stub(docFindBar, 'updateUIResultsCount');
        });

        it('should update the status and add the correct class if the match is not found', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_NOT_FOUND });

            expect(docFindBar.status).to.equal('');
            expect(docFindBar.findFieldEl.classList.contains(CLASS_FIND_MATCH_NOT_FOUND)).to.be.true;
            expect(docFindBar.findFieldEl.getAttribute('data-status')).to.equal('');
            expect(stubs.updateUIResultsCount).to.be.called;
        });

        it('should update the status if the status is pending', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_PENDING });

            expect(docFindBar.status).to.equal('pending');
            expect(docFindBar.findFieldEl.getAttribute('data-status')).to.equal('pending');
            expect(stubs.updateUIResultsCount).to.be.called;
        });

        it('should update the status and add the correct class if the status is found', () => {
            docFindBar.updateUIState({ state: FIND_MATCH_FOUND });

            expect(docFindBar.status).to.equal('');
            expect(docFindBar.findFieldEl.classList.contains(CLASS_FIND_MATCH_NOT_FOUND)).to.be.false;
            expect(docFindBar.findFieldEl.getAttribute('data-status')).to.equal('');
            expect(stubs.updateUIResultsCount).to.be.called;
        });
    });

    describe('updateUIResultsCount()', () => {
        beforeEach(() => {
            stubs.getBoundingClientRect = sandbox.stub(docFindBar.findResultsCountEl, 'getBoundingClientRect').returns({
                width: 5,
            });
        });

        it('should do nothing if there is no find results count element', () => {
            docFindBar.findResultsCountEl = undefined;

            docFindBar.updateUIResultsCount({ matchesCount: { current: 1, total: 2 } });
            expect(stubs.getBoundingClientRect).to.not.be.called;
        });

        it('should hide the counter if there are no matches', () => {
            docFindBar.updateUIResultsCount({ matchesCount: { current: 0, total: 0 } });

            expect(docFindBar.findResultsCountEl.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(stubs.getBoundingClientRect).to.not.be.called;
        });

        it('should adjust padding, and create/show the counter', () => {
            const paddingRight = `${5 + MATCH_OFFSET}px`;

            docFindBar.updateUIResultsCount({ matchesCount: { current: 1, total: 2 } });

            expect(docFindBar.findFieldEl.style.paddingRight).to.be.equal(paddingRight);
            expect(docFindBar.findResultsCountEl.classList.contains(CLASS_HIDDEN)).to.be.false;
            expect(stubs.getBoundingClientRect).to.be.called;
        });
    });

    describe('setFindFieldElValue()', () => {
        it('should set the findFieldEl value', () => {
            docFindBar.findFieldEl = {
                removeEventListener: sandbox.stub(),
            };

            docFindBar.setFindFieldElValue('test');

            expect(docFindBar.findFieldEl.value).to.equal('test');
        });
    });

    describe('bindDOMListeners()', () => {
        it('should add the correct event listeners', () => {
            const barStub = sandbox.stub(docFindBar.findBarEl, 'addEventListener');
            const findFieldStub = sandbox.stub(docFindBar.findFieldEl, 'addEventListener');
            const findPrevStub = sandbox.stub(docFindBar.findPreviousButtonEl, 'addEventListener');
            const findNextStub = sandbox.stub(docFindBar.findNextButtonEl, 'addEventListener');
            const findCloseStub = sandbox.stub(docFindBar.findCloseButtonEl, 'addEventListener');

            docFindBar.bindDOMListeners();
            expect(barStub).to.be.calledWith('keydown', docFindBar.findBarKeyDownHandler);
            expect(findFieldStub).to.be.calledWith('input', docFindBar.findFieldHandler);
            expect(findPrevStub).to.be.calledWith('click', docFindBar.findPreviousHandler);
            expect(findNextStub).to.be.calledWith('click', docFindBar.findNextHandler);
            expect(findCloseStub).to.be.calledWith('click', docFindBar.close);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should remove the correct event listeners', () => {
            const barStub = sandbox.stub(docFindBar.findBarEl, 'removeEventListener');
            const findFieldStub = sandbox.stub(docFindBar.findFieldEl, 'removeEventListener');
            const findPrevStub = sandbox.stub(docFindBar.findPreviousButtonEl, 'removeEventListener');
            const findNextStub = sandbox.stub(docFindBar.findNextButtonEl, 'removeEventListener');
            const findCloseStub = sandbox.stub(docFindBar.findCloseButtonEl, 'removeEventListener');

            docFindBar.unbindDOMListeners();
            expect(barStub).to.be.calledWith('keydown', docFindBar.findBarKeyDownHandler);
            expect(findFieldStub).to.be.calledWith('input', docFindBar.findFieldHandler);
            expect(findPrevStub).to.be.calledWith('click', docFindBar.findPreviousHandler);
            expect(findNextStub).to.be.calledWith('click', docFindBar.findNextHandler);
            expect(findCloseStub).to.be.calledWith('click', docFindBar.close);
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = sandbox.stub(util, 'decodeKeydown');
            stubs.open = sandbox.stub(docFindBar, 'open');
            stubs.event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub(),
            };
            stubs.close = sandbox.stub(docFindBar, 'close');
        });

        it('should open and prevent default if meta+f is entered', () => {
            stubs.decodeKeydown.returns('meta+f');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should open and prevent default if control+f is entered', () => {
            stubs.decodeKeydown.returns('control+f');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should open and prevent default if meta+g is entered', () => {
            stubs.decodeKeydown.returns('meta+g');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should open and prevent default if control+g is entered', () => {
            stubs.decodeKeydown.returns('control+g');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should open and prevent default if f3 is entered', () => {
            stubs.decodeKeydown.returns('f3');

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should do nothing if find bar is already closed and escape is entered', () => {
            stubs.decodeKeydown.returns('escape');
            docFindBar.opened = false;

            docFindBar.onKeydown(stubs.event);
            expect(stubs.open).to.not.be.called;
            expect(stubs.close).to.not.be.called;
            expect(stubs.event.preventDefault).to.not.be.called;
        });
    });

    describe('findFieldHandler()', () => {
        it('should dispatch the find event', () => {
            const dispatchFindEventStub = sandbox.stub(docFindBar, 'dispatchFindEvent');

            docFindBar.findFieldHandler();
            expect(dispatchFindEventStub).to.be.calledWith('find');
        });
    });

    describe('findBarKeyDownHandler()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = sandbox.stub(util, 'decodeKeydown');
            stubs.event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub(),
            };
            stubs.findNextHandler = sandbox.stub(docFindBar, 'findNextHandler');
            stubs.findPreviousHandler = sandbox.stub(docFindBar, 'findPreviousHandler');
            stubs.close = sandbox.stub(docFindBar, 'close');
        });

        it('should find the next match if Enter is entered', () => {
            stubs.decodeKeydown.returns('Enter');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.findNextHandler).to.be.called;
        });

        it('should find the previous match if Shift+Enter is entered', () => {
            stubs.decodeKeydown.returns('Shift+Enter');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.findNextHandler).to.not.be.called;
            expect(stubs.findPreviousHandler).to.be.called;
        });

        it('should do nothing if the find bar is not open and Escape is entered', () => {
            stubs.decodeKeydown.returns('Escape');
            docFindBar.opened = false;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).to.not.be.called;
            expect(stubs.event.stopPropagation).to.not.be.called;
            expect(stubs.event.preventDefault).to.not.be.called;
        });

        it('should close, prevent default behavior, and stop propogation if Escape is entered', () => {
            stubs.decodeKeydown.returns('Escape');
            docFindBar.opened = true;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should close, prevent default behavior, and stop propogation if Esc is entered', () => {
            stubs.decodeKeydown.returns('Esc');
            docFindBar.opened = true;

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.close).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should stop propogation if Shift++ is entered', () => {
            stubs.decodeKeydown.returns('Shift++');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).to.be.called;
        });

        it('should stop propogation if Shift+_ is entered', () => {
            stubs.decodeKeydown.returns('Shift+_');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).to.be.called;
        });

        it('should stop propogation if [ is entered', () => {
            stubs.decodeKeydown.returns('[');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).to.be.called;
        });

        it('should stop propogation if ] is entered', () => {
            stubs.decodeKeydown.returns(']');

            docFindBar.findBarKeyDownHandler(stubs.event);
            expect(stubs.event.stopPropagation).to.be.called;
        });
    });

    describe('findNextHandler()', () => {
        beforeEach(() => {
            stubs.focus = sandbox.stub(docFindBar.findNextButtonEl, 'focus');
            stubs.dispatchFindEvent = sandbox.stub(docFindBar, 'dispatchFindEvent');
            docFindBar.findFieldEl.value = 'test';
            docFindBar.findController.matchCount = 1;
        });

        it('should do nothing if there is nothing to find', () => {
            docFindBar.findFieldEl.value = '';

            docFindBar.findNextHandler(false);
            expect(stubs.focus).to.not.be.called;
            expect(stubs.dispatchFindEvent).to.not.be.called;
        });

        it('should focus the next button element if it has not been clicked', () => {
            docFindBar.findNextHandler(false);
            expect(stubs.focus).to.be.called;
            expect(stubs.dispatchFindEvent).to.not.be.called;
        });

        it('should find the next match if the next button element has been clicked', () => {
            docFindBar.findNextHandler(true);
            expect(stubs.focus).to.not.be.called;
            expect(stubs.dispatchFindEvent).to.be.called;
        });

        it('should emit the find next event', () => {
            sandbox.stub(docFindBar, 'emit');

            docFindBar.findFieldEl.value = 'test';
            docFindBar.findNextHandler(true);

            expect(docFindBar.emit).to.be.calledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.NEXT,
            });
        });
    });

    describe('findPreviousHandler()', () => {
        beforeEach(() => {
            stubs.focus = sandbox.stub(docFindBar.findPreviousButtonEl, 'focus');
            stubs.dispatchFindEvent = sandbox.stub(docFindBar, 'dispatchFindEvent');
            docFindBar.findFieldEl.value = 'test';
            docFindBar.findController.matchCount = 5;
        });

        it('should do nothing if there is nothing to find', () => {
            docFindBar.findFieldEl.value = '';
            docFindBar.findPreviousHandler(false);

            expect(stubs.focus).to.not.be.called;
            expect(stubs.dispatchFindEvent).to.not.be.called;
        });

        it('should focus the previous button element if it has not been clicked', () => {
            docFindBar.findPreviousHandler(false);
            expect(stubs.focus).to.be.called;
            expect(stubs.dispatchFindEvent).to.not.be.called;
        });

        it('should find the previous match if the previous button element has been clicked', () => {
            docFindBar.findPreviousHandler(true);
            expect(stubs.focus).to.not.be.called;
            expect(stubs.dispatchFindEvent).to.be.called;
        });

        it('should emit a find previous metric', () => {
            sandbox.stub(docFindBar, 'emit');
            docFindBar.findFieldEl.value = 'test';

            docFindBar.findPreviousHandler(true);
            expect(docFindBar.emit).to.be.calledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.PREVIOUS,
            });
        });
    });
    describe('open()', () => {
        beforeEach(() => {
            stubs.findFieldHandler = sandbox.stub(docFindBar, 'findFieldHandler');
            stubs.remove = sandbox.stub(docFindBar.findBarEl.classList, 'remove');
            stubs.select = sandbox.stub(docFindBar.findFieldEl, 'select');
            stubs.focus = sandbox.stub(docFindBar.findFieldEl, 'focus');
        });

        it('should repopulate and re-highlight the find field with the last search', () => {
            docFindBar.prevSearchQuery = 'test';

            docFindBar.open();
            expect(docFindBar.findFieldEl.value).to.equal(docFindBar.prevSearchQuery);
            expect(stubs.findFieldHandler).to.be.called;
        });

        it('should not repopulate and re-highlight if there is no last search', () => {
            docFindBar.prevSearchQuery = '';

            docFindBar.open();
            expect(stubs.findFieldHandler).to.not.be.called;
        });

        it('should open the find bar if it is not open', () => {
            sandbox.stub(docFindBar, 'emit');
            docFindBar.opened = false;

            docFindBar.open();
            expect(docFindBar.opened).to.equal(true);
            expect(stubs.remove).to.be.called;
            expect(docFindBar.emit).to.be.calledWith(VIEWER_EVENT.metric, {
                name: USER_DOCUMENT_FIND_EVENTS.OPEN,
            });
        });

        it('should not open the find bar if it is already open', () => {
            docFindBar.opened = true;

            docFindBar.open();
            expect(docFindBar.opened).to.equal(true);
            expect(stubs.remove).to.not.be.called;
        });

        it('should select and focus the find bar field', () => {
            docFindBar.opened = true;

            docFindBar.open();
            expect(stubs.select).to.be.called;
            expect(stubs.focus).to.be.called;
        });
    });

    describe('close()', () => {
        beforeEach(() => {
            stubs.findFieldHandler = sandbox.stub(docFindBar, 'findFieldHandler');
            stubs.add = sandbox.stub(docFindBar.findBarEl.classList, 'add');
        });

        it('should save and clear the current search', () => {
            docFindBar.findFieldEl.value = 'test';
            docFindBar.opened = false;

            docFindBar.close();
            expect(docFindBar.findFieldEl.value).to.equal('');
            expect(docFindBar.prevSearchQuery).to.equal('test');
            expect(stubs.findFieldHandler).to.be.called;
        });

        it('should hide the bar if it is open', () => {
            sandbox.stub(docFindBar, 'emit');

            docFindBar.findFieldEl.value = 'test';
            docFindBar.opened = true;

            docFindBar.close();
            expect(docFindBar.emit).to.be.calledWith('close');
            expect(docFindBar.opened).to.equal(false);
            expect(stubs.add).to.be.calledWith(CLASS_HIDDEN);
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.open = sandbox.stub(docFindBar, 'open');
            stubs.close = sandbox.stub(docFindBar, 'close');
        });

        it('should open if not currently opened', () => {
            docFindBar.opened = false;

            docFindBar.toggle();

            expect(docFindBar.open).to.be.called;
            expect(docFindBar.close).not.to.be.called;
        });

        it('should close if currently opened', () => {
            docFindBar.opened = true;

            docFindBar.toggle();

            expect(docFindBar.open).not.to.be.called;
            expect(docFindBar.close).to.be.called;
        });
    });
});
