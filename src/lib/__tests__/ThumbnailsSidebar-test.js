/* eslint-disable no-unused-expressions */
import ThumbnailsSidebar, { DEFAULT_THUMBNAILS_SIDEBAR_WIDTH } from '../ThumbnailsSidebar';
import VirtualScroller from '../VirtualScroller';
import * as utils from '../util';

const TEST_SCALE = (DEFAULT_THUMBNAILS_SIDEBAR_WIDTH * 2) / 10;

describe('ThumbnailsSidebar', () => {
    let thumbnailsSidebar;
    let stubs = {};
    let pdfViewer = {};
    let page;
    let virtualScroller;
    let pagePromise;
    let anchorEl;

    beforeEach(() => {
        fixture.load('__tests__/ThumbnailsSidebar-test.html');

        stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
        stubs.raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => callback());

        stubs.getViewport = jest.fn();
        stubs.render = jest.fn(() => ({
            promise: Promise.resolve(),
        }));

        page = {
            getViewport: stubs.getViewport,
            render: stubs.render,
        };
        pagePromise = Promise.resolve(page);

        stubs.getPage = jest.fn(() => pagePromise);
        stubs.vsInit = jest.spyOn(VirtualScroller.prototype, 'init').mockImplementation();
        stubs.vsDestroy = jest.spyOn(VirtualScroller.prototype, 'destroy').mockImplementation();
        stubs.vsScrollIntoView = jest.spyOn(VirtualScroller.prototype, 'scrollIntoView').mockImplementation();
        stubs.vsGetVisibleItems = jest.spyOn(VirtualScroller.prototype, 'getVisibleItems').mockImplementation();

        virtualScroller = {
            destroy: stubs.vsDestroy,
            getVisibleItems: stubs.vsGetVisibleItems,
            scrollIntoView: stubs.vsScrollIntoView,
        };

        pdfViewer = {
            pdfDocument: {
                getPage: stubs.getPage,
            },
        };

        anchorEl = document.getElementById('test-thumbnails-sidebar');

        thumbnailsSidebar = new ThumbnailsSidebar(anchorEl, pdfViewer);
    });

    afterEach(() => {
        fixture.cleanup();

        if (thumbnailsSidebar && typeof thumbnailsSidebar.destroy === 'function') {
            thumbnailsSidebar.thumbnailImageCache = null;
            thumbnailsSidebar.destroy();
        }

        thumbnailsSidebar = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should initialize properties', () => {
            expect(thumbnailsSidebar.anchorEl.id).toBe('test-thumbnails-sidebar');
            expect(thumbnailsSidebar.pdfViewer).toBe(pdfViewer);
            expect(thumbnailsSidebar.thumbnailImageCache.cache).toEqual({});
            expect(thumbnailsSidebar.scale).toBeUndefined();
            expect(thumbnailsSidebar.pageRatio).toBeUndefined();
        });
    });

    describe('destroy()', () => {
        test('should clean up the instance properties', () => {
            thumbnailsSidebar.destroy();

            expect(thumbnailsSidebar.thumbnailImageCache).toBeNull();
            expect(thumbnailsSidebar.pdfViewer).toBeNull();
        });

        test('should destroy virtualScroller if it exists', () => {
            thumbnailsSidebar.virtualScroller = virtualScroller;
            thumbnailsSidebar.destroy();

            expect(stubs.vsDestroy).toBeCalled();
            expect(thumbnailsSidebar.virtualScroller).toBeNull();
            expect(thumbnailsSidebar.thumbnailImageCache).toBeNull();
            expect(thumbnailsSidebar.pdfViewer).toBeNull();
        });
    });

    describe('init()', () => {
        test('should initialize the render properties', () => {
            stubs.getViewport.mockReturnValue({ width: 10, height: 10 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnailsSidebar.scale).toBe(DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10);
                expect(thumbnailsSidebar.pageRatio).toBe(1);
                expect(stubs.vsInit).toBeCalled();
            });
        });

        test('should not initialize the render properties if viewport does not return width', () => {
            stubs.getViewport.mockReturnValue({ width: undefined, height: 10 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnailsSidebar.scale).toBeUndefined();
                expect(thumbnailsSidebar.pageRatio).toBeUndefined();
                expect(stubs.vsInit).not.toBeCalled();
            });
        });

        test('should not initialize the render properties if viewport does not return height', () => {
            stubs.getViewport.mockReturnValue({ width: 10, height: undefined });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnailsSidebar.scale).toBeUndefined();
                expect(thumbnailsSidebar.pageRatio).toBeUndefined();
                expect(stubs.vsInit).not.toBeCalled();
            });
        });

        test('should not initialize the render properties if viewport does not return non zero width & height', () => {
            stubs.getViewport.mockReturnValue({ width: 0, height: 0 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnailsSidebar.scale).toBeUndefined();
                expect(thumbnailsSidebar.pageRatio).toBeUndefined();
                expect(stubs.vsInit).not.toBeCalled();
            });
        });
    });

    describe('renderNextThumbnailImage()', () => {
        beforeEach(() => {
            stubs.requestThumbnailImage = jest.spyOn(thumbnailsSidebar, 'requestThumbnailImage').mockImplementation();
            thumbnailsSidebar.virtualScroller = virtualScroller;
            stubs.vsGetVisibleItems.mockReturnValue([]);
        });

        // eslint-disable-next-line
        const createThumbnailEl = (pageNum, contains) => {
            return {
                classList: {
                    contains: () => contains,
                },
                dataset: {
                    bpPageNum: pageNum,
                },
            };
        };

        test('should do nothing there are no current thumbnails', () => {
            thumbnailsSidebar.currentThumbnails = [];
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).not.toBeCalled();
        });

        test('should not request thumbnail images if thumbnail already contains image loaded class', () => {
            const items = [createThumbnailEl(1, true)];
            thumbnailsSidebar.currentThumbnails = items;

            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).not.toBeCalled();
        });

        test('should request thumbnail images if thumbnail does not already contains image loaded class', () => {
            const items = [createThumbnailEl(1, false)];
            thumbnailsSidebar.currentThumbnails = items;
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).toBeCalledTimes(1);
        });

        test('should only request the first thumbnail that does not already contain an image loaded class', () => {
            const items = [createThumbnailEl(1, true), createThumbnailEl(2, false), createThumbnailEl(3, false)];
            thumbnailsSidebar.currentThumbnails = items;
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).toBeCalledTimes(1);
        });
    });

    describe('requestThumbnailImage()', () => {
        test('should add the image to the thumbnail element', () => {
            const imageEl = {};
            const createImagePromise = Promise.resolve(imageEl);
            stubs.createThumbnailImage = jest
                .spyOn(thumbnailsSidebar, 'createThumbnailImage')
                .mockReturnValue(createImagePromise);
            stubs.appendChild = jest.fn();
            stubs.addClass = jest.fn();
            stubs.renderNextThumbnailImage = jest
                .spyOn(thumbnailsSidebar, 'renderNextThumbnailImage')
                .mockImplementation();

            const thumbnailEl = {
                lastChild: { appendChild: stubs.appendChild },
                classList: { add: stubs.addClass },
            };

            thumbnailsSidebar.requestThumbnailImage(0, thumbnailEl);

            return createImagePromise.then(() => {
                expect(stubs.appendChild).toBeCalled();
                expect(stubs.addClass).toBeCalled();
            });
        });
    });

    describe('createThumbnailImage', () => {
        beforeEach(() => {
            stubs.getThumbnailDataURL = jest
                .spyOn(thumbnailsSidebar, 'getThumbnailDataURL')
                .mockResolvedValue(undefined);
            stubs.createImageEl = jest.spyOn(thumbnailsSidebar, 'createImageEl').mockImplementation();
            stubs.getCacheEntry = jest.spyOn(thumbnailsSidebar.thumbnailImageCache, 'get').mockImplementation();
            stubs.setCacheEntry = jest.spyOn(thumbnailsSidebar.thumbnailImageCache, 'set').mockImplementation();
        });

        test('should resolve immediately if the image is in cache', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue({ image: cachedImage });

            return thumbnailsSidebar.createThumbnailImage(1).then(() => {
                expect(stubs.createImageEl).not.toBeCalled();
            });
        });

        test('should create an image element if not in cache', () => {
            const cachedImage = {};
            stubs.createImageEl.mockReturnValue(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).toBeCalled();
                expect(stubs.setCacheEntry).toBeCalledWith(0, { inProgress: false, image: imageEl });
            });
        });

        test('should resolve with null if cache entry inProgress is true', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue({ inProgress: true });
            stubs.createImageEl.mockReturnValue(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).not.toBeCalled();
                expect(imageEl).toBeNull();
            });
        });
    });

    describe('getThumbnailDataURL()', () => {
        beforeEach(() => {
            stubs.getCacheEntry = jest.spyOn(thumbnailsSidebar.thumbnailImageCache, 'get').mockImplementation();
            stubs.setCacheEntry = jest.spyOn(thumbnailsSidebar.thumbnailImageCache, 'set').mockImplementation();
            thumbnailsSidebar.thumbnailImageCache = { get: stubs.getCacheEntry, set: stubs.setCacheEntry };
        });

        test('should scale canvas the same as the first page if page ratio is the same', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue(cachedImage);
            thumbnailsSidebar.pageRatio = 1;

            // Current page has same ratio
            stubs.getViewport.mockReturnValue({ width: 10, height: 10 });

            const expScale = TEST_SCALE; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10

            return thumbnailsSidebar.getThumbnailDataURL(1).then(() => {
                expect(stubs.getPage).toBeCalled();
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale });
            });
        });

        test('should handle non-uniform page ratios', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue(cachedImage);
            thumbnailsSidebar.pageRatio = 1;

            // Current page has ratio of 0.5 instead of 1
            stubs.getViewport.mockReturnValue({ width: 10, height: 20 });

            const expScale = TEST_SCALE / 2; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10 / 2

            return thumbnailsSidebar.getThumbnailDataURL(0).then(() => {
                expect(stubs.getPage).toBeCalled();
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale });
            });
        });
    });

    describe('thumbnailClickHandler()', () => {
        let targetEl;
        let parentEl;
        let evt;

        beforeEach(() => {
            stubs.onThumbnailSelect = jest.fn();
            stubs.preventDefault = jest.fn();
            stubs.stopImmediatePropagation = jest.fn();
            stubs.focus = jest.fn();

            parentEl = document.createElement('div');
            parentEl.dataset.bpPageNum = '3';

            targetEl = document.createElement('div');
            targetEl.classList.add('bp-thumbnail-nav');

            parentEl.appendChild(targetEl);

            evt = {
                target: targetEl,
                preventDefault: stubs.preventDefault,
                stopImmediatePropagation: stubs.stopImmediatePropagation,
            };

            thumbnailsSidebar.onThumbnailSelect = stubs.onThumbnailSelect;
            thumbnailsSidebar.anchorEl.focus = stubs.focus;
        });

        test('should call the onThumbnailSelect if target is a thumbnail element', () => {
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onThumbnailSelect).toBeCalledWith(3);
            expect(stubs.focus).toBeCalled();
            expect(stubs.preventDefault).toBeCalled();
            expect(stubs.stopImmediatePropagation).toBeCalled();
        });

        test('should not call the onThumbnailSelect if target is not thumbnail element', () => {
            targetEl.classList.remove('bp-thumbnail-nav');
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onThumbnailSelect).not.toBeCalled();
            expect(stubs.focus).toBeCalled();
            expect(stubs.preventDefault).toBeCalled();
            expect(stubs.stopImmediatePropagation).toBeCalled();
        });
    });

    describe('onKeyDown()', () => {
        beforeEach(() => {
            stubs.onThumbnailSelect = jest.fn();
            stubs.event = {
                stopImmediatePropagation: jest.fn(),
                preventDefault: jest.fn(),
            };
            utils.decodeKeydown = jest.fn();

            thumbnailsSidebar.onThumbnailSelect = stubs.onThumbnailSelect;
        });

        test('should select the next page on ArrowDown', () => {
            thumbnailsSidebar.currentPage = 1;
            utils.decodeKeydown.mockReturnValue('ArrowDown');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).toBeCalledWith(2);
            expect(stubs.event.preventDefault).toBeCalled();
            expect(stubs.event.stopImmediatePropagation).toBeCalled();
        });

        test('should select the previous page on ArrowUp', () => {
            thumbnailsSidebar.currentPage = 2;
            utils.decodeKeydown.mockReturnValue('ArrowUp');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).toBeCalledWith(1);
            expect(stubs.event.preventDefault).toBeCalled();
            expect(stubs.event.stopImmediatePropagation).toBeCalled();
        });

        test('should not stop the event if any other key is pressed', () => {
            utils.decodeKeydown.mockReturnValue('Tab');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.event.preventDefault).not.toBeCalled();
            expect(stubs.event.stopImmediatePropagation).not.toBeCalled();
        });

        test('should do nothing if there is no passed in onThumbnailSelect method', () => {
            thumbnailsSidebar.onThumbnailSelect = null;

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).not.toBeCalled();
        });
    });

    describe('setCurrentPage()', () => {
        beforeEach(() => {
            stubs.applyCurrentPageSelection = jest
                .spyOn(thumbnailsSidebar, 'applyCurrentPageSelection')
                .mockImplementation();
            thumbnailsSidebar.pdfViewer = { pagesCount: 10 };
            thumbnailsSidebar.virtualScroller = virtualScroller;
        });

        const paramaterizedTests = [
            { name: 'pageNumber is undefined', pageNumber: undefined },
            { name: 'pageNumber is less than 1', pageNumber: 0 },
            { name: 'pageNumber is greater than last page', pageNumber: 11 },
        ];

        paramaterizedTests.forEach(({ name, pageNumber }) => {
            test(`should do nothing if ${name}`, () => {
                thumbnailsSidebar.setCurrentPage(pageNumber);

                expect(thumbnailsSidebar.currentPage).toBeUndefined();
                expect(stubs.applyCurrentPageSelection).not.toBeCalled();
            });
        });

        test('should set the currentPage and apply current page selection', () => {
            thumbnailsSidebar.setCurrentPage(3);

            expect(thumbnailsSidebar.currentPage).toBe(3);
            expect(stubs.applyCurrentPageSelection).toBeCalled();
            expect(stubs.vsScrollIntoView).toBeCalledWith(2);
        });
    });

    describe('applyCurrentPageSelection()', () => {
        let thumbnails;

        beforeEach(() => {
            stubs.addClass = jest.fn();
            stubs.removeClass = jest.fn();

            // eslint-disable-next-line
            const createTestThumbnail = pageNum => {
                const thumbnail = document.createElement('div');
                thumbnail.dataset.bpPageNum = pageNum;
                thumbnail.classList.add = stubs.addClass;
                thumbnail.classList.remove = stubs.removeClass;
                return thumbnail;
            };

            const thumbnail1 = createTestThumbnail('1');
            const thumbnail2 = createTestThumbnail('2');
            const thumbnail3 = createTestThumbnail('3');

            thumbnails = [thumbnail1, thumbnail2, thumbnail3];

            thumbnailsSidebar.currentThumbnails = thumbnails;
        });

        test('should remove the is selected class from all thumbnails', () => {
            thumbnailsSidebar.currentPage = 10;

            thumbnailsSidebar.applyCurrentPageSelection();

            expect(stubs.removeClass).toBeCalledTimes(3);
            expect(stubs.addClass).not.toBeCalled();
        });

        test('should remove the is selected class from all thumbnails', () => {
            thumbnailsSidebar.currentPage = 2;

            thumbnailsSidebar.applyCurrentPageSelection();

            expect(stubs.removeClass).toBeCalledTimes(2);
            expect(stubs.addClass).toBeCalledTimes(1);
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.toggleOpen = jest.spyOn(thumbnailsSidebar, 'toggleOpen').mockImplementation();
            stubs.toggleClose = jest.spyOn(thumbnailsSidebar, 'toggleClose').mockImplementation();
        });

        test('should do nothing if there is no anchorEl', () => {
            thumbnailsSidebar.anchorEl = null;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).not.toBeCalled();
            expect(stubs.toggleClose).not.toBeCalled();

            thumbnailsSidebar.anchorEl = anchorEl;
        });

        test('should toggle open if it was closed', () => {
            thumbnailsSidebar.isOpen = false;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).toBeCalled();
            expect(stubs.toggleClose).not.toBeCalled();
        });

        test('should toggle closed if it was open', () => {
            thumbnailsSidebar.isOpen = true;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).not.toBeCalled();
            expect(stubs.toggleClose).toBeCalled();
        });
    });

    describe('toggleOpen()', () => {
        beforeEach(() => {
            stubs.removeClass = jest.spyOn(thumbnailsSidebar.anchorEl.classList, 'remove').mockImplementation();
            thumbnailsSidebar.virtualScroller = virtualScroller;
        });

        test('should do nothing if there is no virtualScroller', () => {
            thumbnailsSidebar.virtualScroller = null;
            thumbnailsSidebar.isOpen = false;

            thumbnailsSidebar.toggleOpen();

            expect(thumbnailsSidebar.isOpen).toBe(false);
            expect(stubs.vsScrollIntoView).not.toBeCalled();
        });

        test('should remove the hidden class and scroll the page into view', () => {
            thumbnailsSidebar.currentPage = 3;

            thumbnailsSidebar.toggleOpen();

            expect(thumbnailsSidebar.isOpen).toBe(true);
            expect(stubs.vsScrollIntoView).toBeCalledWith(2);
        });
    });

    describe('toggleClose()', () => {
        test('should set isOpen to false', () => {
            thumbnailsSidebar.isOpen = true;

            thumbnailsSidebar.toggleClose();

            expect(thumbnailsSidebar.isOpen).toBe(false);
        });
    });
});
