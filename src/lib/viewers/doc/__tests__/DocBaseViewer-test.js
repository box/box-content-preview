/* eslint-disable no-unused-expressions */
import DocBaseViewer from '../DocBaseViewer';
import DocFindBar from '../DocFindBar';
import Browser from '../../../Browser';
import BaseViewer from '../../BaseViewer';
import Controls from '../../../Controls';
import PageControls from '../../../PageControls';
import fullscreen from '../../../Fullscreen';
import DocPreloader from '../DocPreloader';
import * as file from '../../../file';
import * as util from '../../../util';

import {
    CLASS_BOX_PREVIEW_FIND_BAR,
    CLASS_HIDDEN,
    PERMISSION_DOWNLOAD,
    STATUS_ERROR,
    STATUS_PENDING,
    STATUS_SUCCESS,
} from '../../../constants';

import { ICON_PRINT_CHECKMARK } from '../../../icons/icons';
import { VIEWER_EVENT } from '../../../events';

const LOAD_TIMEOUT_MS = 180000; // 3 min timeout
const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const SCROLL_END_TIMEOUT = 500;
const MOBILE_MAX_CANVAS_SIZE = 2949120; // ~3MP 1920x1536

const sandbox = sinon.sandbox.create();
let docBase;
let containerEl;
let stubs = {};

