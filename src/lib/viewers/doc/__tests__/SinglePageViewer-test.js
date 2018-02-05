/* eslint-disable no-unused-expressions */
import SinglePageViewer from '../SinglePageViewer';
import BaseViewer from '../../BaseViewer';

const sandbox = sinon.sandbox.create();
let containerEl;
let doc;
let stubs = {};

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
                id: '0'
            }
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
        stubs = {};
    });

    describe('initPdfViewer()', () => {
        const pdfViewer = {
            linkService: new PDFJS.PDFLinkService(),
            setDocument: sandbox.stub(),
            enhanceTextSelection: true
        };

        beforeEach(() => {
            stubs.pdfViewerStub = sandbox.stub(PDFJS, 'PDFSinglePageViewer').returns(pdfViewer);
        });

        it('should return the default pdfViewer', () => {
            const result = doc.initPdfViewer();
            expect(stubs.pdfViewerStub).to.be.calledWith({
                container: sinon.match.any,
                linkService: sinon.match.any,
                enhanceTextSelection: true
            });
            expect(result).to.equal(pdfViewer);
        });
    });
});
