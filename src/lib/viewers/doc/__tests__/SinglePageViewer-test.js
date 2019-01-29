/* eslint-disable no-unused-expressions */
import SinglePageViewer from '../SinglePageViewer';
import BaseViewer from '../../BaseViewer';

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
    });

    describe('initPdfViewer()', () => {
        beforeEach(() => {
            doc.pdfjsLib = {
                getDocument: sandbox.stub().returns(Promise.resolve({}))
            };

            doc.pdfjsViewer = {
                PDFFindController: sandbox.stub(),
                PDFLinkService: sandbox.stub(),
                PDFSinglePageViewer: sandbox.stub()
            };
        });

        it('should create a single page viewer', () => {
            doc.initPdfViewer();

            expect(doc.pdfjsViewer.PDFFindController).to.have.been.called;
            expect(doc.pdfjsViewer.PDFLinkService).to.have.been.called;
            expect(doc.pdfjsViewer.PDFSinglePageViewer).to.have.been.called;
        });
    });
});
