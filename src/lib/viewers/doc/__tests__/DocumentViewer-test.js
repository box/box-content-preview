/* eslint-disable no-unused-expressions */
import DocumentViewer from '../DocumentViewer';
import DocBaseViewer from '../DocBaseViewer';
import BaseViewer from '../../BaseViewer';
import DocPreloader from '../DocPreloader';
import fullscreen from '../../../Fullscreen';

let containerEl;
let doc;
let stubs = {};

describe('lib/viewers/doc/DocumentViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocumentViewer-test.html');

        containerEl = document.querySelector('.container');
        doc = new DocumentViewer({
            container: containerEl,
            file: {
                id: '0',
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        doc.containerEl = containerEl;
        doc.setup();

        doc.pdfViewer = {
            currentPageNumber: 0,
            cleanup: jest.fn(),
        };
        doc.controls = {
            add: jest.fn(),
        };
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (doc && typeof doc.destroy === 'function') {
            doc.destroy();
        }

        doc = null;
        stubs = {};
    });

    describe('setup()', () => {
        test('should add the document class to the doc element and set up preloader', () => {
            expect(doc.docEl).toHaveClass('bp-doc-document');
            expect(doc.preloader).toBeInstanceOf(DocPreloader);
        });

        test('should invoke onPreload callback', () => {
            doc.options.logger = {
                setPreloaded: jest.fn(),
            };
            stubs.setPreloaded = doc.options.logger.setPreloaded;
            doc.preloader.emit('preload');

            expect(stubs.setPreloaded).toBeCalled();
        });
    });

    describe('destroy()', () => {
        const destroyFunc = DocBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        test('should remove listeners from preloader', () => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: jest.fn() });
            doc.preloader = {
                removeAllListeners: jest.fn(),
            };
            doc.destroy();
            doc = null; // Don't call destroy again during cleanup
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.zoomIn = jest.spyOn(doc, 'zoomIn').mockImplementation();
            stubs.zoomOut = jest.spyOn(doc, 'zoomOut').mockImplementation();
            stubs.previousPage = jest.spyOn(doc, 'previousPage').mockImplementation();
            stubs.nextPage = jest.spyOn(doc, 'nextPage').mockImplementation();
            stubs.fullscreen = jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
        });

        test('should zoom in and return true if Shift++ is entered', () => {
            const result = doc.onKeydown('Shift++');

            expect(result).toBe(true);
            expect(stubs.zoomIn).toBeCalled();
        });

        test('should zoom out and return true if Shift+_ is entered', () => {
            const result = doc.onKeydown('Shift+_');

            expect(result).toBe(true);
            expect(stubs.zoomOut).toBeCalled();
        });

        test('should go to the previous page and return true if ArrowUp is entered and in fullscreen', () => {
            const result = doc.onKeydown('ArrowUp');

            expect(result).toBe(true);
            expect(stubs.previousPage).toBeCalled();
        });

        test('should go to the next page and return true if ArrowDown is entered and in fullscreen', () => {
            const result = doc.onKeydown('ArrowDown');

            expect(result).toBe(true);
            expect(stubs.nextPage).toBeCalled();
        });

        test("should fallback to doc base's onKeydown if no entry matches", () => {
            const docbaseStub = jest.spyOn(DocBaseViewer.prototype, 'onKeydown');
            const eventStub = jest.fn();
            stubs.fullscreen.mockReturnValue(false);

            const key = 'ArrowDown';
            const result = doc.onKeydown(key, eventStub);
            expect(docbaseStub).toBeCalledWith(key, eventStub);
            expect(result).toBe(false);
            expect(stubs.nextPage).not.toBeCalled();

            const key2 = 'ArrowRight';
            const result2 = doc.onKeydown(key2, eventStub);
            expect(docbaseStub).toBeCalledWith(key2, eventStub);
            expect(result2).toBe(true);

            expect(docbaseStub).toBeCalledTimes(2);
        });
    });
});
