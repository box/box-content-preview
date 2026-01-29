import DocFirstPreloader from '../DocFirstPreloader';
import Api from '../../../api';
import * as util from '../../../util';

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
            jest.spyOn(preloader, 'showPreloadAll').mockResolvedValue();
            jest.spyOn(preloader, 'isStaggeredLoadingEnabled').mockReturnValue(false);
            await preloader.showPreload(null, mockContainer, 'mock-paged-image-url', 1, mockDocBaseViewer);
            expect(preloader.isWebp).toBe(true);
        });

        it('should set isWebp to false if pagedPreLoadUrlWithAuth is not provided', async () => {
            jest.spyOn(preloader, 'showPreloadSingleImage').mockResolvedValue();
            await preloader.showPreload('mock-url', mockContainer, null, 1, mockDocBaseViewer);
            expect(preloader.isWebp).toBe(false);
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

        it('should dispatch to showPreloadSingleImage when only single-image URL is provided', async () => {
            jest.spyOn(preloader, 'showPreloadSingleImage').mockResolvedValue();
            jest.spyOn(preloader, 'showPreloadAll');
            jest.spyOn(preloader, 'showPreloadStaggered');

            await preloader.showPreload('mock-single-url', mockContainer, null, 1, mockDocBaseViewer);

            expect(preloader.showPreloadSingleImage).toHaveBeenCalledWith('mock-single-url', 1, mockDocBaseViewer);
            expect(preloader.showPreloadAll).not.toHaveBeenCalled();
            expect(preloader.showPreloadStaggered).not.toHaveBeenCalled();
        });

        it('should dispatch to showPreloadAll when paged URL is provided and staggered is disabled', async () => {
            jest.spyOn(preloader, 'showPreloadSingleImage');
            jest.spyOn(preloader, 'showPreloadAll').mockResolvedValue();
            jest.spyOn(preloader, 'isStaggeredLoadingEnabled').mockReturnValue(false);

            await preloader.showPreload(null, mockContainer, 'mock-paged-url', 8, mockDocBaseViewer);

            expect(preloader.showPreloadSingleImage).not.toHaveBeenCalled();
            expect(preloader.showPreloadAll).toHaveBeenCalled();
        });

        it('should show preview mask when no preload URLs are provided', async () => {
            jest.spyOn(preloader, 'showPreloadSingleImage');
            jest.spyOn(preloader, 'showPreloadAll');

            await preloader.showPreload(null, mockContainer, null, 1, mockDocBaseViewer);

            expect(preloader.showPreloadSingleImage).not.toHaveBeenCalled();
            expect(preloader.showPreloadAll).not.toHaveBeenCalled();
            expect(preloader.showPreviewMask).toHaveBeenCalled();
        });
    });

    describe('showPreloadAll()', () => {
        let mockBlob;
        let mockBlob2;
        let mockBlob3;
        let mockBlob4;

        beforeEach(() => {
            mockBlob = new Blob(['mock-content1'], { type: 'image/webp' });
            mockBlob2 = new Blob(['mock-content2'], { type: 'image/webp' });
            mockBlob3 = new Blob(['mock-content3'], { type: 'image/webp' });
            mockBlob4 = new Blob(['mock-content4'], { type: 'image/webp' });

            preloader.wrapperEl = document.createElement('div');
            preloader.preloadEl = document.createElement('div');
            preloader.imageDimensions = { width: 100, height: 100 };

            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'loadBatchAsBlobs');
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);
            jest.spyOn(preloader, 'processAdditionalPages').mockResolvedValue();
            jest.spyOn(preloader, 'finalizePreload').mockImplementation(() => {});
            jest.spyOn(preloader, 'showPreviewMask');
        });

        it('should handle thumbnail sidebar correctly', async () => {
            jest.spyOn(preloader, 'loadBatchAsBlobs').mockResolvedValue([mockBlob]);
            preloader.finalizePreload.mockRestore();
            jest.spyOn(preloader, 'finalizePreload');
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);

            await preloader.showPreloadAll('mock-url', 'mock-paged-image-url', 1, mockDocBaseViewer);

            expect(preloader.finalizePreload).toHaveBeenCalledWith(mockDocBaseViewer);
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
        });

        it('should fetch preload images and add images in order', async () => {
            const mockBlobs = [mockBlob, mockBlob2, mockBlob3, mockBlob4];
            jest.spyOn(preloader, 'loadBatchAsBlobs').mockResolvedValue(mockBlobs);
            jest.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
                if (blob === mockBlob) return 'mock-object-url1';
                if (blob === mockBlob2) return 'mock-object-url2';
                if (blob === mockBlob3) return 'mock-object-url3';
                if (blob === mockBlob4) return 'mock-object-url4';
                return '';
            });
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);

            await preloader.showPreloadAll('mock-url', 'mock-paged-image-url', 4, mockDocBaseViewer);

            expect(preloader.loadBatchAsBlobs).toHaveBeenCalledWith('mock-url', 'mock-paged-image-url', 4);
            expect(preloader.renderFirstPage).toHaveBeenCalledWith(mockBlob, mockDocBaseViewer);
            expect(preloader.processAdditionalPages).toHaveBeenCalledWith(
                [mockBlob2, mockBlob3, mockBlob4],
                mockDocBaseViewer,
            );
            expect(preloader.finalizePreload).toHaveBeenCalledWith(mockDocBaseViewer);
        });

        it('should stop on first image retrieval failure', async () => {
            jest.spyOn(preloader, 'loadBatchAsBlobs').mockResolvedValue([new Error('error'), mockBlob]);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(false);

            await preloader.showPreloadAll('mock-url', 'mock-paged-image-url', 2, mockDocBaseViewer);

            expect(preloader.showPreviewMask).toHaveBeenCalled();
            expect(preloader.processAdditionalPages).not.toHaveBeenCalled();
            expect(preloader.finalizePreload).not.toHaveBeenCalled();
        });

        it('should handle early pdfJs doc load completion', async () => {
            jest.spyOn(preloader, 'loadBatchAsBlobs').mockResolvedValue([mockBlob]);
            preloader.renderFirstPage.mockRestore();
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);
            const pdfJsMock = jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValueOnce(true); // After rendering first page (line 275)

            await preloader.showPreloadAll('mock-url', 'mock-paged-image-url', 1, mockDocBaseViewer);

            expect(pdfJsMock).toHaveBeenCalledTimes(1);
            expect(preloader.wrapperEl.classList.contains('loaded')).toBe(true);
            expect(preloader.processAdditionalPages).not.toHaveBeenCalled();
            expect(preloader.finalizePreload).not.toHaveBeenCalled();
        });
    });

    describe('showPreloadSingleImage()', () => {
        beforeEach(() => {
            preloader.wrapperEl = document.createElement('div');
            preloader.preloadEl = document.createElement('div');
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'emit');
            jest.spyOn(preloader, 'showPreviewMask');
            jest.spyOn(preloader, 'handleThumbnailToggling').mockImplementation(() => {});
            jest.spyOn(preloader, 'finalizePreload').mockImplementation(() => {});
        });

        it('should fetch single image and render first page with natural dimensions', async () => {
            const mockBlob = new Blob(['mock-image-content'], { type: 'image/jpeg' });
            preloader.api.get = jest.fn().mockResolvedValue(mockBlob);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(mockBlob);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);

            await preloader.showPreloadSingleImage('mock-single-url', 5, mockDocBaseViewer);

            expect(preloader.api.get).toHaveBeenCalledWith('mock-single-url', { type: 'blob' });
            expect(preloader.renderFirstPage).toHaveBeenCalledWith(mockBlob, mockDocBaseViewer);
            expect(preloader.handleThumbnailToggling).toHaveBeenCalledWith(mockDocBaseViewer);
            expect(preloader.finalizePreload).toHaveBeenCalledWith(mockDocBaseViewer);
        });

        it('should show preview mask when JPEG fetch fails to render', async () => {
            const mockBlob = new Blob(['mock-jpeg-content'], { type: 'image/jpeg' });
            preloader.api.get = jest.fn().mockResolvedValue(mockBlob);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(mockBlob);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(false);

            await preloader.showPreloadSingleImage('mock-jpeg-url', 5, mockDocBaseViewer);

            expect(preloader.showPreviewMask).toHaveBeenCalled();
            expect(preloader.finalizePreload).not.toHaveBeenCalled();
        });

        it('should not finalize if pdfJs doc load completes during render', async () => {
            const mockBlob = new Blob(['mock-jpeg-content'], { type: 'image/jpeg' });
            preloader.api.get = jest.fn().mockResolvedValue(mockBlob);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(mockBlob);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);

            preloader.pdfJsDocLoadComplete.mockReturnValue(true);

            await preloader.showPreloadSingleImage('mock-jpeg-url', 5, mockDocBaseViewer);

            expect(preloader.wrapperEl.classList.contains('loaded')).toBe(true);
            expect(preloader.finalizePreload).not.toHaveBeenCalled();
        });

        it('should append preloadEl to wrapperEl', async () => {
            const mockBlob = new Blob(['mock-jpeg-content'], { type: 'image/jpeg' });
            preloader.api.get = jest.fn().mockResolvedValue(mockBlob);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(mockBlob);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);

            await preloader.showPreloadSingleImage('mock-jpeg-url', 1, mockDocBaseViewer);

            expect(preloader.wrapperEl.contains(preloader.preloadEl)).toBe(true);
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
            docEl = document.createElement('div');
            docEl.className = 'bp-doc';

            preloader.wrapperEl = document.createElement('div');
            const parentNode = document.createElement('div');
            parentNode.appendChild(preloader.wrapperEl);
            parentNode.appendChild(docEl);

            Object.defineProperty(preloader.wrapperEl, 'scrollTop', {
                value: 0,
                writable: true,
            });
        });

        test('should restore scroll position when scrollTop is greater than 0', () => {
            preloader.wrapperEl.scrollTop = 150;

            preloader.restoreScrollPosition();

            expect(docEl.scrollTop).toBe(150);
        });

        test('should not restore scroll position when scrollTop is 0', () => {
            preloader.wrapperEl.scrollTop = 0;

            preloader.restoreScrollPosition();

            expect(docEl.scrollTop).toBe(0);
        });

        test('should not throw error when document element is not found', () => {
            docEl.remove();

            preloader.wrapperEl.scrollTop = 150;

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

            mockPdfData = {
                pdfWidth: 1000,
                pdfHeight: 800,
                numPages: 5,
            };

            mockScaledDimensions = {
                scaledWidth: 900,
                scaledHeight: 720,
            };

            jest.spyOn(preloader, 'readEXIF').mockImplementation(() => Promise.resolve(mockPdfData));
            jest.spyOn(preloader, 'getScaledWidthAndHeight').mockReturnValue(mockScaledDimensions);
            jest.spyOn(preloader, 'getScaledDimensions').mockReturnValue(mockScaledDimensions);
            readExif = jest.spyOn(preloader, 'readEXIF');

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

            jest.spyOn(preloader, 'getScaledDimensions').mockReturnValue(mockScaledDimensions);
        });

        test('should return the scaled width and height from getScaledDimensions', () => {
            const result = preloader.getScaledWidthAndHeight(mockPdfData);

            expect(preloader.getScaledDimensions).toHaveBeenCalledWith(mockPdfData.pdfWidth, mockPdfData.pdfHeight);

            expect(result).toEqual(mockScaledDimensions);
        });
    });

    describe('hidePreviewMask()', () => {
        it('should hide the preview mask element when it exists', () => {
            preloader.hidePreviewMask();

            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');

            expect(mockElement.style.display).toBe('none');
        });

        it('should not throw an error when preview mask element does not exist', () => {
            jest.spyOn(document, 'getElementsByClassName').mockReturnValue([]);

            expect(() => preloader.hidePreviewMask()).not.toThrow();

            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');
        });
    });

    describe('showPreviewMask()', () => {
        it('should show the preview mask element when it exists', () => {
            mockElement.style.display = 'none';

            preloader.showPreviewMask();

            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');

            expect(mockElement.style.display).toBe('');
        });

        it('should not throw an error when preview mask element does not exist', () => {
            jest.spyOn(document, 'getElementsByClassName').mockReturnValue([]);

            expect(() => preloader.showPreviewMask()).not.toThrow();

            expect(document.getElementsByClassName).toHaveBeenCalledWith('bcpr-PreviewMask');
        });
    });

    describe('processAdditionalPages()', () => {
        const widthDimension = 123;
        const heightDimension = 456;

        beforeEach(() => {
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

        it('should not add placeholders (placeholders are handled by finalizePreload)', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 3 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('.loaded').length).toBe(3);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(3);
        });

        it('should not add placeholder divs for missing pages (handled by finalizePreload)', () => {
            const data = [new Blob(), new Blob()];

            preloader.imageDimensions = { width: widthDimension, height: heightDimension };
            preloader.pdfData = { numPages: 5 };
            preloader.processAdditionalPages(data);
            const placeholders = preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder');
            expect(placeholders.length).toBe(3);
        });

        it('should not add empty placeholders (handled by finalizePreload)', () => {
            const data = [new Blob(), new Blob(), new Blob(), new Blob(), new Blob(), new Blob(), new Blob()];
            preloader.pdfData = { numPages: 321 };
            preloader.processAdditionalPages(data);
            expect(preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder').length).toBe(8);
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

        it('should trigger thumbnail rendering for each page when docBaseViewer is provided', () => {
            const docBaseViewerWithThumbnails = {
                thumbnailsSidebar: {
                    renderNextThumbnailImage: jest.fn(),
                },
            };
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 3 };
            preloader.processAdditionalPages(data, docBaseViewerWithThumbnails);

            expect(docBaseViewerWithThumbnails.thumbnailsSidebar.renderNextThumbnailImage).toHaveBeenCalledTimes(2);
            expect(preloader.retrievedPagesCount).toBe(3);
        });

        it('should not throw when docBaseViewer is not provided', () => {
            const data = [new Blob(), new Blob()];
            preloader.pdfData = { numPages: 3 };
            expect(() => preloader.processAdditionalPages(data)).not.toThrow();
        });
    });

    describe('clearBatchTimeouts()', () => {
        it('should clear the timeout when secondBatchTimeoutId exists', () => {
            const timeoutId = setTimeout(() => {}, 10000);
            preloader.secondBatchTimeoutId = timeoutId;
            jest.spyOn(global, 'clearTimeout');

            preloader.clearBatchTimeouts();

            expect(clearTimeout).toHaveBeenCalledWith(timeoutId);
            expect(preloader.secondBatchTimeoutId).toBeNull();
        });

        it('should not throw when secondBatchTimeoutId is null', () => {
            preloader.secondBatchTimeoutId = null;

            expect(() => preloader.clearBatchTimeouts()).not.toThrow();
            expect(preloader.secondBatchTimeoutId).toBeNull();
        });
    });

    describe('finalizePreload()', () => {
        const widthDimension = 100;
        const heightDimension = 200;
        let finalizeDocBaseViewer;

        beforeEach(() => {
            finalizeDocBaseViewer = {
                initThumbnails: jest.fn(),
                shouldThumbnailsBeToggled: jest.fn().mockReturnValue(false),
                rootEl: document.createElement('div'),
                emit: jest.fn(),
            };
            preloader.preloadEl = document.createElement('div');
            preloader.wrapperEl = document.createElement('div');
            preloader.imageDimensions = { width: widthDimension, height: heightDimension };
            preloader.preloadedImages = { 1: 'url1', 2: 'url2', 3: 'url3' };
            jest.spyOn(preloader, 'emit');
            jest.spyOn(preloader, 'clearBatchTimeouts');
        });

        it('should clear batch timeouts', () => {
            preloader.finalizePreload(finalizeDocBaseViewer);

            expect(preloader.clearBatchTimeouts).toHaveBeenCalled();
        });

        it('should set retrievedPagesCount from preloadedImages', () => {
            preloader.finalizePreload(finalizeDocBaseViewer);

            expect(preloader.retrievedPagesCount).toBe(3);
        });

        it('should add placeholders for remaining pages', () => {
            preloader.pdfData = { numPages: 5 };

            preloader.finalizePreload(finalizeDocBaseViewer);

            const placeholders = preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder');
            expect(placeholders.length).toBe(2); // pages 4 and 5
        });

        it('should emit preload event when pages exist', () => {
            preloader.finalizePreload(finalizeDocBaseViewer);

            expect(preloader.emit).toHaveBeenCalledWith('preload');
            expect(preloader.loadTime).toBeDefined();
            expect(preloader.wrapperEl.classList.contains('loaded')).toBe(true);
        });

        it('should not emit preload event when no pages exist', () => {
            preloader.preloadedImages = {};

            preloader.finalizePreload(finalizeDocBaseViewer);

            expect(preloader.emit).not.toHaveBeenCalledWith('preload');
            expect(preloader.loadTime).toBeUndefined();
        });

        it('should add a maximum of 10 placeholders', () => {
            preloader.pdfData = { numPages: 100 };
            preloader.preloadedImages = { 1: 'url1', 2: 'url2', 3: 'url3' };

            preloader.finalizePreload(finalizeDocBaseViewer);

            const placeholders = preloader.preloadEl.querySelectorAll('div.bp-preload-placeholder');
            expect(placeholders.length).toBe(10);
        });
    });

    describe('renderFirstPage()', () => {
        let testFirstImage;

        beforeEach(() => {
            testFirstImage = new Image(100, 200);
            preloader.preloadEl = document.createElement('div');
            preloader.wrapperEl = document.createElement('div');
            preloader.imageDimensions = { width: 100, height: 100 };
            preloader.preloadedImages = {};
            jest.spyOn(preloader, 'loadImage').mockResolvedValue(testFirstImage);
            jest.spyOn(preloader, 'setPreloadImageDimensions').mockResolvedValue();
            jest.spyOn(preloader, 'emit');
        });

        it('should return false if blob is null', async () => {
            const result = await preloader.renderFirstPage(null, mockDocBaseViewer);
            expect(result).toBe(false);
        });

        it('should return false if blob is an Error', async () => {
            const result = await preloader.renderFirstPage(new Error('test'), mockDocBaseViewer);
            expect(result).toBe(false);
        });

        it('should render first page and return true on success', async () => {
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

            const result = await preloader.renderFirstPage(mockBlob, mockDocBaseViewer);

            expect(result).toBe(true);
            expect(preloader.preloadedImages[1]).toBe('mock-url');
            expect(preloader.loadImage).toHaveBeenCalledWith('mock-url');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalledWith(mockBlob, testFirstImage);
            expect(preloader.emit).toHaveBeenCalledWith('firstRender');
        });

        it('should trigger thumbnail rendering when docBaseViewer has thumbnailsSidebar', async () => {
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
            mockDocBaseViewer.thumbnailsSidebar = { renderNextThumbnailImage: jest.fn() };

            await preloader.renderFirstPage(mockBlob, mockDocBaseViewer);

            expect(mockDocBaseViewer.thumbnailsSidebar.renderNextThumbnailImage).toHaveBeenCalled();
        });

        it('should always use setPreloadImageDimensions', async () => {
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

            await preloader.renderFirstPage(mockBlob, mockDocBaseViewer);

            expect(preloader.setPreloadImageDimensions).toHaveBeenCalledWith(mockBlob, testFirstImage);
        });
    });

    describe('updateThumbnailProgress()', () => {
        it('should update retrievedPagesCount', () => {
            preloader.preloadedImages = { 1: 'url1', 2: 'url2', 3: 'url3' };

            preloader.updateThumbnailProgress(mockDocBaseViewer);

            expect(preloader.retrievedPagesCount).toBe(3);
        });

        it('should call renderNextThumbnailImage when thumbnailsSidebar exists', () => {
            mockDocBaseViewer.thumbnailsSidebar = { renderNextThumbnailImage: jest.fn() };
            preloader.preloadedImages = { 1: 'url1' };

            preloader.updateThumbnailProgress(mockDocBaseViewer);

            expect(mockDocBaseViewer.thumbnailsSidebar.renderNextThumbnailImage).toHaveBeenCalled();
        });

        it('should not throw when docBaseViewer is undefined', () => {
            preloader.preloadedImages = { 1: 'url1' };

            expect(() => preloader.updateThumbnailProgress(undefined)).not.toThrow();
        });
    });

    describe('addPageToPreload()', () => {
        beforeEach(() => {
            preloader.preloadEl = document.createElement('div');
            preloader.imageDimensions = { width: 100, height: 100 };
            preloader.preloadedImages = {};
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
        });

        it('should add page to preloadedImages', () => {
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

            preloader.addPageToPreload(2, mockBlob);

            expect(preloader.preloadedImages[2]).toBe('mock-url');
        });

        it('should not add page if already exists', () => {
            preloader.preloadedImages = { 2: 'existing-url' };
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('new-url');

            preloader.addPageToPreload(2, mockBlob);

            expect(preloader.preloadedImages[2]).toBe('existing-url');
        });

        it('should not add page if pdfJsDocLoadComplete returns true', () => {
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(true);
            const mockBlob = new Blob(['test'], { type: 'image/webp' });

            preloader.addPageToPreload(2, mockBlob);

            expect(preloader.preloadedImages[2]).toBeUndefined();
        });

        it('should not add image element for presentations', () => {
            preloader.isPresentation = true;
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
            jest.spyOn(preloader, 'addPreloadImageToPreloaderContainer');

            preloader.addPageToPreload(2, mockBlob);

            expect(preloader.preloadedImages[2]).toBe('mock-url');
            expect(preloader.addPreloadImageToPreloaderContainer).not.toHaveBeenCalled();
        });

        it('should add image element for documents', () => {
            preloader.isPresentation = false;
            const mockBlob = new Blob(['test'], { type: 'image/webp' });
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
            jest.spyOn(preloader, 'addPreloadImageToPreloaderContainer');

            preloader.addPageToPreload(2, mockBlob);

            expect(preloader.addPreloadImageToPreloaderContainer).toHaveBeenCalled();
        });
    });

    describe('loadBatchAsBlobs()', () => {
        beforeEach(() => {
            jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue([Promise.resolve({})]);
            jest.spyOn(util, 'getPreloadImageRequestPromisesByBatch').mockReturnValue([Promise.resolve({})]);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(new Blob());
        });

        it('should use getPreloadImageRequestPromises when preloadUrl is provided and startPage is 1', async () => {
            await preloader.loadBatchAsBlobs('preload-url', 'paged-url', 5, 1);

            expect(util.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                preloader.api,
                'preload-url',
                5,
                'paged-url',
            );
        });

        it('should use getPreloadImageRequestPromisesByBatch when preloadUrl is null', async () => {
            await preloader.loadBatchAsBlobs(null, 'paged-url', 5, 1);

            expect(util.getPreloadImageRequestPromisesByBatch).toHaveBeenCalledWith(preloader.api, 'paged-url', 1, 5);
        });

        it('should use getPreloadImageRequestPromisesByBatch when startPage is not 1', async () => {
            await preloader.loadBatchAsBlobs('preload-url', 'paged-url', 10, 6);

            expect(util.getPreloadImageRequestPromisesByBatch).toHaveBeenCalledWith(preloader.api, 'paged-url', 6, 10);
        });

        it('should return array of blobs', async () => {
            const mockBlob = new Blob(['test']);
            jest.spyOn(util, 'handleRepresentationBlobFetch').mockResolvedValue(mockBlob);

            const result = await preloader.loadBatchAsBlobs(null, 'paged-url', 1);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(mockBlob);
        });
    });

    describe('scheduleSecondBatch()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.spyOn(preloader, 'showSecondBatch').mockImplementation(() => {});
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should schedule showSecondBatch after delay', () => {
            preloader.scheduleSecondBatch('paged-url', 4, 8, mockDocBaseViewer, 1000);

            expect(preloader.showSecondBatch).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);

            expect(preloader.showSecondBatch).toHaveBeenCalledWith('paged-url', 4, 8, mockDocBaseViewer);
        });

        it('should store timeout ID', () => {
            preloader.scheduleSecondBatch('paged-url', 4, 8, mockDocBaseViewer, 1000);

            expect(preloader.secondBatchTimeoutId).not.toBeNull();
        });
    });

    describe('showPreloadStaggered() - startSecondBatchAfterFetch configuration', () => {
        let mockBlob;

        beforeEach(() => {
            mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            preloader.wrapperEl = document.createElement('div');
            preloader.preloadEl = document.createElement('div');
            preloader.imageDimensions = { width: 100, height: 100 };

            jest.spyOn(preloader, 'loadBatchAsBlobs').mockResolvedValue([mockBlob]);
            jest.spyOn(preloader, 'renderFirstPage').mockResolvedValue(true);
            jest.spyOn(preloader, 'processAdditionalPages').mockResolvedValue();
            jest.spyOn(preloader, 'handleThumbnailToggling').mockImplementation(() => {});
            jest.spyOn(preloader, 'scheduleSecondBatch').mockImplementation(() => {});
            jest.spyOn(preloader, 'finalizePreload').mockImplementation(() => {});
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
        });

        it('should schedule second batch after fetch when startSecondBatchAfterFetch is true (default)', async () => {
            preloader.config = {
                priorityPages: 1,
                maxPreloadPages: 8,
                secondBatchDelayMs: 100,
                startSecondBatchAfterFetch: true,
            };

            await preloader.showPreloadStaggered(null, 'paged-url', 8, mockDocBaseViewer);

            expect(preloader.scheduleSecondBatch).toHaveBeenCalledTimes(1);
            expect(preloader.scheduleSecondBatch).toHaveBeenCalledWith('paged-url', 2, 8, mockDocBaseViewer, 100);

            const scheduleCallOrder = preloader.scheduleSecondBatch.mock.invocationCallOrder[0];
            const renderCallOrder = preloader.renderFirstPage.mock.invocationCallOrder[0];
            expect(scheduleCallOrder).toBeLessThan(renderCallOrder);
        });

        it('should schedule second batch after rendering when startSecondBatchAfterFetch is false', async () => {
            preloader.config = {
                priorityPages: 1,
                maxPreloadPages: 8,
                secondBatchDelayMs: 100,
                startSecondBatchAfterFetch: false,
            };

            await preloader.showPreloadStaggered(null, 'paged-url', 8, mockDocBaseViewer);

            expect(preloader.scheduleSecondBatch).toHaveBeenCalledTimes(1);
            expect(preloader.scheduleSecondBatch).toHaveBeenCalledWith('paged-url', 2, 8, mockDocBaseViewer, 100);

            const scheduleCallOrder = preloader.scheduleSecondBatch.mock.invocationCallOrder[0];
            const processCallOrder = preloader.processAdditionalPages.mock.invocationCallOrder[0];
            expect(scheduleCallOrder).toBeGreaterThan(processCallOrder);
        });

        it('should default to true when startSecondBatchAfterFetch is not specified', async () => {
            preloader.config = {
                priorityPages: 1,
                maxPreloadPages: 8,
                secondBatchDelayMs: 100,
            };

            await preloader.showPreloadStaggered(null, 'paged-url', 8, mockDocBaseViewer);

            expect(preloader.scheduleSecondBatch).toHaveBeenCalledTimes(1);
            const scheduleCallOrder = preloader.scheduleSecondBatch.mock.invocationCallOrder[0];
            const renderCallOrder = preloader.renderFirstPage.mock.invocationCallOrder[0];
            expect(scheduleCallOrder).toBeLessThan(renderCallOrder);
        });

        it('should not schedule second batch at all when totalPages <= priorityPages', async () => {
            preloader.config = {
                priorityPages: 8,
                maxPreloadPages: 8,
                secondBatchDelayMs: 100,
                startSecondBatchAfterFetch: true,
            };

            await preloader.showPreloadStaggered(null, 'paged-url', 5, mockDocBaseViewer);

            expect(preloader.scheduleSecondBatch).not.toHaveBeenCalled();
            expect(preloader.finalizePreload).toHaveBeenCalled();
        });

        it('should finalize instead of scheduling when startSecondBatchAfterFetch is false and no second batch needed', async () => {
            preloader.config = {
                priorityPages: 8,
                maxPreloadPages: 8,
                secondBatchDelayMs: 100,
                startSecondBatchAfterFetch: false,
            };

            await preloader.showPreloadStaggered(null, 'paged-url', 5, mockDocBaseViewer);

            expect(preloader.scheduleSecondBatch).not.toHaveBeenCalled();
            expect(preloader.finalizePreload).toHaveBeenCalled();
        });
    });
});
