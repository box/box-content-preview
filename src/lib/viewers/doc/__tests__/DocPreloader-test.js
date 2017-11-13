/* eslint-disable no-unused-expressions */
import DocPreloader from '../DocPreloader';
import * as util from '../../../util';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_OVERLAY,
    CLASS_INVISIBLE,
    CLASS_PREVIEW_LOADED,
    CLASS_SPINNER
} from '../../../constants';

const PDFJS_CSS_UNITS = 96.0 / 72.0;

const sandbox = sinon.sandbox.create();
let containerEl;
let stubs;
let docPreloader;

describe('lib/viewers/doc/DocPreloader', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocPreloader-test.html');
        containerEl = document.querySelector('.container');
        docPreloader = new DocPreloader({
            hideLoadingIndicator: () => {}
        });
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('showPreload()', () => {
        it('should not do anything if document is loaded', () => {
            sandbox.stub(docPreloader, 'checkDocumentLoaded').returns(true);
            sandbox.stub(util, 'get').returns(Promise.resolve({}));
            sandbox.stub(docPreloader, 'bindDOMListeners');

            return docPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(docPreloader.wrapperEl).to.be.undefined;
                expect(docPreloader.bindDOMListeners).to.not.be.called;
            });
        });

        it('should set up preload DOM structure and bind image load handler', () => {
            const imgSrc = 'https://someblobimgsrc/';
            sandbox.stub(util, 'get').returns(Promise.resolve({}));
            sandbox.stub(URL, 'createObjectURL').returns(imgSrc);
            sandbox.stub(docPreloader, 'bindDOMListeners');

            return docPreloader.showPreload('someUrl', containerEl).then(() => {
                expect(docPreloader.wrapperEl).to.contain(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
                expect(docPreloader.preloadEl).to.contain(`.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
                expect(docPreloader.preloadEl).to.contain(`.${CLASS_BOX_PREVIEW_PRELOAD_OVERLAY}`);
                expect(docPreloader.overlayEl).to.contain(`.${CLASS_SPINNER}`);
                expect(docPreloader.imageEl.src).to.equal(imgSrc);
                expect(containerEl).to.contain(docPreloader.wrapperEl);
                expect(docPreloader.bindDOMListeners).to.be.called;
            });
        });
    });

    describe('hidePreload()', () => {
        beforeEach(() => {
            stubs.restoreScrollPosition = sandbox.stub(docPreloader, 'restoreScrollPosition');
            stubs.unbindDOMListeners = sandbox.stub(docPreloader, 'unbindDOMListeners');
            stubs.cleanupPreload = sandbox.stub(docPreloader, 'cleanupPreload');
        });

        it('should not do anything if preload wrapper element is not present', () => {
            docPreloader.wrapperEl = null;
            docPreloader.hidePreload();

            expect(stubs.restoreScrollPosition).to.not.be.called;
            expect(stubs.unbindDOMListeners).to.not.be.called;
        });

        it('should restore scroll position, unbind DOM listeners, and add a transparent class to the wrapper', () => {
            docPreloader.wrapperEl = document.createElement('div');
            docPreloader.srcUrl = 'blah';

            docPreloader.hidePreload();

            expect(docPreloader.wrapperEl).to.have.class('bp-is-transparent');
            expect(stubs.restoreScrollPosition).to.be.called;
            expect(stubs.unbindDOMListeners).to.be.called;
        });

        it('should clean up preload after transition ends', () => {
            docPreloader.wrapperEl = document.createElement('div');
            sandbox.stub()

            docPreloader.hidePreload();
            docPreloader.wrapperEl.dispatchEvent(new Event('transitionend'));

            expect(stubs.cleanupPreload).to.be.called;
        });

        it('should clean up preload after scroll event', () => {
            docPreloader.wrapperEl = document.createElement('div');
            sandbox.stub()

            docPreloader.hidePreload();
            docPreloader.wrapperEl.dispatchEvent(new Event('scroll'));

            expect(stubs.cleanupPreload).to.be.called;
        });
    });

    describe('cleanupPreload()', () => {
        it('should remove wrapper, clear out preload and image element, and revoke object URL', () => {
            docPreloader.wrapperEl = document.createElement('div');
            docPreloader.preloadEl = document.createElement('div');
            docPreloader.imageEl = document.createElement('img');
            docPreloader.srcUrl = 'blah';
            containerEl.appendChild(docPreloader.wrapperEl);

            sandbox.mock(URL).expects('revokeObjectURL').withArgs(docPreloader.srcUrl);

            docPreloader.cleanupPreload();

            expect(docPreloader.preloadEl).to.be.undefined;
            expect(docPreloader.imageEl).to.be.undefined;
            expect(containerEl).to.not.contain(docPreloader.wrapperEl);
        });
    });

    describe('scaleAndShowPreload()', () => {
        beforeEach(() => {
            stubs.checkDocumentLoaded = sandbox.stub(docPreloader, 'checkDocumentLoaded');
            stubs.emit = sandbox.stub(docPreloader, 'emit');
            stubs.setDimensions = sandbox.stub(util, 'setDimensions');
            stubs.hideLoadingIndicator = sandbox.stub(docPreloader.previewUI, 'hideLoadingIndicator');
            docPreloader.imageEl = {};
            docPreloader.preloadEl = document.createElement('div');
        });

        it('should not do anything if document is loaded', () => {
            stubs.checkDocumentLoaded.returns(true);

            docPreloader.scaleAndShowPreload(1, 1, 1);

            expect(stubs.setDimensions).to.not.be.called;
            expect(stubs.hideLoadingIndicator).to.not.be.called;
        });

        it('should set preload image dimensions, hide loading indicator, show preload element, and emit preload event', () => {
            docPreloader.preloadEl.classList.add(CLASS_INVISIBLE);

            const width = 100;
            const height = 100;

            docPreloader.scaleAndShowPreload(width, height, 1);

            expect(stubs.setDimensions).to.be.calledWith(docPreloader.imageEl, width, height);
            expect(stubs.setDimensions).to.be.calledWith(docPreloader.overlayEl, width, height);
            expect(stubs.hideLoadingIndicator).to.be.called;
            expect(stubs.emit).to.be.calledWith('preload');
            expect(docPreloader.preloadEl).to.not.have.class(CLASS_INVISIBLE);
        });

        [5, 10, 11, 100].forEach((numPages) => {
            it('should create and set dimensions for numPages - 1 placeholders', () => {
                docPreloader.scaleAndShowPreload(100, 100, numPages);

                // Should scale 1 preload image, one overlay, and numPages - 1 placeholders
                expect(stubs.setDimensions).to.have.callCount(numPages + 1);

                // Should have numPages - 1 placeholder elements
                expect(docPreloader.preloadEl).to.have.length(numPages - 1);
            });
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind load event listener to image element', () => {
            docPreloader.imageEl = {
                addEventListener: sandbox.stub()
            };

            docPreloader.bindDOMListeners();

            expect(docPreloader.imageEl.addEventListener).to.be.calledWith('load', docPreloader.loadHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind load event listener to image element', () => {
            docPreloader.imageEl = {
                removeEventListener: sandbox.stub()
            };

            docPreloader.unbindDOMListeners();

            expect(docPreloader.imageEl.removeEventListener).to.be.calledWith('load', docPreloader.loadHandler);
        });
    });

    describe('restoreScrollPosition()', () => {
        it('should set the document scrollTop to be the same as the preload wrapper scrollTop', () => {
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

            // Check that fake pdf.js document is scrolled to same position
            expect(docEl.scrollTop).to.equal(50);
        });
    });

    describe('loadHandler()', () => {
        beforeEach(() => {
            stubs.readEXIF = sandbox.stub(docPreloader, 'readEXIF');
            stubs.getScaledDimensions = sandbox.stub(docPreloader, 'getScaledDimensions');
            stubs.scaleAndShowPreload = sandbox.stub(docPreloader, 'scaleAndShowPreload');
        });

        it('should not do anything if preload element or image element do not exist', () => {
            docPreloader.preloadEl = null;
            docPreloader.imageEl = {};
            docPreloader.loadHandler();

            expect(stubs.readEXIF).to.not.be.called;

            docPreloader.preloadEl = {};
            docPreloader.imageEl = null;
            docPreloader.loadHandler();

            expect(stubs.readEXIF).to.not.be.called;
        });

        it('should read EXIF, calculate scaled dimensions, and show preload', () => {
            const pdfWidth = 100;
            const pdfHeight = 100;
            const numPages = 10;
            stubs.readEXIF.returns(
                Promise.resolve({
                    pdfWidth,
                    pdfHeight,
                    numPages
                })
            );

            const scaledWidth = 200;
            const scaledHeight = 200;
            stubs.getScaledDimensions.returns({
                scaledWidth,
                scaledHeight
            });

            docPreloader.preloadEl = {};
            docPreloader.imageEl = {};
            return docPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).to.be.calledWith(pdfWidth, pdfHeight);
                expect(stubs.scaleAndShowPreload).to.be.calledWith(scaledWidth, scaledHeight, numPages);
            });
        });

        it('should only show up to NUM_PAGES_MAX pages', () => {
            const NUM_PAGES_MAX = 500;
            stubs.readEXIF.returns(
                Promise.resolve({
                    pdfWidth: 100,
                    pdfHeight: 100,
                    numPages: NUM_PAGES_MAX + 1 // NUM_PAGES_MAX + 1
                })
            );

            stubs.getScaledDimensions.returns({
                scaledWidth: 200,
                scaledHeight: 200
            });

            docPreloader.preloadEl = {};
            docPreloader.imageEl = {};
            return docPreloader.loadHandler().then(() => {
                expect(stubs.scaleAndShowPreload).to.be.calledWith(sinon.match.any, sinon.match.any, NUM_PAGES_MAX);
            });
        });

        it('should fall back to naturalWidth and naturalHeight if reading EXIF fails', () => {
            stubs.readEXIF.returns(Promise.reject());
            stubs.getScaledDimensions.returns({
                scaledWidth: 200,
                scaledHeight: 200
            });

            docPreloader.preloadEl = {};

            const naturalWidth = 100;
            const naturalHeight = 100;
            docPreloader.imageEl = {
                naturalWidth,
                naturalHeight
            };

            return docPreloader.loadHandler().then(() => {
                expect(stubs.getScaledDimensions).to.be.calledWith(naturalWidth, naturalHeight);
            });
        });
    });

    describe('readEXIF()', () => {
        let fakeImageEl;

        beforeEach(() => {
            fakeImageEl = {
                naturalWidth: 50,
                naturalHeight: 100
            };
        });

        it('should return a promise that eventually rejects if there is an error reading EXIF', () => {
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns('')
            };
            docPreloader.readEXIF(fakeImageEl)
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });

        it('should return a promise that eventually rejects if EXIF parser is not available', () => {
            window.EXIF = null;
            return docPreloader.readEXIF(fakeImageEl)
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });

        it('should return a promise that eventually rejects if num pages is not valid', () => {
            const pdfWidth = 100;
            const pdfHeight = 200;
            const numPages = 0;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map((c) => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns(exifRawArray)
            };

            return docPreloader.readEXIF(fakeImageEl)
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });

        it('should return a promise that eventually rejects if image dimensions are invalid', () => {
            const pdfWidth = 100;
            const pdfHeight = 1000;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map((c) => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns(exifRawArray)
            };

            return docPreloader.readEXIF(fakeImageEl)
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });

        it('should return a promise that eventually resolves with pdf width, height, and number of pages if EXIF is successfully read', () => {
            const pdfWidth = 100;
            const pdfHeight = 200;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map((c) => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns(exifRawArray)
            };

            return docPreloader.readEXIF(fakeImageEl)
                .then((response) => {
                    response.should.deep.equal({
                        pdfWidth: pdfWidth * PDFJS_CSS_UNITS,
                        pdfHeight: pdfHeight * PDFJS_CSS_UNITS,
                        numPages
                    });
                })
                .catch(() => Assert.fail());
        });

        it('should return a promise that eventually resolves with swapped pdf width and height if PDF data is rotated', () => {
            const pdfWidth = 200;
            const pdfHeight = 100;
            const numPages = 30;

            const exifRawArray = `pdfWidth:${pdfWidth}pts,pdfHeight:${pdfHeight}pts,numPages:${numPages}`
                .split('')
                .map((c) => c.charCodeAt(0));
            window.EXIF = {
                getData: (imageEl, func) => {
                    func();
                },
                getTag: sandbox.stub().returns(exifRawArray)
            };

            return docPreloader.readEXIF(fakeImageEl)
                .then((response) => {
                    response.should.deep.equal({
                        pdfWidth: pdfHeight * PDFJS_CSS_UNITS,
                        pdfHeight: pdfWidth * PDFJS_CSS_UNITS,
                        numPages
                    });
                })
                .catch(() => Assert.fail());
        });
    });

    describe('getScaledDimensions()', () => {
        beforeEach(() => {
            docPreloader.wrapperEl = document.createElement('div');
            containerEl.appendChild(docPreloader.wrapperEl);
        });

        it('should scale up to a max of 1.25', () => {
            const clientWidth = 500;
            const clientHeight = 500;
            docPreloader.wrapperEl.style.width = `${clientWidth}px`;
            docPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const scaledDimensions = docPreloader.getScaledDimensions(100, 100);

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
            docPreloader.wrapperEl.style.width = `${clientWidth}px`;
            docPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 1000;
            const pdfHeight = 600;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

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
            docPreloader.wrapperEl.style.width = `${clientWidth}px`;
            docPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 1000;
            const pdfHeight = 500;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

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
            docPreloader.wrapperEl.style.width = `${clientWidth}px`;
            docPreloader.wrapperEl.style.height = `${clientHeight}px`;

            const pdfWidth = 500;
            const pdfHeight = 1000;
            const scaledDimensions = docPreloader.getScaledDimensions(pdfWidth, pdfHeight);

            // Expect width scale to be used
            const expectedScale = (clientWidth - 40) / pdfWidth;
            expect(scaledDimensions).to.deep.equal({
                scaledWidth: Math.floor(expectedScale * pdfWidth),
                scaledHeight: Math.floor(expectedScale * pdfHeight)
            });
        });
    });

    describe('checkDocumentLoaded()', () => {
        beforeEach(() => {
            docPreloader.containerEl = document.createElement('div');
        });

        it('should hide preload and return true if container element does have loaded class', () => {
            docPreloader.containerEl.classList.add(CLASS_PREVIEW_LOADED);
            sandbox.mock(docPreloader).expects('hidePreload');
            expect(docPreloader.checkDocumentLoaded()).to.be.true;
        });

        it('should return false if container element does not have loaded class', () => {
            expect(docPreloader.checkDocumentLoaded()).to.be.false;
        });
    });
});
