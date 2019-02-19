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

    describe('generateThumbnailImage()', () => {
        beforeEach(() => {
            stubs.requestThumbnailImage = sandbox.stub(thumbnailsSidebar, 'requestThumbnailImage');
        });

        it('should do nothing if startOffset is -1', () => {
            thumbnailsSidebar.generateThumbnailImages({ items: [], startOffset: -1 });

            expect(stubs.requestThumbnailImage).not.to.be.called;
        });

        it('should not request thumbnail images if thumbnail already contains image loaded class', () => {
            stubs.contains = sandbox.stub().returns(true);

            const items = [{ classList: { contains: stubs.contains } }];

            thumbnailsSidebar.generateThumbnailImages({ items, startOffset: 0 });

            expect(stubs.requestThumbnailImage).not.to.be.called;
        });

        it('should request thumbnail images if thumbnail does not already contains image loaded class', () => {
            stubs.contains = sandbox.stub().returns(false);

            const items = [{ classList: { contains: stubs.contains } }];

            thumbnailsSidebar.generateThumbnailImages({ items, startOffset: 0 });

            expect(stubs.requestThumbnailImage).to.be.called;
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

    describe('createThumbnailImage()', () => {
        it('should resolve immediately if the image is in cache', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: cachedImage };

            return thumbnailsSidebar.createThumbnailImage(1).then(() => {
                expect(stubs.getPage).not.to.be.called;
            });
        });

        it('should create an image element if not in cache', () => {
            const cachedImage = {};
            thumbnailsSidebar.thumbnailImageCache = { 1: cachedImage };
            thumbnailsSidebar.pageRatio = 1;

            stubs.getViewport.returns({ width: 10, height: 10 });
            stubs.render.returns(Promise.resolve());

            return thumbnailsSidebar.createThumbnailImage(0).then((imageEl) => {
                expect(stubs.getPage).to.be.called;
                expect(stubs.getViewport).to.be.called;
                expect(thumbnailsSidebar.thumbnailImageCache[0]).to.be.eql(imageEl);
            });
        });
    });
});
