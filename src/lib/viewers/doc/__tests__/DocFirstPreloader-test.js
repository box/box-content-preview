import DocFirstPreloader from '../DocFirstPreloader';
import Api from '../../../api';
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
        beforeEach(() => {
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'emit');
            jest.spyOn(preloader, 'showSpinner');
            jest.spyOn(preloader, 'setPreloadImageDimensions').mockResolvedValue();
            jest.spyOn(preloader, 'loadImage').mockReturnValue(mockFirstImage);
        });

        it('should not proceed if the document is already loaded', async () => {
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(true);
            jest.spyOn(preloader, 'initializePreloadContainerComponents').mockImplementation();
            await preloader.showPreload('mock-url', document.createElement('div'));
            expect(preloader.pdfJsDocLoadComplete).toHaveBeenCalled();
            expect(preloader.initializePreloadContainerComponents).not.toHaveBeenCalled();
        });

        it('should handle thubmnail sidebar correctly', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [Promise.resolve(mockBlob)];
            jest.spyOn(preloader, 'loadImage').mockReturnValue(new Image(100, 200));
            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            const mockContainer = document.createElement('div');
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

            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
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
            const mockContainer = document.createElement('div');
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 4, mockDocBaseViewer);
            expect(preloader.numPages).toBe(4);
            expect(preloader.retrievedPages).toBe(4);
            expect(preloader.initializePreloadContainerComponents).toHaveBeenCalledWith(mockContainer);
            expect(preloader.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                'mock-url',
                4,
                'mock-paged-image-url',
            );
            expect(Object.keys(preloader.preloadedImages).length).toBe(4);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url1');
            expect(preloader.preloadedImages[2]).toBe('mock-object-url2');
            expect(preloader.preloadedImages[3]).toBe('mock-object-url3');
            expect(preloader.preloadedImages[4]).toBe('mock-object-url4');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalledWith(mockBlob, mockFirstImage);
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalledWith('preload');
            expect(preloader.showSpinner).toHaveBeenCalled();
            expect(preloader.loadTime).toBeDefined();
            expect(mockElement.style.display).toBe('none');
        });

        it('should stop on first image retrieval failure', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [Promise.resolve(new Error('error')), Promise.resolve(mockBlob)];
            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            const mockContainer = document.createElement('div');
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 2, mockDocBaseViewer);
            expect(preloader.retrievedPages).toBe(0);
            expect(preloader.setPreloadImageDimensions).not.toHaveBeenCalled();
            expect(mockDocBaseViewer.initThumbnails).not.toHaveBeenCalled();
            expect(preloader.showSpinner).not.toHaveBeenCalled();
            expect(preloader.emit).not.toHaveBeenCalled();
            expect(preloader.loadTime).toBeUndefined();
        });

        it('should only show the first image if a failure occurs in the second image but not the third', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/webp' });
            const mockPromises = [
                Promise.resolve(mockBlob),
                Promise.resolve(new Error('error')),
                Promise.resolve(mockBlob),
            ];

            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-object-url');

            const mockContainer = document.createElement('div');
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 3, mockDocBaseViewer);
            expect(preloader.retrievedPages).toBe(1);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalled();
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalled();
            expect(preloader.showSpinner).toHaveBeenCalled();
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

            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
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

            const mockContainer = document.createElement('div');
            mockDocBaseViewer.shouldThumbnailsBeToggled = jest.fn().mockReturnValue(true);
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 4, mockDocBaseViewer);
            expect(preloader.retrievedPages).toBe(2);
            expect(preloader.preloadedImages[1]).toBe('mock-object-url1');
            expect(preloader.preloadedImages[2]).toBe('mock-object-url2');
            expect(preloader.setPreloadImageDimensions).toHaveBeenCalled();
            expect(mockDocBaseViewer.rootEl.classList.contains('bp-thumbnails-open')).toBe(true);
            expect(mockDocBaseViewer.initThumbnails).toHaveBeenCalled();
            expect(preloader.emit).toHaveBeenCalled();
            expect(preloader.loadTime).not.toBeUndefined();
        });

        it('should use the jpeg image as  preloader if webp is not available ', async () => {
            const mockBlob = new Blob(['mock-content'], { type: 'image/jpg' });
            const mockPromises = [Promise.resolve(new Error('error')), Promise.resolve(mockBlob)];
            jest.spyOn(preloader, 'pdfJsDocLoadComplete').mockReturnValue(false);
            jest.spyOn(preloader, 'emit');
            jest.spyOn(preloader, 'getPreloadImageRequestPromises').mockReturnValue(mockPromises);
            jest.spyOn(preloader, 'setPreloadImageDimensions').mockResolvedValue();
            const mockContainer = document.createElement('div');
            await preloader.showPreload('mock-url', mockContainer, 'mock-paged-image-url', 2, mockDocBaseViewer);
            expect(preloader.retrievedPages).toBe(0);
            expect(preloader.setPreloadImageDimensions).not.toHaveBeenCalled();
            expect(mockDocBaseViewer.initThumbnails).not.toHaveBeenCalled();
            expect(preloader.emit).not.toHaveBeenCalled();
            expect(preloader.loadTime).toBeUndefined();
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


    describe('showSpinner()', () => {
        it('should not create the spinner if it already exists', () => {
            const mockWrapperEl = jest.spyOn(document, 'createElement').mockReturnValue();
            preloader.wrapperEl = mockWrapperEl;
            preloader.spinner = {};
            preloader.showSpinner();
            expect(document.createElement).not.toHaveBeenCalled();
            expect(preloader.spinner).toEqual({});
        });

        it('should create the spinner if it does not exist', () => {
            const mockWrapperEl = document.createElement('div');
            jest.spyOn(mockWrapperEl, 'appendChild');
            jest.spyOn(document, 'getElementsByClassName').mockImplementation(klass => {
                if (klass === 'bcs-is-open') {
                    return ['div'];
                }

                return null;
            });

            preloader.wrapperEl = mockWrapperEl;
            preloader.spinner = null;
            preloader.showSpinner();
            expect(preloader.spinner).toBeInstanceOf(HTMLDivElement);
            expect(preloader.spinner.classList.contains('bp-document-preload-spinner')).toBe(true);
            expect(preloader.spinner.classList.contains('bp-sidebar-closed')).not.toBe(true);
            expect(mockWrapperEl.appendChild).toHaveBeenCalledWith(preloader.spinner);
        });

        it('should create the spinner and position it properly if sidebar is closed', () => {
            const mockWrapperEl = document.createElement('div');
            jest.spyOn(mockWrapperEl, 'appendChild');
            preloader.wrapperEl = mockWrapperEl;
            preloader.showSpinner();
            expect(preloader.spinner).toBeInstanceOf(HTMLDivElement);
            expect(preloader.spinner.classList.contains('bp-sidebar-closed')).toBe(true);
        });
    });

    
    describe('getPreloadImageRequestPromises()', () => {
        beforeEach(() => {
            jest.spyOn(preloader.api, 'get').mockResolvedValue({});
        });

        it('should create only the jpeg promise if webp is unavailable', () => {
            const jpegPagedUrl = 'jpeg-url';
            const webpPagedUrl = '';
            const promises = preloader.getPreloadImageRequestPromises(jpegPagedUrl, 3, webpPagedUrl);
            expect(preloader.api.get).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('jpeg-url'),
                expect.any(Object),
            );
            expect(promises.length).toBe(1);
        });

        it('should create only the webp promises if webp is unavailable', () => {
            const jpegPagedUrl = 'jpeg-url';
            const webpPagedUrl = 'webp-urlpage_number';
            const promises = preloader.getPreloadImageRequestPromises(jpegPagedUrl, 3, webpPagedUrl);
            expect(preloader.api.get).toHaveBeenCalledTimes(3);
            expect(preloader.api.get).toHaveBeenCalledWith(expect.stringContaining('1.webp'), expect.any(Object));
            expect(preloader.api.get).toHaveBeenCalledWith(expect.stringContaining('2.webp'), expect.any(Object));
            expect(preloader.api.get).toHaveBeenCalledWith(expect.stringContaining('3.webp'), expect.any(Object));
            expect(promises.length).toBe(3);
        });
    });
});
