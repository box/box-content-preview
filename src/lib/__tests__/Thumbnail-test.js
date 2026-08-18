/* eslint-disable no-unused-expressions */
import Thumbnail, { CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE, THUMBNAIL_TOTAL_WIDTH } from '../Thumbnail';

const TEST_SCALE = 30;

describe('Thumbnail', () => {
    let thumbnail;
    let stubs = {};
    let pdfViewer = {};
    let page;
    let pagePromise;

    beforeEach(() => {
        stubs.getViewport = jest.fn();
        stubs.cancelRender = jest.fn();
        stubs.cleanup = jest.fn();
        stubs.render = jest.fn(() => ({
            cancel: stubs.cancelRender,
            promise: Promise.resolve(),
        }));
        page = {
            cleanup: stubs.cleanup,
            getViewport: stubs.getViewport,
            pageNumber: 1,
            render: stubs.render,
            rotate: 0,
        };
        pagePromise = Promise.resolve(page);
        stubs.getPage = jest.fn(() => pagePromise);
        pdfViewer = {
            pdfDocument: {
                getPage: stubs.getPage,
            },
            isPageCached: jest.fn().mockReturnValue(false),
        };
        thumbnail = new Thumbnail(pdfViewer);
    });

    afterEach(() => {
        if (thumbnail && typeof thumbnail.destroy === 'function') {
            thumbnail.thumbnailImageCache = null;
            thumbnail.destroy();
        }
        thumbnail = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should initialize properties', () => {
            expect(thumbnail.pdfViewer).toBe(pdfViewer);
            expect(thumbnail.thumbnailImageCache.cache).toEqual({});
            expect(thumbnail.renderTasks).toEqual(new Set());
            expect(thumbnail.scale).toBeUndefined();
            expect(thumbnail.pageRatio).toBeUndefined();
        });

        test('should initialize properties if docFirstPreloader is enabled', () => {
            const preloader = {};
            thumbnail = new Thumbnail(pdfViewer, preloader);
            expect(thumbnail.pdfViewer).toBe(pdfViewer);
            expect(thumbnail.preloader).toBe(preloader);
            expect(thumbnail.thumbnailImageCache.cache).toEqual({});
            expect(thumbnail.scale).toBeUndefined();
            expect(thumbnail.pageRatio).toBeUndefined();
        });
    });

    describe('init()', () => {
        test('should initialize the render properties', () => {
            stubs.getViewport.mockReturnValue({ width: 10, height: 10 });

            thumbnail.init();
            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnail.scale).toBe(15);
                expect(thumbnail.pageRatio).toBe(1);
            });
        });

        test('should initialize the render properties from the preloader if available', () => {
            const preloader = {
                imageDimensions: {
                    width: 10,
                    height: 10,
                },
            };
            thumbnail = new Thumbnail(pdfViewer, preloader);

            thumbnail.init();
            return pagePromise.then(() => {
                expect(thumbnail.scale).toBe(15);
                expect(thumbnail.pageRatio).toBe(1);
                expect(stubs.getViewport).not.toBeCalled();
            });
        });

        test('should not initialize the render properties if viewport does not return width', () => {
            stubs.getViewport.mockReturnValue({ width: undefined, height: 10 });

            thumbnail.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnail.scale).toBeUndefined();
                expect(thumbnail.pageRatio).toBeUndefined();
            });
        });

        test('should not initialize the render properties if viewport does not return height', () => {
            stubs.getViewport.mockReturnValue({ width: 10, height: undefined });

            thumbnail.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnail.scale).toBeUndefined();
                expect(thumbnail.pageRatio).toBeUndefined();
            });
        });

        test('should not initialize the render properties if viewport does not return non zero width & height', () => {
            stubs.getViewport.mockReturnValue({ width: 0, height: 0 });

            thumbnail.init();

            return pagePromise.then(() => {
                expect(stubs.getViewport).toBeCalled();
                expect(thumbnail.scale).toBeUndefined();
                expect(thumbnail.pageRatio).toBeUndefined();
            });
        });
    });

    describe('destroy()', () => {
        test('should clean up the instance properties', () => {
            thumbnail.destroy();
            expect(thumbnail.thumbnailImageCache).toBeNull();
            expect(thumbnail.pdfViewer).toBeNull();
            expect(thumbnail.preloader).toBeNull();
            expect(thumbnail.renderTasks).toBeNull();
        });

        test('should safely handle repeated calls', () => {
            thumbnail.destroy();
            expect(() => thumbnail.destroy()).not.toThrow();
        });

        test('should not initialize after being destroyed', async () => {
            thumbnail.destroy();

            await expect(thumbnail.init()).resolves.toBeNull();
            expect(stubs.getPage).not.toBeCalled();
        });

        test('should ignore an in-flight initialization after being destroyed', async () => {
            let resolvePage;
            pagePromise = new Promise(resolve => {
                resolvePage = resolve;
            });

            const initPromise = thumbnail.init();
            thumbnail.destroy();
            resolvePage(page);

            await expect(initPromise).resolves.toBeNull();
            expect(stubs.getViewport).not.toBeCalled();
        });

        test('should ignore an in-flight thumbnail render after being destroyed', async () => {
            let resolvePage;
            pagePromise = new Promise(resolve => {
                resolvePage = resolve;
            });

            const dataUrlPromise = thumbnail.getThumbnailDataURL(1);
            thumbnail.destroy();
            resolvePage(page);
            await dataUrlPromise;

            expect(stubs.getViewport).not.toBeCalled();
            expect(stubs.render).not.toBeCalled();
        });
    });

    describe('createImageEl()', () => {
        test('should create a new div element if only the dataUrl is sent', () => {
            const imageMock = 'image';
            const imageEle = thumbnail.createImageEl(imageMock);
            expect(imageEle.outerHTML).toBe(
                `<div class="${CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE}" style="background-image: url(${imageMock}); width: ${THUMBNAIL_TOTAL_WIDTH}px;"></div>`,
            );
        });

        test('should create a new image element if the option is set', () => {
            const imageMock = 'image';
            const imageEle = thumbnail.createImageEl(imageMock, { createImgTag: true });
            expect(imageEle.outerHTML).toBe(`<img src="${imageMock}">`);
        });
    });

    describe('createThumbnailImage', () => {
        beforeEach(() => {
            stubs.getThumbnailDataURL = jest.spyOn(thumbnail, 'getThumbnailDataURL').mockResolvedValue('dataurl');
            stubs.createImageEl = jest.spyOn(thumbnail, 'createImageEl').mockImplementation();
            stubs.getCacheEntry = jest.spyOn(thumbnail.thumbnailImageCache, 'get').mockImplementation();
            stubs.setCacheEntry = jest.spyOn(thumbnail.thumbnailImageCache, 'set').mockImplementation();
        });

        test('should resolve immediately if the image is in cache', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue({ image: cachedImage });

            return thumbnail.createThumbnailImage(1).then(() => {
                expect(stubs.createImageEl).not.toBeCalled();
            });
        });

        test('should create an image element if not in cache', () => {
            const cachedImage = {};
            stubs.createImageEl.mockReturnValue(cachedImage);

            return thumbnail.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).toBeCalled();
                expect(stubs.setCacheEntry).toBeCalledWith(0, {
                    image: imageEl,
                    inProgress: false,
                });
            });
        });

        test('should resolve with null if cache entry inProgress is true', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue({ inProgress: true });
            stubs.createImageEl.mockReturnValue(cachedImage);

            return thumbnail.createThumbnailImage(0).then(imageEl => {
                expect(stubs.createImageEl).not.toBeCalled();
                expect(imageEl).toBeNull();
            });
        });

        test('should clear the in-progress entry when rendering is cancelled', async () => {
            stubs.getThumbnailDataURL.mockResolvedValue(null);

            await expect(thumbnail.createThumbnailImage(0)).resolves.toBeNull();
            expect(stubs.setCacheEntry).toHaveBeenLastCalledWith(0, { inProgress: false });
            expect(stubs.createImageEl).not.toHaveBeenCalled();
        });

        test('should resolve with null after being destroyed', async () => {
            thumbnail.destroy();

            await expect(thumbnail.createThumbnailImage(0)).resolves.toBeNull();
            expect(stubs.getThumbnailDataURL).not.toBeCalled();
        });

        test('should ignore an in-flight image after being destroyed', async () => {
            let resolveDataUrl;
            stubs.getThumbnailDataURL.mockReturnValue(
                new Promise(resolve => {
                    resolveDataUrl = resolve;
                }),
            );

            const imagePromise = thumbnail.createThumbnailImage(0);
            thumbnail.destroy();
            stubs.setCacheEntry.mockClear();
            resolveDataUrl('image');

            await expect(imagePromise).resolves.toBeNull();
            expect(stubs.createImageEl).not.toBeCalled();
            expect(stubs.setCacheEntry).not.toBeCalled();
        });
    });

    describe('getThumbnailDataURL()', () => {
        beforeEach(() => {
            stubs.getCacheEntry = jest.spyOn(thumbnail.thumbnailImageCache, 'get').mockImplementation();
            stubs.setCacheEntry = jest.spyOn(thumbnail.thumbnailImageCache, 'set').mockImplementation();
            thumbnail.thumbnailImageCache = { get: stubs.getCacheEntry, set: stubs.setCacheEntry };
        });

        test('should scale canvas the same as the first page if page ratio is the same', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue(cachedImage);
            thumbnail.pageRatio = 1;

            // Current page has same ratio
            stubs.getViewport.mockReturnValue({ width: 10, height: 10 });

            const expScale = TEST_SCALE; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10

            return thumbnail.getThumbnailDataURL(1).then(() => {
                expect(stubs.getPage).toBeCalled();
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale, rotation: 0 });
            });
        });

        test('should handle non-uniform page ratios', () => {
            const cachedImage = {};
            stubs.getCacheEntry.mockReturnValue(cachedImage);
            thumbnail.pageRatio = 1;

            // Current page has ratio of 0.5 instead of 1
            stubs.getViewport.mockReturnValue({ width: 10, height: 20 });

            const expScale = TEST_SCALE / 2; // Should be DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / 10 / 2

            return thumbnail.getThumbnailDataURL(0).then(() => {
                expect(stubs.getPage).toBeCalled();
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale, rotation: 0 });
            });
        });

        test('should use the thumb width sent by param on uniform ratios', () => {
            stubs.mathCeil = jest.spyOn(Math, 'ceil');
            thumbnail.pageRatio = 1;
            const thumbSize = {
                width: 10,
                height: 10,
            };
            stubs.getViewport.mockReturnValue(thumbSize);
            const thumbMaxWidth = 20;
            return thumbnail.getThumbnailDataURL(0, { thumbMaxWidth }).then(() => {
                expect(stubs.mathCeil).toBeCalledWith(thumbMaxWidth / (thumbSize.width / thumbSize.height));
            });
        });

        test('should use the thumb width sent by param on non-uniform ratios', () => {
            stubs.mathCeil = jest.spyOn(Math, 'ceil');
            thumbnail.pageRatio = 1;
            const thumbSize = {
                width: 10,
                height: 20,
            };
            stubs.getViewport.mockReturnValue(thumbSize);
            const thumbMaxWidth = 20;
            return thumbnail.getThumbnailDataURL(0, { thumbMaxWidth }).then(() => {
                expect(stubs.mathCeil).toBeCalledWith(thumbMaxWidth / thumbnail.pageRatio);
            });
        });

        test('should get data url from preloader if available', () => {
            const preloader = {
                preloadedImages: { 1: 'dataurl' },
            };
            thumbnail = new Thumbnail(pdfViewer, preloader);

            return thumbnail.getThumbnailDataURL(1).then(dataUrl => {
                expect(dataUrl).toBe('dataurl');
                expect(stubs.getPage).not.toHaveBeenCalled();
                expect(stubs.getViewport).not.toHaveBeenCalled();
            });
        });
    });

    describe('renderPageImage()', () => {
        beforeEach(() => {
            thumbnail.pageRatio = 1;
            stubs.getViewport.mockReturnValue({ width: 10, height: 10 });
        });

        test('should return dimensions and release the canvas backing store', async () => {
            const canvas = document.createElement('canvas');
            const createElement = jest.spyOn(document, 'createElement').mockReturnValue(canvas);

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await expect(task.promise).resolves.toMatchObject({
                dataUrl: expect.stringContaining('data:image/png'),
                height: 20,
                width: 20,
            });
            expect(canvas.width).toBe(0);
            expect(canvas.height).toBe(0);
            expect(thumbnail.renderTasks.size).toBe(0);
            createElement.mockRestore();
        });

        test('should cancel an active PDF render and discard its result', async () => {
            let rejectRender;
            stubs.render.mockReturnValue({
                cancel: stubs.cancelRender,
                promise: new Promise((resolve, reject) => {
                    rejectRender = reject;
                }),
            });

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await pagePromise;
            await Promise.resolve();
            task.cancel();
            rejectRender(new Error('Rendering cancelled'));

            expect(stubs.cancelRender).toHaveBeenCalled();
            await expect(task.promise).resolves.toBeNull();
        });

        test('should bypass preloaded images for an uncached high-resolution render', async () => {
            thumbnail = new Thumbnail(pdfViewer, { preloadedImages: { 1: 'dataurl' } });
            thumbnail.pageRatio = 1;

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await expect(task.promise).resolves.toMatchObject({ width: 20 });
            expect(stubs.getPage).toHaveBeenCalled();
        });

        test('should release PDF.js page resources after a successful render', async () => {
            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await task.promise;
            expect(stubs.cleanup).toHaveBeenCalled();
        });

        test('should release PDF.js page resources after cancelling a render that had started', async () => {
            let rejectRender;
            stubs.render.mockReturnValue({
                cancel: stubs.cancelRender,
                promise: new Promise((resolve, reject) => {
                    rejectRender = reject;
                }),
            });

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await pagePromise;
            await Promise.resolve();
            task.cancel();
            rejectRender(new Error('Rendering cancelled'));

            await expect(task.promise).resolves.toBeNull();
            expect(stubs.cleanup).toHaveBeenCalled();
        });

        test('should not clean up a page whose render was cancelled before it started', async () => {
            let resolvePage;
            stubs.getPage.mockReturnValue(
                new Promise(resolve => {
                    resolvePage = resolve;
                }),
            );

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            task.cancel();
            resolvePage(page);

            await expect(task.promise).resolves.toBeNull();
            expect(stubs.cleanup).not.toHaveBeenCalled();
        });

        test('should resolve and clear the task when PDF.js defers cleanup because the page is rendering elsewhere', async () => {
            stubs.cleanup.mockReturnValue(false);

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await expect(task.promise).resolves.toMatchObject({ width: 20 });
            expect(stubs.cleanup).toHaveBeenCalled();
            expect(thumbnail.renderTasks.size).toBe(0);
        });

        test('should skip cleanup while the main viewer caches the page', async () => {
            pdfViewer.isPageCached.mockReturnValue(true);

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await expect(task.promise).resolves.toMatchObject({ width: 20 });

            expect(pdfViewer.isPageCached).toHaveBeenCalledWith(1);
            expect(stubs.cleanup).not.toHaveBeenCalled();
        });

        test('should clean up a page the main viewer has evicted from its cache', async () => {
            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await task.promise;

            expect(pdfViewer.isPageCached).toHaveBeenCalledWith(1);
            expect(stubs.cleanup).toHaveBeenCalled();
        });

        test('should skip cleanup when the bundled PDF.js viewer cannot report its page cache', async () => {
            delete pdfViewer.isPageCached;

            const task = thumbnail.renderPageImage(1, { thumbMaxWidth: 20 });
            await task.promise;

            expect(stubs.cleanup).not.toHaveBeenCalled();
        });
    });
});
