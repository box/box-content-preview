import DocFirstPreloader from '../DocFirstPreloader';
import Api from '../../../api';
import * as util from '../../../util';
import { CLASS_BOX_PREVIEW_THUMBNAILS_OPEN, CLASS_BOX_PRELOAD_COMPLETE } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

jest.mock('../../../api');

describe('/lib/viewers/doc/DocFirstPreloader', () => {
    let preloader;
    let mockPreviewUI;
    let mockApi;
    let mockDocBaseViewer;
    let mockElement;
    let mockFirstImage;
    beforeEach(() => {
        mockPreviewUI = {
            previewContainer: {
                classList: {
                    contains: jest.fn(),
                },
            },
        };

        mockDocBaseViewer = {
            initThumbnails: jest.fn(),
            shouldThumbnailsBeToggled: jest.fn(),
            rootEl: document.createElement('div'),
            emit: jest.fn(),
        };

        mockApi = new Api();
        preloader = new DocFirstPreloader(mockPreviewUI, { api: mockApi });
        preloader.preloadEl = document.createElement('div');
        mockElement = document.createElement('div');
        mockFirstImage = new Image(100, 200);
        preloader.imageDimensions = {
            width: 100,
            height: 100,
        };

        jest.spyOn(document, 'getElementsByClassName').mockImplementation(className => {
            if (className === 'bcpr-PreviewMask') {
                return [mockElement];
            }
            return [];
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('constructor()', () => {
        it('should initialize with the provided previewUI and api', () => {
            expect(preloader.previewUI).toBe(mockPreviewUI);
            expect(preloader.api).toBe(mockApi);
        });

        it('should set default properties', () => {
            expect(preloader.wrapperClassName).toBe('bp-document-preload-wrapper');
            expect(preloader.numPages).toBe(1);
            expect(preloader.preloadedImages).toEqual({});
        });
    });

    describe('buildPreloaderImagePlaceHolder()', () => {
        it('should create a placeholder element with the provided image', () => {
            const mockImage = document.createElement('img');
            const placeholder = preloader.buildPreloaderImagePlaceHolder(mockImage);

            expect(placeholder.classList.contains('bp-preload-placeholder')).toBe(true);
            expect(placeholder.firstChild).toBe(mockImage);
        });
    });

    describe('loadImage()', () => {
        it('should resolve with an image element when the image loads successfully', async () => {
            const mockSrc = 'mock-image-src';
            const mockImage = { src: mockSrc, onload: null, onerror: null };
            jest.spyOn(global, 'Image').mockImplementation(() => mockImage);

            const promise = preloader.loadImage(mockSrc);
            mockImage.onload();

            await expect(promise).resolves.toBe(mockImage);
        });

        it('should reject when the image fails to load', async () => {
            const mockSrc = 'mock-image-src';
            const mockImage = { src: mockSrc, onload: null, onerror: null };
            jest.spyOn(global, 'Image').mockImplementation(() => mockImage);

            const promise = preloader.loadImage(mockSrc);
            mockImage.onerror();

            await expect(promise).rejects.toBeUndefined();
        });
    });

    describe('showPreload()', () => {
        let mockContainer;
        beforeEach(() => {
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'emit');
            jest.spyOn(preloader, 'setPreloadImageDimensions').mockResolvedValue();
            jest.spyOn(preloader, 'loadImage').mockReturnValue(mockFirstImage);
            jest.spyOn(preloader, 'hidePreviewMask');
            jest.spyOn(preloader, 'showPreviewMask');
            mockContainer = document.createElement('div');
        });

        it('should not proceed if the document is already loaded', async () => {
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(true);
            jest.spyOn(preloader, 'initializePreloadContainerComponents').mockImplementation();
            await preloader.showPreload('mock-url', document.createElement('div'));
            expect(preloader.pdfJsDocLoadComplete).toHaveBeenCalled();
            expect(preloader.initializePreloadContainerComponents).not.toHaveBeenCalled();
        });

        it('should set isWebp to true if pagedPreLoadUrlWithAuth is provided', async () => {
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue([]);
            await preloader.showPreload(null, mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);
            expect(preloader.isWebp).toBe(true);
        });

        it('should set isWebp to false if pagedPreLoadUrlWithAuth is not provided', async () => {
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue([]);
            await preloader.showPreload('mock-url', mockContainer, null, 1, mockDocBaseViewer);
            expect(preloader.isWebp).toBe(false);
        });

        it('should handle thubmnail sidebar correctly', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [Promise.resolve(mockBlob)];
            jest.spyOn(preloader, 'loadImage').mockReturnValue(new Image(100, 200));
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);
            expect(mockElement.style.display).toBe('none');
            expect(mockDocBaseViewer.emit).toHaveBeenCalledWith(VIEWER_EVENT.thumbnailsOpen);
            expect(mockDocBaseViewer.rootEl.classList.contains(CLASS_BOX_PRELOAD_COMPLETE)).toBe(true);
            expect(mockDocBaseViewer.rootEl.classList.contains(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN)).toBe(true);
        });

        it('should initialize preload components and fetch preload images and add images in order', async () => {
            const mockBlob = new Blob(['mock-content1'], { type: 'image/webp' });
            const mockBlob2 = new Blob(['mock-content2'], { type: 'image/webp' });
            const mockBlob3 = new Blob(['mock-content3'], { type: 'image/webp' });
            const mockBlob4 = new Blob(['mock-content4'], { type: 'image/webp' });
            const mockPromises = [
                Promise.resolve(mockBlob),
                Promise.resolve(mockBlob2),
                Promise.resolve(mockBlob3),
                Promise.resolve(mockBlob4),
            ];

            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'initializePreloadContainerComponents');

            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            jest.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
                if (blob === mockBlob) {
                    return 'mock-object-url1';
                }
                if (blob === mockBlob2) {
                    return 'mock-object-url2';
                }
                if (blob === mockBlob3) {
                    return 'mock-object-url3';
                }
                if (blob === mockBlob4) {
                    return 'mock-object-url4';
                }
                return '';
            });
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 4, mockDocBaseViewer);
            expect(preloader.numPages).toBe(4);
            expect(preloader.retrievedPagesCount).toBe(4);
            expect(preloader.initializePreloadContainerComponents).toHaveBeenCalledWith(mockContainer);
            expect(util.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                mockApi,
                'mock-url',
                4,
                'mock-paged-image-url',
                undefined, // preloadUrlMap not set in this test
            );
            expect(Object.keys(preloader.preloadedImages).length).toBe(4);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url1');
            expect(preloader.preloadedImages[2]).toBe('mock-object-url2');
            expect(preloader.preloadedImages[3]).toBe('mock-object-url3');
            expect(preloader.preloadedImages[4]).toBe('mock-object-url4');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalledWith(mockBlob, mockFirstImage);
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalledWith('preload');
            expect(preloader.loadTime).toBeDefined();
            expect(preloader.hidePreviewMask).toHaveBeenCalled();
            expect(preloader.showPreviewMask).not.toHaveBeenCalled();
        });

        it('should stop on first image retrieval failure', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [Promise.resolve(new Error('error')), Promise.resolve(mockBlob)];
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 2, mockDocBaseViewer);
            expect(preloader.retrievedPagesCount).toBe(0);
            expect(preloader.setPreloadImageDimensions).not.toHaveBeenCalled();
            expect(mockDocBaseViewer.initThumbnails).not.toHaveBeenCalled();
            expect(preloader.emit).not.toHaveBeenCalled();
            expect(preloader.loadTime).toBeUndefined();
            expect(preloader.showPreviewMask).toHaveBeenCalled();
            expect(preloader.hidePreviewMask).toHaveBeenCalled();
        });

        it('should only show the first image if a failure occurs in the second image but not the third', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [
                Promise.resolve(mockBlob),
                Promise.resolve(new Error('error')),
                Promise.resolve(mockBlob),
            ];

            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-object-url');

            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 3, mockDocBaseViewer);
            expect(preloader.retrievedPagesCount).toBe(1);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalled();
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalled();
            expect(preloader.loadTime).not.toBeUndefined();
        });

        it('should only add pages in order and stop as soon as there is an error', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockBlob2 = new Blob(['mock-content'], { type: 'image/webp' });
            const mockBlob4 = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [
                Promise.resolve(mockBlob),
                Promise.resolve(mockBlob2),
                Promise.resolve(new Error('error')),
                Promise.resolve(mockBlob4),
            ];

            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-object-url');
            jest.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
                if (blob === mockBlob) {
                    return 'mock-object-url1';
                }
                if (blob === mockBlob2) {
                    return 'mock-object-url2';
                }
                if (blob === mockBlob4) {
                    return 'mock-object-url4';
                }
                return '';
            });

            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 4, mockDocBaseViewer);
            expect(preloader.retrievedPagesCount).toBe(2);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url1');
            expect(preloader.preloadedImages[2]).toBe('mock-object-url2');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalled();
            expect(mockDocBaseViewer.rootEl.classList.contains('bp-thumbnails-open')).toBe(true);
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalled();
            expect(preloader.loadTime).not.toBeUndefined();
        });

        it('should show preview mask when Promise.all chain fails', async () => {
            const mockPromises = [Promise.reject(new Error('Network error'))];
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);

            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);

            expect(preloader.hidePreviewMask).toHaveBeenCalled();
            expect(preloader.showPreviewMask).toHaveBeenCalled();
            expect(preloader.emit).not.toHaveBeenCalledWith('preload');
        });

        it('should pass preloadUrlMap to getPreloadImageRequestPromises when available', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [Promise.resolve(mockBlob)];
            const preloadUrlMap = {
                jpg: { '1': 'https://api.box.com/image1.jpg' },
                webp: { '1': 'https://api.box.com/image2.webp' },
            };

            jest.spyOn(preloader, 'loadImage').mockReturnValue(new Image(100, 200));
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);

            mockDocBaseViewer.options = { preloadUrlMap };

            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);

            expect(util.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                mockApi,
                'mock-url',
                1,
                'mock-paged-image-url',
                preloadUrlMap,
            );
        });

        it('should show preview mask when initialization throws an error', async () => {
            jest.spyOn(preloader, 'initializePreloadContainerComponents').mockImplementation(() => {
                throw new Error('Initialization error');
            });

            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);

            expect(preloader.hidePreviewMask).toHaveBeenCalled();
            expect(preloader.showPreviewMask).toHaveBeenCalled();
            expect(preloader.emit).not.toHaveBeenCalledWith('preload');
        });
    });

    describe('addPreloadImageToPreloaderContainer()', () => {
        it('should create and return a container with the correct attributes and append it to preloadEl', () => {
            const mockImage = document.createElement('img');
            const index = 1;

            jest.spyOn(preloader, 'buildPreloaderImagePlaceHolder').mockImplementation(img => {
                const placeholder = document.createElement('div');
                placeholder.appendChild(img);
                return placeholder;
            });

            const result = preloader.addPreloadImageToPreloaderContainer(mockImage, index);

            expect(preloader.buildPreloaderImagePlaceHolder).toHaveBeenCalledWith(mockImage);
            expect(result.getAttribute('data-preload-index')).toBe(String(index));
            expect(result.classList.contains('loaded')).toBe(true);
            expect(preloader.preloadEl.contains(result)).toBe(true);
            expect(result.querySelector('img')).toBe(mockImage);
        });
    });

    describe('hidePreload()', () => {
        it('should add the transparent class and clean up preload DOM', () => {
            const mockWrapperEl = document.createElement('div');
            jest.spyOn(mockWrapperEl, 'addEventListener');
            jest.spyOn(preloader, 'restoreScrollPosition').mockImplementation(() => {});
            preloader.wrapperEl = mockWrapperEl;
            preloader.hidePreload();
            expect(mockWrapperEl.classList.contains('bp-is-transparent')).toBe(true);
            expect(mockWrapperEl.addEventListener).toHaveBeenCalledWith('transitionend', preloader.cleanupPreload);
            expect(mockWrapperEl.addEventListener).toHaveBeenCalledWith('scroll', preloader.cleanupPreload);
        });
    });

    describe('cleanupPreload()', () => {
        it('should remove the wrapper element and revoke object URLs', () => {
            const mockWrapperEl = document.createElement('div');
            const mockParent = document.createElement('div');
            mockParent.appendChild(mockWrapperEl);
            preloader.wrapperEl = mockWrapperEl;
            preloader.srcUrl = 'mock-url';
            preloader.preloadedImages = {
                1: 'mock-url',
                2: 'mock-url2',
            };
            jest.spyOn(URL, 'revokeObjectURL');
            preloader.cleanupPreload();
            expect(mockParent.contains(mockWrapperEl)).toBe(false);
            expect(preloader.wrapperEl).toBeUndefined();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url2');
            expect(preloader.preloadedImages).toEqual({});
        });
    });

    describe('pdfJsDocLoadComplete()', () => {
        it('should return true if the document is already loaded', () => {
            mockPreviewUI.previewContainer.classList.contains.mockReturnValue(true);

            const result = preloader.pdfJsDocLoadComplete();

            expect(result).toBe(true);
        });

        it('should return false if the document is not loaded', () => {
            mockPreviewUI.previewContainer.classList.contains.mockReturnValue(false);

            const result = preloader.pdfJsDocLoadComplete();

            expect(result).toBe(false);
        });
    });

    describe('readEXIF', () => {
        const mockImageBlob = new Blob(['mock data'], { type: 'image/jpeg' });
        const mockImageEl = {
            naturalWidth: 600,
            naturalHeight: 800,
        };

        beforeEach(() => {
            preloader = new DocFirstPreloader();
        });

        it('should resolve with valid PDF dimensions and number of pages when EXIF data is valid', async () => {
            const mockTags = {
                UserComment: {
                    description: 'pdfWidth:612pts,pdfHeight:792pts,numPages:10',
                },
            };

            global.ExifReader = {
                load: jest.fn().mockReturnValue(mockTags),
            };

            const result = await preloader.readEXIF(mockImageBlob, mockImageEl);

            expect(result).toEqual({
                pdfWidth: 612 * 1.3333333333333333, // PDFJS_CSS_UNITS
                pdfHeight: 792 * 1.3333333333333333,
                numPages: 10,
            });
        });

        it('should reject if EXIF data is invalid', async () => {
            const mockTags = {
                UserComment: {
                    description: 'invalid data',
                },
            };

            global.ExifReader = {
                load: jest.fn().mockReturnValue(mockTags),
            };

            await expect(preloader.readEXIF(mockImageBlob, mockImageEl)).rejects.toThrow('No valid EXIF data found');
        });

        it('should reject if EXIF num pages is invalid', async () => {
            const mockTags = {
                UserComment: {
                    description: 'pdfWidth:612pts,pdfHeight:792pts,numPages:0',
                },
            };

            global.ExifReader = {
                load: jest.fn().mockReturnValue(mockTags),
            };

            await expect(preloader.readEXIF(mockImageBlob, mockImageEl)).rejects.toThrow(
                'EXIF num pages data is invalid',
            );
        });

        it('should reject if EXIF PDF width and height are invalid', async () => {
            const mockTags = {
                UserComment: {
                    description: 'pdfWidth:612pts,pdfHeight:792pts,numPages:10',
                },
            };

            global.ExifReader = {
                load: jest.fn().mockReturnValue(mockTags),
            };

            const invalidImageEl = {
                naturalWidth: 2000,
                naturalHeight: 500,
            };

            await expect(preloader.readEXIF(mockImageBlob, invalidImageEl)).rejects.toThrow(
                'EXIF PDF width and height are invalid',
            );
        });

        it('should resolve with swapped PDF dimensions if rotated ratio is valid', async () => {
            const mockTags = {
                UserComment: {
                    description: 'pdfWidth:792pts,pdfHeight:612pts,numPages:10',
                },
            };

            global.ExifReader = {
                load: jest.fn().mockReturnValue(mockTags),
            };

            const rotatedImageEl = {
                naturalWidth: 600,
                naturalHeight: 800,
            };

            const result = await preloader.readEXIF(mockImageBlob, rotatedImageEl);

            expect(result).toEqual({
                pdfWidth: 612 * 1.3333333333333333, // PDFJS_CSS_UNITS
                pdfHeight: 792 * 1.3333333333333333,
                numPages: 10,
            });
        });

        it('should reject if there is an error reading the blob as ArrayBuffer', async () => {
            const mockReader = {
                readAsArrayBuffer: jest.fn(),
                onerror: null,
            };

            global.FileReader = jest.fn(() => mockReader);

            const promise = preloader.readEXIF(mockImageBlob, mockImageEl);

            mockReader.onerror();

            await expect(promise).rejects.toThrow('Error reading blob as ArrayBuffer');
        });

        it('should reject with error when FileReader fails to read blob', async () => {
            const mockFileReader = {
                readAsArrayBuffer: jest.fn(),
                onerror: null,
                onload: null,
                result: null,
            };
            global.FileReader = jest.fn(() => mockFileReader);

            const promise = preloader.readEXIF(mockImageBlob, mockImageEl);
            mockFileReader.onerror();

            await expect(promise).rejects.toThrow('Error reading blob as ArrayBuffer');
        });
    });

    describe('getScaledDimensions()', () => {
        const pdfjsHeightCSSUnits = 5;
        const pdfjsHWidthCSSUnits = 40;

        beforeEach(() => {
            preloader.wrapperEl = document.createElement('div');
            Object.defineProperty(preloader.wrapperEl, 'clientHeight', { value: 0, writable: true });
            Object.defineProperty(preloader.wrapperEl, 'clientWidth', { value: 0, writable: true });
        });

        test('should scale up to a max defined by maxZoomScale', () => {
            const clientWidth = 500;
            const clientHeight = 500;
            preloader.wrapperEl.clientWidth = clientWidth;
            preloader.wrapperEl.clientHeight = clientHeight;
            const expectedScale = 1.25;
            preloader.maxZoomScale = expectedScale;

            const scaledDimensions = preloader.getScaledDimensions(100, 100);
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * 100),
                scaledHeight: Math.floor(expectedScale * 100),
            });
        });

        test('should scale with height scale if in landscape and height scale is less than width scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            preloader.wrapperEl.clientWidth = clientWidth;
            preloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 1000;
            const pdfHeight = 600;
            const scaledDimensions = preloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect height scale to be used
            const expectedScale = (clientHeight - pdfjsHeightCSSUnits) / pdfHeight;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });

        test('should scale with width scale if in landscape and width scale is less than height scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            preloader.wrapperEl.clientWidth = clientWidth;
            preloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 1000;
            const pdfHeight = 500;
            const scaledDimensions = preloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - pdfjsHWidthCSSUnits) / pdfWidth;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });

        test('should scale with width scale if not in landscape', () => {
            const clientWidth = 600;
            const clientHeight = 1100;
            preloader.wrapperEl.clientWidth = clientWidth;
            preloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 500;
            const pdfHeight = 1000;
            const scaledDimensions = preloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - pdfjsHWidthCSSUnits) / pdfWidth;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });

        test('should not apply maxZoomScale if not defined', () => {
            const clientWidth = 1000;
            const clientHeight = 1000;
            preloader.wrapperEl.clientWidth = clientWidth;
            preloader.wrapperEl.clientHeight = clientHeight;
            preloader.maxZoomScale = undefined;

            const pdfWidth = 500;
            const pdfHeight = 500;
            const scaledDimensions = preloader.getScaledDimensions(pdfWidth, pdfHeight);

            const expectedScale = (clientWidth - pdfjsHWidthCSSUnits) / pdfWidth;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });
    });

    describe('restoreScrollPosition()', () => {
        let docEl;

        beforeEach(() => {
            // Create a document element with the expected class
            docEl = document.createElement('div');
            docEl.className = 'bp-doc';

            // Set up the wrapper element with a parent node that contains the doc element
            preloader.wrapperEl = document.createElement('div');
            const parentNode = document.createElement('div');
            parentNode.appendChild(preloader.wrapperEl);
            parentNode.appendChild(docEl);

            // Mock the scrollTop property
            Object.defineProperty(preloader.wrapperEl, 'scrollTop', {
                value: 0,
                writable: true,
            });
        });

        test('should restore scroll position when scrollTop is greater than 0', () => {
            // Set a non-zero scroll position
            preloader.wrapperEl.scrollTop = 150;

            // Call the method
            preloader.restoreScrollPosition();

            // Verify the document element's scroll position was updated
            expect(docEl.scrollTop).toBe(150);
        });

        test('should not restore scroll position when scrollTop is 0', () => {
            // Set scroll position to 0
            preloader.wrapperEl.scrollTop = 0;

            // Call the method
            preloader.restoreScrollPosition();

            // Verify the document element's scroll position was not updated
            expect(docEl.scrollTop).toBe(0);
        });

        test('should not throw error when document element is not found', () => {
            // Remove the document element
            docEl.remove();

            // Set a non-zero scroll position
            preloader.wrapperEl.scrollTop = 150;

            // Call the method - should not throw an error
            expect(() => preloader.restoreScrollPosition()).not.toThrow();
        });
    });

    describe('setPreloadImageDimensions()', () => {
        let mockImageBlob;
        let mockImageEl;
        let mockPdfData;
        let mockScaledDimensions;
        let readExif;
        beforeEach(() => {
            // Create mock image blob and element
            mockImageBlob = new Blob(['mock-image-data'], { type: 'image/jpeg' });

            const mockImage = {
                onload: null,
                onerror: null,
                naturalWidth: 800, // Set a mock value
                naturalHeight: 600, // Set a mock value
                src: '',
            };

            jest.spyOn(window, 'Image').mockImplementation(() => {
                return mockImage;
            });
            mockImageEl = document.createElement('img');

            // Mock PDF data that would be returned from readEXIF
            mockPdfData = {
                pdfWidth: 1000,
                pdfHeight: 800,
                numPages: 5,
            };

            // Mock scaled dimensions that would be returned from getScaledWidthAndHeight
            mockScaledDimensions = {
                scaledWidth: 900,
                scaledHeight: 720,
            };

            // Mock the methods used by setPreloadImageDimensions
            jest.spyOn(preloader, 'readEXIF').mockImplementation(() => Promise.resolve(mockPdfData));
            jest.spyOn(preloader, 'getScaledWidthAndHeight').mockReturnValue(mockScaledDimensions);
            jest.spyOn(preloader, 'getScaledDimensions').mockReturnValue(mockScaledDimensions);
            readExif = jest.spyOn(preloader, 'readEXIF');

            // Set up wrapperEl for getScaledDimensions
            preloader.wrapperEl = document.createElement('div');
            Object.defineProperty(preloader.wrapperEl, 'clientWidth', { value: 1000, writable: true });
            Object.defineProperty(preloader.wrapperEl, 'clientHeight', { value: 800, writable: true });
        });

        it('should return early if imageBlob or imageEl is not provided', async () => {
            await preloader.setPreloadImageDimensions(null, mockImageEl);
            expect(readExif).not.toHaveBeenCalled();

            await preloader.setPreloadImageDimensions(mockImageBlob, null);
            expect(readExif).not.toHaveBeenCalled();
        });

        it('should set dimensions from EXIF data when available', async () => {
            await preloader.setPreloadImageDimensions(mockImageBlob, mockImageEl);

            expect(preloader.readEXIF).toHaveBeenCalledWith(mockImageBlob, mockImageEl);
            expect(preloader.getScaledWidthAndHeight).toHaveBeenCalledWith(mockPdfData);
            expect(preloader.pdfData).toEqual(mockPdfData);
            expect(preloader.imageDimensions.width).toEqual(mockScaledDimensions.scaledWidth);
            expect(preloader.imageDimensions.height).toEqual(mockScaledDimensions.scaledHeight);
            expect(preloader.numPages).toBe(mockPdfData.numPages);
            expect(mockImageEl.classList.contains('loaded')).toBe(true);
        });

        it('should fall back to natural dimensions when EXIF data is not available', async () => {
            // Mock readEXIF to reject
            jest.spyOn(preloader, 'readEXIF').mockImplementation(() => Promise.reject(new Error('EXIF error')));

            await preloader.setPreloadImageDimensions(mockImageBlob, mockImageEl);

            expect(preloader.readEXIF).toHaveBeenCalledWith(mockImageBlob, mockImageEl);
            expect(preloader.getScaledDimensions).toHaveBeenCalledWith(
                mockImageEl.naturalWidth,
                mockImageEl.naturalHeight,
            );
            expect(preloader.imageDimensions.width).toEqual(mockScaledDimensions.scaledWidth);
            expect(preloader.imageDimensions.height).toEqual(mockScaledDimensions.scaledHeight);
            expect(mockImageEl.classList.contains('loaded')).toBe(true);
        });
    });

    describe('getScaledWidthAndHeight()', () => {
        let mockPdfData;
        let mockScaledDimensions;

        beforeEach(() => {
            preloader = new DocFirstPreloader();
            mockPdfData = {
                pdfWidth: 800,
                pdfHeight: 600,
            };
            mockScaledDimensions = {
                scaledWidth: 1000,
                scaledHeight: 800,
            };

            // Mock the getScaledDimensions method
            jest.spyOn(preloader, 'getScaledDimensions').mockReturnValue(mockScaledDimensions);
        });

        test('should return the scaled width and height from getScaledDimensions', () => {
            // Call the method
            const result = preloader.getScaledWidthAndHeight(mockPdfData);

            // Verify getScaledDimensions was called with the correct parameters
            expect(preloader.getScaledDimensions).toHaveBeenCalledWith(mockPdfData.pdfWidth, mockPdfData.pdfHeight);

            // Verify the returned object matches the mock scaled dimensions
            expect(result).toEqual(mockScaledDimensions);
        });
    });

    describe('hidePreviewMask()', () => {
        it('should hide the preview mask element when it exists', () => {
            // Call the method
            preloader.hidePreviewMask();

            // Verify that getElementsByClassName was called with the correct class name
            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');

            // Verify that the display style was set to 'none'
            expect(mockElement.style.display).toBe('none');
        });

        it('should not throw an error when preview mask element does not exist', () => {
            // Mock getElementsByClassName to return an empty array
            jest.spyOn(document, 'getElementsByClassName').mockReturnValue([]);

            // Call the method - should not throw an error
            expect(() => preloader.hidePreviewMask()).not.toThrow();

            // Verify that getElementsByClassName was called
            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');
        });
    });

    describe('showPreviewMask()', () => {
        it('should show the preview mask element when it exists', () => {
            // Set initial display style to 'none' to simulate hidden state
            mockElement.style.display = 'none';

            // Call the method
            preloader.showPreviewMask();

            // Verify that getElementsByClassName was called with the correct class name
            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');

            // Verify that the display style was set to empty string (default display)
            expect(mockElement.style.display).toBe('');
        });

        it('should not throw an error when preview mask element does not exist', () => {
            // Mock getElementsByClassName to return an empty array
            jest.spyOn(document, 'getElementsByClassName').mockReturnValue([]);

            // Call the method - should not throw an error
            expect(() => preloader.showPreviewMask()).not.toThrow();

            // Verify that getElementsByClassName was called
            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');
        });
    });

    describe('processAdditionalPages()', () => {
        const widthDimension = 123;
        const heightDimension = 456;

        beforeEach(() => {
            // Set up preloader instance
            preloader.pdfData = { numPages: 5 };
            preloader.imageDimensions = { width: widthDimension, height: heightDimension };
            preloader.preloadEl = document.createElement('div');
            const firstImagePlaceholder = document.createElement('div');
            firstImagePlaceholder.classList.add('bp-preload-placeholder');
            firstImagePlaceholder.classList.add('loaded');
            preloader.preloadEl.appendChild(firstImagePlaceholder);
            preloader.preloadedImages = { 1: 'url1' };
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should set the preloaded images object with the correct number of pages', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 3 };
            preloader.processAdditionalPages(data);
            expect(Object.keys(preloader.preloadedImages).length).toBe(3);
        });

        it('should not add additional pages if it is for a presentation', () => {
            const data = [new Blob(), new Blob()];
            const addPreloadImageToPreloaderContainer = jest.spyOn(preloader, 'addPreloadImageToPreloaderContainer');
            preloader.isPresentation = true;
            preloader.pdfData = { numPages: 3 };
            preloader.processAdditionalPages(data);
            expect(addPreloadImageToPreloaderContainer).not.toHaveBeenCalled();
        });

        it('should not add placeholders if the number of pages equals the number of images', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 3 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('.loaded').length).toBe(3);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(3);
        });

        it('should add placeholder divs for missing pages', () => {
            const data = [new Blob(), new Blob()];

            preloader.imageDimensions = { width: widthDimension, height: heightDimension };
            preloader.pdfData = { numPages: 5 };
            preloader.processAdditionalPages(data);
            const placeholders = preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder');
            expect(placeholders.length).toBe(5);
            const placeholder4 = placeholders[3];
            const placeholder5 = placeholders[4];
            expect(placeholder4.style.width).toBe(`${widthDimension}px`);
            expect(placeholder4.style.height).toBe(`${heightDimension}px`);
            expect(placeholder5.style.width).toBe(`${widthDimension}px`);
            expect(placeholder5.style.height).toBe(`${heightDimension}px`);
            expect(placeholder4.classList.contains('loaded')).not.toBe(true);
            expect(placeholder5.classList.contains('loaded')).not.toBe(true);
        });

        it('should add a max of 10 placeholders', () => {
            // 7 additional doc first pages, total will be 8 including the first one.
            const data = [new Blob(), new Blob(), new Blob(), new Blob(), new Blob(), new Blob(), new Blob()];
            preloader.pdfData = { numPages: 321 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(18);
        });

        it('should not add empty placeholders if the number of pages is less than the number of images', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 2 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(3);
        });

        it('should not add empty placeholders if there is no pdfData', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = null;
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(3);
        });

        it('should not add empty placeholders if the number of pages in pdfData is null', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: null };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(3);
        });

        it('should not add empty placeholders if this is a presentation', () => {
            const data = [new Blob(), new Blob()];
            preloader.isPresentation = true;
            preloader.pdfData = { numPages: 10 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(1);
        });
    });
});
