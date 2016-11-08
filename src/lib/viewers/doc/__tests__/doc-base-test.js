/* eslint-disable no-unused-expressions */
import DocBase from '../doc-base';
import Browser from '../../../browser';
import Base from '../../base';
import cache from '../../../cache';
import Controls from '../../../controls';
import fullscreen from '../../../fullscreen';
import * as util from '../../../util';


import { CLASS_BOX_PREVIEW_FIND_BAR } from '../../../constants';

const LOAD_TIMEOUT_MS = 300000; // 5 min timeout
const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const SCROLL_END_TIMEOUT = 500;


const sandbox = sinon.sandbox.create();
let docBase;
let containerEl;
let stubs = {};

describe('doc-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/doc-base-test.html');

        containerEl = document.querySelector('.container');
        const options = {
            viewerName: 'docBaseViewer',
            file: {
                id: 0
            }
        };
        docBase = new DocBase(containerEl, options);
    });

    afterEach(() => {
        docBase.pdfViewer = undefined;
        docBase.destroy();
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        it('should correctly set a doc element, viewer element, and a timeout', () => {
            expect(docBase.docEl.classList.contains('box-preview-doc')).to.be.true;
            expect(docBase.docEl.parentNode).to.deep.equal(docBase.containerEl);

            expect(docBase.viewerEl.classList.contains('pdfViewer')).to.be.true;
            expect(docBase.viewerEl.parentNode).to.equal(docBase.docEl);

            expect(docBase.loadTimeout).to.equal(LOAD_TIMEOUT_MS);
        });

        it('should correctly set the find bar', () => {
            expect(docBase.findBarEl.classList.contains(CLASS_BOX_PREVIEW_FIND_BAR)).to.be.true;
            expect(docBase.docEl.parentNode).to.deep.equal(docBase.containerEl);
        });
    });

    describe('destroy()', () => {
        it('should unbind listeners and clear the print blob', () => {
            const unbindDOMListenersStub = sandbox.stub(docBase, 'unbindDOMListeners');

            docBase.destroy();
            expect(unbindDOMListenersStub).to.be.called;
            expect(docBase.printBlob).to.equal(null);
        });

        it('should destroy the controls', () => {
            docBase.controls = {
                destroy: sandbox.stub()
            };

            docBase.destroy();
            expect(docBase.controls.destroy).to.be.called;
        });

        it('should remove listeners and destroy the annotator', () => {
            docBase.annotator = {
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };

            docBase.destroy();
            expect(docBase.annotator.destroy).to.be.called;
            expect(docBase.annotator.removeAllListeners).to.be.called.twice;
        });

        it('should destroy the find bar', () => {
            docBase.findBar = {
                destroy: sandbox.stub()
            };

            docBase.destroy();
            expect(docBase.findBar.destroy).to.be.called;
        });

        it('should clean up the PDF network requests', () => {
            docBase.pdfLoadingTask = {
                destroy: sandbox.stub()
            };

            docBase.destroy();
            expect(docBase.pdfLoadingTask.destroy).to.be.called;
        });

        it('should clean up the viewer and the document object', () => {
            docBase.pdfViewer = {
                cleanup: sandbox.stub(),
                pdfDocument: {
                    destroy: sandbox.stub()
                }
            };

            docBase.destroy();
            expect(docBase.pdfViewer.cleanup).to.be.called;
            expect(docBase.pdfViewer.pdfDocument.destroy).to.be.called;
        });
    });

    describe('load()', () => {
        it('should load a document', () => {
            const url = 'test';
            const setupPdfjsStub = sandbox.stub(docBase, 'setupPdfjs');
            const initViewerStub = sandbox.stub(docBase, 'initViewer');
            const initPrintStub = sandbox.stub(docBase, 'initPrint');
            const initFindStub = sandbox.stub(docBase, 'initFind');
            Object.defineProperty(Object.getPrototypeOf(DocBase.prototype), 'load', {
                value: sandbox.stub()
            });

            docBase.load(url);
            expect(docBase.pdfUrl).to.equal(url);
            expect(setupPdfjsStub).to.be.called;
            expect(initViewerStub).to.be.calledWith(url);
            expect(initPrintStub).to.be.called;
            expect(initFindStub).to.be.called;


            expect(Base.prototype.load).to.be.called;
        });
    });

    describe('initFind()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                setFindController: sandbox.stub()
            };
        });

        it('should create and set a new findController', () => {
            docBase.initFind();
            expect(docBase.pdfViewer.setFindController).to.be.called;
        });

        it('should do nothing if there is no find bar element', () => {
            docBase.findBarEl = null;

            docBase.initFind();
            expect(docBase.pdfViewer.setFindController).to.not.be.called;
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.fetchPrintBlob = sandbox.stub(docBase, 'fetchPrintBlob').returns({ then: () => {} });
            stubs.emit = sandbox.stub(docBase, 'emit');
            stubs.createObject = sandbox.stub(URL, 'createObjectURL');
            stubs.open = sandbox.stub(window, 'open').returns(false);
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Chrome');
            stubs.revokeObjectURL = sandbox.stub(URL, 'revokeObjectURL');
            stubs.printResult = { print: sandbox.stub(), addEventListener: sandbox.stub() };
            docBase.printBlob = true;
            window.navigator.msSaveOrOpenBlob = sandbox.stub().returns(true);
        });

        it('should fetch the print blob if it is not ready', () => {
            docBase.printBlob = false;

            docBase.print();
            expect(stubs.fetchPrintBlob).to.be.called;
        });

        it('should use the open or save dialog if on IE or Edge', () => {
            docBase.print();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should use the open or save dialog if on IE or Edge and emit a message', () => {
            docBase.print();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should emit an error message if the print result fails on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob.returns(false);

            docBase.print();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.calledWith('printerror');
        });

        it('should open the pdf in a new tab if not on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob = undefined;

            docBase.print();
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.called.with;
            expect(stubs.emit).to.be.called;
        });

        it('should print on load in the chrome browser', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);


            docBase.print();
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.called.with;
            expect(stubs.browser).to.be.called;
            expect(stubs.emit).to.be.called;
            expect(stubs.revokeObjectURL).to.be.called;
        });

        it('should use a timeout in safari', () => {
            let clock = sinon.useFakeTimers();
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);
            stubs.browser.returns('Safari');

            docBase.print();
            clock.tick(PRINT_TIMEOUT_MS + 1);
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.called;
            expect(stubs.browser).to.be.called;
            expect(stubs.printResult.print).to.be.called;
            expect(stubs.emit).to.be.called;

            clock = undefined;
        });
    });

    describe('resize()', () => {
        it('should update the pdfViewer and reset the page', () => {
            docBase.pdfViewer = {
                update: sandbox.stub(),
                currentScaleValue: 0,
                currentPageNumber: 0
            };
            const setPageStub = sandbox.stub(docBase, 'setPage');
            Object.defineProperty(Object.getPrototypeOf(DocBase.prototype), 'resize', {
                value: sandbox.stub()
            });

            docBase.resize();
            expect(docBase.pdfViewer.update).to.be.called;
            expect(setPageStub).to.be.called;
            expect(Base.prototype.resize).to.be.called;
        });

        it('should set the annotator scale if it exists', () => {
            docBase.pdfViewer = {
                currentPageNumber: 0,
                update: sandbox.stub()
            };
            const setPageStub = sandbox.stub(docBase, 'setPage');
            docBase.annotator = {
                setScale: sandbox.stub()
            };

            docBase.resize();
            expect(docBase.annotator.setScale).to.be.called;
            expect(setPageStub).to.be.called;
        });
    });

    describe('Page Methods', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                currentPageNumber: 1
            };
            stubs.cachePage = sandbox.stub(docBase, 'cachePage');
        });

        describe('previousPage()', () => {
            it('should call setPage', () => {
                const setPageStub = sandbox.stub(docBase, 'setPage');

                docBase.previousPage();
                expect(setPageStub).to.be.calledWith(0);
            });
        });

        describe('nextPage()', () => {
            it('should call setPage', () => {
                docBase.pdfViewer = {
                    currentPageNumber: 0
                };
                const setPageStub = sandbox.stub(docBase, 'setPage');

                docBase.nextPage();
                expect(setPageStub).to.be.calledWith(1);
            });
        });

        describe('setPage()', () => {
            it('should set the pdfViewer\'s page and cache it', () => {
                docBase.pdfViewer = {
                    currentPageNumber: 1,
                    pagesCount: 3
                };

                docBase.setPage(2);

                expect(docBase.pdfViewer.currentPageNumber).to.equal(2);
                expect(stubs.cachePage).to.be.called;
            });

            it('should not do anything if setting an invalid page', () => {
                docBase.pdfViewer = {
                    currentPageNumber: 1,
                    pagesCount: 3
                };

                // Too low
                docBase.setPage(0);

                expect(docBase.pdfViewer.currentPageNumber).to.equal(1);
                expect(stubs.cachePage).to.not.be.called;

                // Too high
                docBase.setPage(4);
                expect(docBase.pdfViewer.currentPageNumber).to.equal(1);
                expect(stubs.cachePage).to.not.be.called;
            });
        });
    });

    describe('getCachedPage()', () => {
        beforeEach(() => {
            stubs.has = sandbox.stub(cache, 'has').returns(true);
            stubs.get = sandbox.stub(cache, 'get').returns({ 0: 10 });
        });

        it('should return the cached current page if present', () => {
            docBase.options = {
                file: {
                    id: 0
                }
            };

            const page = docBase.getCachedPage();
            expect(stubs.has).to.be.called;
            expect(stubs.get).to.be.called;
            expect(page).to.equal(10);
        });

        it('should return the first page if the current page is not cached', () => {
            stubs.has.returns(false);

            const page = docBase.getCachedPage();
            expect(stubs.has).to.be.called;
            expect(page).to.equal(1);
        });
    });

    describe('cachePage()', () => {
        beforeEach(() => {
            docBase.options = {
                file: {
                    id: 0
                }
            };
            stubs.has = sandbox.stub(cache, 'has').returns(true);
            stubs.get = sandbox.stub(cache, 'get').returns({ 0: 10 });
            stubs.set = sandbox.stub(cache, 'set').returns({ 0: 10 });
        });

        it('should get the current page map if it does not exist and cache the given page', () => {
            docBase.cachePage(10);
            expect(stubs.has).to.be.called;
            expect(stubs.get).to.be.called;
            expect(stubs.set).to.be.called;
        });

        it('should use the current page map if it exists', () => {
            stubs.has.returns(false);

            docBase.cachePage(10);
            expect(stubs.has).to.be.called;
            expect(stubs.get).to.not.be.called;
            expect(stubs.set).to.be.called;
        });
    });

    describe('checkPaginationButtons()', () => {
        beforeEach(() => {
            const pageNumButtonEl = document.createElement('div');
            pageNumButtonEl.className = 'box-preview-doc-page-num';
            pageNumButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(pageNumButtonEl);

            const previousPageButtonEl = document.createElement('div');
            previousPageButtonEl.className = 'box-preview-previous-page';
            previousPageButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(previousPageButtonEl);

            const nextPageButtonEl = document.createElement('div');
            nextPageButtonEl.className = 'box-preview-next-page';
            nextPageButtonEl.disabled = undefined;
            docBase.containerEl.appendChild(nextPageButtonEl);

            docBase.pdfViewer = {
                pagesCount: 0,
                currentPageNumber: 1
            };

            stubs.pageNumButtonEl = pageNumButtonEl;
            stubs.previousPageButtonEl = previousPageButtonEl;
            stubs.nextPageButtonEl = nextPageButtonEl;
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Safari');
            stubs.fullscreen = sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        afterEach(() => {
            docBase.containerEl.innerHTML = '';
            docBase.pdfViewer = undefined;
        });

        it('should disable/enable page number button el based on current page and browser type', () => {
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.pagesCount = 6;
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(true);

            stubs.fullscreen.returns('false');
            stubs.browser.returns('Chrome');
            docBase.checkPaginationButtons();
            expect(stubs.pageNumButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable previous page button el based on current page', () => {
            docBase.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.currentPageNumber = 20;
            docBase.checkPaginationButtons();
            expect(stubs.previousPageButtonEl.disabled).to.equal(false);
        });

        it('should disable/enable next page button el based on current page', () => {
            docBase.pdfViewer.currentPageNumber = 20;
            docBase.pdfViewer.pagesCount = 20;

            docBase.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).to.equal(true);

            docBase.pdfViewer.currentPageNumber = 1;
            docBase.checkPaginationButtons();
            expect(stubs.nextPageButtonEl.disabled).to.equal(false);
        });
    });

    describe('zoom methods', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                currentScale: 5
            };
            stubs.setScale = sandbox.stub(docBase, 'setScale');
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        afterEach(() => {
            docBase.pdfViewer = undefined;
        });

        describe('zoomIn()', () => {
            it('should zoom in until it hits the number of ticks or the max scale', () => {
                docBase.zoomIn(10);
                expect(stubs.setScale).to.be.calledWith(MAX_SCALE);

                docBase.pdfViewer.currentScale = 1;
                docBase.zoomIn(1);
                expect(stubs.setScale).to.be.calledWith(DEFAULT_SCALE_DELTA);
            });

            it('should emit the zoom event', () => {
                docBase.zoomIn(1);
                expect(stubs.emit).to.be.calledWith('zoom');
            });

            it('should not emit the zoom event if we can\'t zoom in', () => {
                docBase.pdfViewer.currentScale = MAX_SCALE;

                docBase.zoomIn(1);
                expect(stubs.emit).to.not.be.calledWith('zoom');
            });
        });

        describe('zoomOut()', () => {
            it('should zoom out until it hits the number of ticks or the min scale', () => {
                docBase.pdfViewer.currentScale = 1;

                docBase.zoomOut(10);
                expect(stubs.setScale).to.be.calledWith(MIN_SCALE);

                docBase.pdfViewer.currentScale = DEFAULT_SCALE_DELTA;
                docBase.zoomOut(1);
                expect(stubs.setScale).to.be.calledWith(1);
            });

            it('should emit the zoom event', () => {
                docBase.zoomOut(1);
                expect(stubs.emit).to.be.calledWith('zoom');
            });

            it('should not emit the zoom event if we can\'t zoom out', () => {
                docBase.pdfViewer.currentScale = MIN_SCALE;

                docBase.zoomOut(1);
                expect(stubs.emit).to.not.be.calledWith('zoom');
            });
        });
    });

    describe('setScale()', () => {
        it('should set the pdf viewer and the annotator\'s scale if it exists', () => {
            docBase.annotator = {
                setScale: sandbox.stub()
            };
            docBase.pdfViewer = {
                currentScaleValue: 0
            };
            const newScale = 5;

            docBase.setScale(newScale);
            expect(docBase.annotator.setScale).to.be.calledWith(newScale);
            expect(docBase.pdfViewer.currentScaleValue).to.equal(newScale);
        });
    });

    describe('rotateLeft()', () => {
        it('should set the pdf viewer rotation, update the viewer, and reset the page', () => {
            docBase.pdfViewer = {
                currentPageNumber: 1,
                update: sandbox.stub()
            };
            const setPageStub = sandbox.stub(docBase, 'setPage');
            const rotation = 180;

            docBase.rotateLeft(rotation);
            expect(setPageStub).to.be.called;
            expect(docBase.pdfViewer.update).to.be.called;
            expect(docBase.pdfViewer.pagesRotation).to.equal(rotation);
        });
    });

    describe('isAnnotatable()', () => {
        beforeEach(() => {
            docBase.options = {
                viewerName: 'doc',
                viewers: {
                    doc: {
                        annotations: true
                    }
                },
                file: {
                    id: 0
                }
            };
        });

        it('should return false if the type is not a point or a highlight', () => {
            expect(docBase.isAnnotatable('drawing')).to.equal(false);
        });

        it('should return annotations value of a specific viewer if specified', () => {
            expect(docBase.isAnnotatable('point')).to.equal(true);

            docBase.options.viewers.doc.annotations = false;
            expect(docBase.isAnnotatable('point')).to.equal(false);
        });

        it('should use the global show annotationsBoolean if the viewer param is not specified', () => {
            docBase.options.viewerName = 'image';
            docBase.options.showAnnotations = true;

            expect(docBase.isAnnotatable('point')).to.equal(true);

            docBase.options.showAnnotations = false;
            expect(docBase.isAnnotatable('highlight')).to.equal(false);
        });
    });

    describe('getPointModeClickHandler()', () => {
        beforeEach(() => {
            stubs.isAnnotatable = sandbox.stub(docBase, 'isAnnotatable').returns(false);
        });

        it('should return null if you cannot annotate', () => {
            const handler = docBase.getPointModeClickHandler();
            expect(stubs.isAnnotatable).to.be.called;
            expect(handler).to.equal(null);
        });

        it('should return the toggle point mode handler', () => {
            stubs.isAnnotatable.returns(true);
            docBase.annotator = {
                togglePointModeHandler: 'handler'
            };

            const handler = docBase.getPointModeClickHandler();
            expect(stubs.isAnnotatable).to.be.called;
            expect(handler).to.equal('handler');
        });
    });

    describe('onKeyDown()', () => {
        beforeEach(() => {
            stubs.previousPage = sandbox.stub(docBase, 'previousPage');
            stubs.nextPage = sandbox.stub(docBase, 'nextPage');
        });

        it('should call the correct method and return true if the binding exists', () => {
            const arrowLeft = docBase.onKeydown('ArrowLeft');
            expect(stubs.previousPage).to.be.called.once;
            expect(arrowLeft).to.equal(true);

            const arrowRight = docBase.onKeydown('ArrowRight');
            expect(stubs.nextPage).to.be.called.once;
            expect(arrowRight).to.equal(true);

            const leftBracket = docBase.onKeydown('[');
            expect(stubs.previousPage).to.be.called.once;
            expect(leftBracket).to.equal(true);

            const rightBracket = docBase.onKeydown(']');
            expect(stubs.nextPage).to.be.called.once;
            expect(rightBracket).to.equal(true);
        });

        it('should return false if there is no match', () => {
            const arrowLeft = docBase.onKeydown('ArrowUp');
            expect(stubs.previousPage).to.not.be.called;
            expect(stubs.nextPage).to.not.be.called;
            expect(arrowLeft).to.equal(false);
        });
    });

    describe('initViewer()', () => {
        beforeEach(() => {
            stubs.pdfViewer = {
                linkService: new PDFJS.PDFLinkService(),
                setDocument: sandbox.stub()
            };
            stubs.pdfViewer.linkService.setDocument = sandbox.stub();
            stubs.pdfViewerStub = sandbox.stub(PDFJS, 'PDFViewer').returns(stubs.pdfViewer);
            stubs.auth = sandbox.stub(docBase, 'appendAuthHeader');
            stubs.bindDOMListeners = sandbox.stub(docBase, 'bindDOMListeners');
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        it('should resolve the loading task and set the document/viewer', () => {
            const doc = {
                url: 'url'
            };
            const promise = Promise.resolve(doc);
            const getDocumentStub = sandbox.stub(PDFJS, 'getDocument').returns(
                promise
            );

            docBase.initViewer('url');
            expect(stubs.pdfViewerStub).to.be.called;
            expect(getDocumentStub).to.be.called;
            expect(stubs.auth).to.be.called;
            expect(stubs.bindDOMListeners).to.be.called;

            return promise.then(() => {
                expect(stubs.pdfViewer.setDocument).to.be.called;
                expect(stubs.pdfViewer.linkService.setDocument).to.be.called;
            });
        });
    });

    describe('setupPdfjs()', () => {
        beforeEach(() => {
            stubs.urlCreator = sandbox.stub(util, 'createAssetUrlCreator').returns(() => { return 'asset'; });
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Safari');
            docBase.options = {
                location: {
                    staticBaseURI: 'test/'
                },
                file: {
                    watermark_info: {
                        is_watermarked: false
                    },
                    permissions: {
                        can_download: undefined
                    }
                }
            };

            PDFJS.disableRange = false;
        });

        it('should create the asset url', () => {
            docBase.setupPdfjs();
            expect(PDFJS.workerSrc).to.equal('asset');
        });

        it('should set external link settings', () => {
            docBase.setupPdfjs();
            expect(PDFJS.externalLinkTarget).to.equal(PDFJS.LinkTarget.BLANK);
            expect(PDFJS.externalLinkRel).to.equal('noopener noreferrer');
        });

        it('should disable range requests if the browser is Mobile Safari', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.true;
        });

        it('should disable range requests if the file is watermarked', () => {
            // file is watermarked
            stubs.browser.returns('Chrome');
            docBase.options.file.watermark_info.is_watermarked = true;

            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.true;
        });

        it('should enable range requests if the file and browser meet the conditions', () => {
            stubs.browser.returns('Chrome');

            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.false;
        });

        it('should disable or enable text layer based on download permissions', () => {
            docBase.options.file.permissions.can_download = true;

            docBase.setupPdfjs();
            expect(PDFJS.disableTextLayer).to.be.false;

            docBase.options.file.permissions.can_download = false;

            docBase.setupPdfjs();
            expect(PDFJS.disableTextLayer).to.be.true;
        });
    });

    describe('initPrint()', () => {
        it('should add the print notification element', () => {
            docBase.initPrint();

            const printNotificationEl = document.getElementsByClassName('box-preview-print-notification')[0];
            expect(printNotificationEl.parentNode).to.equal(docBase.containerEl);
        });
    });

    describe('initAnnotations()', () => {
        beforeEach(() => {
            docBase.options = {
                file: {
                    file_version: {
                        id: 0
                    },
                    permissions: {
                        can_annotate: true
                    }
                },
                location: {
                    locale: 'en-US'
                }
            };
            docBase.pdfViewer = {
                currentScale: 1
            };
            stubs.browser = sandbox.stub(Browser, 'isMobile').returns(false);
        });

        it('should allow annotations based on browser and permissions', () => {
            docBase.initAnnotations();
            expect(docBase.annotator._annotationService._canAnnotate).to.be.true;

            stubs.browser.returns(true);
            docBase.initAnnotations();
            expect(docBase.annotator._annotationService._canAnnotate).to.be.false;

            stubs.browser.returns(false);
            docBase.options.file.permissions.can_annotate = false;
            docBase.initAnnotations();
            expect(docBase.annotator._annotationService._canAnnotate).to.be.false;
        });
    });

    describe('initPageNumEl()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                pagesCount: 5
            };
            stubs.totalPageEl = {
                textContent: 0
            };
            stubs.querySelector = {
                querySelector: sandbox.stub().returns(stubs.totalPageEl)
            };
            docBase.controls = {
                controlsEl: {
                    querySelector: sandbox.stub().returns(stubs.querySelector)
                }
            };
        });

        it('should set the text content on the total page element', () => {
            docBase.initPageNumEl();

            expect(docBase.controls.controlsEl.querySelector).to.be.called;
            expect(stubs.querySelector.querySelector).to.be.called;
            expect(stubs.totalPageEl.textContent).to.equal(5);
        });

        it('should keep track of the page number input and current page elements', () => {
            docBase.initPageNumEl();

            expect(docBase.pageNumInputEl).to.equal(stubs.totalPageEl);
            expect(docBase.currentPageEl).to.equal(stubs.totalPageEl);
        });
    });

    describe('fetchPrintBlob()', () => {
        it('should get and return the blob', () => {
            const authStub = sandbox.stub(docBase, 'appendAuthHeader');
            const getStub = sandbox.stub(util, 'get').returns({
                then: () => { docBase.printBlob = 'blob'; }
            });

            docBase.fetchPrintBlob('url');
            expect(getStub).to.be.called;
            expect(authStub).to.be.called;
            expect(docBase.printBlob).to.equal('blob');
        });
    });

    describe('loadUI()', () => {
        it('should set controls, bind listeners, and init the page number element', () => {
            const bindControlListenersStub = sandbox.stub(docBase, 'bindControlListeners');
            const initPageNumElStub = sandbox.stub(docBase, 'initPageNumEl');

            docBase.loadUI();
            expect(bindControlListenersStub).to.be.called;
            expect(initPageNumElStub).to.be.called;
            expect(docBase.controls instanceof Controls).to.be.true;
        });
    });

    describe('showPageNumInput()', () => {
        it('should set the page number input value, focus, select, and add listeners', () => {
            docBase.controls = {
                controlsEl: {
                    classList: {
                        add: sandbox.stub()
                    }
                }
            };
            docBase.currentPageEl = 0;
            docBase.pageNumInputEl = {
                value: 0,
                focus: sandbox.stub(),
                select: sandbox.stub(),
                addEventListener: sandbox.stub()
            };

            docBase.showPageNumInput();
            expect(docBase.pageNumInputEl.focus).to.be.called;
            expect(docBase.pageNumInputEl.select).to.be.called;
            expect(docBase.pageNumInputEl.addEventListener).to.be.called.twice;
        });
    });

    describe('hidePageNumInput()', () => {
        it('should hide the input class and remove event listeners', () => {
            docBase.controls = {
                controlsEl: {
                    classList: {
                        remove: sandbox.stub()
                    }
                }
            };
            docBase.pageNumInputEl = {
                removeEventListener: sandbox.stub()
            };

            docBase.hidePageNumInput();
            expect(docBase.controls.controlsEl.classList.remove).to.be.called;
            expect(docBase.pageNumInputEl.removeEventListener).to.be.called;
        });
    });

    describe('updateCurrentPage()', () => {
        it('should only update the page to a valid value', () => {
            docBase.pdfViewer = {
                pagesCount: 10
            };
            docBase.pageNumInputEl = {
                value: 1,
                textContent: 1
            };
            const checkPaginationButtonsStub = sandbox.stub(docBase, 'checkPaginationButtons');

            docBase.updateCurrentPage(-5);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(1);

            docBase.updateCurrentPage(25);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(10);

            docBase.updateCurrentPage(7);
            expect(checkPaginationButtonsStub).to.be.called;
            expect(docBase.pageNumInputEl.value).to.equal(7);
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            stubs.addEventListener = sandbox.stub(docBase.docEl, 'addEventListener');
            stubs.addListener = sandbox.stub(fullscreen, 'addListener');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile');
            stubs.isIOS = sandbox.stub(Browser, 'isIOS');
        });

        it('should add the correct listeners', () => {
            stubs.isMobile.returns(false);

            docBase.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('pagesinit', docBase.pagesinitHandler);
            expect(stubs.addEventListener).to.be.calledWith('pagerendered', docBase.pagerenderedHandler);
            expect(stubs.addEventListener).to.be.calledWith('textlayerrendered', docBase.textlayerrenderedHandler);
            expect(stubs.addEventListener).to.be.calledWith('pagechange', docBase.pagechangeHandler);
            expect(stubs.addEventListener).to.be.calledWith('scroll');


            expect(stubs.addEventListener).to.not.be.calledWith('gesturestart', docBase.mobileZoomStartHandler);
            expect(stubs.addEventListener).to.not.be.calledWith('gestureend', docBase.mobileZoomEndHandler);

            expect(stubs.addListener).to.be.calledWith('enter', docBase.enterfullscreenHandler);
            expect(stubs.addListener).to.be.calledWith('exit', docBase.exitfullscreenHandler);
        });

        it('should add gesture listeners if the browser is iOS', () => {
            stubs.isMobile.returns(true);
            stubs.isIOS.returns(true);

            docBase.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('gesturestart', docBase.mobileZoomStartHandler);
            expect(stubs.addEventListener).to.be.calledWith('gestureend', docBase.mobileZoomEndHandler);
        });

        it('should add the touch event listeners if the browser is not iOS', () => {
            stubs.isMobile.returns(true);
            stubs.isIOS.returns(false);

            docBase.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('touchstart', docBase.mobileZoomStartHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchmove', docBase.mobileZoomChangeHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchend', docBase.mobileZoomEndHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = sandbox.stub(docBase.docEl, 'removeEventListener');
            stubs.removeFullscreenListener = sandbox.stub(fullscreen, 'removeListener');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile');
            stubs.isIOS = sandbox.stub(Browser, 'isIOS');
        });

        it('should remove the doc element listeners if the doc element exists', () => {
            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('pagesinit', docBase.pagesinitHandler);
            expect(stubs.removeEventListener).to.be.calledWith('pagerendered', docBase.pagerenderedHandler);
            expect(stubs.removeEventListener).to.be.calledWith('textlayerrendered', docBase.textlayerrenderedHandler);
            expect(stubs.removeEventListener).to.be.calledWith('pagechange', docBase.pagechangeHandler);
            expect(stubs.removeEventListener).to.be.calledWith('scroll');
        });

        it('should not remove the doc element listeners if the doc element does not exist', () => {
            const docElTemp = docBase.docEl;
            docBase.docEl = null;

            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.not.be.called;

            docBase.docEl = docElTemp;
        });

        it('should remove the fullscreen listener', () => {
            docBase.unbindDOMListeners();
            expect(stubs.removeFullscreenListener).to.be.calledWith('enter', docBase.enterfullscreenHandler);
            expect(stubs.removeFullscreenListener).to.be.calledWith('exit', docBase.exitfullscreenHandler);
        });

        it('should remove gesture listeners if the browser is iOS', () => {
            stubs.isMobile.returns(true);
            stubs.isIOS.returns(true);

            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('gesturestart', docBase.mobileZoomStartHandler);
            expect(stubs.removeEventListener).to.be.calledWith('gestureend', docBase.mobileZoomEndHandler);
        });

        it('should remove the touch event listeners if the browser is not iOS', () => {
            stubs.isMobile.returns(true);
            stubs.isIOS.returns(false);

            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('touchstart', docBase.mobileZoomStartHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchmove', docBase.mobileZoomChangeHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchend', docBase.mobileZoomEndHandler);
        });
    });

    describe('pageNumInputBlurHandler()', () => {
        beforeEach(() => {
            docBase.event = {
                target: {
                    value: 5
                }
            };
            stubs.setPageStub = sandbox.stub(docBase, 'setPage');
            stubs.hidePageNumInputStub = sandbox.stub(docBase, 'hidePageNumInput');
        });

        it('should hide the page number input and set the page if given valid input', () => {
            docBase.pageNumInputBlurHandler(docBase.event);
            expect(stubs.setPageStub).to.be.calledWith(docBase.event.target.value);
            expect(stubs.hidePageNumInputStub).to.be.called;
        });

        it('should hide the page number input but not set the page if given invalid input', () => {
            docBase.event.target.value = 'not a number';

            docBase.pageNumInputBlurHandler(docBase.event);
            expect(stubs.setPageStub).to.not.be.called;
            expect(stubs.hidePageNumInputStub).to.be.called;
        });
    });

    describe('pageNumInputKeydownHandler()', () => {
        beforeEach(() => {
            docBase.event = {
                key: 'Enter',
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub(),
                target: {
                    blur: sandbox.stub()
                }
            };
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Explorer');
            stubs.focus = sandbox.stub(docBase.docEl, 'focus');
            stubs.hidePageNumInput = sandbox.stub(docBase, 'hidePageNumInput');
        });

        it('should focus the doc element if IE and stop default actions on \'enter\'', () => {
            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.browser).to.be.called;
            expect(stubs.focus).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });

        it('should blur if not IE and stop default actions on \'enter\'', () => {
            stubs.browser.returns('Chrome');

            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.browser).to.be.called;
            expect(docBase.event.target.blur).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });

        it('should hide the page number input, focus the document, and stop default actions on \'Esc\'', () => {
            docBase.event.key = 'Esc';

            docBase.pageNumInputKeydownHandler(docBase.event);
            expect(stubs.hidePageNumInput).to.be.called;
            expect(stubs.focus).to.be.called;
            expect(docBase.event.stopPropagation).to.be.called;
            expect(docBase.event.preventDefault).to.be.called;
        });
    });

    describe('pagesinitHandler()', () => {
        beforeEach(() => {
            stubs.isAnnotatable = sandbox.stub(docBase, 'isAnnotatable');
            stubs.initAnnotations = sandbox.stub(docBase, 'initAnnotations');
            stubs.loadUI = sandbox.stub(docBase, 'loadUI');
            stubs.checkPaginationButtons = sandbox.stub(docBase, 'checkPaginationButtons');
            stubs.setPage = sandbox.stub(docBase, 'setPage');
            stubs.getCachedPage = sandbox.stub(docBase, 'getCachedPage');
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        it('should init annotations if annotatable', () => {
            stubs.isAnnotatable.returns(true);
            docBase.pdfViewer = {
                currentScale: 'unknown'
            };

            docBase.pagesinitHandler();
            expect(stubs.initAnnotations).to.be.called;
        });

        it('should load UI, check the pagination buttons, and set the page', () => {
            stubs.isAnnotatable.returns(false);
            docBase.pdfViewer = {
                currentScale: 'unknown'
            };

            docBase.pagesinitHandler();
            expect(stubs.initAnnotations).to.not.be.called;
            expect(stubs.loadUI).to.be.called;
            expect(stubs.checkPaginationButtons).to.be.called;
            expect(stubs.setPage).to.be.called;
        });

        it('should broadcast that the preview is loaded if it has\'nt already', () => {
            stubs.isAnnotatable.returns(false);
            docBase.pdfViewer = {
                currentScale: 'unknown'
            };
            docBase.loaded = false;

            docBase.pagesinitHandler();
            expect(stubs.emit).to.be.calledWith('load');
            expect(docBase.loaded).to.be.truthy;
        });
    });

    describe('pagerenderedHandler()', () => {
        beforeEach(() => {
            docBase.annotator = {
                renderAnnotationsOnPage: sandbox.stub(),
                renderAnnotations: sandbox.stub()
            };
            docBase.event = {
                detail: {
                    pageNumber: 1
                }
            };
            stubs.textlayerrenderedHandler = sandbox.stub(docBase, 'textlayerrenderedHandler');
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        it('should emit the pagerender event', () => {
            docBase.pagerenderedHandler(docBase.event);
            expect(stubs.emit).to.be.calledWith('pagerender');
        });

        it('should render annotations on a page if the annotator and event page are specified', () => {
            docBase.pagerenderedHandler(docBase.event);
            expect(docBase.annotator.renderAnnotationsOnPage).to.be.calledWith(docBase.event.detail.pageNumber);
        });

        it('should render annotations all annotations if the annotator but not the page is specified', () => {
            docBase.event.detail = undefined;

            docBase.pagerenderedHandler(docBase.event);
            expect(docBase.annotator.renderAnnotations).to.be.called;
        });

        it('should show annotations even if the text layer is disabled', () => {
            PDFJS.disableTextLayer = true;

            docBase.pagerenderedHandler(docBase.event);
            expect(stubs.textlayerrenderedHandler).to.be.called;
        });
    });

    describe('textlayerrenderedHandler()', () => {
        beforeEach(() => {
            docBase.annotator = {
                showAnnotations: sandbox.stub()
            };
        });

        it('should do nothing if the annotator does not exist or if the annotations are loaded', () => {
            docBase.annotationsLoaded = true;

            docBase.textlayerrenderedHandler();
            expect(docBase.annotator.showAnnotations).to.not.be.called;

            docBase.annotationsLoaded = false;
            docBase.annotator = false;
            docBase.textlayerrenderedHandler();
            expect(docBase.annotationsLoaded).to.equal(false);
        });

        it('should show annotations and set them as loaded', () => {
            docBase.annotationsLoaded = false;

            docBase.textlayerrenderedHandler();
            expect(docBase.annotator.showAnnotations).to.be.called;
            expect(docBase.annotationsLoaded).to.be.true;
        });
    });

    describe('pagechangeHandler()', () => {
        beforeEach(() => {
            stubs.updateCurrentPage = sandbox.stub(docBase, 'updateCurrentPage');
            stubs.cachePage = sandbox.stub(docBase, 'cachePage');
            stubs.emit = sandbox.stub(docBase, 'emit');
            docBase.event = {
                pageNumber: 1
            };
            docBase.pdfViewer = {
                pageCount: 1
            };
        });

        it('should emit the pagefocus event', () => {
            docBase.pagechangeHandler(docBase.event);

            expect(stubs.emit).to.be.calledWith('pagefocus');
        });

        it('should update the current page', () => {
            docBase.pagechangeHandler(docBase.event);

            expect(stubs.updateCurrentPage).to.be.calledWith(docBase.event.pageNumber);
        });

        it('should cache the page if it is loaded', () => {
            docBase.loaded = true;
            docBase.pagechangeHandler(docBase.event);

            expect(stubs.cachePage).to.be.calledWith(docBase.event.pageNumber);
        });

        it('should not cache the page if it is not loaded', () => {
            docBase.loaded = false;
            docBase.pagechangeHandler(docBase.event);

            expect(stubs.cachePage).to.not.be.called;
        });
    });

    describe('enterfullscreenHandler()', () => {
        it('should update the scale value, and resize the page', () => {
            docBase.pdfViewer = {
                presentationModeState: 'normal',
                currentScaleValue: 'normal'
            };
            const resizeStub = sandbox.stub(docBase, 'resize');

            docBase.enterfullscreenHandler();
            expect(resizeStub).to.be.called;
            expect(docBase.pdfViewer.currentScaleValue).to.equal('page-fit');
        });
    });

    describe('exitfullscreenHandler()', () => {
        it('should update the scale value, and resize the page', () => {
            docBase.pdfViewer = {
                presentationModeState: 'fullscreen',
                currentScaleValue: 'pagefit'
            };
            const resizeStub = sandbox.stub(docBase, 'resize');

            docBase.exitfullscreenHandler();
            expect(resizeStub).to.be.called;
            expect(docBase.pdfViewer.currentScaleValue).to.equal('auto');
        });
    });

    describe('scrollHandler()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(docBase, 'emit');
            docBase.scrollStarted = false;
        });

        it('should emit the scrollstart event on a new scroll', () => {
            docBase.scrollHandler();
            docBase.throttledScrollHandler();
            expect(stubs.emit).to.be.calledWith('scrollstart');
        });

        it('should not emit the scrollstart event on a continued scroll', () => {
            docBase.scrollStarted = true;

            docBase.scrollHandler();
            docBase.throttledScrollHandler();
            expect(stubs.emit).to.not.be.calledWith('scrollstart');
        });

        it('should emit a scrollend event after scroll timeout', () => {
            const clock = sinon.useFakeTimers();

            docBase.scrollHandler();
            docBase.throttledScrollHandler();
            expect(stubs.emit).to.be.calledWith('scrollstart');

            clock.tick(SCROLL_END_TIMEOUT + 1);
            expect(stubs.emit).to.be.calledWith('scrollend');
        });
    });
});
