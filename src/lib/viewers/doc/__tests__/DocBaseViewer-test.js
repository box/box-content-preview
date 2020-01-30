/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import DocBaseViewer from '../DocBaseViewer';
import DocFindBar from '../DocFindBar';
import Browser from '../../../Browser';
import BaseViewer from '../../BaseViewer';
import Controls from '../../../Controls';
import PageControls from '../../../PageControls';
import ZoomControls from '../../../ZoomControls';
import fullscreen from '../../../Fullscreen';
import DocPreloader from '../DocPreloader';
import * as file from '../../../file';
import * as util from '../../../util';

import {
    CLASS_HIDDEN,
    PERMISSION_DOWNLOAD,
    STATUS_ERROR,
    STATUS_PENDING,
    STATUS_SUCCESS,
    QUERY_PARAM_ENCODING,
    ENCODING_TYPES,
    SELECTOR_BOX_PREVIEW_CONTENT,
    CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER,
    CLASS_BOX_PREVIEW_THUMBNAILS_OPEN,
    SELECTOR_BOX_PREVIEW,
} from '../../../constants';
import {
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_PRINT_CHECKMARK,
    ICON_SEARCH,
    ICON_THUMBNAILS_TOGGLE,
} from '../../../icons/icons';
import { VIEWER_EVENT, LOAD_METRIC, USER_DOCUMENT_THUMBNAIL_EVENTS } from '../../../events';
import Timer from '../../../Timer';

const LOAD_TIMEOUT_MS = 180000; // 3 min timeout
const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const SCROLL_END_TIMEOUT = 500;
const MOBILE_MAX_CANVAS_SIZE = 2949120; // ~3MP 1920x1536
const PAGES_UNIT_NAME = 'pages';

const sandbox = sinon.sandbox.create();
let docBase;
let containerEl;
let rootEl;
let stubs = {};

const STANDARD_HEADERS = [
    'Accept',
    'Accept-Language',
    'Content-Language',
    'Content-Type',
    'DPR',
    'Downlink',
    'Save-Data',
    'Viewport-Width',
    'Width',
];

