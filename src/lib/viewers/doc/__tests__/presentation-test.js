/* eslint-disable no-unused-expressions */
import Presentation from '../presentation';
import { CLASS_INVISIBLE } from '../../../constants';

import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../../icons/icons';


const sandbox = sinon.sandbox.create();

let containerEl;
let presentation;
let stubs = {};

describe('presentation', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/presentation-test.html');

        containerEl = document.querySelector('.container');
        presentation = new Presentation(containerEl);
        presentation.pdfViewer = {
            currentPageNumber: 1,
            update: sandbox.stub()
        };
        presentation.controls = {
            add: sandbox.stub()
        };
        presentation.options = {
            file: 'file'
        };
    });

    afterEach(() => {
        presentation.pdfViewer = null;
        presentation.controls = null;
        presentation.destroy();
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        it('should add the document class to the doc element', () => {
            expect(presentation.docEl.classList.contains('box-preview-doc-presentation')).to.be.true;
        });
    });

    describe('setPage()', () => {
        let page1;
        let page2;
        beforeEach(() => {
            page1 = document.createElement('div');
            page1.setAttribute('data-page-number', '1');

            page2 = document.createElement('div');
            page2.setAttribute('data-page-number', '2');
            page2.className = CLASS_INVISIBLE;

            presentation.docEl.appendChild(page1);
            presentation.docEl.appendChild(page2);
        });

        afterEach(() => {
            presentation.docEl.removeChild(page1);
            presentation.docEl.removeChild(page2);
        });

        it('should hide the page that was previously shown', () => {
            presentation.setPage(2);

            expect(page1.classList.contains(CLASS_INVISIBLE)).to.be.true;
        });

        it('should show the page being set', () => {
            presentation.setPage(2);

            expect(page2.classList.contains(CLASS_INVISIBLE)).to.be.false;
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.previousPage = sandbox.stub(presentation, 'previousPage');
            stubs.nextPage = sandbox.stub(presentation, 'nextPage');
        });

        it('should go to the previous page and return true if ArrowUp', () => {
            const result = presentation.onKeydown('ArrowUp');

            expect(result).to.be.true;
            expect(stubs.previousPage).to.be.called;
        });

        it('should go to the next page and return true if ArrowDown is entered ', () => {
            const result = presentation.onKeydown('ArrowDown');

            expect(result).to.be.true;
            expect(stubs.nextPage).to.be.called;
        });

        it('should fallback to doc base\'s onKeydown if no entry matches', () => {
            const result = presentation.onKeydown('ArrowRight');

            expect(result).to.be.true;
            expect(stubs.nextPage).to.be.called;

            const result2 = presentation.onKeydown('d');

            expect(result2).to.be.false;
        });
    });

    describe('initViewer()', () => {
        beforeEach(() => {
            stubs.proto = Presentation.prototype;
        });

        afterEach(() => {
            Presentation.prototype = stubs.proto;
        });
        it('should overwrite the scrollPageIntoView method', () => {
            const setPageStub = sandbox.stub(presentation, 'setPage');
            const page = {
                pageNumber: 3
            };
            Object.defineProperty(Object.getPrototypeOf(Presentation.prototype), 'initViewer', {
                value: sandbox.stub()
            });
            presentation.initViewer('url');
            presentation.pdfViewer.scrollPageIntoView(page);
            expect(setPageStub).to.be.calledWith(page.pageNumber);
        });

        it('should set the page to 1 if a number is not passed in', () => {
            const setPageStub = sandbox.stub(presentation, 'setPage');
            const page = 'page';
            Object.defineProperty(Object.getPrototypeOf(Presentation.prototype), 'initViewer', {
                value: sandbox.stub()
            });
            presentation.initViewer('url');
            presentation.pdfViewer.scrollPageIntoView(page);
            expect(setPageStub).to.be.calledWith(1);
        });
    });

    describe('bindDOMListeners()', () => {
        it('should add a wheel handler', () => {
            const addEventListenerStub = sandbox.stub(presentation.docEl, 'addEventListener');
            presentation.bindDOMListeners();

            expect(addEventListenerStub).to.be.calledWith('wheel', presentation.wheelHandler(), { passive: true });
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should remove a wheel handler', () => {
            const removeEventListenerStub = sandbox.stub(presentation.docEl, 'removeEventListener');
            presentation.unbindDOMListeners();

            expect(removeEventListenerStub).to.be.calledWith('wheel', presentation.wheelHandler(), { passive: true });
        });
    });

    describe('bindControlListeners()', () => {
        it('should ', () => {
            presentation.bindControlListeners();
            expect(presentation.controls.add).to.be.calledWith(__('previous_page'), presentation.previousPage, 'box-preview-presentation-previous-page-icon box-preview-previous-page', ICON_DROP_UP);
            expect(presentation.controls.add).to.be.calledWith(__('enter_page_num'), presentation.showPageNumInput, 'box-preview-doc-page-num');
            expect(presentation.controls.add).to.be.calledWith(__('next_page'), presentation.nextPage, 'box-preview-presentation-next-page-icon box-preview-next-page', ICON_DROP_DOWN);
            expect(presentation.controls.add).to.be.calledWith(__('enter_fullscreen'), presentation.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
            expect(presentation.controls.add).to.be.calledWith(__('exit_fullscreen'), presentation.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
        });
    });

    describe('pagesInitHandler()', () => {
        beforeEach(() => {
            const page1 = document.createElement('div');
            page1.setAttribute('data-page-number', '1');
            page1.className = 'page';

            const page2 = document.createElement('div');
            page2.setAttribute('data-page-number', '2');
            page2.className = 'page';
            document.querySelector('.pdfViewer').appendChild(page1);
            document.querySelector('.pdfViewer').appendChild(page2);
            stubs.page2Add = sandbox.stub(page2.classList, 'add');
        });

        it('should hide all pages except for the first one', () => {
            presentation.pagesinitHandler();

            expect(stubs.page2Add).to.be.calledOnce;
        });
    });
    describe('wheelHandler()', () => {
        beforeEach(() => {
            stubs.nextPage = sandbox.stub(presentation, 'nextPage');
            stubs.previousPage = sandbox.stub(presentation, 'previousPage');
            presentation.annotator = {
                isInDialogOnPage: sandbox.stub().returns(false)
            };
            presentation.event = {
                deltaY: 5
            };
        });

        it('should create a new throttle if the wheel handler does not exist', () => {
            const result = presentation.wheelHandler();

            expect(result).to.equal(presentation.throttledWheelHandler);
        });

        it('should call next page if the event delta is positive', () => {
            presentation.wheelHandler();

            presentation.throttledWheelHandler(presentation.event);
            expect(stubs.nextPage).to.be.called;
        });

        it('should call previous page if the event delta is negative', () => {
            presentation.event.deltaY = -5;

            presentation.wheelHandler();
            presentation.throttledWheelHandler(presentation.event);
            expect(stubs.previousPage).to.be.called;
        });

        it('should return the original function if the wheel handler already exists', () => {
            presentation.throttledWheelHandler = true;
            const result = presentation.wheelHandler();

            expect(result).to.be.truthy;
        });
    });
});
