/* eslint-disable no-unused-expressions */
import ThumbnailsSidebar, { DEFAULT_THUMBNAILS_SIDEBAR_WIDTH } from '../ThumbnailsSidebar';
import VirtualScroller from '../VirtualScroller';
import * as utils from '../util';

const sandbox = sinon.sandbox.create();
const TEST_SCALE = (DEFAULT_THUMBNAILS_SIDEBAR_WIDTH * 2) / 10;

describe('ThumbnailsSidebar', () => {
    let thumbnailsSidebar;
    let stubs = {};
    let pdfViewer = {};
    let page;
    let virtualScroller;
    let pagePromise;
    let anchorEl;

    before(() => fixture.setBase('src/lib'));

    beforeEach(() => {
        fixture.load('__tests__/ThumbnailsSidebar-test.html');

        stubs.raf = sandbox.stub(window, 'requestAnimationFrame').callsFake(callback => callback());

        stubs.getViewport = sandbox.stub();
        stubs.render = sandbox.stub().returns({
            promise: Promise.resolve(),
        });

        page = {
            getViewport: stubs.getViewport,
            render: stubs.render,
        };
        pagePromise = Promise.resolve(page);

        stubs.getPage = sandbox.stub().returns(pagePromise);
        stubs.vsInit = sandbox.stub(VirtualScroller.prototype, 'init');
        stubs.vsDestroy = sandbox.stub(VirtualScroller.prototype, 'destroy');
        stubs.vsScrollIntoView = sandbox.stub(VirtualScroller.prototype, 'scrollIntoView');
        stubs.vsGetVisibleItems = sandbox.stub(VirtualScroller.prototype, 'getVisibleItems');

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
        sandbox.verifyAndRestore();

        if (thumbnailsSidebar && typeof thumbnailsSidebar.destroy === 'function') {
            thumbnailsSidebar.thumbnailImageCache = null;
            thumbnailsSidebar.destroy();
        }

        thumbnailsSidebar = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should initialize properties', () => {
            expect(thumbnailsSidebar.anchorEl.id).to.be.equal('test-thumbnails-sidebar');
            expect(thumbnailsSidebar.pdfViewer).to.be.equal(pdfViewer);
            expect(thumbnailsSidebar.thumbnailImageCache.cache).to.be.empty;
            expect(thumbnailsSidebar.scale).to.be.undefined;
            expect(thumbnailsSidebar.pageRatio).to.be.undefined;
        });
    });

    describe('destroy()', () => {
        it('should clean up the instance properties', () => {
            thumbnailsSidebar.destroy();

            expect(thumbnailsSidebar.thumbnailImageCache).to.be.null;
            expect(thumbnailsSidebar.pdfViewer).to.be.null;
        });

        it('should destroy virtualScroller if it exists', () => {
            thumbnailsSidebar.virtualScroller = virtualScroller;
            thumbnailsSidebar.destroy();

            expect(stubs.vsDestroy).to.be.called;
            expect(thumbnailsSidebar.virtualScroller).to.be.null;
            expect(thumbnailsSidebar.thumbnailImageCache).to.be.null;
            expect(thumbnailsSidebar.pdfViewer).to.be.null;
        });
    });

    describe('init()', () => {
        it('should initialize the render properties', () => {
            stubs.getViewport.returns({ width: 10, height: 10 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).to.be.called;
                expect(thumbnailsSidebar.scale).to.be.equal(DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10);
                expect(thumbnailsSidebar.pageRatio).to.be.equal(1);
                expect(stubs.vsInit).to.be.called;
            });
        });

        it('should not initialize the render properties if viewport does not return width', () => {
            stubs.getViewport.returns({ width: undefined, height: 10 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).to.be.called;
                expect(thumbnailsSidebar.scale).to.be.undefined;
                expect(thumbnailsSidebar.pageRatio).to.be.undefined;
                expect(stubs.vsInit).not.to.be.called;
            });
        });

        it('should not initialize the render properties if viewport does not return height', () => {
            stubs.getViewport.returns({ width: 10, height: undefined });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).to.be.called;
                expect(thumbnailsSidebar.scale).to.be.undefined;
                expect(thumbnailsSidebar.pageRatio).to.be.undefined;
                expect(stubs.vsInit).not.to.be.called;
            });
        });

        it('should not initialize the render properties if viewport does not return non zero width & height', () => {
            stubs.getViewport.returns({ width: 0, height: 0 });

            thumbnailsSidebar.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).to.be.called;
                expect(thumbnailsSidebar.scale).to.be.undefined;
                expect(thumbnailsSidebar.pageRatio).to.be.undefined;
                expect(stubs.vsInit).not.to.be.called;
            });
        });
    });

    describe('renderNextThumbnailImage()', () => {
        beforeEach(() => {
            stubs.requestThumbnailImage = sandbox.stub(thumbnailsSidebar, 'requestThumbnailImage');
            thumbnailsSidebar.virtualScroller = virtualScroller;
            stubs.vsGetVisibleItems.returns([]);
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

        it('should do nothing there are no current thumbnails', () => {
            thumbnailsSidebar.currentThumbnails = [];
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).not.to.be.called;
        });

        it('should not request thumbnail images if thumbnail already contains image loaded class', () => {
            const items = [createThumbnailEl(1, true)];
            thumbnailsSidebar.currentThumbnails = items;

            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).not.to.be.called;
        });

        it('should request thumbnail images if thumbnail does not already contains image loaded class', () => {
            const items = [createThumbnailEl(1, false)];
            thumbnailsSidebar.currentThumbnails = items;
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).to.be.calledOnce;
        });

        it('should only request the first thumbnail that does not already contain an image loaded class', () => {
            const items = [createThumbnailEl(1, true), createThumbnailEl(2, false), createThumbnailEl(3, false)];
            thumbnailsSidebar.currentThumbnails = items;
            thumbnailsSidebar.renderNextThumbnailImage();

            expect(stubs.requestThumbnailImage).to.be.calledOnce;
        });
    });

    describe('requestThumbnailImage()', () => {
        it('should add the image to the thumbnail element', () => {
            const imageEl = {};
            const createImagePromise = Promise.resolve(imageEl);
            stubs.createThumbnailImage = sandbox
                .stub(thumbnailsSidebar, 'createThumbnailImage')
                .returns(createImagePromise);
            stubs.appendChild = sandbox.stub();
            stubs.addClass = sandbox.stub();
            stubs.renderNextThumbnailImage = sandbox.stub(thumbnailsSidebar, 'renderNextThumbnailImage');

            const thumbnailEl = {
                lastChild: { appendChild: stubs.appendChild },
                classList: { add: stubs.addClass },
            };

            thumbnailsSidebar.requestThumbnailImage(0, thumbnailEl);

            return createImagePromise.then(() => {
                expect(stubs.appendChild).to.be.called;
                expect(stubs.addClass).to.be.called;
            });
        });
    });

    describe('createThumbnailImage', () => {
        beforeEach(() => {
            stubs.getThumbnailDataURL = sandbox
                .stub(thumbnailsSidebar, 'getThumbnailDataURL')
                .returns(Promise.resolve());
            stubs.createImageEl = sandbox.stub(thumbnailsSidebar, 'createImageEl');
            stubs.getCacheEntry = sandbox.stub(thumbnailsSidebar.thumbnailImageCache, 'get');
            stubs.setCacheEntry = sandbox.stub(thumbnailsSidebar.thumbnailImageCache, 'set');
        });

        it('should resolve immediately if the image is in cache', () => {
            const cachedImage = {};
            stubs.getCacheEntry.withArgs(1).returns({ image: cachedImage });

            return thumbnailsSidebar.createThumbnailImage(1).then(() => {
                expect(stubs.createImageEl).not.to.be.called;
            });
        });

        it('should create an image element if not in cache', () => {
            const cachedImage = {};
            stubs.createImageEl.returns(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).to.be.called;
                expect(stubs.setCacheEntry).to.be.calledWith(0, { inProgress: false, image: imageEl });
            });
        });

        it('should resolve with null if cache entry inProgress is true', () => {
            const cachedImage = {};
            stubs.getCacheEntry.withArgs(0).returns({ inProgress: true });
            stubs.createImageEl.returns(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).not.to.be.called;
                expect(imageEl).to.be.null;
            });
        });
    });

    describe('getThumbnailDataURL()', () => {
        beforeEach(() => {
            stubs.getCacheEntry = sandbox.stub(thumbnailsSidebar.thumbnailImageCache, 'get');
            stubs.setCacheEntry = sandbox.stub(thumbnailsSidebar.thumbnailImageCache, 'set');
            thumbnailsSidebar.thumbnailImageCache = { get: stubs.getCacheEntry, set: stubs.setCacheEntry };
        });

        it('should scale canvas the same as the first page if page ratio is the same', () => {
            const cachedImage = {};
            stubs.getCacheEntry.withArgs(1).returns(cachedImage);
            thumbnailsSidebar.pageRatio = 1;

            // Current page has same ratio
            stubs.getViewport.withArgs({ scale: 1 }).returns({ width: 10, height: 10 });

            const expScale = TEST_SCALE; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10

            return thumbnailsSidebar.getThumbnailDataURL(1).then(() => {
                expect(stubs.getPage).to.be.called;
                expect(stubs.getViewport.withArgs({ scale: expScale })).to.be.called;
            });
        });

        it('should handle non-uniform page ratios', () => {
            const cachedImage = {};
            stubs.getCacheEntry.withArgs(1).returns(cachedImage);
            thumbnailsSidebar.pageRatio = 1;

            // Current page has ratio of 0.5 instead of 1
            stubs.getViewport.withArgs({ scale: 1 }).returns({ width: 10, height: 20 });

            const expScale = TEST_SCALE / 2; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10 / 2

            return thumbnailsSidebar.getThumbnailDataURL(0).then(() => {
                expect(stubs.getPage).to.be.called;
                expect(stubs.getViewport.withArgs({ scale: expScale })).to.be.called;
            });
        });
    });

    describe('thumbnailClickHandler()', () => {
        let targetEl;
        let parentEl;
        let evt;

        beforeEach(() => {
            stubs.onThumbnailSelect = sandbox.stub();
            stubs.preventDefault = sandbox.stub();
            stubs.stopImmediatePropagation = sandbox.stub();
            stubs.focus = sandbox.stub();

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

        it('should call the onThumbnailSelect if target is a thumbnail element', () => {
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onThumbnailSelect).to.be.calledWith(3);
            expect(stubs.focus).to.be.called;
            expect(stubs.preventDefault).to.be.called;
            expect(stubs.stopImmediatePropagation).to.be.called;
        });

        it('should not call the onThumbnailSelect if target is not thumbnail element', () => {
            targetEl.classList.remove('bp-thumbnail-nav');
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onThumbnailSelect).not.to.be.called;
            expect(stubs.focus).to.be.called;
            expect(stubs.preventDefault).to.be.called;
            expect(stubs.stopImmediatePropagation).to.be.called;
        });
    });

    describe('onKeyDown()', () => {
        beforeEach(() => {
            stubs.onThumbnailSelect = sandbox.stub();
            stubs.event = {
                stopImmediatePropagation: sandbox.stub(),
                preventDefault: sandbox.stub(),
            };
            utils.decodeKeydown = sandbox.stub();

            thumbnailsSidebar.onThumbnailSelect = stubs.onThumbnailSelect;
        });

        it('should select the next page on ArrowDown', () => {
            thumbnailsSidebar.currentPage = 1;
            utils.decodeKeydown.returns('ArrowDown');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).to.be.calledWith(2);
            expect(stubs.event.preventDefault).to.be.called;
            expect(stubs.event.stopImmediatePropagation).to.be.called;
        });

        it('should select the previous page on ArrowUp', () => {
            thumbnailsSidebar.currentPage = 2;
            utils.decodeKeydown.returns('ArrowUp');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).to.be.calledWith(1);
            expect(stubs.event.preventDefault).to.be.called;
            expect(stubs.event.stopImmediatePropagation).to.be.called;
        });

        it('should not stop the event if any other key is pressed', () => {
            utils.decodeKeydown.returns('Tab');

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.event.preventDefault).not.to.be.called;
            expect(stubs.event.stopImmediatePropagation).not.to.be.called;
        });

        it('should do nothing if there is no passed in onThumbnailSelect method', () => {
            thumbnailsSidebar.onThumbnailSelect = null;

            thumbnailsSidebar.onKeydown(stubs.event);

            expect(stubs.onThumbnailSelect).not.to.be.called;
        });
    });

    describe('setCurrentPage()', () => {
        beforeEach(() => {
            stubs.applyCurrentPageSelection = sandbox.stub(thumbnailsSidebar, 'applyCurrentPageSelection');
            thumbnailsSidebar.pdfViewer = { pagesCount: 10 };
            thumbnailsSidebar.virtualScroller = virtualScroller;
        });

        const paramaterizedTests = [
            { name: 'pageNumber is undefined', pageNumber: undefined },
            { name: 'pageNumber is less than 1', pageNumber: 0 },
            { name: 'pageNumber is greater than last page', pageNumber: 11 },
        ];

        paramaterizedTests.forEach(({ name, pageNumber }) => {
            it(`should do nothing if ${name}`, () => {
                thumbnailsSidebar.setCurrentPage(pageNumber);

                expect(thumbnailsSidebar.currentPage).to.be.undefined;
                expect(stubs.applyCurrentPageSelection).not.to.be.called;
            });
        });

        it('should set the currentPage and apply current page selection', () => {
            thumbnailsSidebar.setCurrentPage(3);

            expect(thumbnailsSidebar.currentPage).to.be.equal(3);
            expect(stubs.applyCurrentPageSelection).to.be.called;
            expect(stubs.vsScrollIntoView).to.be.calledWith(2);
        });
    });

    describe('applyCurrentPageSelection()', () => {
        let thumbnails;

        beforeEach(() => {
            stubs.addClass = sandbox.stub();
            stubs.removeClass = sandbox.stub();

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

        it('should remove the is selected class from all thumbnails', () => {
            thumbnailsSidebar.currentPage = 10;

            thumbnailsSidebar.applyCurrentPageSelection();

            expect(stubs.removeClass).to.be.calledThrice;
            expect(stubs.addClass).not.to.be.called;
        });

        it('should remove the is selected class from all thumbnails', () => {
            thumbnailsSidebar.currentPage = 2;

            thumbnailsSidebar.applyCurrentPageSelection();

            expect(stubs.removeClass).to.be.calledTwice;
            expect(stubs.addClass).to.be.calledOnce;
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.toggleOpen = sandbox.stub(thumbnailsSidebar, 'toggleOpen');
            stubs.toggleClose = sandbox.stub(thumbnailsSidebar, 'toggleClose');
        });

        it('should do nothing if there is no anchorEl', () => {
            thumbnailsSidebar.anchorEl = null;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).not.to.be.called;
            expect(stubs.toggleClose).not.to.be.called;

            thumbnailsSidebar.anchorEl = anchorEl;
        });

        it('should toggle open if it was closed', () => {
            thumbnailsSidebar.isOpen = false;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).to.be.called;
            expect(stubs.toggleClose).not.to.be.called;
        });

        it('should toggle closed if it was open', () => {
            thumbnailsSidebar.isOpen = true;

            thumbnailsSidebar.toggle();

            expect(stubs.toggleOpen).not.to.be.called;
            expect(stubs.toggleClose).to.be.called;
        });
    });

    describe('toggleOpen()', () => {
        beforeEach(() => {
            stubs.removeClass = sandbox.stub(thumbnailsSidebar.anchorEl.classList, 'remove');
            thumbnailsSidebar.virtualScroller = virtualScroller;
        });

        it('should do nothing if there is no virtualScroller', () => {
            thumbnailsSidebar.virtualScroller = null;
            thumbnailsSidebar.isOpen = false;

            thumbnailsSidebar.toggleOpen();

            expect(thumbnailsSidebar.isOpen).to.be.false;
            expect(stubs.vsScrollIntoView).not.to.be.called;
        });

        it('should remove the hidden class and scroll the page into view', () => {
            thumbnailsSidebar.currentPage = 3;

            thumbnailsSidebar.toggleOpen();

            expect(thumbnailsSidebar.isOpen).to.be.true;
            expect(stubs.vsScrollIntoView).to.be.calledWith(2);
        });
    });

    describe('toggleClose()', () => {
        it('should set isOpen to false', () => {
            thumbnailsSidebar.isOpen = true;

            thumbnailsSidebar.toggleClose();

            expect(thumbnailsSidebar.isOpen).to.be.false;
        });
    });
});