describe('src/lib/viewers/doc/DocBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocBaseViewer-test.html');

        containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
        stubs = {};

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });

        rootEl = document.querySelector(SELECTOR_BOX_PREVIEW);
        stubs.api = new Api();
        stubs.classListAdd = sandbox.stub(rootEl.classList, 'add');
        stubs.classListRemove = sandbox.stub(rootEl.classList, 'remove');
        stubs.checkPermission = sandbox.stub(file, 'checkPermission');
        stubs.urlCreator = sandbox.stub(util, 'createAssetUrlCreator').returns(() => 'asset');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (docBase) {
            docBase.pdfViewer = undefined;
            if (typeof docBase.destroy === 'function') {
                docBase.destroy();
            }
        }

        docBase = null;
        stubs = null;
    });

    describe('setup()', () => {
        it('should correctly set a doc element, viewer element, thumbnails sidebar element, and a timeout', () => {
            docBase = new DocBaseViewer({
                cache: {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
                file: {
                    id: '0',
                    extension: 'ppt',
                },
                enableThumbnailsSidebar: true,
            });

            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();

            expect(docBase.docEl.classList.contains('bp-doc')).to.be.true;
            expect(docBase.docEl.parentNode).to.deep.equal(docBase.containerEl);

            expect(docBase.viewerEl.classList.contains('pdfViewer')).to.be.true;
            expect(docBase.viewerEl.parentNode).to.equal(docBase.docEl);

            expect(docBase.thumbnailsSidebarEl.classList.contains(CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER)).to.be.true;
            expect(docBase.thumbnailsSidebarEl.parentNode).to.equal(docBase.containerEl.parentNode);

            expect(docBase.loadTimeout).to.equal(LOAD_TIMEOUT_MS);
        });

        it('should not set a thumbnails sidebar element if the option is not enabled', () => {
            docBase = new DocBaseViewer({
                cache: {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
                file: {
                    id: '0',
                    extension: 'ppt',
                },
                enableThumbnailsSidebar: false,
            });
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();

            expect(docBase.thumbnailsSidebarEl).to.be.undefined;
        });

        it('should default the thumbnails open if thumbnails toggle state is open', () => {
            docBase = new DocBaseViewer({
                cache: {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
                file: {
                    id: '0',
                    extension: 'ppt',
                },
                enableThumbnailsSidebar: true,
            });
            sandbox.stub(docBase, 'getCachedThumbnailsToggledState').returns(true);
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();
        });

        it('should default the thumbnails closed if thumbnails toggle state is closed', () => {
            docBase = new DocBaseViewer({
                cache: {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
                file: {
                    id: '0',
                    extension: 'ppt',
                },
                enableThumbnailsSidebar: true,
            });
            sandbox.stub(docBase, 'getCachedThumbnailsToggledState').returns(false);
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();

            expect(stubs.classListAdd).not.to.have.been.calledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
        });
    });

    describe('Non setup methods', () => {
        beforeEach(() => {
            docBase = new DocBaseViewer({
                api: stubs.api,
                cache: {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
                file: {
                    id: '0',
                    extension: 'ppt',
                },
                enableThumbnailsSidebar: true,
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });

            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;

            docBase.setup();
        });

        describe('destroy()', () => {
            it('should unbind listeners and clear the print blob', () => {
                const unbindDOMListenersStub = sandbox.stub(docBase, 'unbindDOMListeners');
                const unbindEventBusListenersStub = sandbox.stub(docBase, 'unbindEventBusListeners');
                docBase.printURL = 'someblob';
                sandbox.stub(URL, 'revokeObjectURL');

                docBase.destroy();
                expect(unbindDOMListenersStub).to.be.called;
                expect(unbindEventBusListenersStub).to.be.called;
                expect(docBase.printBlob).to.equal(null);
                expect(URL.revokeObjectURL).to.be.calledWith(docBase.printURL);
            });

            it('should destroy the controls', () => {
                docBase.controls = {
                    destroy: sandbox.stub(),
                };

                docBase.destroy();
                expect(docBase.controls.destroy).to.be.called;
            });

            it('should destroy the find bar', () => {
                docBase.findBar = {
                    destroy: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };

                docBase.destroy();
                expect(docBase.findBar.destroy).to.be.called;
            });

            it('should clean up the PDF network requests', () => {
                docBase.pdfLoadingTask = {
                    destroy: sandbox.stub(),
                };

                docBase.destroy();
                expect(docBase.pdfLoadingTask.destroy).to.be.called;
            });

            it('should clean up the viewer and the document object', () => {
                docBase.pdfViewer = {
                    cleanup: sandbox.stub(),
                    pdfDocument: {
                        destroy: sandbox.stub(),
                    },
                };

                docBase.destroy();
                expect(docBase.pdfViewer.cleanup).to.be.called;
                expect(docBase.pdfViewer.pdfDocument.destroy).to.be.called;
            });

            it('should clean up the thumbnails sidebar instance and DOM element', () => {
                docBase.thumbnailsSidebar = {
                    destroy: sandbox.stub(),
                };
                const thumbnailsSidebarEl = {
                    remove: sandbox.stub(),
                };
                docBase.thumbnailsSidebarEl = thumbnailsSidebarEl;

                docBase.destroy();
                expect(docBase.thumbnailsSidebar.destroy).to.be.called;
                expect(thumbnailsSidebarEl.remove).to.be.called;
                expect(stubs.classListRemove).to.be.called;
            });
        });

        describe('prefetch()', () => {
            it('should prefetch assets if assets is true', () => {
                sandbox.stub(docBase, 'prefetchAssets');
                sandbox.stub(stubs.api, 'get');
                docBase.prefetch({ assets: true, preload: false, content: false });
                expect(docBase.prefetchAssets).to.be.called;
            });

            it('should prefetch preload if preload is true and representation is ready', () => {
                const template = 'someTemplate';
                const preloadRep = {
                    content: {
                        url_template: template,
                    },
                    status: {
                        state: 'success',
                    },
                };
                sandbox.stub(stubs.api, 'get');
                sandbox.stub(file, 'getRepresentation').returns(preloadRep);
                sandbox.stub(docBase, 'createContentUrlWithAuthParams');

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).to.be.calledWith(template);
            });

            it('should not prefetch preload if preload is true and representation is not ready', () => {
                const template = 'someTemplate';
                const preloadRep = {
                    content: {
                        url_template: template,
                    },
                    status: {
                        state: 'pending',
                    },
                };
                sandbox.stub(stubs.api, 'get');
                sandbox.stub(file, 'getRepresentation').returns(preloadRep);
                sandbox.stub(docBase, 'createContentUrlWithAuthParams');

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).to.not.be.calledWith(template);
            });

            it('should not prefetch preload if file is watermarked', () => {
                docBase.options.file.watermark_info = {
                    is_watermarked: true,
                };
                sandbox.stub(docBase, 'createContentUrlWithAuthParams');

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).to.not.be.called;
            });

            it('should prefetch content if content is true and representation is ready', () => {
                const contentUrl = 'someContentUrl';
                sandbox.stub(docBase, 'createContentUrlWithAuthParams').returns(contentUrl);
                sandbox.stub(docBase, 'isRepresentationReady').returns(true);
                sandbox
                    .mock(stubs.api)
                    .expects('get')
                    .withArgs(contentUrl, { type: 'document' });

                docBase.prefetch({ assets: false, preload: false, content: true });
            });

            it('should not prefetch content if content is true but representation is not ready', () => {
                sandbox.stub(docBase, 'isRepresentationReady').returns(false);
                sandbox
                    .mock(stubs.api)
                    .expects('get')
                    .never();
                docBase.prefetch({ assets: false, preload: false, content: true });
            });

            it('should not prefetch content if file is watermarked', () => {
                docBase.options.file.watermark_info = {
                    is_watermarked: true,
                };
                sandbox
                    .mock(stubs.api)
                    .expects('get')
                    .never();
                docBase.prefetch({ assets: false, preload: false, content: true });
            });
        });

        describe('showPreload()', () => {
            beforeEach(() => {
                docBase.preloader = new DocPreloader();
            });

            it('should not do anything if there is a previously cached page', () => {
                sandbox.stub(docBase, 'getCachedPage').returns(2);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if startAt is not page 1', () => {
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                docBase.startPageNum = 3;
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if file is watermarked', () => {
                docBase.options.file = {
                    watermark_info: {
                        is_watermarked: true,
                    },
                };
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(file, 'getRepresentation').returns({});
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if no preload rep is found', () => {
                docBase.options.file = {};
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(file, 'getRepresentation').returns(null);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if preload option is not set', () => {
                docBase.options.file = {};
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(false);
                sandbox.stub(file, 'getRepresentation').returns(null);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if preload rep has an error', () => {
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(file, 'getRepresentation').returns({
                    status: {
                        state: STATUS_ERROR,
                    },
                });
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should not do anything if preload rep is pending', () => {
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(file, 'getRepresentation').returns({
                    status: {
                        state: STATUS_PENDING,
                    },
                });
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            it('should show preload with correct authed URL', () => {
                const preloadUrl = 'someUrl';
                docBase.options.file = {};
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox.stub(file, 'getRepresentation').returns({
                    content: {
                        url_template: '',
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                });
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(docBase, 'createContentUrlWithAuthParams').returns(preloadUrl);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .withArgs(preloadUrl, docBase.containerEl);

                docBase.showPreload();
            });

            it('should start preload timer for metrics', () => {
                const preloadUrl = 'someUrl';
                docBase.options.file = {};
                sandbox.stub(docBase, 'getCachedPage').returns(1);
                sandbox.stub(file, 'getRepresentation').returns({
                    content: {
                        url_template: '',
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                });
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                sandbox.stub(docBase, 'createContentUrlWithAuthParams').returns(preloadUrl);

                sandbox.mock(docBase.preloader).expects('showPreload');
                const startPreloadTimerStub = sandbox.stub(docBase, 'startPreloadTimer');

                docBase.showPreload();

                expect(startPreloadTimerStub).to.be.called;
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
                sandbox.stub(stubs.api, 'get');
                sandbox.stub(docBase, 'setup');
                Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });
                sandbox.stub(docBase, 'createContentUrlWithAuthParams');
                sandbox.stub(docBase, 'handleAssetAndRepLoad');
                sandbox.stub(docBase, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
                sandbox.stub(docBase, 'loadAssets');
                sandbox.stub(docBase, 'loadBoxAnnotations');

                return docBase.load().then(() => {
                    expect(docBase.loadAssets).to.be.called;
                    expect(docBase.setup).not.to.be.called;
                    expect(docBase.createContentUrlWithAuthParams).to.be.calledWith('foo');
                    expect(docBase.handleAssetAndRepLoad).to.be.called;
                });
            });
        });

        describe('handleAssetAndRepLoad', () => {
            it('should setup pdfjs, init viewer, print, and find', done => {
                const url = 'foo';
                docBase.pdfUrl = url;
                docBase.pdfViewer = {
                    currentScale: 1,
                };

                const setupPdfjsStub = sandbox.stub(docBase, 'setupPdfjs');
                const initViewerStub = sandbox.stub(docBase, 'initViewer');
                const initPrintStub = sandbox.stub(docBase, 'initPrint');
                const initFindStub = sandbox.stub(docBase, 'initFind');
                const loadBoxAnnotations = sandbox.stub(docBase, 'loadBoxAnnotations').returns(Promise.resolve());
                const createAnnotator = sandbox.stub(docBase, 'createAnnotator').returns(
                    new Promise(resolve => {
                        resolve();
                        done();
                    }),
                );

                docBase.handleAssetAndRepLoad();

                expect(setupPdfjsStub).to.be.called;
                expect(initViewerStub).to.be.calledWith(docBase.pdfUrl);
                expect(initPrintStub).to.be.called;
                expect(initFindStub).to.be.called;
                expect(loadBoxAnnotations).to.be.called;
                expect(createAnnotator).to.be.called;
            });
        });

        describe('initFind()', () => {
            beforeEach(() => {
                docBase.pdfEventBus = {
                    off: sandbox.stub(),
                    on: sandbox.stub(),
                };
                docBase.pdfFindController = {
                    execute: sandbox.stub(),
                };
                docBase.pdfViewer = {
                    setFindController: sandbox.stub(),
                };
            });

            it('should not set find bar if viewer option disableFindBar is true', () => {
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('disableFindBar')
                    .returns(true);
                docBase.initFind();
                expect(docBase.findBar).to.be.undefined;
            });

            it('should not set find bar if the user does not have download permissions', () => {
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(false);
                docBase.initFind();
                expect(docBase.findBar).to.be.undefined;
            });

            it('should set findBar to a function if viewer option disableFindBar is not set', () => {
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);
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
                    destroy: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };

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
                    currentPageNumber: 1,
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
                        currentPageNumber: 0,
                    };
                    const setPageStub = sandbox.stub(docBase, 'setPage');

                    docBase.nextPage();
                    expect(setPageStub).to.be.calledWith(1);
                });
            });

            describe('setPage()', () => {
                it("should set the pdfViewer's page and cache it", () => {
                    docBase.pdfViewer = {
                        currentPageNumber: 1,
                        pagesCount: 3,
                    };

                    docBase.setPage(2);

                    expect(docBase.pdfViewer.currentPageNumber).to.equal(2);
                    expect(stubs.cachePage).to.be.called;
                });

                it('should not do anything if setting an invalid page', () => {
                    docBase.pdfViewer = {
                        currentPageNumber: 1,
                        pagesCount: 3,
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
                        id: 0,
                    },
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
                        id: 0,
                    },
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
                    currentScale: 8.9,
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

                it("should not emit the zoom event if we can't zoom in", () => {
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

                it("should not emit the zoom event if we can't zoom out", () => {
                    docBase.pdfViewer.currentScale = MIN_SCALE;

                    docBase.zoomOut(1);
                    expect(stubs.emit).to.not.be.calledWith('zoom');
                });
            });
        });

        describe('onKeydown()', () => {
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

            it('should call the findBar onKeydown if present', () => {
                const keys = 'ctrl+f';
                const mockEvent = sandbox.stub();
                const onKeydownStub = sandbox.stub().withArgs(mockEvent);
                docBase.findBar = {
                    onKeydown: onKeydownStub,
                    destroy: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };
                docBase.onKeydown(keys, mockEvent);
                expect(onKeydownStub).to.have.been.calledOnce;
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
                stubs.bindDOMListeners = sandbox.stub(docBase, 'bindDOMListeners');
                stubs.emit = sandbox.stub(docBase, 'emit');
                stubs.getDocument = sandbox.stub().returns({
                    destroy: sandbox.stub(),
                    promise: Promise.resolve(),
                });
                stubs.getViewerOption = sandbox.stub(docBase, 'getViewerOption');
                stubs.pdfEventBus = {
                    off: sandbox.stub(),
                    on: sandbox.stub(),
                };
                stubs.pdfViewer = {
                    setDocument: sandbox.stub(),
                };
                stubs.pdfViewerClass = sandbox.stub().returns(stubs.pdfViewer);
                stubs.shouldThumbnailsBeToggled = sandbox.stub(docBase, 'shouldThumbnailsBeToggled');
                stubs.resize = sandbox.stub(docBase, 'resize');

                docBase.isMobile = false;
                docBase.options.file = {
                    size: 1000000,
                    watermark_info: {},
                };
                docBase.options.location = {
                    locale: 'en-US',
                };
                docBase.pdfjsLib = {
                    disableRange: false,
                    getDocument: stubs.getDocument,
                    LinkTarget: { NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4 },
                };
                docBase.pdfjsViewer = {
                    EventBus: sandbox.stub().returns(stubs.pdfEventBus),
                    PDFFindController: sandbox.stub().returns({
                        setLinkService: sandbox.stub(),
                    }),
                    PDFLinkService: sandbox.stub().returns({
                        setDocument: sandbox.stub(),
                        setViewer: sandbox.stub(),
                    }),
                    PDFViewer: stubs.pdfViewerClass,
                };
            });

            it('should create an event bus and subscribe to relevant events', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.called;
                    expect(stubs.pdfEventBus.on).to.be.calledWith('pagechanging', docBase.pagechangingHandler);
                    expect(stubs.pdfEventBus.on).to.be.calledWith('pagerendered', docBase.pagerenderedHandler);
                    expect(stubs.pdfEventBus.on).to.be.calledWith('pagesinit', docBase.pagesinitHandler);
                });
            });

            it('should set maxCanvasPixels if on mobile', () => {
                docBase.isMobile = true;

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.calledWith(
                        sinon.match({ maxCanvasPixels: MOBILE_MAX_CANVAS_SIZE }),
                    );
                });
            });

            it('should enable the text layer based on download permissions', () => {
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.calledWith(sinon.match({ textLayerMode: 2 }));
                });
            });

            it('should simplify the text layer if the user is on mobile', () => {
                docBase.isMobile = true;
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.calledWith(sinon.match({ textLayerMode: 1 }));
                });
            });

            it('should disable the text layer based on download permissions', () => {
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(false);

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.calledWith(sinon.match({ textLayerMode: 0 }));
                });
            });

            it('should disable the text layer if disableTextLayer viewer option is set', () => {
                stubs.checkPermission.withArgs(docBase.options.file, PERMISSION_DOWNLOAD).returns(true);
                stubs.getViewerOption.withArgs('disableTextLayer').returns(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).to.be.calledWith(sinon.match({ textLayerMode: 0 }));
                });
            });

            it('should setup the link controller settings correctly', () => {
                return docBase.initViewer('').then(() => {
                    expect(docBase.pdfjsViewer.PDFLinkService).to.be.calledWith(
                        sinon.match({
                            externalLinkRel: 'noopener noreferrer nofollow',
                            externalLinkTarget: 2, // window.pdfjsLib.LinkTarget.BLANK
                        }),
                    );
                });
            });

            it('should test if browser has font rendering issue', () => {
                sandbox.stub(Browser, 'hasFontIssue').returns(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableFontFace: true }));
                });
            });

            it('should disable font face if supplied the option', () => {
                stubs.getViewerOption.returns(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableFontFace: true }));
                });
            });

            it('should not disable streaming', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableStream: true }));
                });
            });

            it('should enable range requests if the file is greater than 25MB', () => {
                docBase.options.file.size = 26500000;

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableRange: false }));
                });
            });

            it('should disable range requests if the file is smaller than 25MB', () => {
                docBase.options.file.size = 26000000;

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableRange: true }));
                });
            });

            it('should disable range requests if the file is greater than 25MB but watermarked', () => {
                docBase.options.file.size = 26500000;
                docBase.options.file.watermark_info.is_watermarked = true;
                docBase.options.location.locale = 'ja-JP';

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableRange: true }));
                });
            });

            it('should set disableCreateObjectURL to false', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ disableCreateObjectURL: false }));
                });
            });

            it('should set a chunk size based on viewer options if available', () => {
                stubs.getViewerOption.returns(100);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ rangeChunkSize: 100 }));
                });
            });

            it('should set a default chunk size if no viewer option set and locale is not en-US', () => {
                const url = 'url';
                const defaultChunkSize = 524288; // 512KB

                docBase.options.location = {
                    locale: 'not-en-US',
                };
                stubs.getViewerOption.returns(null);

                return docBase.initViewer(url).then(() => {
                    expect(stubs.getDocument).to.be.calledWith(sinon.match({ rangeChunkSize: defaultChunkSize }));
                });
            });

            it('should set a large chunk size if no viewer option set and locale is en-US', () => {
                const url = 'url';
                const largeChunkSize = 1048576; // 1MB

                docBase.options.location = {
                    locale: 'en-US',
                };
                stubs.getViewerOption.returns(null);

                return docBase.initViewer(url).then(() => {
                    expect(stubs.getDocument).to.be.calledWith(
                        sinon.match({
                            rangeChunkSize: largeChunkSize,
                        }),
                    );
                });
            });

            it('should avoid preflight requests by not adding non-standard headers', done => {
                docBase.options.location = {
                    locale: 'en-US',
                };
                stubs.getDocument.callsFake(docInitParams => {
                    return new Promise(() => {
                        const { httpHeaders = {} } = docInitParams;
                        const headerKeys = Object.keys(httpHeaders);

                        const containsNonStandardHeader = headerKeys.some(header => {
                            return !STANDARD_HEADERS.includes(header);
                        });

                        expect(containsNonStandardHeader).to.be.false;
                        done();
                    });
                });

                return docBase.initViewer('');
            });

            it('should append encoding query parameter for gzip content when range requests are disabled', () => {
                const defaultChunkSize = 524288; // Taken from RANGE_CHUNK_SIZE_NON_US
                const url = 'www.myTestPDF.com/123456';
                const paramsList = `${QUERY_PARAM_ENCODING}=${ENCODING_TYPES.GZIP}`;

                docBase.options.location = {
                    locale: 'ja-JP', // Disables range requests
                };

                docBase.options.file = {
                    size: 1048576, // 1MB < RANGE_REQUEST_MINIMUM_SIZE (25MB)
                };

                return docBase.initViewer(url).then(() => {
                    expect(stubs.getDocument).to.be.calledWith(
                        sinon.match({
                            rangeChunkSize: defaultChunkSize,
                            url: `${url}?${paramsList}`,
                        }),
                    );
                });
            });

            it('should resolve the loading task and set the document/viewer', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getDocument.returns({ promise: Promise.resolve(doc) });
                stubs.getViewerOption.returns(100);

                return docBase.initViewer('url').then(() => {
                    expect(stubs.bindDOMListeners).to.be.called;
                    expect(stubs.classListAdd).not.to.be.called;
                    expect(stubs.getDocument).to.be.called;
                    expect(stubs.pdfViewerClass).to.be.called;
                    expect(stubs.pdfViewer.setDocument).to.be.called;
                    expect(docBase.pdfLinkService.setDocument).to.be.called;
                });
            });

            it('should invoke startLoadTimer()', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getDocument.returns({ promise: Promise.resolve(doc) });
                stubs.getViewerOption.returns(100);
                sandbox.stub(docBase, 'startLoadTimer');
                docBase.initViewer('url');

                expect(docBase.startLoadTimer).to.be.called;
            });

            it('should handle any download error', () => {
                const doc = {
                    url: 'url',
                };

                stubs.handleDownloadError = sandbox.stub(docBase, 'handleDownloadError');
                stubs.getDocument.returns({ promise: Promise.reject(doc) });
                docBase.options.location = {
                    locale: 'en-US',
                };

                return docBase.initViewer('url').catch(() => {
                    expect(stubs.handleDownloadError).to.be.called;
                });
            });

            it('should adjust the layout if thumbnails should be toggled', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getViewerOption.returns(100);
                stubs.getDocument.returns({ promise: Promise.resolve(doc) });
                stubs.shouldThumbnailsBeToggled.returns(true);

                return docBase.initViewer('url').then(() => {
                    expect(stubs.pdfViewerClass).to.be.called;
                    expect(stubs.getDocument).to.be.called;
                    expect(stubs.bindDOMListeners).to.be.called;
                    expect(stubs.pdfViewer.setDocument).to.be.called;
                    expect(docBase.pdfLinkService.setDocument).to.be.called;
                    expect(stubs.classListAdd).calledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                    expect(stubs.resize).to.be.called;
                });
            });
        });

        describe('resize()', () => {
            const resizeFunc = BaseViewer.prototype.resize;

            beforeEach(() => {
                docBase.pdfViewer = {
                    update: sandbox.stub(),
                    currentScaleValue: 0,
                    currentPageNumber: 0,
                };

                docBase.somePageRendered = true;

                stubs.setPage = sandbox.stub(docBase, 'setPage');
                Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                    value: sandbox.stub(),
                });
                stubs.thumbnailsResize = sandbox.stub();
                docBase.thumbnailsSidebar = { resize: stubs.thumbnailsResize, destroy: () => {} };
            });

            afterEach(() => {
                Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                    value: resizeFunc,
                });
            });

            it('should do nothing if pdfViewer does not exist', () => {
                docBase.pdfViewer = null;
                docBase.resize();
                expect(BaseViewer.prototype.resize).to.not.be.called;
                expect(stubs.thumbnailsResize).not.to.be.called;
            });

            it('should attempt to resize the preload if no PDF pages are ready ', () => {
                docBase.somePageRendered = false;
                docBase.resize();
                expect(BaseViewer.prototype.resize).to.not.be.called;
                expect(stubs.thumbnailsResize).not.to.be.called;
            });

            it('should resize the preload', () => {
                docBase.pdfViewer = null;
                docBase.preloader = {
                    resize: sandbox.stub(),
                };
                docBase.resize();
                expect(docBase.preloader.resize).to.be.called;
                expect(BaseViewer.prototype.resize).to.not.be.called;
                expect(stubs.thumbnailsResize).not.to.be.called;
            });

            it('should update the pdfViewer and reset the page', () => {
                docBase.resize();
                expect(docBase.pdfViewer.update).to.be.called;
                expect(stubs.setPage).to.be.called;
                expect(BaseViewer.prototype.resize).to.be.called;
                expect(stubs.thumbnailsResize).to.be.called;
            });
        });

        describe('startPreloadTimer()', () => {
            afterEach(() => {
                Timer.reset();
            });

            it('should create a tag and start a timer related to preload for the file being loaded', () => {
                const id = '12345';
                const tag = Timer.createTag(id, LOAD_METRIC.preloadTime);
                docBase.options.file = {
                    id,
                };

                const startStub = sandbox.stub(Timer, 'start');
                docBase.startPreloadTimer();

                expect(startStub).to.be.calledWith(tag);
            });
        });

        describe('stopPreloadTimer()', () => {
            const id = '123456';
            const tag = Timer.createTag(id, LOAD_METRIC.preloadTime);
            beforeEach(() => {
                docBase.options.file = {
                    id,
                };
            });

            afterEach(() => {
                Timer.reset();
            });

            it('should do nothing if preload timer was not started for that file', () => {
                const stopStub = sandbox.stub(Timer, 'stop');
                docBase.stopPreloadTimer();

                expect(stopStub).to.not.be.called;
            });

            it('should stop and reset the timer for the file preload event', () => {
                const stopStub = sandbox.stub(Timer, 'stop');
                const resetStub = sandbox.stub(Timer, 'reset');
                Timer.start(tag);

                docBase.stopPreloadTimer();

                expect(stopStub).to.be.calledWith(tag);
                expect(resetStub).to.be.calledWith(tag);
            });

            it('should emit a preload event for metrics logging', () => {
                const elapsed = 100;
                const preloadTime = {
                    start: 1,
                    end: 101,
                    elapsed,
                };
                sandbox.stub(Timer, 'get').returns(preloadTime);
                const metricStub = sandbox.stub(docBase, 'emitMetric');

                docBase.stopPreloadTimer();

                expect(metricStub).to.be.calledWith({
                    name: LOAD_METRIC.previewPreloadEvent,
                    data: elapsed,
                });
            });
        });

        describe('onPreload()', () => {
            let logger;
            beforeEach(() => {
                logger = {
                    setPreloaded: sandbox.stub(),
                };
                docBase.options.logger = logger;
            });

            it('should invoke "setPreloaded" on logger for legacy metrics preload calculation', () => {
                docBase.onPreload();

                expect(logger.setPreloaded).to.be.called;
            });

            it('should stop preload timer for that file', () => {
                const stopStub = sandbox.stub(docBase, 'stopPreloadTimer');
                docBase.onPreload();

                expect(stopStub).to.be.called;
            });

            it('should reset load timeout to prevent preview timeout', () => {
                const resetStub = sandbox.stub(docBase, 'resetLoadTimeout');
                docBase.onPreload();

                expect(resetStub).to.be.called;
            });
        });

        describe('setupPdfjs()', () => {
            it('should set the worker source asset url', () => {
                docBase.options = {
                    file: {},
                    location: {
                        staticBaseURI: 'test/',
                        locale: 'en-US',
                    },
                };
                docBase.setupPdfjs();

                expect(docBase.pdfjsLib.GlobalWorkerOptions.workerSrc).to.equal('asset');
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
                expect(docBase.printPopup.loadingIndicator.innerHTML.replace(/\s/g, '')).to.equal(
                    mockIndicator.innerHTML.replace(/\s/g, ''),
                );
                expect(docBase.printPopup.loadingIndicator.classList.contains('bp-crawler')).to.be.true;
            });
        });

        describe('print()', () => {
            let clock;

            beforeEach(() => {
                clock = sinon.useFakeTimers();
                docBase.printBlob = undefined;
                stubs.fetchPrintBlob = sandbox.stub(docBase, 'fetchPrintBlob').returns({
                    then: sandbox.stub(),
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

            it("should directly print if print blob is ready and the print dialog hasn't been shown yet", () => {
                docBase.printBlob = {};
                docBase.printDialogTimeout = setTimeout(() => {});
                sandbox.stub(docBase, 'browserPrint');

                docBase.print();
                expect(docBase.browserPrint).to.be.called;
            });

            it("should directly print if print blob is ready and the print dialog isn't visible", () => {
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
                stubs.get = sandbox.stub(stubs.api, 'get').resolves('blob');
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
                expect(docBase.zoomControls instanceof ZoomControls).to.be.true;
                expect(docBase.pageControls.contentEl).to.equal(docBase.docEl);
            });
        });

        describe('bindDOMListeners()', () => {
            beforeEach(() => {
                stubs.addEventListener = sandbox.stub(docBase.docEl, 'addEventListener');
                stubs.addListener = sandbox.stub(fullscreen, 'addListener');
            });

            it('should add the correct listeners', () => {
                docBase.hasTouch = false;
                docBase.bindDOMListeners();

                expect(stubs.addEventListener).to.be.calledWith('scroll', docBase.throttledScrollHandler);
                expect(stubs.addEventListener).to.not.be.calledWith('touchstart', docBase.pinchToZoomStartHandler);
                expect(stubs.addEventListener).to.not.be.calledWith('touchmove', docBase.pinchToZoomChangeHandler);
                expect(stubs.addEventListener).to.not.be.calledWith('touchend', docBase.pinchToZoomEndHandler);
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
            });

            it('should remove the docBase element listeners if the docBase element exists', () => {
                docBase.unbindDOMListeners();
                expect(stubs.removeEventListener).to.be.calledWith('scroll', docBase.throttledScrollHandler);
            });

            it('should not remove the doc element listeners if the doc element does not exist', () => {
                const docElTemp = docBase.docEl;
                docBase.docEl = null;

                docBase.unbindDOMListeners();
                expect(stubs.removeEventListener).to.not.be.called;

                docBase.docEl = docElTemp;
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

        describe('unbindEventBusListeners', () => {
            it('should remove all the event listeners on the internal PDFJS event bus', () => {
                docBase.pdfEventBus = {
                    _listeners: {
                        event1: [() => {}],
                        event2: [() => {}, () => {}],
                    },
                    off: sandbox.stub(),
                };

                docBase.unbindEventBusListeners();

                expect(docBase.pdfEventBus.off).to.have.callCount(3);
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
                    currentScale: 'unknown',
                };

                docBase.pagesinitHandler();
                expect(stubs.loadUI).to.be.called;
                expect(stubs.setPage).to.be.called;
                expect(docBase.docEl).to.have.class('bp-is-scrollable');
                expect(stubs.setupPages).to.be.called;
            });

            it("should broadcast that the preview is loaded if it hasn't already", () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };
                docBase.loaded = false;
                docBase.pdfViewer.pagesCount = 5;
                docBase.encoding = 'gzip';

                docBase.pagesinitHandler();
                expect(stubs.emit).to.be.calledWith(VIEWER_EVENT.load, {
                    encoding: docBase.encoding,
                    endProgress: false,
                    numPages: 5,
                    scale: sinon.match.any,
                });
                expect(docBase.loaded).to.be.true;
            });

            it('should set the start page based', () => {
                const START_PAGE_NUM = 2;
                const PAGES_COUNT = 3;
                docBase.startPageNum = START_PAGE_NUM;
                docBase.pdfViewer = {
                    pagesCount: PAGES_COUNT,
                };
                docBase.pagesinitHandler();

                expect(stubs.setPage).to.have.been.calledWith(START_PAGE_NUM);
            });
        });

        describe('pagerenderedHandler()', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    currentScale: 0.5,
                    currentScaleValue: 0.5,
                };
                docBase.zoomControls = {
                    setCurrentScale: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };
                docBase.event = {
                    pageNumber: 1,
                };

                docBase.somePageRendered = false;
                stubs.emit = sandbox.stub(docBase, 'emit');
                stubs.initThumbnails = sandbox.stub(docBase, 'initThumbnails');
                stubs.hidePreload = sandbox.stub(docBase, 'hidePreload');
                stubs.resize = sandbox.stub(docBase, 'resize');
            });

            it('should emit the pagerender event', () => {
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.emit).to.be.calledWith('pagerender');
                expect(stubs.emit).to.be.calledWith('scale', { pageNum: 1, scale: 0.5 });
                expect(docBase.zoomControls.setCurrentScale).to.be.calledWith(docBase.pdfViewer.currentScale);
            });

            it('should emit handleAssetAndRepLoad event if not already emitted', () => {
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.emit).to.be.calledWith(VIEWER_EVENT.progressEnd);
                expect(docBase.zoomControls.setCurrentScale).to.be.calledWith(docBase.pdfViewer.currentScale);
            });

            it('should hide the preload and init thumbnails if no pages were previously rendered', () => {
                docBase.options.enableThumbnailsSidebar = true;
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.initThumbnails).to.be.called;
                expect(stubs.hidePreload).to.be.called;
                expect(docBase.somePageRendered).to.be.true;
                expect(docBase.resize).to.be.called;
                expect(docBase.zoomControls.setCurrentScale).to.be.calledWith(docBase.pdfViewer.currentScale);
            });

            it('should not init thumbnails if not enabled', () => {
                docBase.options.enableThumbnailsSidebar = false;
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.initThumbnails).not.to.be.called;
                expect(docBase.zoomControls.setCurrentScale).to.be.calledWith(docBase.pdfViewer.currentScale);
            });
        });

        describe('pagechangingHandler()', () => {
            beforeEach(() => {
                stubs.cachePage = sandbox.stub(docBase, 'cachePage');
                stubs.emit = sandbox.stub(docBase, 'emit');
                docBase.event = {
                    pageNumber: 1,
                };
                docBase.pdfViewer = {
                    pageCount: 1,
                };
                docBase.pageControls = {
                    updateCurrentPage: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };
                stubs.updateCurrentPage = docBase.pageControls.updateCurrentPage;
            });

            it('should emit the pagefocus event', () => {
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.emit).to.be.calledWith('pagefocus');
            });

            it('should update the current page', () => {
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.updateCurrentPage).to.be.calledWith(docBase.event.pageNumber);
            });

            it('should cache the page if it is loaded', () => {
                docBase.loaded = true;
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.cachePage).to.be.calledWith(docBase.event.pageNumber);
            });

            it('should not cache the page if it is not loaded', () => {
                docBase.loaded = false;
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.cachePage).to.not.be.called;
            });
        });

        describe('handleFullscreenEnter()', () => {
            it('should update the scale value, and resize the page', () => {
                docBase.pdfViewer = {
                    presentationModeState: 'normal',
                    currentScaleValue: 'normal',
                };
                const resizeStub = sandbox.stub(docBase, 'resize');

                docBase.handleFullscreenEnter();
                expect(resizeStub).to.be.called;
                expect(docBase.pdfViewer.currentScaleValue).to.equal('page-fit');
            });
        });

        describe('handleFullscreenExit()', () => {
            it('should update the scale value, and resize the page', () => {
                docBase.pdfViewer = {
                    presentationModeState: 'fullscreen',
                    currentScaleValue: 'pagefit',
                };
                const resizeStub = sandbox.stub(docBase, 'resize');

                docBase.handleFullscreenExit();
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
                    stopPropagation: sandbox.stub(),
                    preventDefault: sandbox.stub(),
                    pageX: 0,
                    pageY: 0,
                    touches: [
                        {
                            pageX: 0,
                            pageY: 100,
                        },
                        {
                            pageX: 200,
                            pageY: 200,
                        },
                    ],
                };
                docBase.isPinching = false;
                docBase.pdfViewer = {
                    _getVisiblePages: sandbox.stub(),
                };
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
                        pageY: 100,
                    },
                    {
                        pageX: 200,
                        pageY: 200,
                    },
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
                expect(util.getDistance).to.be.calledWith(
                    event.touches[0].pageX,
                    event.touches[0].pageY,
                    event.touches[1].pageX,
                    event.touches[1].pageY,
                );
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
                    scale: 1.5,
                };

                eventWithoutScale = {
                    touches: [
                        {
                            pageX: 100,
                            pageY: 100,
                        },
                        {
                            pageX: 300,
                            pageY: 300,
                        },
                    ],
                };

                docBase.pdfViewer = {
                    currentScale: 1,
                };

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
                    eventWithScale.scale = 0.1;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).to.equal(undefined);
                });

                it('should do nothing if the proposed scale is greater than the MAX_SCALE', () => {
                    docBase.pdfViewer = {
                        currentScale: 7,
                    };

                    eventWithScale.scale = 2;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).to.equal(undefined);
                });

                it('should do nothing if the proposed scale is less than the MIN_SCALE', () => {
                    docBase.pdfViewer = {
                        currentScale: 0.12,
                    };

                    eventWithScale.scale = 0.25;
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
                    update: sandbox.stub(),
                };

                docBase.pinchScale = 1.5;

                docBase.docEl.scroll = sandbox.stub();

                docBase.isPinching = true;
                docBase.pinchPage = document.createElement('div');
            });

            it('should do nothing if we are not pinching', () => {
                docBase.isPinching = false;
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).to.equal(1);
            });

            it('should do nothing if no pinched page exists', () => {
                docBase.pinchPage = null;
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).to.equal(1);
            });

            it('should perform a pdf.js zoom', () => {
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).to.equal(1.5);
            });

            it('should scroll to offset the zoom', () => {
                docBase.pinchToZoomEndHandler();
                expect(docBase.docEl.scroll).to.be.called;
            });

            it('should reset pinching state variables', () => {
                docBase.pinchToZoomEndHandler();

                expect(docBase.isPinching).to.be.false;
                expect(docBase.originalDistance).to.equal(0);
                expect(docBase.pinchScale).to.equal(1);
                expect(docBase.pinchPage).to.equal(null);
            });
        });

        describe('getStartPage()', () => {
            it('should return the start page as a number', () => {
                const startAt = {
                    value: 3,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).to.equal(3);
            });

            it('should return the floored number if a floating point number is passed', () => {
                const startAt = {
                    value: 4.1,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).to.equal(4);
            });

            it('should return undefined if a value < 1 is passed', () => {
                let startAt = {
                    value: 0,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).to.be.undefined;

                startAt = {
                    value: -100,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).to.be.undefined;
            });

            it('should return undefined if an invalid unit is passed', () => {
                const startAt = {
                    value: 3,
                    unit: 'foo',
                };

                expect(docBase.getStartPage(startAt)).to.be.undefined;
            });

            it('should return undefined if an invalid value is passed', () => {
                const startAt = {
                    value: 'foo',
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).to.be.undefined;
            });

            it('should return undefined if no unit and value is passed', () => {
                const startAt = {};
                expect(docBase.getStartPage(startAt)).to.be.undefined;
            });
        });

        describe('bindControlListeners()', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    pagesCount: 4,
                    currentPageNumber: 1,
                    currentScale: 0.9,
                    cleanup: sandbox.stub(),
                };

                docBase.controls = {
                    add: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };

                docBase.zoomControls = {
                    init: sandbox.stub(),
                };

                docBase.pageControls = {
                    add: sandbox.stub(),
                    removeListener: sandbox.stub(),
                };

                stubs.isFindDisabled = sandbox.stub(docBase, 'isFindDisabled');
            });

            it('should add the correct controls', () => {
                docBase.bindControlListeners();

                expect(docBase.controls.add).to.be.calledWith(
                    __('toggle_thumbnails'),
                    docBase.toggleThumbnails,
                    'bp-toggle-thumbnails-icon',
                    ICON_THUMBNAILS_TOGGLE,
                );

                expect(docBase.controls.add).to.be.calledWith(
                    __('toggle_findbar'),
                    sinon.match.func,
                    'bp-toggle-findbar-icon',
                    ICON_SEARCH,
                );

                expect(docBase.zoomControls.init).to.be.calledWith(0.9, {
                    maxZoom: 10,
                    minZoom: 0.1,
                    zoomInClassName: 'bp-doc-zoom-in-icon',
                    zoomOutClassName: 'bp-doc-zoom-out-icon',
                    onZoomIn: docBase.zoomIn,
                    onZoomOut: docBase.zoomOut,
                });

                expect(docBase.pageControls.add).to.be.calledWith(1, 4);

                expect(docBase.controls.add).to.be.calledWith(
                    __('enter_fullscreen'),
                    docBase.toggleFullscreen,
                    'bp-enter-fullscreen-icon',
                    ICON_FULLSCREEN_IN,
                );
                expect(docBase.controls.add).to.be.calledWith(
                    __('exit_fullscreen'),
                    docBase.toggleFullscreen,
                    'bp-exit-fullscreen-icon',
                    ICON_FULLSCREEN_OUT,
                );
            });

            it('should not add the toggle thumbnails control if the option is not enabled', () => {
                // Create a new instance that has enableThumbnailsSidebar as false
                docBase.options.enableThumbnailsSidebar = false;

                // Invoke the method to test
                docBase.bindControlListeners();

                // Check expectations
                expect(docBase.controls.add).to.not.be.calledWith(
                    __('toggle_thumbnails'),
                    docBase.toggleThumbnails,
                    'bp-toggle-thumbnails-icon',
                    ICON_THUMBNAILS_TOGGLE,
                );
            });

            it('should not add the find controls if find is disabled', () => {
                stubs.isFindDisabled.returns(true);

                docBase.bindControlListeners();

                expect(docBase.controls.add).not.to.be.calledWith(
                    __('toggle_findbar'),
                    sinon.match.func,
                    'bp-toggle-findbar-icon',
                    ICON_SEARCH,
                );
            });
        });

        describe('toggleThumbnails()', () => {
            let thumbnailsSidebar;
            let clock;

            beforeEach(() => {
                sandbox.stub(docBase, 'resize');
                sandbox.stub(docBase, 'emitMetric');
                sandbox.stub(docBase, 'emit');

                clock = sinon.useFakeTimers();

                stubs.toggleSidebar = sandbox.stub();
                stubs.isSidebarOpen = sandbox.stub();

                thumbnailsSidebar = {
                    toggle: stubs.toggleSidebar,
                    isOpen: false,
                    destroy: () => {},
                };
            });

            afterEach(() => {
                clock.restore();
            });

            it('should do nothing if thumbnails sidebar does not exist', () => {
                docBase.thumbnailsSidebar = undefined;

                docBase.toggleThumbnails();
                clock.tick(300);

                expect(docBase.resize).not.to.be.called;
            });

            it('should toggle open and resize the viewer', () => {
                docBase.thumbnailsSidebar = thumbnailsSidebar;
                docBase.pdfViewer = { pagesCount: 10 };
                thumbnailsSidebar.isOpen = true;

                docBase.toggleThumbnails();
                clock.tick(301);

                expect(stubs.classListAdd).to.be.calledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                expect(stubs.toggleSidebar).to.be.called;
                expect(docBase.resize).to.be.called;
                expect(docBase.emitMetric).to.be.calledWith({ name: USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN, data: 10 });
                expect(docBase.emit).to.be.calledWith('thumbnailsOpen');
            });

            it('should toggle close and resize the viewer', () => {
                docBase.thumbnailsSidebar = thumbnailsSidebar;
                docBase.pdfViewer = { pagesCount: 10 };

                docBase.toggleThumbnails();
                clock.tick(301);

                expect(stubs.classListRemove).to.be.calledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                expect(stubs.toggleSidebar).to.be.called;
                expect(docBase.resize).to.be.called;
                expect(docBase.emitMetric).to.be.calledWith({ name: USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE, data: 10 });
                expect(docBase.emit).to.be.calledWith('thumbnailsClose');
            });
        });

        describe('getMetricsWhitelist()', () => {
            it('should return the thumbnail sidebar events', () => {
                const expWhitelist = [
                    USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE,
                    USER_DOCUMENT_THUMBNAIL_EVENTS.NAVIGATE,
                    USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN,
                ];

                expect(docBase.getMetricsWhitelist()).to.be.eql(expWhitelist);
            });
        });

        describe('handleAnnotatorEvents()', () => {
            let thumbnailsSidebarEl;

            beforeEach(() => {
                stubs.classListAdd = sandbox.stub();
                stubs.classListRemove = sandbox.stub();

                thumbnailsSidebarEl = {
                    classList: {
                        add: stubs.classListAdd,
                        remove: stubs.classListRemove,
                    },
                    remove: sandbox.stub(),
                };

                docBase.thumbnailsSidebarEl = thumbnailsSidebarEl;

                stubs.handleAnnotatorEvents = sandbox.stub(BaseViewer.prototype, 'handleAnnotatorEvents');
            });

            it('should do nothing if thumbnails sidebar element does not exist', () => {
                docBase.thumbnailsSidebarEl = null;

                docBase.handleAnnotatorEvents();

                expect(stubs.classListAdd).not.to.be.called;
                expect(stubs.classListRemove).not.to.be.called;

                docBase.thumbnailsSidebarEl = thumbnailsSidebarEl;
            });

            it('should add a class if annotator mode enter', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationmodeenter' });

                expect(stubs.classListAdd).to.be.called;
                expect(stubs.classListRemove).not.to.be.called;
            });

            it('should remove a class if annotator mode exit', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationmodeexit' });

                expect(stubs.classListAdd).not.to.be.called;
                expect(stubs.classListRemove).to.be.called;
            });

            it('should do nothing if another annotator mode event', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationeventfoo' });

                expect(stubs.classListAdd).not.to.be.called;
                expect(stubs.classListRemove).not.to.be.called;
            });
        });

        describe('getCachedThumbnailsToggleState()', () => {
            beforeEach(() => {
                stubs.get = sandbox.stub(docBase.cache, 'get');
            });

            it('should return undefined if there is no existing cache entry', () => {
                stubs.get.returns(undefined);

                expect(docBase.getCachedThumbnailsToggledState()).to.be.undefined;
            });

            it('should return undefined if there is no existing cache entry for the file', () => {
                stubs.get.returns({ '123': true });

                expect(docBase.getCachedThumbnailsToggledState()).to.be.undefined;
            });

            it('should return the cached value if there is an existing cache entry for the file', () => {
                stubs.get.returns({ '0': true });

                expect(docBase.getCachedThumbnailsToggledState()).to.be.true;
            });
        });

        describe('cacheThumbnailsToggleState()', () => {
            const THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY = 'doc-thumbnails-toggled-map';

            beforeEach(() => {
                stubs.set = sandbox.stub(docBase.cache, 'set');
                stubs.get = sandbox.stub(docBase.cache, 'get');
            });

            it('should set toggled state to new object', () => {
                stubs.get.returns(undefined);

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).to.be.calledWith(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, { '0': true }, true);
            });

            it('should set toggled state to existing object', () => {
                stubs.get.returns({ '123': false });

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).to.be.calledWith(
                    THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY,
                    { '0': true, '123': false },
                    true,
                );
            });

            it('should update toggled state to existing object', () => {
                stubs.get.returns({ '0': false });

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).to.be.calledWith(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, { '0': true }, true);
            });
        });

        describe('shouldThumbnailsBeToggled()', () => {
            let mockPdfViewer;

            beforeEach(() => {
                stubs.getCachedThumbnailsToggledState = sandbox.stub(docBase, 'getCachedThumbnailsToggledState');
                mockPdfViewer = {
                    pdfDocument: { numPages: 5 },
                };
                docBase.pdfViewer = mockPdfViewer;
            });

            it('should return true if cached value is true', () => {
                stubs.getCachedThumbnailsToggledState.returns(true);
                expect(docBase.shouldThumbnailsBeToggled()).to.be.true;
            });

            it('should return false if cached value is false', () => {
                stubs.getCachedThumbnailsToggledState.returns(false);
                expect(docBase.shouldThumbnailsBeToggled()).to.be.false;
            });

            it('should return true if cached value is anything other than false', () => {
                stubs.getCachedThumbnailsToggledState.returns(undefined);
                expect(docBase.shouldThumbnailsBeToggled()).to.be.true;

                stubs.getCachedThumbnailsToggledState.returns(null);
                expect(docBase.shouldThumbnailsBeToggled()).to.be.true;

                stubs.getCachedThumbnailsToggledState.returns('123');
                expect(docBase.shouldThumbnailsBeToggled()).to.be.true;
            });

            it('should return false if document only has 1 page, even if cached state is true', () => {
                stubs.getCachedThumbnailsToggledState.returns(true);
                mockPdfViewer = {
                    pdfDocument: { numPages: 1 },
                };
                docBase.pdfViewer = mockPdfViewer;

                expect(docBase.shouldThumbnailsBeToggled()).to.be.false;
            });

            it('should return false if pdfDocument is not found', () => {
                stubs.getCachedThumbnailsToggledState.returns(true);
                mockPdfViewer = {
                    pdfDocument: {},
                };
                docBase.pdfViewer = mockPdfViewer;

                expect(docBase.shouldThumbnailsBeToggled()).to.be.false;
            });
        });
    });
});
