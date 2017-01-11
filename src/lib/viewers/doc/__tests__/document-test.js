/* eslint-disable no-unused-expressions */
import Document from '../document';
import fullscreen from '../../../fullscreen';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../../icons/icons';


const sandbox = sinon.sandbox.create();

let containerEl;
let doc;
let stubs = {};

describe('doc-find-bar', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/document-test.html');

        containerEl = document.querySelector('.container');
        doc = new Document(containerEl);
        doc.pdfViewer = {
            currentPageNumber: 0
        };
        doc.controls = {
            add: sandbox.stub()
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        doc = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should add the document class to the doc element', () => {
            expect(doc.docEl.classList.contains('bp-doc-document')).to.be.true;
        });
    });

    describe('onKeyDown()', () => {
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

        it('should fallback to doc base\'s onKeydown if no entry matches', () => {
            stubs.fullscreen.returns(false);
            const result = doc.onKeydown('ArrowDown');

            expect(result).to.be.false;
            expect(stubs.nextPage).to.not.be.called;

            stubs.fullscreen.returns(false);
            const result2 = doc.onKeydown('ArrowRight');

            expect(result2).to.be.true;
        });
    });

    describe('bindControlListeners()', () => {
        it('should add the correct controls', () => {
            doc.bindControlListeners();
            expect(doc.controls.add).to.be.calledWith(__('zoom_out'), doc.zoomOut, 'bp-doc-zoom-out-icon', ICON_ZOOM_OUT);
            expect(doc.controls.add).to.be.calledWith(__('zoom_in'), doc.zoomIn, 'bp-doc-zoom-in-icon', ICON_ZOOM_IN);
            expect(doc.controls.add).to.be.calledWith(__('previous_page'), doc.previousPage, 'bp-doc-previous-page-icon bp-previous-page', ICON_DROP_UP);


            expect(doc.controls.add).to.be.calledWith(__('enter_page_num'), doc.showPageNumInput, 'bp-doc-page-num');
            expect(doc.controls.add).to.be.calledWith(__('next_page'), doc.nextPage, 'bp-doc-next-page-icon bp-next-page', ICON_DROP_DOWN);
            expect(doc.controls.add).to.be.calledWith(__('enter_fullscreen'), doc.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
            expect(doc.controls.add).to.be.calledWith(__('exit_fullscreen'), doc.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
        });
    });
});
