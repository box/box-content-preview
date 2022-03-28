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
        stubs.render = jest.fn(() => ({
            promise: Promise.resolve(),
        }));
        page = {
            getViewport: stubs.getViewport,
            render: stubs.render,
        };
        pagePromise = Promise.resolve(page);
        stubs.getPage = jest.fn(() => pagePromise);
        pdfViewer = {
            pdfDocument: {
                getPage: stubs.getPage,
            },
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
            stubs.getThumbnailDataURL = jest.spyOn(thumbnail, 'getThumbnailDataURL').mockResolvedValue(undefined);
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
                expect(stubs.setCacheEntry).toBeCalledWith(0, { inProgress: false, image: imageEl });
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
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale });
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
                expect(stubs.getViewport).toBeCalledWith({ scale: expScale });
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
    });
});
