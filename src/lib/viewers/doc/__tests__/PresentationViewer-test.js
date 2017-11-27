/* eslint-disable no-unused-expressions */
import PresentationViewer from '../PresentationViewer';
import BaseViewer from '../../BaseViewer';
import DocBaseViewer from '../DocBaseViewer';
import PresentationPreloader from '../PresentationPreloader';
import { CLASS_INVISIBLE } from '../../../constants';

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

describe('lib/viewers/doc/PresentationViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/PresentationViewer-test.html');

        containerEl = document.querySelector('.container');
        presentation = new PresentationViewer({
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {}
            },
            container: containerEl,
            file: {
                extension: 'ppt'
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        presentation.containerEl = containerEl;
        presentation.setup();

        presentation.pdfViewer = {
            currentPageNumber: 1,
            update: sandbox.stub(),
            cleanup: sandbox.stub()
        };

        presentation.controls = {
            add: sandbox.stub()
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (presentation && typeof presentation.destroy === 'function') {
            presentation.pdfViewer = undefined;
            presentation.destroy();
        }

        presentation = null;
        stubs = {};
    });

    describe('setup()', () => {
        it('should add the presentation class to the presentation element and set up preloader', () => {
            expect(presentation.docEl).to.have.class('bp-doc-presentation');
            expect(presentation.preloader).to.be.instanceof(PresentationPreloader);
        });

        it('should set fileMetrics to be preloaded and reset load timeout when preload event is received', () => {
            presentation.options.fileMetrics = {
                setPreloaded: sandbox.stub()
            };
            stubs.setPreloaded = presentation.options.fileMetrics.setPreloaded;
            stubs.resetLoadTimeout = sandbox.stub(presentation, 'resetLoadTimeout');

            presentation.preloader.emit('preload');

            expect(stubs.setPreloaded).to.be.called;
            expect(stubs.resetLoadTimeout).to.be.called;
        });
    });

    describe('destroy()', () => {
        const destroyFunc = DocBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        it('should remove listeners from preloader', () => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: sandbox.stub() });
            presentation.preloader = {
                removeAllListeners: sandbox.mock().withArgs('preload')
            };
            presentation.destroy();
            presentation = null; // Don't call destroy again during cleanup
        });
    });

    describe('setPage()', () => {
        let page1;
        let page2;
        let page3;

        beforeEach(() => {
            page1 = document.createElement('div');
            page1.setAttribute('data-page-number', '1');
            page1.classList.add('page');

            page2 = document.createElement('div');
            page2.setAttribute('data-page-number', '2');
            page2.classList.add(CLASS_INVISIBLE, 'page');

            page3 = document.createElement('div');
            page3.setAttribute('data-page-number', '3');
            page3.classList.add('page');

            presentation.docEl.appendChild(page1);
            presentation.docEl.appendChild(page2);
            presentation.docEl.appendChild(page3);
        });

        afterEach(() => {
            presentation.docEl.removeChild(page1);
            presentation.docEl.removeChild(page2);
            presentation.docEl.removeChild(page3);
        });

        it('should check to see if overflow is present', () => {
            const checkOverflowStub = sandbox.stub(presentation, 'checkOverflow');

            presentation.setPage(2);
            expect(checkOverflowStub).to.be.called;
        });

        it('should all other pages', () => {
            sandbox.stub(presentation, 'checkOverflow');
            presentation.setPage(2);

            expect(page1).to.have.class(CLASS_INVISIBLE);
            expect(page3).to.have.class(CLASS_INVISIBLE);
        });

        it('should show the page being set', () => {
            sandbox.stub(presentation, 'checkOverflow');
            presentation.setPage(2);

            expect(page2).to.not.have.class(CLASS_INVISIBLE);
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
            stubs.page1 = document.createElement('div');
            stubs.page1.setAttribute('data-page-number', '1');
            stubs.page1.classList.add('page');

            presentation.docEl.appendChild(stubs.page1);
        });

        afterEach(() => {
            presentation.docEl.removeChild(stubs.page1);
        });

        it('should remove the both overflow classes and return false if there is no overflow', () => {
            presentation.docEl.style.width = '100px';
            presentation.docEl.style.height = '100px';

            const result = presentation.checkOverflow();
            expect(presentation.docEl).to.not.have.class('overflow-x');
            expect(presentation.docEl).to.not.have.class('overflow-y');
            expect(result).to.equal(false);
        });

        it('should add overflow-y class and return true if there is y overflow', () => {
            stubs.page1.style.height = '500px';
            presentation.docEl.style.width = '100px';
            presentation.docEl.style.height = '100px';

            const result = presentation.checkOverflow();
            expect(presentation.docEl).to.have.class('overflow-y');
            expect(result).to.equal(true);
        });

        it('should add the overflow-x class and return true if there is x overflow', () => {
            stubs.page1.style.width = '500px';
            presentation.docEl.style.width = '100px';
            presentation.docEl.style.height = '100px';

            const result = presentation.checkOverflow();
            expect(presentation.docEl).to.have.class('overflow-x');
            expect(presentation.docEl).to.not.have.class('overflow-y');
            expect(result).to.equal(true);
        });
    });

    describe('initViewer()', () => {
        const initViewerFunc = DocBaseViewer.prototype.initViewer;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'initViewer', { value: initViewerFunc });
        });

        it('should overwrite the scrollPageIntoView method', () => {
            const stub = sandbox.stub(presentation, 'overwritePdfViewerBehavior');
            Object.defineProperty(DocBaseViewer.prototype, 'initViewer', { value: sandbox.stub() });

            presentation.initViewer('url');

            expect(stub).to.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            stubs.addEventListener = sandbox.stub(presentation.docEl, 'addEventListener');
        });

        it('should add a wheel handler', () => {
            presentation.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('wheel', presentation.throttledWheelHandler);
        });

        it('should add a touch handlers if touch events are supported', () => {
            presentation.hasTouch = true;

            presentation.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchend', presentation.mobileScrollHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = sandbox.stub(presentation.docEl, 'removeEventListener');
        });

        it('should remove a wheel handler', () => {
            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('wheel', presentation.throttledWheelHandler);
        });

        it('should remove the touchhandlers if on mobile', () => {
            presentation.hasTouch = true;

            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchend', presentation.mobileScrollHandler);
        });
    });

    describe('bindControlListeners()', () => {
        beforeEach(() => {
            presentation.pdfViewer = {
                pagesCount: 4,
                currentPageNumber: 1,
                cleanup: sandbox.stub()
            };

            presentation.pageControls = {
                add: sandbox.stub(),
                removeListener: sandbox.stub()
            };
        });

        it('should add the correct controls', () => {
            presentation.bindControlListeners();
            expect(presentation.controls.add).to.be.calledWith(
                __('zoom_out'),
                presentation.zoomOut,
                'bp-exit-zoom-out-icon',
                ICON_ZOOM_OUT
            );
            expect(presentation.controls.add).to.be.calledWith(
                __('zoom_in'),
                presentation.zoomIn,
                'bp-enter-zoom-in-icon',
                ICON_ZOOM_IN
            );

            expect(presentation.pageControls.add).to.be.calledWith(1, 4);

            expect(presentation.controls.add).to.be.calledWith(
                __('enter_fullscreen'),
                presentation.toggleFullscreen,
                'bp-enter-fullscreen-icon',
                ICON_FULLSCREEN_IN
            );
            expect(presentation.controls.add).to.be.calledWith(
                __('exit_fullscreen'),
                presentation.toggleFullscreen,
                'bp-exit-fullscreen-icon',
                ICON_FULLSCREEN_OUT
            );
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
            expect(stubs.event.preventDefault).to.not.be.called;
        });

        it('should set the scroll start position if the event is a touch start', () => {
            stubs.event.type = 'touchstart';
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).to.equal(100);
        });

        it('should prevent default behaviour if the event is touchmove', () => {
            stubs.event.type = 'touchmove';
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.event.preventDefault).to.be.called;
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
            stubs.setPage = sandbox.stub(presentation, 'setPage');
            stubs.page1 = document.createElement('div');
            stubs.page1.setAttribute('data-page-number', '1');
            stubs.page1.className = 'page';

            stubs.page2 = document.createElement('div');
            stubs.page2.setAttribute('data-page-number', '2');
            stubs.page2.className = 'page';

            stubs.page3 = document.createElement('div');
            stubs.page3.setAttribute('data-page-number', '3');
            stubs.page3.className = 'page';

            document.querySelector('.pdfViewer').appendChild(stubs.page1);
            document.querySelector('.pdfViewer').appendChild(stubs.page2);
            document.querySelector('.pdfViewer').appendChild(stubs.page3);
        });

        it('should hide all pages except for the first one', () => {
            presentation.pagesinitHandler();

            expect(stubs.page1).to.not.have.class(CLASS_INVISIBLE);
            expect(stubs.page2).to.have.class(CLASS_INVISIBLE);
            expect(stubs.page3).to.have.class(CLASS_INVISIBLE);
        });

        it('should set the pdf viewer scale to page-fit', () => {
            presentation.pagesinitHandler();

            expect(presentation.pdfViewer.currentScaleValue).to.equal('page-fit');
        });
    });

    describe('getWheelHandler()', () => {
        let wheelHandler;

        beforeEach(() => {
            stubs.nextPage = sandbox.stub(presentation, 'nextPage');
            stubs.previousPage = sandbox.stub(presentation, 'previousPage');
            stubs.checkOverflow = sandbox.stub(presentation, 'checkOverflow').returns(false);
            presentation.event = {
                deltaY: 5,
                deltaX: -0
            };
            wheelHandler = presentation.getWheelHandler();
        });

        it('should call next page if the event delta is positive', () => {
            wheelHandler(presentation.event);
            expect(stubs.nextPage).to.be.called;
        });

        it('should call previous page if the event delta is negative', () => {
            presentation.event.deltaY = -5;
            wheelHandler(presentation.event);
            expect(stubs.previousPage).to.be.called;
        });

        it('should do nothing if x scroll is detected', () => {
            presentation.event.deltaX = -7;
            wheelHandler(presentation.event);
            expect(stubs.previousPage).to.not.be.called;
            expect(stubs.nextPage).to.not.be.called;
        });

        it('should do nothing if there is overflow', () => {
            stubs.checkOverflow.returns(true);
            wheelHandler(presentation.event);
            expect(stubs.previousPage).to.not.be.called;
            expect(stubs.nextPage).to.not.be.called;
        });
    });

    describe('overwritePdfViewerBehavior()', () => {
        it('should overwrite the scrollPageIntoView method', () => {
            const setPageStub = sandbox.stub(presentation, 'setPage');
            const page = {
                pageNumber: 3
            };
            Object.defineProperty(DocBaseViewer.prototype, 'initViewer', { value: sandbox.stub() });

            presentation.overwritePdfViewerBehavior();
            presentation.pdfViewer.scrollPageIntoView(page);

            expect(setPageStub).to.be.calledWith(page.pageNumber);
        });

        it('should overwrite the _getVisiblePages method', () => {
            presentation.pdfViewer = {
                _pages: {
                    0: {
                        id: 1,
                        view: 'pageObj'
                    }
                },
                _currentPageNumber: 1
            };

            presentation.overwritePdfViewerBehavior();
            const result = presentation.pdfViewer._getVisiblePages();

            expect(result.first.id).to.equal(1);
            expect(result.last.id).to.equal(1);
        });
    });
});