describe('src/lib/viewers/doc/DocBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocBaseViewer-test.html');

        containerEl = document.querySelector('.container');
        docBase = new DocBaseViewer({
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {}
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo'
                }
            },
            file: {
                id: '0',
                extension: 'ppt'
            }
        });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        docBase.containerEl = containerEl;
        docBase.setup();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        docBase.pdfViewer = undefined;
        if (typeof docBase.destroy === 'function') {
            docBase.destroy();
        }
        docBase = null;
        stubs = null;
    });

    describe('setup()', () => {
        it('should correctly set a doc element, viewer element, and a timeout', () => {
            expect(docBase.docEl.classList.contains('bp-doc')).to.be.true;
            expect(docBase.docEl.parentNode).to.deep.equal(docBase.containerEl);

            expect(docBase.viewerEl.classList.contains('pdfViewer')).to.be.true;
            expect(docBase.viewerEl.parentNode).to.equal(docBase.docEl);

            expect(docBase.loadTimeout).to.equal(LOAD_TIMEOUT_MS);
        });
    });

    describe('destroy()', () => {
        it('should unbind listeners and clear the print blob', () => {
            const unbindDOMListenersStub = sandbox.stub(docBase, 'unbindDOMListeners');
            docBase.printURL = 'someblob';
            sandbox.stub(URL, 'revokeObjectURL');

            docBase.destroy();
            expect(unbindDOMListenersStub).to.be.called;
            expect(docBase.printBlob).to.equal(null);
            expect(URL.revokeObjectURL).to.be.calledWith(docBase.printURL);
        });

        it('should destroy the controls', () => {
            docBase.controls = {
                destroy: sandbox.stub()
            };

            docBase.destroy();
            expect(docBase.controls.destroy).to.be.called;
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

    describe('prefetch()', () => {
        it('should prefetch assets if assets is true', () => {
            sandbox.stub(docBase, 'prefetchAssets');
            sandbox.stub(util, 'get');
            docBase.prefetch({ assets: true, preload: false, content: false });
            expect(docBase.prefetchAssets).to.be.called;
        });

        it('should prefetch preload if preload is true and representation is ready', () => {
            const template = 'someTemplate';
            const preloadRep = {
                content: {
                    url_template: template
                },
                status: {
                    state: 'success'
                }
            };
            sandbox.stub(util, 'get');
            sandbox.stub(file, 'getRepresentation').returns(preloadRep);
            sandbox.stub(docBase, 'createContentUrlWithAuthParams');

            docBase.prefetch({ assets: false, preload: true, content: false });

            expect(docBase.createContentUrlWithAuthParams).to.be.calledWith(template);
        });

        it('should not prefetch preload if preload is true and representation is not ready', () => {
            const template = 'someTemplate';
            const preloadRep = {
                content: {
                    url_template: template
                },
                status: {
                    state: 'pending'
                }
            };
            sandbox.stub(util, 'get');
            sandbox.stub(file, 'getRepresentation').returns(preloadRep);
            sandbox.stub(docBase, 'createContentUrlWithAuthParams');

            docBase.prefetch({ assets: false, preload: true, content: false });

            expect(docBase.createContentUrlWithAuthParams).to.not.be.calledWith(template);
        });

        it('should not prefetch preload if file is watermarked', () => {
            docBase.options.file.watermark_info = {
                is_watermarked: true
            };
            sandbox.stub(docBase, 'createContentUrlWithAuthParams');

            docBase.prefetch({ assets: false, preload: true, content: false });

            expect(docBase.createContentUrlWithAuthParams).to.not.be.called;
        });

        it('should prefetch content if content is true and representation is ready', () => {
            const contentUrl = 'someContentUrl';
            sandbox.stub(docBase, 'createContentUrlWithAuthParams').returns(contentUrl);
            sandbox.stub(docBase, 'isRepresentationReady').returns(true);
            sandbox.mock(util).expects('get').withArgs(contentUrl, 'any');

            docBase.prefetch({ assets: false, preload: false, content: true });
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(docBase, 'isRepresentationReady').returns(false);
            sandbox.mock(util).expects('get').never();
            docBase.prefetch({ assets: false, preload: false, content: true });
        });

        it('should not prefetch content if file is watermarked', () => {
            docBase.options.file.watermark_info = {
                is_watermarked: true
            };
            sandbox.mock(util).expects('get').never();
            docBase.prefetch({ assets: false, preload: false, content: true });
        });
    });

    describe('showPreload()', () => {
        beforeEach(() => {
            docBase.preloader = new DocPreloader();
        });

        it('should not do anything if there is a previously cached page', () => {
            sandbox.stub(docBase, 'getCachedPage').returns(2);
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should not do anything if file is watermarked', () => {
            docBase.options.file = {
                watermark_info: {
                    is_watermarked: true
                }
            };
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(true);
            sandbox.stub(file, 'getRepresentation').returns({});
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should not do anything if no preload rep is found', () => {
            docBase.options.file = {};
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(true);
            sandbox.stub(file, 'getRepresentation').returns(null);
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should not do anything if preload option is not set', () => {
            docBase.options.file = {};
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(false);
            sandbox.stub(file, 'getRepresentation').returns(null);
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should not do anything if preload rep has an error', () => {
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(true);
            sandbox.stub(file, 'getRepresentation').returns({
                status: {
                    state: STATUS_ERROR
                }
            });
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should not do anything if preload rep is pending', () => {
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(true);
            sandbox.stub(file, 'getRepresentation').returns({
                status: {
                    state: STATUS_PENDING
                }
            });
            sandbox.mock(docBase.preloader).expects('showPreload').never();

            docBase.showPreload();
        });

        it('should show preload with correct authed URL', () => {
            const preloadUrl = 'someUrl';
            docBase.options.file = {};
            sandbox.stub(docBase, 'getCachedPage').returns(1);
            sandbox.stub(file, 'getRepresentation').returns({
                content: {
                    url_template: ''
                },
                status: {
                    state: STATUS_SUCCESS
                }
            });
            sandbox.stub(docBase, 'getViewerOption').withArgs('preload').returns(true);
            sandbox.stub(docBase, 'createContentUrlWithAuthParams').returns(preloadUrl);
            sandbox.mock(docBase.preloader).expects('showPreload').withArgs(preloadUrl, docBase.containerEl);

            docBase.showPreload();
        });
    });

    describe('hidePreload', () => {
        beforeEach(() => {
            docBase.preloader = new DocPreloader();
        });

        it('should hide the preload', () => {
            sandbox.mock(docBase.preloader).expects('hidePreload');
            docBase.hidePreload();
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should load a document', () => {
            sandbox.stub(docBase, 'setup');
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });
            sandbox.stub(docBase, 'createContentUrlWithAuthParams');
            sandbox.stub(docBase, 'handleAssetAndRepLoad');
            sandbox.stub(docBase, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(docBase, 'loadAssets');

            return docBase.load().then(() => {
                expect(docBase.loadAssets).to.be.called;
                expect(docBase.setup).to.be.called;
                expect(docBase.createContentUrlWithAuthParams).to.be.calledWith('foo');
                expect(docBase.handleAssetAndRepLoad).to.be.called;
            });
        });
    });

    describe('handleAssetAndRepLoad', () => {
        it('should setup pdfjs, init viewer, print, and find', () => {
            const url = 'foo';
            docBase.pdfUrl = url;
            docBase.pdfViewer = {
                currentScale: 1
            };

            const setupPdfjsStub = sandbox.stub(docBase, 'setupPdfjs');
            const initViewerStub = sandbox.stub(docBase, 'initViewer');
            const initPrintStub = sandbox.stub(docBase, 'initPrint');
            const initFindStub = sandbox.stub(docBase, 'initFind');

            docBase.handleAssetAndRepLoad();

            expect(setupPdfjsStub).to.be.called;
            expect(initViewerStub).to.be.calledWith(docBase.pdfUrl);
            expect(initPrintStub).to.be.called;
            expect(initFindStub).to.be.called;
        });
    });

    describe('initFind()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                setFindController: sandbox.stub()
            };
        });

        it('should correctly set the find bar', () => {
            docBase.initFind();
            expect(docBase.findBarEl.classList.contains(CLASS_BOX_PREVIEW_FIND_BAR)).to.be.true;
            expect(docBase.docEl.parentNode).to.deep.equal(docBase.containerEl);
        });

        it('should create and set a new findController', () => {
            docBase.initFind();
            expect(docBase.pdfViewer.setFindController).to.be.called;
        });

        it('should not set find bar if viewer option disableFindBar is true', () => {
            sandbox.stub(docBase, 'getViewerOption').withArgs('disableFindBar').returns(true);
            docBase.initFind();
            expect(docBase.findBar).to.be.undefined;
        });

        it('should set findBar to a function if viewer option disableFindBar is not set', () => {
            docBase.initFind();
            expect(docBase.findBar).to.be.instanceof(DocFindBar);
        });
    });

    describe('find()', () => {
        beforeEach(() => {
            docBase.findBar = {
                setFindFieldElValue: sandbox.stub(),
                findFieldHandler: sandbox.stub(),
                open: sandbox.stub(),
                destroy: sandbox.stub()
            }

            sandbox.stub(docBase, 'setPage');
        });

        it('should do nothing if there is no findbar', () => {
            docBase.findBar = undefined;

            docBase.find('hi');

            expect(docBase.setPage).to.not.be.called;
        });

        it('should set the search value and handle a find', () => {
            docBase.find('hi');

            expect(docBase.setPage).to.be.calledWith(1);
            expect(docBase.findBar.setFindFieldElValue).to.be.calledWith('hi');
            expect(docBase.findBar.findFieldHandler).to.be.called;
        });

        it('should open the findbar if the openFindBar flag is true', () => {
            docBase.find('hi', true);

            expect(docBase.findBar.setFindFieldElValue).to.be.calledWith('hi');
            expect(docBase.findBar.findFieldHandler).to.be.called;
            expect(docBase.findBar.open).to.be.called;
        });
    });

    describe('browserPrint()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(docBase, 'emit');
            stubs.createObject = sandbox.stub(URL, 'createObjectURL').returns('test');
            stubs.open = sandbox.stub(window, 'open').returns(false);
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Chrome');
            stubs.printResult = { print: sandbox.stub(), addEventListener: sandbox.stub() };
            docBase.printBlob = true;
            window.navigator.msSaveOrOpenBlob = sandbox.stub().returns(true);
        });

        it('should use the open or save dialog if on IE or Edge', () => {
            docBase.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should use the open or save dialog if on IE or Edge and emit a message', () => {
            docBase.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should emit an error message if the print result fails on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob.returns(false);

            docBase.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.calledWith('printerror');
        });

        it('should open the pdf in a new tab if not on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob = undefined;

            docBase.browserPrint();
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.calledWith(docBase.printURL);
            expect(stubs.emit).to.be.called;
        });

        it('should print on load in the chrome browser', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);

            docBase.browserPrint();
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.calledWith(docBase.printURL);
            expect(stubs.browser).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should use a timeout in safari', () => {
            let clock = sinon.useFakeTimers();
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);
            stubs.browser.returns('Safari');

            docBase.browserPrint();
            clock.tick(PRINT_TIMEOUT_MS + 1);
            expect(stubs.createObject).to.be.calledWith(docBase.printBlob);
            expect(stubs.open).to.be.called;
            expect(stubs.browser).to.be.called;
            expect(stubs.printResult.print).to.be.called;
            expect(stubs.emit).to.be.called;

            clock = undefined;
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
            stubs.has = sandbox.stub(docBase.cache, 'has').returns(true);
            stubs.get = sandbox.stub(docBase.cache, 'get').returns({ 0: 10 });
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
            stubs.has = sandbox.stub(docBase.cache, 'has').returns(true);
            stubs.get = sandbox.stub(docBase.cache, 'get').returns({ 0: 10 });
            stubs.set = sandbox.stub(docBase.cache, 'set').returns({ 0: 10 });
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

    describe('zoom methods', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                currentScale: 5
            };
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        afterEach(() => {
            docBase.pdfViewer = undefined;
        });

        describe('zoomIn()', () => {
            it('should zoom in until it hits the number of ticks or the max scale', () => {
                docBase.zoomIn(12);
                expect(docBase.pdfViewer.currentScaleValue).to.equal(MAX_SCALE);

                docBase.pdfViewer.currentScale = 1;
                docBase.zoomIn(1);
                expect(docBase.pdfViewer.currentScaleValue).to.equal(DEFAULT_SCALE_DELTA);
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
                docBase.pdfViewer.currentScale = 0.2;

                docBase.zoomOut(10);
                expect(docBase.pdfViewer.currentScaleValue).to.equal(MIN_SCALE);

                docBase.pdfViewer.currentScale = DEFAULT_SCALE_DELTA;
                docBase.zoomOut(1);
                expect(docBase.pdfViewer.currentScaleValue).to.equal(1);
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
            stubs.bindDOMListeners = sandbox.stub(docBase, 'bindDOMListeners');
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        it('should turn on enhanced text selection if not on mobile', () => {
            docBase.options.location = {
                locale: 'en-US'
            };
            docBase.isMobile = false;
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer('').then(() => {
                expect(stubs.pdfViewerStub).to.be.calledWith({
                    container: sinon.match.any,
                    linkService: sinon.match.any,
                    enhanceTextSelection: true
                });
            });
        });

        it('should turn off enhanced text selection if on mobile', () => {
            docBase.options.location = {
                locale: 'en-US'
            };
            docBase.isMobile = true;
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer('').then(() => {
                expect(stubs.pdfViewerStub).to.be.calledWith({
                    container: sinon.match.any,
                    linkService: sinon.match.any,
                    enhanceTextSelection: false
                });
            });
        });

        it('should set a chunk size based on viewer options if available', () => {
            const url = 'url';
            const rangeChunkSize = 100;

            sandbox.stub(docBase, 'getViewerOption').returns(rangeChunkSize);
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer(url).then(() => {
                expect(PDFJS.getDocument).to.be.calledWith({
                    url,
                    rangeChunkSize
                });
            });
        });

        it('should set a default chunk size if no viewer option set and locale is not en-US', () => {
            const url = 'url';
            const defaultChunkSize = 524288; // 512KB

            docBase.options.location = {
                locale: 'not-en-US'
            };
            sandbox.stub(docBase, 'getViewerOption').returns(null);
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer(url).then(() => {
                expect(PDFJS.getDocument).to.be.calledWith({
                    url,
                    rangeChunkSize: defaultChunkSize
                });
            });
        });

        it('should set a large chunk size if no viewer option set and locale is en-US', () => {
            const url = 'url';
            const largeChunkSize = 1048576; // 1MB

            docBase.options.location = {
                locale: 'en-US'
            };
            sandbox.stub(docBase, 'getViewerOption').returns(null);
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer(url).then(() => {
                expect(PDFJS.getDocument).to.be.calledWith({
                    url,
                    rangeChunkSize: largeChunkSize
                });
            });
        });

        it('should set a cache-busting header if on mobile', () => {
            docBase.options.location = {
                locale: 'en-US'
            };
            sandbox.stub(Browser, 'isIOS').returns(true);
            sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve({}));

            return docBase.initViewer('').then(() => {
                expect(PDFJS.getDocument).to.be.calledWith({
                    url: '',
                    rangeChunkSize: 1048576,
                    httpHeaders: {
                        'If-None-Match': 'webkit-no-cache'
                    }
                });
            });
        });

        it('should resolve the loading task and set the document/viewer', () => {
            const doc = {
                url: 'url'
            };
            const getDocumentStub = sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve(doc));
            sandbox.stub(docBase, 'getViewerOption').returns(100);

            return docBase.initViewer('url').then(() => {
                expect(stubs.pdfViewerStub).to.be.called;
                expect(getDocumentStub).to.be.called;
                expect(stubs.bindDOMListeners).to.be.called;
                expect(stubs.pdfViewer.setDocument).to.be.called;
                expect(stubs.pdfViewer.linkService.setDocument).to.be.called;
            });
        });

        it('should invoke startLoadTimer()', () => {
            const doc = {
                url: 'url'
            };
            const getDocumentStub = sandbox.stub(PDFJS, 'getDocument').returns(Promise.resolve(doc));
            sandbox.stub(docBase, 'getViewerOption').returns(100);
            sandbox.stub(docBase, 'startLoadTimer');
            docBase.initViewer('url');

            expect(docBase.startLoadTimer).to.be.called;
        });
    });

    describe('resize()', () => {
        const resizeFunc = BaseViewer.prototype.resize;

        beforeEach(() => {
            docBase.pdfViewer = {
                update: sandbox.stub(),
                currentScaleValue: 0,
                currentPageNumber: 0,
                pageViewsReady: true
            };

            stubs.setPage = sandbox.stub(docBase, 'setPage');
            Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                value: sandbox.stub()
            });
        });

        afterEach(() => {
            Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                value: resizeFunc
            });
        });

        it('should do nothing if pdfViewer does not exist', () => {
            docBase.pdfViewer = null;
            docBase.resize();
            expect(BaseViewer.prototype.resize).to.not.be.called;
        });

        it('should do nothing if the page views are not ready', () => {
            docBase.pdfViewer.pageViewsReady = false;
            docBase.resize();
            expect(BaseViewer.prototype.resize).to.not.be.called;
        });

        it('should update the pdfViewer and reset the page', () => {
            docBase.resize();
            expect(docBase.pdfViewer.update).to.be.called;
            expect(stubs.setPage).to.be.called;
            expect(BaseViewer.prototype.resize).to.be.called;
        });
    });

    describe('setupPdfjs()', () => {
        beforeEach(() => {
            stubs.urlCreator = sandbox.stub(util, 'createAssetUrlCreator').returns(() => {
                return 'asset';
            });
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Safari');
            stubs.checkPermission = sandbox.stub(file, 'checkPermission');
            stubs.getViewerOption = sandbox.stub(docBase, 'getViewerOption');
            docBase.options = {
                location: {
                    staticBaseURI: 'test/',
                    locale: 'en-US'
                },
                file: {
                    size: 10000000,
                    extension: 'pdf',
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
            expect(PDFJS.externalLinkRel).to.equal('noopener noreferrer nofollow');
        });

        // @NOTE(JustinHoldstock) 2017-04-11: Check to remove or modify this after next IOS release after 10.3.1 or
        // Safari version
        it('should test if browser has font rendering issue', () => {
            PDFJS.disableFontFace = false;
            sandbox.mock(Browser).expects('hasFontIssue').returns(true);

            docBase.setupPdfjs();

            expect(PDFJS.disableFontFace).to.be.true;
        });

        it('should not disable streaming', () => {
            docBase.setupPdfjs();
            expect(PDFJS.disableStream).to.be.true;
        });

        it('should not disable range requests if the locale is en-US', () => {
            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.false;
        });

        it('should disable range requests if locale is not en-US, the file is smaller than 25MB and is not an Excel file', () => {
            docBase.options.file.size = 26000000;
            docBase.options.extension = 'pdf';
            docBase.options.location.locale = 'ja-JP';
            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.true;
        });

        it('should enable range requests if locale is not en-US, the file is greater than 25MB and is not watermarked', () => {
            docBase.options.location.locale = 'ja-JP';
            docBase.options.file.size = 26500000;
            docBase.options.extension = 'pdf';
            docBase.options.file.watermark_info.is_watermarked = false;
            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.false;
        });

        it('should disable range requests if the file is watermarked', () => {
            docBase.options.location.locale = 'ja-JP';
            docBase.options.file.watermark_info.is_watermarked = true;
            docBase.setupPdfjs();
            expect(PDFJS.disableRange).to.be.true;
        });

        it('should disable or enable text layer based on download permissions', () => {
            stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);
            docBase.setupPdfjs();
            expect(PDFJS.disableTextLayer).to.be.false;

            stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(false);
            docBase.setupPdfjs();
            expect(PDFJS.disableTextLayer).to.be.true;
        });

        it('should disable the text layer if disableTextLayer viewer option is set', () => {
            stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);
            stubs.getViewerOption.withArgs('disableTextLayer').returns(true);

            docBase.setupPdfjs();

            expect(PDFJS.disableTextLayer).to.be.true;
        });

        it('should decrease max canvas size to 3MP if on mobile', () => {
            docBase.isMobile = true;
            docBase.setupPdfjs();
            expect(PDFJS.maxCanvasPixels).to.equal(MOBILE_MAX_CANVAS_SIZE);
        });

        it('should set disableCreateObjectURL to false', () => {
            docBase.setupPdfjs();
            expect(PDFJS.disableCreateObjectURL).to.equal(false);
        });

        it('should override pdf.js PDFPageView reset with custom loading indicator logic', () => {
            const resetFunc = PDFJS.PDFPageView.prototype.reset;
            docBase.setupPdfjs();
            expect(resetFunc).to.not.equal(PDFJS.PDFPageView.prototype.reset);
        });
    });

    describe('initPrint()', () => {
        it('should add print checkmark', () => {
            docBase.initPrint();

            const mockCheckmark = document.createElement('div');
            mockCheckmark.innerHTML = `${ICON_PRINT_CHECKMARK}`.trim();
            expect(docBase.printPopup.printCheckmark.innerHTML).to.equal(mockCheckmark.innerHTML);
        });

        it('should hide the print checkmark', () => {
            docBase.initPrint();

            expect(docBase.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN));
        });

        it('should add the loading indicator', () => {
            docBase.initPrint();

            const mockIndicator = document.createElement('div');
            mockIndicator.innerHTML = `
            <div></div>
            <div></div>
            <div></div>
            `.trim();
            expect(docBase.printPopup.loadingIndicator.innerHTML).to.equal(mockIndicator.innerHTML);
            expect(docBase.printPopup.loadingIndicator.classList.contains('bp-crawler')).to.be.true;
        });
    });

    describe('print()', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            docBase.printBlob = undefined;
            stubs.fetchPrintBlob = sandbox.stub(docBase, 'fetchPrintBlob').returns({
                then: sandbox.stub()
            });
            docBase.initPrint();
            stubs.show = sandbox.stub(docBase.printPopup, 'show');
        });

        afterEach(() => {
            clock.restore();
        });

        it('should request the print blob if it is not ready', () => {
            docBase.print();
            expect(stubs.fetchPrintBlob).to.be.called;
        });

        it('should show the print popup and disable the print button if the blob is not ready', () => {
            sandbox.stub(docBase.printPopup, 'disableButton');

            docBase.print();
            clock.tick(PRINT_DIALOG_TIMEOUT_MS + 1);

            expect(stubs.show).to.be.calledWith(__('print_loading'), __('print'), sinon.match.func);
            expect(docBase.printPopup.disableButton).to.be.called;
        });

        it('should directly print if print blob is ready and the print dialog hasn\'t been shown yet', () => {
            docBase.printBlob = {};
            docBase.printDialogTimeout = setTimeout(() => {});
            sandbox.stub(docBase, 'browserPrint');

            docBase.print();
            expect(docBase.browserPrint).to.be.called;
        });

        it('should directly print if print blob is ready and the print dialog isn\'t visible', () => {
            docBase.printBlob = {};
            docBase.printDialogTimeout = null;
            sandbox.stub(docBase.printPopup, 'isVisible').returns(false);
            sandbox.stub(docBase, 'browserPrint');

            docBase.print();
            expect(docBase.browserPrint).to.be.called;
        });

        it('should update the print popup UI if popup is visible and there is no current print timeout', () => {
            docBase.printBlob = {};

            sandbox.stub(docBase.printPopup, 'isVisible').returns(true);

            docBase.print();

            expect(docBase.printPopup.buttonEl.classList.contains('is-disabled')).to.be.false;
            expect(docBase.printPopup.messageEl.textContent).to.equal(__('print_ready'));
            expect(docBase.printPopup.loadingIndicator.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(docBase.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('setupPageIds()', () => {
        it('should add page IDs', () => {
            const pageEl = document.createElement('div');
            pageEl.classList.add('page');
            pageEl.dataset.pageNumber = 2;
            docBase.containerEl.appendChild(pageEl);

            docBase.setupPageIds();

            expect(pageEl.id).to.equal('bp-page-2');
        });
    });

    describe('fetchPrintBlob()', () => {
        beforeEach(() => {
            stubs.get = sandbox.stub(util, 'get').returns(Promise.resolve('blob'));
        });

        it('should get and set the blob', () => {
            return docBase.fetchPrintBlob('url').then(() => {
                expect(docBase.printBlob).to.equal('blob');
            });
        });
    });

    describe('loadUI()', () => {
        it('should set controls, bind listeners, and init the page number element', () => {
            const bindControlListenersStub = sandbox.stub(docBase, 'bindControlListeners');

            docBase.loadUI();
            expect(bindControlListenersStub).to.be.called;
            expect(docBase.controls instanceof Controls).to.be.true;
            expect(docBase.pageControls instanceof PageControls).to.be.true;
            expect(docBase.pageControls.contentEl).to.equal(docBase.docEl);
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            stubs.addEventListener = sandbox.stub(docBase.docEl, 'addEventListener');
            stubs.addListener = sandbox.stub(fullscreen, 'addListener');
            stubs.isIOS = sandbox.stub(Browser, 'isIOS');
        });

        it('should add the correct listeners', () => {
            docBase.hasTouch = false;
            docBase.bindDOMListeners();
            expect(stubs.addEventListener).to.be.calledWith('pagesinit', docBase.pagesinitHandler);
            expect(stubs.addEventListener).to.be.calledWith('pagerendered', docBase.pagerenderedHandler);
            expect(stubs.addEventListener).to.be.calledWith('pagechange', docBase.pagechangeHandler);
            expect(stubs.addEventListener).to.be.calledWith('scroll', docBase.throttledScrollHandler);


            expect(stubs.addEventListener).to.not.be.calledWith('touchstart', docBase.pinchToZoomStartHandler);
            expect(stubs.addEventListener).to.not.be.calledWith('touchmove', docBase.pinchToZoomChangeHandler);
            expect(stubs.addEventListener).to.not.be.calledWith('touchend', docBase.pinchToZoomEndHandler);

            expect(stubs.addListener).to.be.calledWith('enter', docBase.enterfullscreenHandler);
            expect(stubs.addListener).to.be.calledWith('exit', docBase.exitfullscreenHandler);
        });

        it('should add the pinch to zoom handler if touch is detected', () => {
            docBase.hasTouch = true;
            docBase.bindDOMListeners();

            expect(stubs.addEventListener).to.be.calledWith('touchstart', docBase.pinchToZoomStartHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchmove', docBase.pinchToZoomChangeHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchend', docBase.pinchToZoomEndHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = sandbox.stub(docBase.docEl, 'removeEventListener');
            stubs.removeFullscreenListener = sandbox.stub(fullscreen, 'removeListener');
            stubs.isIOS = sandbox.stub(Browser, 'isIOS');
        });

        it('should remove the docBase element listeners if the docBase element exists', () => {
            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('pagesinit', docBase.pagesinitHandler);
            expect(stubs.removeEventListener).to.be.calledWith('pagerendered', docBase.pagerenderedHandler);
            expect(stubs.removeEventListener).to.be.calledWith('pagechange', docBase.pagechangeHandler);
            expect(stubs.removeEventListener).to.be.calledWith('scroll', docBase.throttledScrollHandler);
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

        it('should remove pinch to zoom listeners if the browser has touch', () => {
            docBase.hasTouch = true;

            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.be.calledWith('touchstart', docBase.pinchToZoomStartHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchmove', docBase.pinchToZoomChangeHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchend', docBase.pinchToZoomEndHandler);
        });

        it('should not remove the pinch to zoom listeners if the browser does not have touch', () => {
            docBase.hasTouch = false;

            docBase.unbindDOMListeners();
            expect(stubs.removeEventListener).to.not.be.calledWith('touchstart', docBase.pinchToZoomStartHandler);
            expect(stubs.removeEventListener).to.not.be.calledWith('touchmove', docBase.pinchToZoomChangeHandler);
            expect(stubs.removeEventListener).to.not.be.calledWith('touchend', docBase.pinchToZoomEndHandler);
        });
    });

    describe('pagesinitHandler()', () => {
        beforeEach(() => {
            stubs.loadUI = sandbox.stub(docBase, 'loadUI');
            stubs.setPage = sandbox.stub(docBase, 'setPage');
            stubs.getCachedPage = sandbox.stub(docBase, 'getCachedPage');
            stubs.emit = sandbox.stub(docBase, 'emit');
            stubs.setupPages = sandbox.stub(docBase, 'setupPageIds');
        });

        it('should load UI, check the pagination buttons, set the page, and make document scrollable', () => {
            docBase.pdfViewer = {
                currentScale: 'unknown'
            };

            docBase.pagesinitHandler();
            expect(stubs.loadUI).to.be.called;
            expect(stubs.setPage).to.be.called;
            expect(docBase.docEl).to.have.class('bp-is-scrollable');
            expect(stubs.setupPages).to.be.called;
        });

        it('should broadcast that the preview is loaded if it hasn\'t already', () => {
            docBase.pdfViewer = {
                currentScale: 'unknown'
            };
            docBase.loaded = false;
            docBase.pdfViewer.pagesCount = 5;

            docBase.pagesinitHandler();
            expect(stubs.emit).to.be.calledWith(VIEWER_EVENT.load, {
                endProgress: false,
                numPages: 5,
                scale: sinon.match.any
            });
            expect(docBase.loaded).to.be.true;
        });
    });

    describe('pagerenderedHandler()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                currentScale: 0.5,
                currentScaleValue: 0.5
            };
            docBase.event = {
                detail: {
                    pageNumber: 1
                }
            };
            stubs.emit = sandbox.stub(docBase, 'emit');
        });

        it('should emit the pagerender event', () => {
            docBase.pagerenderedHandler(docBase.event);
            expect(stubs.emit).to.be.calledWith('pagerender');
            expect(stubs.emit).to.be.calledWith('scale', { pageNum: 1, scale: 0.5 });
        });

        it('should emit handleAssetAndRepLoad event if not already emitted', () => {
            docBase.pagerenderedHandler(docBase.event);
            expect(stubs.emit).to.be.calledWith(VIEWER_EVENT.progressEnd);
        });
    });

    describe('pagechangeHandler()', () => {
        beforeEach(() => {
            stubs.cachePage = sandbox.stub(docBase, 'cachePage');
            stubs.emit = sandbox.stub(docBase, 'emit');
            docBase.event = {
                pageNumber: 1
            };
            docBase.pdfViewer = {
                pageCount: 1
            };
            docBase.pageControls = {
                updateCurrentPage: sandbox.stub(),
                removeListener: sandbox.stub()
            };
            stubs.updateCurrentPage = docBase.pageControls.updateCurrentPage;
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

    describe('getScrollHandler()', () => {
        let scrollHandler;

        beforeEach(() => {
            stubs.emit = sandbox.stub(docBase, 'emit');
            docBase.scrollStarted = false;
            scrollHandler = docBase.getScrollHandler();
        });

        it('should emit the scrollstart event on a new scroll', () => {
            scrollHandler();
            expect(stubs.emit).to.be.calledWith('scrollstart');
        });

        it('should not emit the scrollstart event on a continued scroll', () => {
            docBase.scrollStarted = true;
            scrollHandler();
            expect(stubs.emit).to.not.be.calledWith('scrollstart');
        });

        it('should emit a scrollend event after scroll timeout', () => {
            const clock = sinon.useFakeTimers();

            scrollHandler();
            expect(stubs.emit).to.be.calledWith('scrollstart');

            clock.tick(SCROLL_END_TIMEOUT + 1);
            expect(stubs.emit).to.be.calledWith('scrollend');
        });
    });

    describe('pinchToZoomStartHandler()', () => {
        let event;

        beforeEach(() => {
            event = {
                touches: {
                    length: 2
                },
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub(),
                pageX: 0,
                pageY: 0,
                touches: [
                    {
                        pageX: 0,
                        pageY: 100
                    },
                    {
                        pageX: 200,
                        pageY: 200
                    }
                ]
            };
            docBase.isPinching = false;
            docBase.pdfViewer = {
                _getVisiblePages: sandbox.stub()
            }
            sandbox.stub(util, 'getClosestPageToPinch').returns(document.createElement('div'));
            sandbox.stub(util, 'getDistance');
        });

        it('should do nothing if we are already pinching or if the event does not use two finger', () => {
            event.touches.length = 1;

            docBase.pinchToZoomStartHandler(event);
            expect(event.stopPropagation).to.not.be.called;

            event.touches = [
                {
                    pageX: 0,
                    pageY: 100
                },
                {
                    pageX: 200,
                    pageY: 200
                }
            ];

            docBase.pinchToZoomStartHandler(event);
            expect(event.stopPropagation).to.be.called;
        });

        it('should prevent default behavior and indicate that we are pinching', () => {
            docBase.pinchToZoomStartHandler(event);

            expect(docBase.isPinching).to.be.true;
            expect(event.stopPropagation).to.be.called;
            expect(event.preventDefault).to.be.called;
        });

        it('should get the closest page and setup the pinching clases', () => {
            docBase.docEl = document.createElement('div');
            const pdfViewer = document.createElement('div');
            docBase.docEl.appendChild(pdfViewer);
            docBase.pinchToZoomStartHandler(event);

            expect(docBase.pdfViewer._getVisiblePages).to.be.called;
            expect(util.getClosestPageToPinch).to.be.called;
        });

        it('should save the original distance for later scale calculation', () => {
            docBase.pinchToZoomStartHandler(event);
            expect(util.getDistance).to.be.calledWith(event.touches[0].pageX, event.touches[0].pageY, event.touches[1].pageX, event.touches[1].pageY)
        });
    });

    describe('pinchToZoomChangeHandler()', () => {
        let eventWithScale;
        let eventWithoutScale;

        beforeEach(() => {
            docBase.originalDistance = 1;
            docBase.pinchPage = document.createElement('div');
            docBase.isPinching = true;
            eventWithScale = {
                scale: 1.5
            };

            eventWithoutScale = {
                touches: [
                    {
                        pageX: 100,
                        pageY: 100
                    },
                    {
                        pageX: 300,
                        pageY: 300
                    }
                ]
            };

            docBase.pdfViewer = {
                currentScale: 1
            }

            sandbox.stub(util, 'getDistance');
        });

        it('should do nothing if we are not pinching', () => {
            docBase.isPinching = false;

            docBase.pinchToZoomChangeHandler(eventWithoutScale);
            expect(util.getDistance).to.not.be.called;

            docBase.isPinching = true;

            docBase.pinchToZoomChangeHandler(eventWithoutScale);
            expect(util.getDistance).to.be.called;
        });

        describe('ignored chages', () => {
            it('should do nothing if the scale is 1', () => {
                eventWithScale.scale = 1;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });

            it('should do nothing if the scale change is less than 0.01', () => {
                docBase.pinchScale = 1.5;
                eventWithScale.scale = 1.501;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });

            it('should do nothing if the scale change bigger than 3', () => {
                docBase.pinchScale = 1;
                eventWithScale.scale = 3.5;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });

            it('should do nothing if the scale change bigger than .25', () => {
                docBase.pinchScale = 1;
                eventWithScale.scale = .1;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });

            it('should do nothing if the proposed scale is greater than the MAX_SCALE', () => {
                docBase.pdfViewer = {
                    currentScale: 7
                }

                eventWithScale.scale = 2;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });

            it('should do nothing if the proposed scale is less than the MIN_SCALE', () => {
                docBase.pdfViewer = {
                    currentScale: .12
                }

                eventWithScale.scale = .25;
                docBase.pinchToZoomChangeHandler(eventWithScale);

                expect(docBase.pinchPage.style.transform).to.equal(undefined);
            });
        });

        it('should transform the pinched page based on the new scale value', () => {
            docBase.pinchToZoomChangeHandler(eventWithScale);
            expect(docBase.pinchPage.style.transform).to.equal('scale(1.5)');
            expect(docBase.pinchPage.classList.contains('pinch-page')).to.be.true;
        });

    });

    describe('pinchToZoomEndHandler()', () => {
        beforeEach(() => {
            docBase.pdfViewer = {
                currentScaleValue: 1,
                currentScale: 1,
                update: sandbox.stub()
            }

            docBase.pinchScale = 1.5;

            docBase.docEl.scroll = sandbox.stub();

            docBase.isPinching = true;
            docBase.pinchPage = document.createElement('div');
        });

        it('should do nothing if we are not pinching', () => {
            docBase.isPinching = false;
            docBase.pinchToZoomEndHandler()
            expect(docBase.pdfViewer.currentScaleValue).to.equal(1);
        });

        it('should do nothing if no pinched page exists', () => {
            docBase.pinchPage = null;
            docBase.pinchToZoomEndHandler()
            expect(docBase.pdfViewer.currentScaleValue).to.equal(1);
        });

        it('should perform a pdf.js zoom', () => {
            docBase.pinchToZoomEndHandler()
            expect(docBase.pdfViewer.currentScaleValue).to.equal(1.5);
        });

        it('should scroll to offset the zoom', () => {
            docBase.pinchToZoomEndHandler()
            expect(docBase.docEl.scroll).to.be.called;
        });

        it('should reset pinching state variables', () => {
            docBase.pinchToZoomEndHandler()

            expect(docBase.isPinching).to.be.false;
            expect(docBase.originalDistance).to.equal(0);
            expect(docBase.pinchScale).to.equal(1);
            expect(docBase.pinchPage).to.equal(null);
        });

    });
});
