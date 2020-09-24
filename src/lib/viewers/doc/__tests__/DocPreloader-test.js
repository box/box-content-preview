/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import DocPreloader from '../DocPreloader';
import * as util from '../../../util';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_OVERLAY,
    CLASS_INVISIBLE,
    CLASS_PREVIEW_LOADED,
} from '../../../constants';

const PDFJS_CSS_UNITS = 96.0 / 72.0;

let containerEl;
let stubs;
let docPreloader;

describe('lib/viewers/doc/DocPreloader', () => {
    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocPreloader-test.html');
        containerEl = document.querySelector('.container');
        stubs = {};
        stubs.api = new Api();
        docPreloader = new DocPreloader({ hideLoadingIndicator: () => {} }, { api: stubs.api });

        docPreloader.previewUI = {
            hideLoadingIndicator: jest.fn(),
            previewContainer: document.createElement('div'),
        };
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('showPreload()', () => {
        test('should not do anything if document is loaded', () => {
            jest.spyOn(docPreloader, 'checkDocumentLoaded').mockReturnValue(true);
            jest.spyOn(stubs.api, 'get').mockResolvedValue({});
            jest.spyOn(docPreloader, 'bindDOMListeners').mockImplementation();

            return docPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(docPreloader.wrapperEl).toBeUndefined();
                expect(docPreloader.bindDOMListeners).not.toBeCalled();
            });
        });

        test('should set up preload DOM structure and bind image load handler', () => {
            const imgSrc = 'https://someblobimgsrc/';
            jest.spyOn(URL, 'createObjectURL').mockReturnValue(imgSrc);
            jest.spyOn(docPreloader, 'bindDOMListeners').mockImplementation();
            jest.spyOn(stubs.api, 'get').mockResolvedValue({});

            return docPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(docPreloader.wrapperEl).toContainSelector(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
                expect(docPreloader.preloadEl).toContainSelector(`.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
                expect(docPreloader.preloadEl).toContainSelector(`.${CLASS_BOX_PREVIEW_PRELOAD_OVERLAY}`);
                expect(docPreloader.imageEl.src).toBe(imgSrc);
                expect(containerEl).toContainElement(docPreloader.wrapperEl);
                expect(docPreloader.bindDOMListeners).toBeCalled();
            });
        });
    });

    describe('scaleAndShowPreload()', () => {
        beforeEach(() => {
            stubs.checkDocumentLoaded = jest.spyOn(docPreloader, 'checkDocumentLoaded').mockImplementation();
            stubs.emit = jest.spyOn(docPreloader, 'emit').mockImplementation();
            stubs.setDimensions = jest.spyOn(util, 'setDimensions').mockImplementation();
            stubs.hideLoadingIndicator = docPreloader.previewUI.hideLoadingIndicator;
            docPreloader.imageEl = {};
            docPreloader.preloadEl = document.createElement('div');
        });

        test('should not do anything if document is loaded', () => {
            stubs.checkDocumentLoaded.mockReturnValue(true);

            docPreloader.scaleAndShowPreload(1, 1, 1);

            expect(stubs.setDimensions).not.toBeCalled();
            expect(stubs.hideLoadingIndicator).not.toBeCalled();
        });

        test('should set preload image dimensions, hide loading indicator, show preload element, and emit preload event', () => {
            docPreloader.preloadEl.classList.add(CLASS_INVISIBLE);

            const width = 100;
            const height = 100;

            docPreloader.scaleAndShowPreload(width, height, 1);

            expect(stubs.setDimensions).toBeCalledWith(docPreloader.imageEl, width, height);
            expect(stubs.setDimensions).toBeCalledWith(docPreloader.overlayEl, width, height);
            expect(stubs.hideLoadingIndicator).toBeCalled();
            expect(stubs.emit).toBeCalledWith('preload');
            expect(docPreloader.preloadEl).not.toHaveClass(CLASS_INVISIBLE);
        });

        [5, 10, 11, 100].forEach(numPages => {
            test('should create and set dimensions for numPages - 1 placeholders', () => {
                docPreloader.scaleAndShowPreload(100, 100, numPages);

                // Should scale 1 preload image, one overlay, and numPages - 1 placeholders
                expect(stubs.setDimensions).toBeCalledTimes(numPages + 1);

                expect(docPreloader.preloadEl.children.length).toBe(numPages - 1);
            });
        });
    });

    describe('hidePreload()', () => {
        beforeEach(() => {
            stubs.restoreScrollPosition = jest.spyOn(docPreloader, 'restoreScrollPosition').mockImplementation();
            stubs.unbindDOMListeners = jest.spyOn(docPreloader, 'unbindDOMListeners').mockImplementation();
            stubs.cleanupPreload = jest.spyOn(docPreloader, 'cleanupPreload').mockImplementation();
        });

        test('should not do anything if preload wrapper element is not present', () => {
            docPreloader.wrapperEl = null;
            docPreloader.hidePreload();

            expect(stubs.restoreScrollPosition).not.toBeCalled();
            expect(stubs.unbindDOMListeners).not.toBeCalled();
        });

        test('should restore scroll position, unbind DOM listeners, and add a transparent class to the wrapper', () => {
            docPreloader.wrapperEl = document.createElement('div');
            docPreloader.srcUrl = 'blah';

            docPreloader.hidePreload();

            expect(docPreloader.wrapperEl).toHaveClass('bp-is-transparent');
            expect(stubs.restoreScrollPosition).toBeCalled();
            expect(stubs.unbindDOMListeners).toBeCalled();
        });

        test('should clean up preload after transition ends', () => {
            docPreloader.wrapperEl = document.createElement('div');
            jest.fn();

            docPreloader.hidePreload();
            docPreloader.wrapperEl.dispatchEvent(new Event('transitionend'));

            expect(stubs.cleanupPreload).toBeCalled();
        });

        test('should clean up preload after scroll event', () => {
            docPreloader.wrapperEl = document.createElement('div');
            jest.fn();

            docPreloader.hidePreload();
            docPreloader.wrapperEl.dispatchEvent(new Event('scroll'));

            expect(stubs.cleanupPreload).toBeCalled();
        });
    });

    describe('cleanupPreload()', () => {
        test('should remove wrapper, clear out preload and image element, and revoke object URL', () => {
            jest.spyOn(URL, 'revokeObjectURL').mockImplementation();

            docPreloader.wrapperEl = document.createElement('div');
            docPreloader.preloadEl = document.createElement('div');
            docPreloader.imageEl = document.createElement('img');
            docPreloader.srcUrl = 'blah';
            containerEl.appendChild(docPreloader.wrapperEl);

            docPreloader.cleanupPreload();

            expect(docPreloader.preloadEl).toBeUndefined();
            expect(docPreloader.imageEl).toBeUndefined();
            expect(containerEl).not.toContain(docPreloader.wrapperEl);
        });
    });

    describe('bindDOMListeners()', () => {
        test('should bind load event listener to image element', () => {
            docPreloader.imageEl = {
                addEventListener: jest.fn(),
            };

            docPreloader.bindDOMListeners();

            expect(docPreloader.imageEl.addEventListener).toBeCalledWith('load', docPreloader.loadHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        test('should unbind load event listener to image element', () => {
            docPreloader.imageEl = {
                removeEventListener: jest.fn(),
            };

            docPreloader.unbindDOMListeners();

            expect(docPreloader.imageEl.removeEventListener).toBeCalledWith('load', docPreloader.loadHandler);
        });
    });

    describe('restoreScrollPosition()', () => {
        test('should set the document scrollTop to be the same as the preload wrapper scrollTop', () => {
            const longDiv = document.createElement('div');
            longDiv.style.height = '200px';

            // Make wrapper element contain an overflowing div
            docPreloader.wrapperEl = document.createElement('div');
            docPreloader.wrapperEl.style.height = '100px';
            docPreloader.wrapperEl.style.width = '100px';
            docPreloader.wrapperEl.style.position = 'absolute';
            docPreloader.wrapperEl.style.overflow = 'auto';
            docPreloader.wrapperEl.appendChild(longDiv);
            containerEl.appendChild(docPreloader.wrapperEl);

            // Make fake pdf.js document that also contains an overflowing div
            const docEl = document.createElement('div');
            docEl.className = 'bp-doc';
            docEl.style.height = '100px';
            docEl.style.width = '100px';
            docEl.style.position = 'absolute';
            docEl.style.overflow = 'auto';
            docEl.appendChild(longDiv.cloneNode());
            containerEl.appendChild(docEl);

            // Scroll the preload wrapper
            docPreloader.wrapperEl.scrollTop = 50;

            docPreloader.restoreScrollPosition();

            expect(docEl.scrollTop).toBe(50);
        });
    });

    describe('loadHandler()', () => {
        beforeEach(() => {
            stubs.readEXIF = jest.spyOn(docPreloader, 'readEXIF').mockImplementation();
            stubs.getScaledDimensions = jest.spyOn(docPreloader, 'getScaledDimensions').mockImplementation();
            stubs.scaleAndShowPreload = jest.spyOn(docPreloader, 'scaleAndShowPreload').mockImplementation();
        });

        test('should not do anything if preload element or image element do not exist', () => {
            docPreloader.preloadEl = null;
            docPreloader.imageEl = {};
            docPreloader.loadHandler();

            expect(stubs.readEXIF).not.toBeCalled();

            docPreloader.preloadEl = {};
            docPreloader.imageEl = null;
            docPreloader.loadHandler();

            expect(stubs.readEXIF).not.toBeCalled();
        });

        test('should read EXIF, calculate scaled dimensions, and show preload', () => {
            const pdfWidth = 100;
            const pdfHeight = 100;
            const numPages = 10;
            stubs.readEXIF.mockReturnValue(
                Promise.resolve({
                    pdfWidth,
                    pdfHeight,
                    numPages,
                }),
            );

            const scaledWidth = 200;
            const scaledHeight = 200;
            stubs.getScaledDimensions.mockReturnValue({
                scaledWidth,
                scaledHeight,
            });

            docPreloader.preloadEl = {};
            docPreloader.imageEl = {};
            return docPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).toBeCalledWith(pdfWidth, pdfHeight);
                expect(stubs.scaleAndShowPreload).toBeCalledWith(scaledWidth, scaledHeight, numPages);
            });
        });

        test('should only show up to NUM_PAGES_MAX pages', () => {
            const NUM_PAGES_MAX = 500;
            stubs.readEXIF.mockReturnValue(
                Promise.resolve({
                    pdfWidth: 100,
                    pdfHeight: 100,
                    numPages: NUM_PAGES_MAX + 1, // NUM_PAGES_MAX + 1
                }),
            );

            stubs.getScaledDimensions.mockReturnValue({
                scaledWidth: 200,
                scaledHeight: 200,
            });

            docPreloader.preloadEl = {};
            docPreloader.imageEl = {};
            return docPreloader.loadHandler().then(() => {
                expect(stubs.scaleAndShowPreload).toBeCalledWith(200, 200, NUM_PAGES_MAX);
            });
        });

        test('should fall back to naturalWidth and naturalHeight if reading EXIF fails', () => {
            stubs.readEXIF.mockReturnValue(Promise.reject());
            stubs.getScaledDimensions.mockReturnValue({
                scaledWidth: 200,
                scaledHeight: 200,
            });

            docPreloader.preloadEl = {};

            const naturalWidth = 100;
            const naturalHeight = 100;
            docPreloader.imageEl = {
                naturalWidth,
                naturalHeight,
            };

            return docPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).toBeCalledWith(naturalWidth, naturalHeight);
            });
        });
    });

    describe('getScaledDimensions()', () => {
        beforeEach(() => {
            docPreloader.wrapperEl = document.createElement('div');

            Object.defineProperty(docPreloader.wrapperEl, 'clientHeight', { value: 0, writable: true });
            Object.defineProperty(docPreloader.wrapperEl, 'clientWidth', { value: 0, writable: true });

            containerEl.appendChild(docPreloader.wrapperEl);
        });

        test('should scale up to a max defined by maxZoomScale', () => {
            const clientWidth = 500;
            const clientHeight = 500;
            docPreloader.wrapperEl.clientWidth = clientWidth;
            docPreloader.wrapperEl.clientHeight = clientHeight;
            const expectedScale = 1.25;
            docPreloader.maxZoomScale = expectedScale;

            const scaledDimensions = docPreloader.getScaledDimensions(100, 100);
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * 100),
                scaledHeight: Math.floor(expectedScale * 100),
            });
        });

        test('should scale with height scale if in landscape and height scale is less than width scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            docPreloader.wrapperEl.clientWidth = clientWidth;
            docPreloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 1000;
            const pdfHeight = 600;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect height scale to be used
            const expectedScale = (clientHeight - 5) / pdfHeight;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });

        test('should scale with width scale if in landscape and width scale is less than height scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            docPreloader.wrapperEl.clientWidth = clientWidth;
            docPreloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 1000;
            const pdfHeight = 500;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - 40) / pdfWidth;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });

        test('should scale with width scale if not in landscape', () => {
            const clientWidth = 600;
            const clientHeight = 1100;
            docPreloader.wrapperEl.clientWidth = clientWidth;
            docPreloader.wrapperEl.clientHeight = clientHeight;

            const pdfWidth = 500;
            const pdfHeight = 1000;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - 40) / pdfWidth;
            expect(scaledDimensions).toEqual({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight),
            });
        });
    });

    describe('readEXIF()', () => {
        let fakeImageEl;

        beforeEach(() => {
            fakeImageEl = {
                naturalWidth: 50,
                naturalHeight: 100,
            };
        });

        test('should return a promise that eventually rejects if there is an error reading EXIF', () => {
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: jest.fn().mockReturnValue(''),
            };
            docPreloader
                .readEXIF(fakeImageEl)
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });

        test('should return a promise that eventually rejects if EXIF parser is not available', () => {
            window.EXIF = null;
            return docPreloader
                .readEXIF(fakeImageEl)
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });

        test('should return a promise that eventually rejects if num pages is not valid', () => {
            const pdfWidth = 100;
            const pdfHeight = 200;
            const numPages = 0;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map(c => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: jest.fn().mockReturnValue(exifRawArray),
            };

            return docPreloader
                .readEXIF(fakeImageEl)
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });

        test('should return a promise that eventually rejects if image dimensions are invalid', () => {
            const pdfWidth = 100;
            const pdfHeight = 1000;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map(c => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: jest.fn().mockReturnValue(exifRawArray),
            };

            return docPreloader
                .readEXIF(fakeImageEl)
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });

        test('should return a promise that eventually resolves with pdf width, height, and number of pages if EXIF is successfully read', () => {
            const pdfWidth = 100;
            const pdfHeight = 200;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map(c => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: jest.fn().mockReturnValue(exifRawArray),
            };

            return docPreloader
                .readEXIF(fakeImageEl)
                .then(response => {
                    expect(response).toEqual({
                        pdfWidth: pdfWidth * PDFJS_CSS_UNITS,
                        pdfHeight: pdfHeight * PDFJS_CSS_UNITS,
                        numPages,
                    });
                })
                .catch(() => fail());
        });

        test('should return a promise that eventually resolves with swapped pdf width and height if PDF data is rotated', () => {
            const pdfWidth = 200;
            const pdfHeight = 100;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map(c => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: jest.fn().mockReturnValue(exifRawArray),
            };

            return docPreloader
                .readEXIF(fakeImageEl)
                .then(response => {
                    expect(response).toEqual({
                        pdfWidth: pdfHeight * PDFJS_CSS_UNITS,
                        pdfHeight: pdfWidth * PDFJS_CSS_UNITS,
                        numPages,
                    });
                })
                .catch(() => fail());
        });
    });

    describe('checkDocumentLoaded()', () => {
        beforeEach(() => {
            docPreloader.previewUI.previewContainer = document.createElement('div');
        });

        test('should hide preload and return true if container element does have loaded class', () => {
            jest.spyOn(docPreloader, 'hidePreload').mockImplementation();
            docPreloader.previewUI.previewContainer.classList.add(CLASS_PREVIEW_LOADED);
            expect(docPreloader.checkDocumentLoaded()).toBe(true);
        });

        test('should return false if container element does not have loaded class', () => {
            expect(docPreloader.checkDocumentLoaded()).toBe(false);
        });
    });

    describe('resize()', () => {
        beforeEach(() => {
            jest.spyOn(docPreloader, 'getScaledWidthAndHeight').mockReturnValue({
                scaledWidth: 1000,
                scaledHeight: 800,
            });
            jest.spyOn(docPreloader, 'getScaledDimensions').mockReturnValue({
                scaledWidth: 1000,
                scaledHeight: 800,
            });
            jest.spyOn(util, 'setDimensions').mockImplementation();
            docPreloader.preloadEl = document.createElement('div');
            docPreloader.preloadEl.innerHTML = `<img class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}" /><div class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}" />`;
        });

        test('should short circuit if there is no preload element to resize', () => {
            docPreloader.preloadEl = null;
            docPreloader.resize();
            expect(docPreloader.getScaledWidthAndHeight).not.toBeCalled();
        });

        test('should short circuit if there is no pdf data or image element', () => {
            docPreloader.pdfData = null;
            docPreloader.imageEl = null;
            docPreloader.resize();
            expect(docPreloader.getScaledWidthAndHeight).not.toBeCalled();
        });

        test('should prefer to resize using the pdfData', () => {
            docPreloader.pdfData = {
                pdfWidth: 800,
                pdfHeight: 600,
            };

            docPreloader.resize();
            expect(docPreloader.getScaledWidthAndHeight).toBeCalled();
            expect(docPreloader.getScaledDimensions).not.toBeCalled();
        });

        test('should resize using image element dimensions if available', () => {
            docPreloader.pdfData = null;
            docPreloader.imageEl = {
                naturalWidth: 800,
                naturalHeight: 600,
            };

            docPreloader.resize();
            expect(docPreloader.getScaledDimensions).toBeCalled();
            expect(docPreloader.getScaledWidthAndHeight).not.toBeCalled();
        });

        test('should resize all the elements', () => {
            docPreloader.pdfData = {
                pdfWidth: 800,
                pdfHeight: 600,
            };
            docPreloader.resize();
            expect(docPreloader.getScaledWidthAndHeight).toBeCalled();
            expect(util.setDimensions).toBeCalledTimes(2);
        });
    });

    describe('getScaledWidthAndHeight()', () => {
        const scaledDimensions = {
            scaledWidth: 1000,
            scaledHeight: 800,
        };
        const pdfData = {
            pdfWidth: 800,
            pdfHeight: 600,
        };
        beforeEach(() => {
            jest.spyOn(docPreloader, 'getScaledDimensions').mockReturnValue(scaledDimensions);
        });

        test('should return the scaled width and height', () => {
            const scaledWidthAndHeight = docPreloader.getScaledWidthAndHeight(pdfData);
            expect(docPreloader.getScaledDimensions).toBeCalledWith(pdfData.pdfWidth, pdfData.pdfHeight);
            expect(scaledWidthAndHeight).toEqual(scaledDimensions);
        });
    });
});
