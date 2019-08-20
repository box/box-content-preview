/* eslint-disable no-unused-expressions */
import SinglePageViewer from '../SinglePageViewer';
import BaseViewer from '../../BaseViewer';
import * as util from '../../../util';

const sandbox = sinon.sandbox.create();
let containerEl;
let doc;

describe('lib/viewers/doc/SinglePageViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

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
                setDocument: sandbox.stub(),
            };
            stubs.pdfViewerClass = sandbox.stub().returns(stubs.pdfViewer);
            stubs.urlCreator = sandbox.stub(util, 'createAssetUrlCreator').returns(() => 'asset');

            doc.pdfjsViewer = {
                PDFSinglePageViewer: stubs.pdfViewerClass,
            };
        });

        it('should return the default pdfViewer', () => {
            const result = doc.initPdfViewer();

            expect(doc.pdfjsViewer.PDFSinglePageViewer).to.be.called;
            expect(result).to.equal(stubs.pdfViewer);
        });
    });
});
