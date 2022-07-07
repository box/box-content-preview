/* eslint-disable no-unused-expressions */
import SinglePageViewer from '../SinglePageViewer';
import BaseViewer from '../../BaseViewer';
import * as util from '../../../util';

const sandbox = sinon.createSandbox();
let containerEl;
let doc;

describe('lib/viewers/doc/SinglePageViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/SinglePageViewer-test.html');

        containerEl = document.querySelector('.container');
        doc = new SinglePageViewer({
            container: containerEl,
            file: {
                id: '0',
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        doc.containerEl = containerEl;
        doc.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (doc && typeof doc.destroy === 'function') {
            doc.destroy();
        }

        doc = null;
    });

    describe('initPdfViewer()', () => {
        const stubs = {};

        beforeEach(() => {
            stubs.pdfViewer = {
                enhanceTextSelection: true,
                linkService: {},
                setDocument: jest.fn(),
            };
            stubs.pdfViewerClass = jest.fn(() => stubs.pdfViewer);
            stubs.urlCreator = jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(() => 'asset');

            doc.pdfjsLib = {};
            doc.pdfjsViewer = {
                PDFSinglePageViewer: stubs.pdfViewerClass,
            };
        });

        test('should return the default pdfViewer', () => {
            const result = doc.initPdfViewer();

            expect(doc.pdfjsViewer.PDFSinglePageViewer).toBeCalled();
            expect(result).toBe(stubs.pdfViewer);
        });
    });
});
