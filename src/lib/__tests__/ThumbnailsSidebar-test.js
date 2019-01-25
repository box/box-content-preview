/* eslint-disable no-unused-expressions */
import ThumbnailsSidebar from '../ThumbnailsSidebar';
import VirtualScroller from '../VirtualScroller';

const sandbox = sinon.sandbox.create();

describe('ThumbnailsSidebar', () => {
    let thumbnailsSidebar;
    let stubs = {};
    let pdfViewer = {};
    let page;
    let virtualScroller;
    let pagePromise;

    before(() => fixture.setBase('src/lib'));

    beforeEach(() => {
        fixture.load('__tests__/ThumbnailsSidebar-test.html');

        stubs.raf = sandbox.stub(window, 'requestAnimationFrame').callsFake((callback) => callback());

        stubs.getViewport = sandbox.stub();
        stubs.render = sandbox.stub();

        page = {
            getViewport: stubs.getViewport,
            render: stubs.render
        };
        pagePromise = Promise.resolve(page);

        stubs.getPage = sandbox.stub().returns(pagePromise);
        stubs.vsInit = sandbox.stub(VirtualScroller.prototype, 'init');
        stubs.vsDestroy = sandbox.stub(VirtualScroller.prototype, 'destroy');

        virtualScroller = {
            destroy: stubs.vsDestroy
        };

        pdfViewer = {
            pdfDocument: {
                getPage: stubs.getPage
            }
        };

        thumbnailsSidebar = new ThumbnailsSidebar(document.getElementById('test-thumbnails-sidebar'), pdfViewer);
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (thumbnailsSidebar && typeof thumbnailsSidebar.destroy === 'function') {
            thumbnailsSidebar.destroy();
        }

        thumbnailsSidebar = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should initialize properties', () => {
            expect(thumbnailsSidebar.anchorEl.id).to.be.equal('test-thumbnails-sidebar');
            expect(thumbnailsSidebar.pdfViewer).to.be.equal(pdfViewer);
            expect(thumbnailsSidebar.thumbnailImageCache).to.be.empty;
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
                expect(thumbnailsSidebar.scale).to.be.equal(15); // DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / width
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
        });

        // eslint-disable-next-line
        const createThumbnailEl = (pageNum, contains) => {
            return {
                classList: {
                    contains: () => contains
                },
                dataset: {
                    bpPageNum: pageNum
                }
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

            const thumbnailEl = {
                appendChild: stubs.appendChild,
                classList: { add: stubs.addClass }
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
        });

        it('should resolve immediately if the image is in cache', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: { image: cachedImage } };

            return thumbnailsSidebar.createThumbnailImage(1).then(() => {
                expect(stubs.createImageEl).not.to.be.called;
            });
        });

        it('should create an image element if not in cache', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: { image: cachedImage } };
            stubs.createImageEl.returns(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then((imageEl) => {
                expect(stubs.createImageEl).to.be.called;
                expect(thumbnailsSidebar.thumbnailImageCache[0].image).to.be.eql(imageEl);
                expect(thumbnailsSidebar.thumbnailImageCache[0].inProgress).to.be.false;
            });
        });

        it('should resolve with null if cache entry inProgress is true', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 0: { inProgress: true } };
            stubs.createImageEl.returns(cachedImage);

            return thumbnailsSidebar.createThumbnailImage(0).then((imageEl) => {
                expect(stubs.createImageEl).not.to.be.called;
                expect(imageEl).to.be.null;
            });
        });
    });

    describe('getThumbnailDataURL()', () => {
        it('should scale canvas the same as the first page if page ratio is the same', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: cachedImage };
            thumbnailsSidebar.pageRatio = 1;

            // Current page has same ratio
            stubs.getViewport.withArgs(1).returns({ width: 10, height: 10 });
            stubs.render.returns(Promise.resolve());

            const expScale = 21; // Should be THUMBNAIL_WIDTH_MAX(210) / 10 = 21

            return thumbnailsSidebar.getThumbnailDataURL(1).then(() => {
                expect(stubs.getPage).to.be.called;
                expect(stubs.getViewport.withArgs(expScale)).to.be.called;
            });
        });

        it('should handle non-uniform page ratios', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: cachedImage };
            thumbnailsSidebar.pageRatio = 1;

            // Current page has ratio of 0.5 instead of 1
            stubs.getViewport.withArgs(1).returns({ width: 10, height: 20 });
            stubs.render.returns(Promise.resolve());

            const expScale = 10.5; // Should be 10.5 instead of 21 because the viewport ratio above is 0.5 instead of 1

            return thumbnailsSidebar.createThumbnailImage(0).then(() => {
                expect(stubs.getPage).to.be.called;
                expect(stubs.getViewport.withArgs(expScale)).to.be.called;
            });
        });
    });

    describe('thumbnailClickHandler()', () => {
        let targetEl;
        let evt;

        beforeEach(() => {
            stubs.onClickHandler = sandbox.stub();
            stubs.preventDefault = sandbox.stub();
            stubs.stopImmediatePropagation = sandbox.stub();

            targetEl = document.createElement('div');
            targetEl.classList.add('bp-thumbnail');
            targetEl.dataset.bpPageNum = '3';

            evt = {
                target: targetEl,
                preventDefault: stubs.preventDefault,
                stopImmediatePropagation: stubs.stopImmediatePropagation
            };

            thumbnailsSidebar.onClickHandler = stubs.onClickHandler;
        });

        it('should call the onClickHandler if target is a thumbnail element', () => {
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onClickHandler).to.be.calledWith(3);
            expect(stubs.preventDefault).to.be.called;
            expect(stubs.stopImmediatePropagation).to.be.called;
        });

        it('should not call the onClickHandler if target is not thumbnail element', () => {
            targetEl.classList.remove('bp-thumbnail');
            thumbnailsSidebar.thumbnailClickHandler(evt);

            expect(stubs.onClickHandler).not.to.be.called;
            expect(stubs.preventDefault).to.be.called;
            expect(stubs.stopImmediatePropagation).to.be.called;
        });
    });

    describe('setCurrentPage()', () => {
        beforeEach(() => {
            stubs.applyCurrentPageSelection = sandbox.stub(thumbnailsSidebar, 'applyCurrentPageSelection');
            thumbnailsSidebar.pdfViewer = { pagesCount: 10 };
        });

        const paramaterizedTests = [
            { name: 'pageNumber is undefined', pageNumber: undefined },
            { name: 'pageNumber is less than 1', pageNumber: 0 },
            { name: 'pageNumber is greater than last page', pageNumber: 11 }
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
        });
    });

    describe('applyCurrentPageSelection()', () => {
        let thumbnails;

        beforeEach(() => {
            stubs.addClass = sandbox.stub();
            stubs.removeClass = sandbox.stub();

            // eslint-disable-next-line
            const createTestThumbnail = (pageNum) => {
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
});
