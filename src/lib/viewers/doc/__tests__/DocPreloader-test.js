/* eslint-disable no-unused-expressions */
import DocPreloader from '../DocPreloader';
import * as util from '../../../util';
import * as ui from '../../../ui';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_INVISIBLE,
    CLASS_PREVIEW_LOADED
} from '../../../constants';

const PDF_UNIT_TO_CSS_PIXEL = 4 / 3;

const sandbox = sinon.sandbox.create();
let containerEl;
let stubs;

describe('lib/viewers/doc/DocPreloader', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocPreloader-test.html');
        containerEl = document.querySelector('.container');
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('showPreload()', () => {
        it('should not do anything if document is loaded', () => {
            sandbox.stub(DocPreloader, 'checkDocumentLoaded').returns(true);
            sandbox.stub(util, 'get').returns(Promise.resolve({}));
            sandbox.stub(DocPreloader, 'bindDOMListeners');

            return DocPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(DocPreloader.wrapperEl).to.be.undefined;
                expect(DocPreloader.bindDOMListeners).to.not.be.called;
            });
        });

        it('should set up preload DOM structure and bind image load handler', () => {
            const imgSrc = 'https://someblobimgsrc/';
            sandbox.stub(util, 'get').returns(Promise.resolve({}));
            sandbox.stub(URL, 'createObjectURL').returns(imgSrc);
            sandbox.stub(DocPreloader, 'bindDOMListeners');

            return DocPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(DocPreloader.wrapperEl).to.contain(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
                expect(DocPreloader.imageEl.src).to.equal(imgSrc);
                expect(containerEl).to.contain(DocPreloader.wrapperEl);
                expect(DocPreloader.bindDOMListeners).to.be.called;
            });
        });
    });

    describe('hidePreload()', () => {
        beforeEach(() => {
            stubs.restoreScrollPosition = sandbox.stub(DocPreloader, 'restoreScrollPosition');
            stubs.unbindDOMListeners = sandbox.stub(DocPreloader, 'unbindDOMListeners');
        });

        it('should not do anything if preload wrapper element is not present', () => {
            DocPreloader.wrapperEl = null;
            DocPreloader.hidePreload();

            expect(stubs.restoreScrollPosition).to.not.be.called;
            expect(stubs.unbindDOMListeners).to.not.be.called;
        });

        it('should restore scroll position, unbind DOM listeners, remove the wrapper element, and revoke the object URL', () => {
            DocPreloader.wrapperEl = document.createElement('div');
            DocPreloader.srcUrl = 'blah';
            containerEl.appendChild(DocPreloader.wrapperEl);

            sandbox.mock(URL).expects('revokeObjectURL').withArgs(DocPreloader.srcUrl);

            DocPreloader.hidePreload();

            expect(stubs.restoreScrollPosition).to.be.called;
            expect(stubs.unbindDOMListeners).to.be.called;
            expect(containerEl).to.not.contain(DocPreloader.wrapperEl);
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind load event listener to image element', () => {
            DocPreloader.imageEl = {
                addEventListener: sandbox.stub()
            };

            DocPreloader.bindDOMListeners();

            expect(DocPreloader.imageEl.addEventListener).to.be.calledWith('load', DocPreloader.loadHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind load event listener to image element', () => {
            DocPreloader.imageEl = {
                removeEventListener: sandbox.stub()
            };

            DocPreloader.unbindDOMListeners();

            expect(DocPreloader.imageEl.removeEventListener).to.be.calledWith('load', DocPreloader.loadHandler);
        });
    });

    describe('restoreScrollPosition()', () => {
        it('should set the document scrollTop to be the same as the preload wrapper scrollTop', () => {
            const longDiv = document.createElement('div');
            longDiv.style.height = '200px';

            // Make wrapper element contain an overflowing div
            DocPreloader.wrapperEl = document.createElement('div');
            DocPreloader.wrapperEl.style.height = '100px';
            DocPreloader.wrapperEl.style.width = '100px';
            DocPreloader.wrapperEl.style.position = 'absolute';
            DocPreloader.wrapperEl.style.overflow = 'auto';
            DocPreloader.wrapperEl.appendChild(longDiv);
            containerEl.appendChild(DocPreloader.wrapperEl);

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
            DocPreloader.wrapperEl.scrollTop = 50;

            DocPreloader.restoreScrollPosition();

            // Check that fake pdf.js document is scrolled to same position
            expect(docEl.scrollTop).to.equal(50);
        });
    });

    describe('loadHandler()', () => {
        beforeEach(() => {
            stubs.readEXIF = sandbox.stub(DocPreloader, 'readEXIF');
            stubs.getScaledDimensions = sandbox.stub(DocPreloader, 'getScaledDimensions');
            stubs.scaleAndShowPreload = sandbox.stub(DocPreloader, 'scaleAndShowPreload');
        });

        it('should not do anything if preload element or image element do not exist', () => {
            DocPreloader.preloadEl = null;
            DocPreloader.imageEl = {};
            DocPreloader.loadHandler();

            expect(stubs.readEXIF).to.not.be.called;

            DocPreloader.preloadEl = {};
            DocPreloader.imageEl = null;
            DocPreloader.loadHandler();

            expect(stubs.readEXIF).to.not.be.called;
        });

        it('should read EXIF, calculate scaled dimensions, and show preload', () => {
            const pdfWidth = 100;
            const pdfHeight = 100;
            const numPages = 10;
            stubs.readEXIF.returns(Promise.resolve({
                pdfWidth,
                pdfHeight,
                numPages
            }));

            const scaledWidth = 200;
            const scaledHeight = 200;
            stubs.getScaledDimensions.returns({
                scaledWidth,
                scaledHeight
            });

            DocPreloader.preloadEl = {};
            DocPreloader.imageEl = {};
            return DocPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).to.be.calledWith(pdfWidth, pdfHeight);
                expect(stubs.scaleAndShowPreload).to.be.calledWith(scaledWidth, scaledHeight, numPages);
            });
        });

        it('should only show up to NUM_PAGES_MAX pages', () => {
            const NUM_PAGES_MAX = 500;
            stubs.readEXIF.returns(Promise.resolve({
                pdfWidth: 100,
                pdfHeight: 100,
                numPages: NUM_PAGES_MAX + 1 // NUM_PAGES_MAX + 1
            }));

            stubs.getScaledDimensions.returns({
                scaledWidth: 200,
                scaledHeight: 200
            });

            DocPreloader.preloadEl = {};
            DocPreloader.imageEl = {};
            return DocPreloader.loadHandler().then(() => {
                expect(stubs.scaleAndShowPreload).to.be.calledWith(sinon.match.any, sinon.match.any, NUM_PAGES_MAX);
            });
        });

        it('should fall back to naturalWidth and naturalHeight if reading EXIF fails', () => {
            stubs.readEXIF.returns(Promise.reject());
            stubs.getScaledDimensions.returns({
                scaledWidth: 200,
                scaledHeight: 200
            });

            DocPreloader.preloadEl = {};

            const naturalWidth = 100;
            const naturalHeight = 100;
            DocPreloader.imageEl = {
                naturalWidth,
                naturalHeight
            };

            return DocPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).to.be.calledWith(naturalWidth, naturalHeight);
            });
        });
    });

    describe('readEXIF()', () => {
        it('should return a promise that eventually rejects if there is an error reading EXIF', () => {
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns('')
            };

            return DocPreloader.readEXIF().should.eventually.be.rejected;
        });

        it('should return a promise that evenntually rejects if EXIF parser is not available', () => {
            window.EXIF = null;
            return DocPreloader.readEXIF().should.eventually.be.rejected;
        });

        it('should return a promise that eventually resolves with pdf width, height, and number of pages if EXIF is successfully read', () => {
            const pdfWidth = 100;
            const pdfHeight = 200;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`.split('').map((c) => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns(exifRawArray)
            };

            return DocPreloader.readEXIF().should.eventually.deep.equal({
                pdfWidth: pdfWidth * PDF_UNIT_TO_CSS_PIXEL,
                pdfHeight: pdfHeight * PDF_UNIT_TO_CSS_PIXEL,
                numPages
            });
        });
    });

    describe('getScaledDimensions()', () => {
        beforeEach(() => {
            DocPreloader.wrapperEl = document.createElement('div');
            containerEl.appendChild(DocPreloader.wrapperEl);
        });

        it('should scale up to a max of 1.25', () => {
            const clientWidth = 500;
            const clientHeight = 500;
            DocPreloader.wrapperEl.style.width = `${clientWidth}px`;
            DocPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const scaledDimensions = DocPreloader.getScaledDimensions(100, 100);

            // Expect max scale of 1.25
            const expectedScale = 1.25;
            expect(scaledDimensions).to.deep.equal({
                scaledWidth: Math.floor(expectedScale * 100),
                scaledHeight: Math.floor(expectedScale * 100)
            });
        });

        it('should scale with height scale if in landscape and height scale is less than width scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            DocPreloader.wrapperEl.style.width = `${clientWidth}px`;
            DocPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 1000;
            const pdfHeight = 600;
            const scaledDimensions = DocPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect height scale to be used
            const expectedScale = (clientHeight - 5) / pdfHeight;
            expect(scaledDimensions).to.deep.equal({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight)
            });
        });

        it('should scale with width scale if in landscape and width scale is less than height scale', () => {
            const clientWidth = 1000;
            const clientHeight = 500;
            DocPreloader.wrapperEl.style.width = `${clientWidth}px`;
            DocPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 1000;
            const pdfHeight = 500;
            const scaledDimensions = DocPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - 40) / pdfWidth;
            expect(scaledDimensions).to.deep.equal({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight)
            });
        });

        it('should scale with width scale if not in landscape', () => {
            const clientWidth = 600;
            const clientHeight = 1100;
            DocPreloader.wrapperEl.style.width = `${clientWidth}px`;
            DocPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 500;
            const pdfHeight = 1000;
            const scaledDimensions = DocPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - 40) / pdfWidth;
            expect(scaledDimensions).to.deep.equal({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight)
            });
        });
    });

    describe('scaleAndShowPreload()', () => {
        beforeEach(() => {
            stubs.checkDocumentLoaded = sandbox.stub(DocPreloader, 'checkDocumentLoaded');
            stubs.setDimensions = sandbox.stub(util, 'setDimensions');
            stubs.hideLoadingIndicator = sandbox.stub(ui, 'hideLoadingIndicator');
            DocPreloader.imageEl = {};
            DocPreloader.preloadEl = document.createElement('div');
        });

        it('should not do anything if document is loaded', () => {
            stubs.checkDocumentLoaded.returns(true);

            DocPreloader.scaleAndShowPreload(1, 1, 1);

            expect(stubs.setDimensions).to.not.be.called;
            expect(stubs.hideLoadingIndicator).to.not.be.called;
        });

        it('should set preload image dimensions, hide loading indicator, and show preload element', () => {
            DocPreloader.preloadEl.classList.add(CLASS_INVISIBLE);

            const width = 100;
            const height = 100;

            DocPreloader.scaleAndShowPreload(width, height, 1);

            expect(stubs.setDimensions).to.be.calledWith(DocPreloader.imageEl, width, height);
            expect(stubs.hideLoadingIndicator).to.be.called;
            expect(DocPreloader.preloadEl).to.not.have.class(CLASS_INVISIBLE);
        });

        [5, 10, 11, 100].forEach((numPages) => {
            it('should create and set dimensions for numPages - 1 placeholders', () => {
                DocPreloader.scaleAndShowPreload(100, 100, numPages);

                // Should scale 1 preload image and numPages - 1 placeholders
                expect(stubs.setDimensions).to.have.callCount(numPages);

                // Should have numPages - 1 placeholder elements
                expect(DocPreloader.preloadEl).to.have.length(numPages - 1);
            });
        });
    });

    describe('checkDocumentLoaded()', () => {
        beforeEach(() => {
            DocPreloader.containerEl = document.createElement('div');
        });

        it('should hide preload and return true if container element does have loaded class', () => {
            DocPreloader.containerEl.classList.add(CLASS_PREVIEW_LOADED);
            sandbox.mock(DocPreloader).expects('hidePreload');
            expect(DocPreloader.checkDocumentLoaded()).to.be.true;
        });

        it('should return false if container element does not have loaded class', () => {
            expect(DocPreloader.checkDocumentLoaded()).to.be.false;
        });
    });
});
