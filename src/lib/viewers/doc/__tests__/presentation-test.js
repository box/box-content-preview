/* eslint-disable no-unused-expressions */
import Presentation from '../presentation';
import Controls from '../../../controls';
import Browser from '../../../browser';
import { CLASS_INVISIBLE } from '../../../constants';
import * as util from '../../../util';

import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_ZOOM_OUT,
    ICON_ZOOM_IN,
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
            update: sandbox.stub(),
            setFindController: sandbox.stub()
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
        if (typeof presentation.destroy === 'function') {
            presentation.destroy();
        }

        presentation = null;
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        it('should add the document class to the doc element', () => {
            expect(presentation.docEl.classList.contains('bp-doc-presentation')).to.be.true;
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
            sandbox.stub(presentation, 'checkOverflow');
            presentation.setPage(2);

            expect(page1.classList.contains(CLASS_INVISIBLE)).to.be.true;
        });

        it('should show the page being set', () => {
            sandbox.stub(presentation, 'checkOverflow');
            presentation.setPage(2);

            expect(page2.classList.contains(CLASS_INVISIBLE)).to.be.false;
        });

        it('should update and center the page', () => {
            stubs.centerSlide = sandbox.stub(presentation, 'centerSlide');

            presentation.setPage(2);

            expect(presentation.pdfViewer.update).to.be.called;
            expect(stubs.centerSlide).to.be.called;
        });
    });


    describe('zoomIn()', () => {
        beforeEach(() => {
            presentation.findBar = {
                opened: true,
                destroy: sandbox.stub(),
                removeListener: sandbox.stub()
            };
            stubs.enableEl = sandbox.stub(util, 'enableEl');
        });

        it('should do nothing if the findbar is opened', () => {
            presentation.zoomIn();

            expect(stubs.enableEl).to.not.be.called;
        });

        it('should increment the zoom level', () => {
            presentation.findBar.opened = false;
            presentation.zoomIn();

            expect(presentation.zoomLevel).to.equal(1);
        });

        it('should enable zoom out', () => {
            presentation.findBar.opened = false;
            presentation.zoomIn();

            expect(stubs.enableEl).to.be.called;
        });
    });

    describe('zoomOut()', () => {
        beforeEach(() => {
            presentation.findBar = {
                opened: true,
                destroy: sandbox.stub(),
                removeListener: sandbox.stub()
            };
            stubs.disableEl = sandbox.stub(util, 'disableEl');
        });

        it('should do nothing if already zoomed out all the way', () => {
            presentation.zoomOut();

            expect(presentation.zoomLevel).to.equal(0);
        });

        it('should decrement the zoom level', () => {
            presentation.zoomLevel = 1;

            presentation.zoomOut();
            expect(presentation.zoomLevel).to.equal(0);
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

    describe('checkOverflow()', () => {
        beforeEach(() => {
            stubs.docEl = {
                clientHeight: 0,
                clientWidth: 0,
                classList: {
                    add: sandbox.stub(),
                    remove: sandbox.stub()
                },
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub(),
                firstChild: {
                    firstChild: {
                        clientHeight: 0,
                        clientWidth: 0
                    }
                }
            };

            presentation.docEl = stubs.docEl;
        });

        it('should remove the both overflow classes and return false if there is no overflow', () => {
            stubs.docEl.clientWidth = 100;
            stubs.docEl.clientHeight = 100;

            const result = presentation.checkOverflow();
            expect(stubs.docEl.classList.remove).to.be.calledWith('overflow');
            expect(stubs.docEl.classList.remove).to.be.calledWith('overflow-y');
            expect(result).to.equal(false);
        });

        it('should add both overflow classes and return true if there is y overflow', () => {
            stubs.docEl.clientWidth = 100;
            stubs.docEl.clientHeight = 100;
            stubs.docEl.firstChild.firstChild.clientHeight = 500;

            const result = presentation.checkOverflow();
            expect(stubs.docEl.classList.add).to.be.calledWith('overflow');
            expect(stubs.docEl.classList.add).to.be.calledWith('overflow-y');
            expect(result).to.equal(true);
        });

        it('should remove the y overflow class, add the overflow class, and return true if there is x overflow', () => {
            stubs.docEl.clientWidth = 100;
            stubs.docEl.clientHeight = 100;
            stubs.docEl.firstChild.firstChild.clientWidth = 500;

            const result = presentation.checkOverflow();
            expect(stubs.docEl.classList.add).to.be.calledWith('overflow');
            expect(stubs.docEl.classList.remove).to.be.calledWith('overflow-y');
            expect(result).to.equal(true);
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

    describe('centerSlide()', () => {
        beforeEach(() => {
            stubs.textLayer = document.createElement('div');
            stubs.textLayer.classList.add('textLayer');

            stubs.page = {
                clientHeight: 100,
                style: {
                    padding: 0
                },
                querySelector: sandbox.stub().returns(stubs.textLayer)
            };

            stubs.docEl = presentation.docEl;
        });

        afterEach(() => {
            presentation.docEl = stubs.docEl;
        });

        it('should set the padding to be 0 if the page is bigger than the doc element', () => {
            presentation.docEl = {
                clientHeight: 0
            };

            presentation.centerSlide(stubs.page);
            expect(stubs.page.style.padding).to.equal('0');
        });

        it('should set the padding to be half the available space', () => {
            presentation.docEl = {
                clientHeight: 200
            };

            presentation.centerSlide(stubs.page);
            expect(stubs.page.style.padding).to.equal('50px 0');
        });

        it('should center the textLayer', () => {
            presentation.docEl = {
                clientHeight: 500
            };

            presentation.centerSlide(stubs.page);
            expect(stubs.textLayer.style.top).to.equal('200px');
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            stubs.addEventListener = sandbox.stub(presentation.docEl, 'addEventListener');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile');
        });

        it('should add a wheel handler', () => {
            presentation.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('wheel', presentation.wheelHandler);
        });

        it('should add a touch handlers if on mobile', () => {
            stubs.isMobile.returns(true);

            presentation.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchend', presentation.mobileScrollHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = sandbox.stub(presentation.docEl, 'removeEventListener');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile');
        });

        it('should remove a wheel handler', () => {
            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('wheel', presentation.wheelHandler);
        });

        it('should remove the touchhandlers if on mobile', () => {
            stubs.isMobile.returns(true);

            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchend', presentation.mobileScrollHandler);
        });

        it('should remove the findBar listeners', () => {
            presentation.initFind();
            stubs.removeListener = sandbox.stub(presentation.findBar, 'removeListener');

            presentation.unbindDOMListeners();

            expect(stubs.removeListener).to.be.calledWith('findbaropen', presentation.findBarOpenHandler);
            expect(stubs.removeListener).to.be.calledWith('findbarclose', presentation.findBarCloseHandler);
        });
    });

    describe('bindControlListeners()', () => {
        it('should add event listeners', () => {
            presentation.controls = new Controls(presentation.containerEl);
            stubs.add = sandbox.spy(presentation.controls, 'add');

            presentation.bindControlListeners();
            expect(stubs.add).to.be.calledWith(__('zoom_out'), presentation.zoomOut, 'bp-exit-zoom-out-icon', ICON_ZOOM_OUT);
            expect(stubs.add).to.be.calledWith(__('zoom_in'), presentation.zoomIn, 'bp-enter-zoom-in-icon', ICON_ZOOM_IN);
            expect(stubs.add).to.be.calledWith(__('previous_page'), presentation.previousPage, 'bp-presentation-previous-page-icon bp-previous-page', ICON_DROP_UP);
            expect(stubs.add).to.be.calledWith(__('enter_page_num'), presentation.showPageNumInput, 'bp-doc-page-num');
            expect(stubs.add).to.be.calledWith(__('next_page'), presentation.nextPage, 'bp-presentation-next-page-icon bp-next-page', ICON_DROP_DOWN);
            expect(stubs.add).to.be.calledWith(__('enter_fullscreen'), presentation.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
            expect(stubs.add).to.be.calledWith(__('exit_fullscreen'), presentation.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
        });
    });

    describe('initFind()', () => {
        it('add open and close event listeners', () => {
            stubs.findBarOpenHandler = sandbox.stub(presentation, 'findBarOpenHandler');
            stubs.findBarCloseHandler = sandbox.stub(presentation, 'findBarCloseHandler');

            presentation.initFind();

            presentation.findBar.emit('findbaropen');
            expect(stubs.findBarOpenHandler).to.be.called;

            presentation.findBar.emit('findbarclose');
            expect(stubs.findBarCloseHandler).to.be.called;
        });
    });

    describe('mobileScrollHandler()', () => {
        beforeEach(() => {
            stubs.checkOverflow = sandbox.stub(presentation, 'checkOverflow').returns(false);
            stubs.event = {
                type: '',
                changedTouches: [
                    {
                        clientX: 0,
                        clientY: 0
                    }
                ],
                preventDefault: sandbox.stub()
            };
            stubs.nextPage = sandbox.stub(presentation, 'nextPage');
            stubs.previousPage = sandbox.stub(presentation, 'previousPage');
        });

        it('should do nothing if there is overflow', () => {
            stubs.checkOverflow.returns(true);

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).to.equal(undefined);
            expect(stubs.event.preventDefault).to.be.called;
        });

        it('should do nothing if there is no change', () => {
            stubs.event.changedTouches = [];

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).to.equal(undefined);
        });

        it('should do nothing if it was a touch move event', () => {
            stubs.event.type = 'touchmove';

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).to.equal(undefined);
        });

        it('should set the scroll start position if the event is a touch start', () => {
            stubs.event.type = 'touchstart';
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).to.equal(100);
        });

        it('should go to the next page if the scroll is in the correct direction', () => {
            stubs.event.type = 'touchend';
            presentation.scrollStart = 500;
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.nextPage).to.be.called;
        });

        it('should go to the previous page if the scroll is in the correct direction', () => {
            stubs.event.type = 'touchend';
            presentation.scrollStart = 100;
            stubs.event.changedTouches[0].clientY = 500;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.previousPage).to.be.called;
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
            stubs.checkOverflow = sandbox.stub(presentation, 'checkOverflow').returns(false);
            presentation.annotator = {
                isInDialogOnPage: sandbox.stub().returns(false)
            };
            presentation.event = {
                deltaY: 5,
                deltaX: -0
            };
        });

        it('should call next page if the event delta is positive', () => {
            presentation.wheelHandler(presentation.event);

            expect(stubs.nextPage).to.be.called;
        });

        it('should call previous page if the event delta is negative', () => {
            presentation.event.deltaY = -5;

            presentation.wheelHandler(presentation.event);
            expect(stubs.previousPage).to.be.called;
        });
    });

    describe('findBarOpenHandler()', () => {
        beforeEach(() => {
            stubs.checkOverflow = sandbox.stub(presentation, 'checkOverflow');
            stubs.disableEl = sandbox.stub(util, 'disableEl');
        });

        it('should reset scale and reset the zoom level if there is overflow', () => {
            stubs.checkOverflow.returns(true);

            presentation.findBarOpenHandler();
            expect(presentation.zoomLevel).to.equal(0);
            expect(presentation.pdfViewer.currentScaleValue).to.equal('page-fit');
        });

        it('should disble all zooming if there is no overflow', () => {
            stubs.checkOverflow.returns(false);

            presentation.findBarOpenHandler();
            expect(stubs.disableEl).to.be.calledTwice;
        });
    });

    describe('findBarCloseHandler()', () => {
        it('should enable zooming in', () => {
            stubs.enableEl = sandbox.stub(util, 'enableEl');

            presentation.findBarCloseHandler();
            expect(stubs.enableEl).to.be.called;
        });
    });
});
