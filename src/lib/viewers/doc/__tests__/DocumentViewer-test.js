/* eslint-disable no-unused-expressions */
import DocumentViewer from '../DocumentViewer';
import DocBaseViewer from '../DocBaseViewer';
import BaseViewer from '../../BaseViewer';
import DocPreloader from '../DocPreloader';
import fullscreen from '../../../Fullscreen';

const sandbox = sinon.sandbox.create();

let containerEl;
let doc;
let stubs = {};

describe('lib/viewers/doc/DocumentViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocumentViewer-test.html');

        containerEl = document.querySelector('.container');
        doc = new DocumentViewer({
            container: containerEl,
            file: {
                id: '0',
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        doc.containerEl = containerEl;
        doc.setup();

        doc.pdfViewer = {
            currentPageNumber: 0,
            cleanup: sandbox.stub(),
        };
        doc.controls = {
            add: sandbox.stub(),
        };
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

    describe('setup()', () => {
        it('should add the document class to the doc element and set up preloader', () => {
            expect(doc.docEl).to.have.class('bp-doc-document');
            expect(doc.preloader).to.be.instanceof(DocPreloader);
        });

        it('should invoke onPreload callback', () => {
            doc.options.logger = {
                setPreloaded: sandbox.stub(),
            };
            stubs.setPreloaded = doc.options.logger.setPreloaded;
            doc.preloader.emit('preload');

            expect(stubs.setPreloaded).to.be.called;
        });
    });

    describe('destroy()', () => {
        const destroyFunc = DocBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        it('should remove listeners from preloader', () => {
            Object.defineProperty(DocBaseViewer.prototype, 'destroy', { value: sandbox.stub() });
            doc.preloader = {
                removeAllListeners: sandbox.mock().withArgs('preload'),
            };
            doc.destroy();
            doc = null; // Don't call destroy again during cleanup
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            stubs.zoomIn = sandbox.stub(doc, 'zoomIn');
            stubs.zoomOut = sandbox.stub(doc, 'zoomOut');
            stubs.previousPage = sandbox.stub(doc, 'previousPage');
            stubs.nextPage = sandbox.stub(doc, 'nextPage');
            stubs.fullscreen = sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        it('should zoom in and return true if Shift++ is entered', () => {
            const result = doc.onKeydown('Shift++');

            expect(result).to.be.true;
            expect(stubs.zoomIn).to.be.called;
        });

        it('should zoom out and return true if Shift+_ is entered', () => {
            const result = doc.onKeydown('Shift+_');

            expect(result).to.be.true;
            expect(stubs.zoomOut).to.be.called;
        });

        it('should go to the previous page and return true if ArrowUp is entered and in fullscreen', () => {
            const result = doc.onKeydown('ArrowUp');

            expect(result).to.be.true;
            expect(stubs.previousPage).to.be.called;
        });

        it('should go to the next page and return true if ArrowDown is entered and in fullscreen', () => {
            const result = doc.onKeydown('ArrowDown');

            expect(result).to.be.true;
            expect(stubs.nextPage).to.be.called;
        });

        it("should fallback to doc base's onKeydown if no entry matches", () => {
            const docbaseStub = sandbox.spy(DocBaseViewer.prototype, 'onKeydown');
            const eventStub = sandbox.stub();
            stubs.fullscreen.returns(false);

            const key = 'ArrowDown';
            const result = doc.onKeydown(key, eventStub);
            expect(docbaseStub).to.have.been.calledWithExactly(key, eventStub);
            expect(result).to.be.false;
            expect(stubs.nextPage).to.not.be.called;

            const key2 = 'ArrowRight';
            const result2 = doc.onKeydown(key2, eventStub);
            expect(docbaseStub).to.have.been.calledWithExactly(key2, eventStub);
            expect(result2).to.be.true;

            expect(docbaseStub).to.have.been.calledTwice;
        });
    });
});
