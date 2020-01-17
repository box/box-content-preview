/* eslint-disable no-unused-expressions */
import PresentationViewer from '../PresentationViewer';
import BaseViewer from '../../BaseViewer';
import DocBaseViewer from '../DocBaseViewer';
import PresentationPreloader from '../PresentationPreloader';
import { CLASS_INVISIBLE } from '../../../constants';

let containerEl;
let presentation;
let stubs = {};

describe('lib/viewers/doc/PresentationViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/PresentationViewer-test.html');

        containerEl = document.querySelector('.container');
        presentation = new PresentationViewer({
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {},
            },
            container: containerEl,
            file: {
                extension: 'ppt',
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        presentation.containerEl = containerEl;
        presentation.setup();

        presentation.pdfViewer = {
            currentPageNumber: 1,
            update: jest.fn(),
            cleanup: jest.fn(),
        };

        presentation.controls = {
            add: jest.fn(),
        };
    });

    afterEach(() => {
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
        test('should add the presentation class to the presentation element and set up preloader', () => {
            expect(presentation.docEl).toHaveClass('bp-doc-presentation');
            expect(presentation.preloader).toBeInstanceOf(PresentationPreloader);
        });

        test('should invoke onPreload callback', () => {
            presentation.options.logger = {
                setPreloaded: jest.fn(),
            };
            stubs.setPreloaded = presentation.options.logger.setPreloaded;
            presentation.preloader.emit('preload');

            expect(stubs.setPreloaded).toBeCalled();
        });
    });

    describe('destroy()', () => {
        const destroyFunc = DocBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        test('should remove listeners from preloader', () => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: jest.fn() });
            presentation.preloader = {
                removeAllListeners: jest.fn(),
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
            jest.spyOn(presentation, 'checkOverflow').mockImplementation();

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

        test('should check to see if overflow is present', () => {
            presentation.setPage(2);
            expect(presentation.checkOverflow).toBeCalled();
        });

        test('should all other pages', () => {
            presentation.setPage(2);

            expect(page1).toHaveClass(CLASS_INVISIBLE);
            expect(page3).toHaveClass(CLASS_INVISIBLE);
        });

        test('should show the page being set', () => {
            presentation.setPage(2);

            expect(page2).not.toHaveClass(CLASS_INVISIBLE);
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.previousPage = jest.spyOn(presentation, 'previousPage').mockImplementation();
            stubs.nextPage = jest.spyOn(presentation, 'nextPage').mockImplementation();
        });

        test('should go to the previous page and return true if ArrowUp', () => {
            const result = presentation.onKeydown('ArrowUp');

            expect(result).toBe(true);
            expect(stubs.previousPage).toBeCalled();
        });

        test('should go to the next page and return true if ArrowDown is entered ', () => {
            const result = presentation.onKeydown('ArrowDown');

            expect(result).toBe(true);
            expect(stubs.nextPage).toBeCalled();
        });

        test("should fallback to doc base's onKeydown if no entry matches", () => {
            const docBaseSpy = jest.spyOn(DocBaseViewer.prototype, 'onKeydown');
            const eventStub = jest.fn();

            const key = 'ArrowRight';

            const result = presentation.onKeydown(key, eventStub);

            expect(docBaseSpy).toBeCalledWith(key, eventStub);
            expect(result).toBe(true);
            expect(stubs.nextPage).toBeCalled();

            const result2 = presentation.onKeydown('d');

            expect(result2).toBe(false);
        });
    });

    describe('checkOverflow()', () => {
        beforeEach(() => {
            stubs.page1 = document.createElement('div');
            stubs.page1.setAttribute('data-page-number', '1');
            stubs.page1.classList.add('page');

            Object.defineProperty(stubs.page1, 'clientHeight', { value: 0, writable: true });
            Object.defineProperty(stubs.page1, 'clientWidth', { value: 0, writable: true });
            Object.defineProperty(presentation.docEl, 'clientHeight', { value: 100, writable: true });
            Object.defineProperty(presentation.docEl, 'clientWidth', { value: 100, writable: true });

            presentation.docEl.appendChild(stubs.page1);
        });

        afterEach(() => {
            presentation.docEl.removeChild(stubs.page1);
        });

        test('should remove the both overflow classes and return false if there is no overflow', () => {
            const result = presentation.checkOverflow();

            expect(presentation.docEl).not.toHaveClass('overflow-x');
            expect(presentation.docEl).not.toHaveClass('overflow-y');
            expect(result).toBe(false);
        });

        test('should add overflow-y class and return true if there is y overflow', () => {
            stubs.page1.clientHeight = 500;

            const result = presentation.checkOverflow();
            expect(presentation.docEl).toHaveClass('overflow-y');
            expect(result).toBe(true);
        });

        test('should add the overflow-x class and return true if there is x overflow', () => {
            stubs.page1.clientWidth = 500;

            const result = presentation.checkOverflow();
            expect(presentation.docEl).toHaveClass('overflow-x');
            expect(presentation.docEl).not.toHaveClass('overflow-y');
            expect(result).toBe(true);
        });
    });

    describe('initViewer()', () => {
        const initViewerFunc = DocBaseViewer.prototype.initViewer;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'initViewer', { value: initViewerFunc });
        });

        test('should overwrite the scrollPageIntoView method', () => {
            const stub = jest.spyOn(presentation, 'overwritePdfViewerBehavior').mockImplementation();
            Object.defineProperty(DocBaseViewer.prototype, 'initViewer', { value: jest.fn() });

            presentation.initViewer('url');

            expect(stub).toBeCalled();
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            stubs.addEventListener = jest.spyOn(presentation.docEl, 'addEventListener').mockImplementation();
        });

        test('should add a wheel handler', () => {
            presentation.bindDOMListeners();
            expect(stubs.addEventListener).toBeCalledWith('wheel', presentation.throttledWheelHandler);
        });

        test('should add a touch handlers if touch events are supported', () => {
            presentation.hasTouch = true;

            presentation.bindDOMListeners();
            expect(stubs.addEventListener).toBeCalledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).toBeCalledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.addEventListener).toBeCalledWith('touchend', presentation.mobileScrollHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = jest.spyOn(presentation.docEl, 'removeEventListener').mockImplementation();
        });

        test('should remove a wheel handler', () => {
            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).toBeCalledWith('wheel', presentation.throttledWheelHandler);
        });

        test('should remove the touchhandlers if on mobile', () => {
            presentation.hasTouch = true;

            presentation.unbindDOMListeners();
            expect(stubs.removeEventListener).toBeCalledWith('touchstart', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).toBeCalledWith('touchmove', presentation.mobileScrollHandler);
            expect(stubs.removeEventListener).toBeCalledWith('touchend', presentation.mobileScrollHandler);
        });
    });

    describe('mobileScrollHandler()', () => {
        beforeEach(() => {
            stubs.checkOverflow = jest.spyOn(presentation, 'checkOverflow').mockReturnValue(false);
            stubs.event = {
                type: '',
                changedTouches: [
                    {
                        clientX: 0,
                        clientY: 0,
                    },
                ],
                touches: [1],
                preventDefault: jest.fn(),
            };
            stubs.nextPage = jest.spyOn(presentation, 'nextPage').mockImplementation();
            stubs.previousPage = jest.spyOn(presentation, 'previousPage').mockImplementation();
        });

        test('should do nothing if there is overflow', () => {
            stubs.checkOverflow.mockReturnValue(true);

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).toBeUndefined();
            expect(stubs.event.preventDefault).not.toBeCalled();
        });

        test('should do nothing if we are pinching or touch with more than one finger', () => {
            presentation.isPinching = true;

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).toBeUndefined();
            expect(stubs.event.preventDefault).not.toBeCalled();

            presentation.isPinching = false;
            stubs.event.touches = [1, 2];

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).toBeUndefined();
            expect(stubs.event.preventDefault).not.toBeCalled();
        });

        test('should set the scroll start position if the event is a touch start', () => {
            stubs.event.type = 'touchstart';
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(presentation.scrollStart).toBe(100);
        });

        test('should prevent default behavior if the event is touchmove', () => {
            stubs.event.type = 'touchmove';
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.event.preventDefault).toBeCalled();
        });

        test('should go to the next page if the scroll is in the correct direction', () => {
            stubs.event.type = 'touchend';
            presentation.scrollStart = 500;
            stubs.event.changedTouches[0].clientY = 100;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.nextPage).toBeCalled();
        });

        test('should go to the previous page if the scroll is in the correct direction', () => {
            stubs.event.type = 'touchend';
            presentation.scrollStart = 100;
            stubs.event.changedTouches[0].clientY = 500;

            presentation.mobileScrollHandler(stubs.event);
            expect(stubs.previousPage).toBeCalled();
        });
    });

    describe('pagesInitHandler()', () => {
        beforeEach(() => {
            stubs.setPage = jest.spyOn(presentation, 'setPage').mockImplementation();
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

        test('should hide all pages except for the first one', () => {
            presentation.pagesinitHandler();

            expect(stubs.page1).not.toHaveClass(CLASS_INVISIBLE);
            expect(stubs.page2).toHaveClass(CLASS_INVISIBLE);
            expect(stubs.page3).toHaveClass(CLASS_INVISIBLE);
        });

        test('should set the pdf viewer scale to page-fit', () => {
            presentation.pagesinitHandler();

            expect(presentation.pdfViewer.currentScaleValue).toBe('page-fit');
        });
    });

    describe('getWheelHandler()', () => {
        let wheelHandler;

        beforeEach(() => {
            stubs.nextPage = jest.spyOn(presentation, 'nextPage').mockImplementation();
            stubs.previousPage = jest.spyOn(presentation, 'previousPage').mockImplementation();
            stubs.checkOverflow = jest.spyOn(presentation, 'checkOverflow').mockReturnValue(false);
            presentation.event = {
                deltaY: 5,
                deltaX: -0,
            };
            wheelHandler = presentation.getWheelHandler();
        });

        test('should call next page if the event delta is positive', () => {
            wheelHandler(presentation.event);
            expect(stubs.nextPage).toBeCalled();
        });

        test('should call previous page if the event delta is negative', () => {
            presentation.event.deltaY = -5;
            wheelHandler(presentation.event);
            expect(stubs.previousPage).toBeCalled();
        });

        test('should do nothing if x scroll is detected', () => {
            presentation.event.deltaX = -7;
            wheelHandler(presentation.event);
            expect(stubs.previousPage).not.toBeCalled();
            expect(stubs.nextPage).not.toBeCalled();
        });

        test('should do nothing if there is overflow', () => {
            stubs.checkOverflow.mockReturnValue(true);
            wheelHandler(presentation.event);
            expect(stubs.previousPage).not.toBeCalled();
            expect(stubs.nextPage).not.toBeCalled();
        });
    });

    describe('overwritePdfViewerBehavior()', () => {
        describe('should overwrite the scrollPageIntoView method', () => {
            beforeEach(() => {
                jest.spyOn(presentation, 'setPage').mockImplementation();
            });

            test('should do nothing if the viewer is not loaded', () => {
                const page = {
                    pageNumber: 3,
                };

                presentation.loaded = false;
                presentation.overwritePdfViewerBehavior();
                presentation.pdfViewer.scrollPageIntoView(page);

                expect(presentation.setPage).not.toBeCalled();
            });

            test('should change the page if the viewer is loaded', () => {
                const page = {
                    pageNumber: 3,
                };

                presentation.loaded = true;
                presentation.overwritePdfViewerBehavior();
                presentation.pdfViewer.scrollPageIntoView(page);

                expect(presentation.setPage).toBeCalledWith(3);
            });
        });

        test('should overwrite the _getVisiblePages method', () => {
            presentation.pdfViewer = {
                _pages: {
                    0: {
                        id: 1,
                        view: 'pageObj',
                    },
                },
                _currentPageNumber: 1,
            };

            presentation.overwritePdfViewerBehavior();
            const result = presentation.pdfViewer._getVisiblePages();

            expect(result.first.id).toBe(1);
            expect(result.last.id).toBe(1);
        });
    });

    describe('handleScrollToAnnotation', () => {
        let setPageStub;
        let scrollToAnnotationStub;

        beforeEach(() => {
            setPageStub = jest.spyOn(presentation, 'setPage').mockImplementation();
            scrollToAnnotationStub = jest.fn();
        });

        test('should call setPage is location value provided', () => {
            const mockPartialAnnotation = { id: '123', target: { location: { value: 5 } } };

            presentation.annotator = {
                scrollToAnnotation: scrollToAnnotationStub,
            };

            presentation.handleScrollToAnnotation(mockPartialAnnotation);

            expect(setPageStub).toBeCalledWith(5);
            expect(scrollToAnnotationStub).toBeCalledWith(mockPartialAnnotation.id);
        });

        test('should call setPage with 1 if location not provided', () => {
            const mockPartialAnnotation = { id: '123' };

            presentation.annotator = {
                scrollToAnnotation: scrollToAnnotationStub,
            };
            presentation.pdfViewer.currentPageNumber = 2;

            presentation.handleScrollToAnnotation(mockPartialAnnotation);

            expect(setPageStub).toBeCalledWith(1);
            expect(scrollToAnnotationStub).toBeCalledWith('123');
        });

        test('should defer to the base viewer if the location value provided matches the current page', () => {
            const mockPartialAnnotation = { id: '123', target: { location: { value: 1 } } };

            presentation.annotator = {
                scrollToAnnotation: scrollToAnnotationStub,
            };

            presentation.handleScrollToAnnotation(mockPartialAnnotation);

            expect(setPageStub).not.toBeCalled();
            expect(scrollToAnnotationStub).toBeCalledWith(mockPartialAnnotation.id);
        });
    });
});
