/* eslint-disable no-unused-expressions */
import * as file from '../../../file';
import * as util from '../../../util';
import AnnotationControlsFSM, {
    AnnotationInput,
    AnnotationMode,
    AnnotationState,
} from '../../../AnnotationControlsFSM';
import Api from '../../../api';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import ControlsRoot from '../../controls/controls-root';
import DocBaseViewer, {
    DISCOVERABILITY_STATES,
    PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER,
    countPdfOperations,
} from '../DocBaseViewer';
import DocFindBar from '../DocFindBar';
import DocPreloader from '../DocPreloader';
import DocFirstPreloader from '../DocFirstPreloader';
import fullscreen from '../../../Fullscreen';
import {
    ANNOTATOR_EVENT,
    CLASS_HIDDEN,
    DOCUMENT_FTUX_CURSOR_SEEN_KEY,
    PERMISSION_DOWNLOAD,
    STATUS_ERROR,
    STATUS_PENDING,
    STATUS_SUCCESS,
    SELECTOR_BOX_PREVIEW_CONTENT,
    CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN,
    CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER,
    CLASS_BOX_PREVIEW_THUMBNAILS_OPEN,
    SELECTOR_BOX_PREVIEW,
    STATUS_NONE,
} from '../../../constants';

import { ICON_PRINT_CHECKMARK } from '../../../icons';
import { LOAD_METRIC, RENDER_EVENT, REPORT_ACI, USER_DOCUMENT_THUMBNAIL_EVENTS, VIEWER_EVENT } from '../../../events';
import Timer from '../../../Timer';
import Thumbnail from '../../../Thumbnail';
import PageTracker from '../../../PageTracker';
import { EXIF_READER, JS, CSS, JS_NO_EXIF } from '../docAssets';
import ThumbnailsSidebar from '../../../ThumbnailsSidebar';

const LOAD_TIMEOUT_MS = 180000; // 3 min timeout
const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const SCROLL_END_TIMEOUT = 500;
const MOBILE_MAX_CANVAS_SIZE = 2949120; // ~3MP 1920x1536
const PAGES_UNIT_NAME = 'pages';

const sandbox = sinon.createSandbox();
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
    const pdfjsLib = { GlobalWorkerOptions: {} };
    const pdfjsViewer = {};

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/DocBaseViewer-test.html');

        containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
        stubs = {};

        Object.defineProperty(window, 'pdfjsLib', { value: pdfjsLib, writable: true });
        Object.defineProperty(window, 'pdfjsViewer', { value: pdfjsViewer, writable: true });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });

        rootEl = document.querySelector(SELECTOR_BOX_PREVIEW);
        stubs.api = new Api();
        stubs.classListAdd = jest.spyOn(rootEl.classList, 'add').mockImplementation();
        stubs.classListRemove = jest.spyOn(rootEl.classList, 'remove').mockImplementation();
        stubs.checkPermission = jest.spyOn(file, 'checkPermission').mockImplementation();
        stubs.urlCreator = jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(() => 'asset');
        stubs.getPreloadImageRequestPromises = jest.spyOn(util, 'getPreloadImageRequestPromises').mockReturnValue([]);
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
        jest.restoreAllMocks();
    });

    describe('setup()', () => {
        test('should correctly set a doc element, viewer element, thumbnails sidebar element, and a timeout', () => {
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
            docBase.options.enableAnnotationsDiscoverability = true;
            docBase.setup();

            expect(docBase.docEl.classList.contains('bp-doc')).toBe(true);
            expect(docBase.docEl.parentNode).toBe(docBase.containerEl);

            expect(docBase.viewerEl.classList.contains('pdfViewer')).toBe(true);
            expect(docBase.viewerEl.parentNode).toBe(docBase.docEl);

            expect(docBase.thumbnailsSidebarEl.classList.contains(CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER)).toBe(true);
            expect(docBase.thumbnailsSidebarEl.parentNode).toBe(docBase.containerEl.parentNode);

            expect(docBase.loadTimeout).toBe(LOAD_TIMEOUT_MS);
            expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('true');
        });

        test('should not set a thumbnails sidebar element if the option is not enabled', () => {
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

            expect(docBase.thumbnailsSidebarEl).toBeUndefined();
        });

        test('should default the thumbnails open if thumbnails toggle state is open', () => {
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
            jest.spyOn(docBase, 'getCachedThumbnailsToggledState').mockReturnValue(true);
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();
        });

        test('should default the thumbnails closed if thumbnails toggle state is closed', () => {
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
            jest.spyOn(docBase, 'getCachedThumbnailsToggledState').mockReturnValue(false);
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();

            expect(stubs.classListAdd).not.toBeCalledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
        });

        test('should not create a new Page Tracker object', () => {
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
            expect(docBase.pageTracker === undefined).toBe(true);
        });

        test('should create a new Page Tracker object', () => {
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
                features: { advancedContentInsights: { enabled: true } },
            });
            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;
            docBase.setup();
            expect(docBase.pageTracker).toBeInstanceOf(PageTracker);
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
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });

            docBase.containerEl = containerEl;
            docBase.rootEl = rootEl;

            docBase.setup();
        });

        describe('destroy()', () => {
            beforeEach(() => {
                jest.spyOn(docBase.rootEl, 'removeChild').mockImplementation();
            });

            test('should unbind listeners and clear the print blob', () => {
                const unbindDomStub = jest.spyOn(docBase, 'unbindDOMListeners').mockImplementation();
                const unbindEventBusStub = jest.spyOn(docBase, 'unbindEventBusListeners').mockImplementation();
                docBase.printURL = 'someblob';
                jest.spyOn(URL, 'revokeObjectURL').mockImplementation();

                docBase.destroy();
                expect(unbindDomStub).toBeCalled();
                expect(unbindEventBusStub).toBeCalled();
                expect(docBase.printBlob).toBeNull();
                expect(URL.revokeObjectURL).toBeCalledWith(docBase.printURL);
            });

            test('should destroy the controls', () => {
                docBase.controls = {
                    destroy: jest.fn(),
                };

                docBase.destroy();
                expect(docBase.controls.destroy).toBeCalled();
            });

            test('should destroy the find bar', () => {
                docBase.findBar = {
                    destroy: jest.fn(),
                    removeListener: jest.fn(),
                };

                docBase.destroy();
                expect(docBase.findBar.destroy).toBeCalled();
            });

            test('should clean up the PDF network requests', () => {
                docBase.pdfLoadingTask = {
                    destroy: jest.fn(),
                };

                docBase.destroy();
                expect(docBase.pdfLoadingTask.destroy).toBeCalled();
            });

            test('should clean up the viewer and the document object', () => {
                docBase.pdfViewer = {
                    cleanup: jest.fn(),
                    pdfDocument: {
                        destroy: jest.fn(),
                    },
                };

                docBase.destroy();
                expect(docBase.pdfViewer.cleanup).toBeCalled();
                expect(docBase.pdfViewer.pdfDocument.destroy).toBeCalled();
            });

            test('should clean up the thumbnails sidebar instance and DOM element', () => {
                docBase.thumbnailsSidebar = {
                    destroy: jest.fn(),
                };
                docBase.thumbnailsSidebarEl = document.createElement('div');

                docBase.destroy();
                expect(docBase.thumbnailsSidebar.destroy).toBeCalled();
                expect(docBase.rootEl.removeChild).toBeCalled();
                expect(stubs.classListRemove).toBeCalled();
            });

            test('should destroy the page tracker object', () => {
                docBase.pageTracker = new PageTracker();
                jest.spyOn(docBase.pageTracker, 'destroy').mockImplementation();
                docBase.destroy();
                expect(docBase.pageTracker.destroy).toBeCalled();
            });
        });

        describe('prefetch()', () => {
            beforeEach(() => {
                docBase.options.isDocFirstPrefetchEnabled = false;
            });

            test('should prefetch assets if assets is true', () => {
                jest.spyOn(docBase, 'prefetchAssets').mockImplementation();
                jest.spyOn(stubs.api, 'get').mockImplementation();
                docBase.prefetch({ assets: true, preload: false, content: false });
                expect(docBase.prefetchAssets).toBeCalled();
            });

            test('should prefetch doc first pages if assets is true and ff is on and preload is true', () => {
                jest.spyOn(docBase, 'prefetchAssets').mockImplementation();
                jest.spyOn(docBase, 'prefetchPreloaderImages').mockImplementation();

                docBase.options.isDocFirstPrefetchEnabled = true;
                docBase.prefetch({ assets: true, preload: true, content: false });
                expect(docBase.prefetchPreloaderImages).toHaveBeenCalled();
            });

            test('should not prefetch doc first pages if assets is true and ff is on and preload is true and is watermarked', () => {
                docBase.options.file.watermark_info = {
                    is_watermarked: true,
                };
                jest.spyOn(docBase, 'prefetchAssets').mockImplementation();
                jest.spyOn(docBase, 'prefetchPreloaderImages').mockImplementation();
                docBase.options.isDocFirstPrefetchEnabled = true;
                docBase.prefetch({ assets: true, preload: true, content: false });
                expect(docBase.prefetchPreloaderImages).not.toHaveBeenCalled();
            });

            test('should prefetch preload if preload is true and representation is ready', () => {
                const template = 'someTemplate';
                const preloadRep = {
                    content: {
                        url_template: template,
                    },
                    status: {
                        state: 'success',
                    },
                };
                jest.spyOn(stubs.api, 'get').mockImplementation();
                jest.spyOn(file, 'getRepresentation').mockReturnValue(preloadRep);
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation();

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).toHaveBeenCalledWith(template);
            });

            test('should not prefetch preload if preload is true and representation is not ready', () => {
                const template = 'someTemplate';
                const preloadRep = {
                    content: {
                        url_template: template,
                    },
                    status: {
                        state: 'pending',
                    },
                };
                jest.spyOn(stubs.api, 'get');
                jest.spyOn(file, 'getRepresentation').mockReturnValue(preloadRep);
                jest.spyOn(docBase, 'createContentUrlWithAuthParams');

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).not.toBeCalledWith(template);
            });

            test('should not prefetch preload if file is watermarked', () => {
                docBase.options.file.watermark_info = {
                    is_watermarked: true,
                };
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation();

                docBase.prefetch({ assets: false, preload: true, content: false });

                expect(docBase.createContentUrlWithAuthParams).not.toHaveBeenCalled();
            });

            test('should prefetch content if content is true and representation is ready', () => {
                docBase.options.file.watermark_info = {
                    is_watermarked: false,
                };

                docBase.options.file.representations = {};
                docBase.options.file.representations.entries = [
                    {
                        representation: 'jpg',
                        status: {
                            state: 'success',
                        },
                        content: {
                            url_template: 'someContentUrl',
                        },
                    },
                    {
                        representation: 'webp',
                        status: {
                            state: 'success',
                        },
                        content: {
                            url_template: 'someContentUrl',
                        },
                    },
                ];
                docBase.options.isDocFirstPrefetchEnabled = true;
                const contentUrl = 'someContentUrl';
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockReturnValue(contentUrl);
                jest.spyOn(docBase, 'isRepresentationReady').mockReturnValue(true);
                docBase.prefetch({ assets: false, preload: true, content: true });
                expect(stubs.getPreloadImageRequestPromises).toBeCalled();
            });

            test('should not prefetch content if content is true but representation is not ready', () => {
                jest.spyOn(docBase, 'isRepresentationReady').mockReturnValue(false);
                sandbox
                    .mock(stubs.api)
                    .expects('get')
                    .never();
                docBase.prefetch({ assets: false, preload: false, content: true });
            });

            test('should not prefetch content if file is watermarked', () => {
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
            let startPreloadTimerStub;
            const jpegUrlTemplate = 'https://preload-url-template';
            const webpUrlTemplate = 'https://url/{+asset_path}';
            let webpRep;
            let jpegRep;
            beforeEach(() => {
                docBase.preloader = new DocPreloader();
                startPreloadTimerStub = jest.spyOn(docBase, 'startPreloadTimer');
                webpRep = {
                    content: {
                        url_template: webpUrlTemplate,
                    },
                    metadata: {
                        pages: 4,
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                };

                jpegRep = {
                    content: {
                        url_template: jpegUrlTemplate,
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                };

                jest.spyOn(file, 'getRepresentation').mockImplementation((theFile, repName) => {
                    if (theFile && repName === 'jpg') {
                        return jpegRep;
                    }
                    if (theFile && repName === 'webp') {
                        return webpRep;
                    }

                    return '';
                });

                jest.spyOn(docBase, 'getViewerOption').mockImplementation(option => {
                    if (option === 'preload') {
                        return true;
                    }
                    return false;
                });
            });

            test('should not do anything if there is a previously cached page', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(2);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if startAt is not page 1', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                docBase.startPageNum = 3;
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if file is watermarked', () => {
                docBase.options.file = {
                    watermark_info: {
                        is_watermarked: true,
                    },
                };
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                jest.spyOn(file, 'getRepresentation').mockReturnValue({});
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if both reps are missing', () => {
                docBase.options.file = {};
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                webpRep = null;
                jpegRep = null;

                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if no preload or paged preload rep is available', () => {
                docBase.options.file = {};
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                webpRep.status.state = STATUS_NONE;
                jpegRep.status.state = STATUS_NONE;

                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if preload option is not set', () => {
                docBase.options.file = {};
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(false);
                jest.spyOn(file, 'getRepresentation').mockReturnValue(null);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if reps have an error', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                webpRep.status.state = STATUS_ERROR;
                jpegRep.status.state = STATUS_ERROR;
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should not do anything if preload reps are pending', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                webpRep.status.state = STATUS_PENDING;
                jpegRep.status.state = STATUS_PENDING;
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .never();

                docBase.showPreload();
            });

            test('should show preload if webp paged rep is unavalable but jpeg preload rep is available', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                webpRep.status.state = STATUS_NONE;
                jest.spyOn(docBase.preloader, 'showPreload').mockImplementation();
                docBase.showPreload();
                expect(docBase.preloader.showPreload).toHaveBeenCalled();
            });

            test('should show preload of webp paged rep is available but jpeg preload rep is unavailable', () => {
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('preload')
                    .returns(true);
                jpegRep.status.state = STATUS_NONE;
                jest.spyOn(docBase.preloader, 'showPreload').mockImplementation();
                docBase.showPreload();
                expect(docBase.preloader.showPreload).toHaveBeenCalled();
            });

            test('should show preload with correct authed URL', () => {
                const preloadUrl = 'someUrl';
                docBase.options.file = {};
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                jest.spyOn(file, 'getRepresentation').mockReturnValue({
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
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockReturnValue(preloadUrl);
                sandbox
                    .mock(docBase.preloader)
                    .expects('showPreload')
                    .withArgs(preloadUrl, docBase.containerEl);

                docBase.showPreload();
            });

            test('should start preload timer for metrics', () => {
                const preloadUrl = 'someUrl';
                docBase.options.file = {};
                jest.spyOn(docBase, 'getCachedPage').mockReturnValue(1);
                jest.spyOn(file, 'getRepresentation').mockReturnValue({
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
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockReturnValue(preloadUrl);

                sandbox.mock(docBase.preloader).expects('showPreload');

                docBase.showPreload();

                expect(startPreloadTimerStub).toBeCalled();
            });

            test('should load doc first preloader properly for doc first pages when webp rep available', () => {
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation(url => {
                    // pagedUrlTemplate gets turned into this url in the code as {+asset_path} is replaced with PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER
                    if (url === `https://url/${PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER}`) {
                        return 'paged-url';
                    }
                    if (url === jpegUrlTemplate) {
                        return 'preload-url';
                    }

                    return '';
                });

                jest.spyOn(docBase.preloader, 'showPreload').mockImplementation();
                docBase.docFirstPagesEnabled = true;
                docBase.showPreload();
                expect(startPreloadTimerStub).toHaveBeenCalled();
                expect(docBase.preloader.showPreload).toHaveBeenCalledWith(null, containerEl, 'paged-url', 4, docBase);
            });

            test('should not throw an error in doc first preloader and use jpeg rep if no webp rep available', () => {
                webpRep = null;
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation(url => {
                    if (url === jpegUrlTemplate) {
                        return 'jpeg-preload-url';
                    }

                    return 'url without template';
                });

                jest.spyOn(docBase.preloader, 'showPreload').mockImplementation();
                docBase.docFirstPagesEnabled = true;
                docBase.showPreload();
                expect(startPreloadTimerStub).toHaveBeenCalled();
                expect(docBase.preloader.showPreload).toHaveBeenCalledWith(
                    'jpeg-preload-url',
                    containerEl,
                    null,
                    1,
                    docBase,
                );
            });

            test('should not throw an error in doc first preloader and use jpeg rep if webp is in error', () => {
                webpRep = {
                    content: {
                        url_template: webpUrlTemplate,
                    },
                    status: {
                        state: STATUS_ERROR,
                    },
                };

                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation(url => {
                    // the webpRep template gets turned into this url in the code as {+asset_path} is replaced with PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER
                    if (url === `https://url/${PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER}`) {
                        return 'paged-url';
                    }
                    if (url === jpegUrlTemplate) {
                        return 'preload-url';
                    }

                    return '';
                });

                jest.spyOn(docBase.preloader, 'showPreload').mockImplementation();
                docBase.docFirstPagesEnabled = true;
                docBase.showPreload();
                expect(startPreloadTimerStub).toHaveBeenCalled();
                expect(docBase.preloader.showPreload).toHaveBeenCalledWith(
                    'preload-url',
                    containerEl,
                    null,
                    1,
                    docBase,
                );
            });
        });

        describe('hidePreload', () => {
            beforeEach(() => {
                docBase.preloader = new DocPreloader();
            });

            test('should hide the preload', () => {
                sandbox.mock(docBase.preloader).expects('hidePreload');
                docBase.hidePreload();
            });
        });

        describe('load()', () => {
            const loadFunc = BaseViewer.prototype.load;

            beforeEach(() => {
                jest.spyOn(stubs.api, 'get').mockImplementation();
                jest.spyOn(docBase, 'setup').mockImplementation();
                Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });
                jest.spyOn(docBase, 'createContentUrlWithAuthParams').mockImplementation();
                jest.spyOn(docBase, 'handleAssetAndRepLoad').mockImplementation();
                jest.spyOn(docBase, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
                jest.spyOn(docBase, 'loadAssets').mockResolvedValue();
                jest.spyOn(docBase, 'loadBoxAnnotations').mockImplementation();
            });

            afterEach(() => {
                Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
            });

            test('should load a document', () => {
                return docBase.load().then(() => {
                    expect(docBase.loadAssets).toHaveBeenCalledWith(JS, CSS);
                    expect(docBase.setup).not.toHaveBeenCalled();
                    expect(docBase.createContentUrlWithAuthParams).toHaveBeenCalledWith('foo');
                    expect(docBase.handleAssetAndRepLoad).toHaveBeenCalled();
                    expect(docBase.loadAssets).not.toHaveBeenCalledWith(EXIF_READER);
                });
            });

            test('should load new exif reader if docfirst pages enabled', () => {
                docBase.docFirstPagesEnabled = true;
                return docBase.load().then(() => {
                    expect(docBase.loadAssets).toHaveBeenNthCalledWith(2, JS_NO_EXIF, CSS);
                    expect(docBase.loadAssets).toHaveBeenNthCalledWith(1, EXIF_READER);
                    expect(docBase.setup).not.toHaveBeenCalled();
                    expect(docBase.createContentUrlWithAuthParams).toHaveBeenCalledWith('foo');
                    expect(docBase.handleAssetAndRepLoad).toHaveBeenCalled();
                });
            });
        });

        describe('handleAssetAndRepLoad', () => {
            test('should setup pdfjs, init viewer, print, and find', () => {
                const url = 'foo';
                docBase.pdfUrl = url;
                docBase.pdfViewer = {
                    currentScale: 1,
                };

                const setupPdfjsStub = jest.spyOn(docBase, 'setupPdfjs').mockImplementation();
                const initViewerStub = jest.spyOn(docBase, 'initViewer').mockImplementation();
                const initPrintStub = jest.spyOn(docBase, 'initPrint').mockImplementation();
                const initFindStub = jest.spyOn(docBase, 'initFind').mockImplementation();
                const loadBoxAnnotations = jest.spyOn(docBase, 'loadBoxAnnotations').mockResolvedValue();

                docBase.handleAssetAndRepLoad();

                expect(setupPdfjsStub).toBeCalled();
                expect(initViewerStub).toBeCalledWith(docBase.pdfUrl);
                expect(initPrintStub).toBeCalled();
                expect(initFindStub).toBeCalled();
                expect(loadBoxAnnotations).toBeCalled();
            });
        });

        describe('initFind()', () => {
            beforeEach(() => {
                docBase.pdfEventBus = {
                    off: jest.fn(),
                    on: jest.fn(),
                };
                docBase.pdfFindController = {
                    execute: jest.fn(),
                };
                docBase.pdfViewer = {
                    setFindController: jest.fn(),
                };
            });

            test('should not set find bar if viewer option disableFindBar is true', () => {
                sandbox
                    .stub(docBase, 'getViewerOption')
                    .withArgs('disableFindBar')
                    .returns(true);
                docBase.initFind();
                expect(docBase.findBar).toBeUndefined();
            });

            test('should not set find bar if the user does not have download permissions', () => {
                stubs.checkPermission.mockReturnValueOnce(false);
                docBase.initFind();
                expect(docBase.findBar).toBeUndefined();
            });

            test('should set findBar to a function if viewer option disableFindBar is not set', () => {
                stubs.checkPermission.mockReturnValueOnce(true);
                docBase.initFind();
                expect(docBase.findBar).toBeInstanceOf(DocFindBar);
            });
        });

        describe('find()', () => {
            beforeEach(() => {
                docBase.findBar = {
                    setFindFieldElValue: jest.fn(),
                    findFieldHandler: jest.fn(),
                    open: jest.fn(),
                    destroy: jest.fn(),
                    removeListener: jest.fn(),
                };

                jest.spyOn(docBase, 'setPage').mockImplementation();
            });

            test('should do nothing if there is no findbar', () => {
                docBase.findBar = undefined;

                docBase.find('hi');

                expect(docBase.setPage).not.toBeCalled();
            });

            test('should set the search value and handle a find', () => {
                docBase.find('hi');

                expect(docBase.setPage).toBeCalledWith(1);
                expect(docBase.findBar.setFindFieldElValue).toBeCalledWith('hi');
                expect(docBase.findBar.findFieldHandler).toBeCalled();
            });

            test('should open the findbar if the openFindBar flag is true', () => {
                docBase.find('hi', true);

                expect(docBase.findBar.setFindFieldElValue).toBeCalledWith('hi');
                expect(docBase.findBar.findFieldHandler).toBeCalled();
                expect(docBase.findBar.open).toBeCalled();
            });
        });

        describe('browserPrint()', () => {
            beforeEach(() => {
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                stubs.createObject = jest.spyOn(URL, 'createObjectURL').mockReturnValue('test');
                stubs.open = jest.spyOn(window, 'open').mockReturnValue(false);
                stubs.browser = jest.spyOn(Browser, 'getName').mockReturnValue('Chrome');
                stubs.printResult = { print: jest.fn(), addEventListener: jest.fn() };
                docBase.printBlob = true;
                window.navigator.msSaveOrOpenBlob = jest.fn(() => true);
            });

            test('should use the open or save dialog if on IE or Edge', () => {
                docBase.browserPrint();
                expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
                expect(stubs.emit).toBeCalled();
            });

            test('should use the open or save dialog if on IE or Edge and emit a message', () => {
                docBase.browserPrint();
                expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
                expect(stubs.emit).toBeCalled();
            });

            test('should emit an error message if the print result fails on IE or Edge', () => {
                window.navigator.msSaveOrOpenBlob.mockReturnValue(false);

                docBase.browserPrint();
                expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
                expect(stubs.emit).toBeCalledWith('printerror');
            });

            test('should open the pdf in a new tab if not on IE or Edge', () => {
                window.navigator.msSaveOrOpenBlob = undefined;

                docBase.browserPrint();
                expect(stubs.createObject).toBeCalledWith(docBase.printBlob);
                expect(stubs.open).toBeCalledWith(docBase.printURL);
                expect(stubs.emit).toBeCalled();
            });

            test('should print on load in the chrome browser', () => {
                window.navigator.msSaveOrOpenBlob = undefined;
                stubs.open.mockReturnValue(stubs.printResult);

                docBase.browserPrint();
                expect(stubs.createObject).toBeCalledWith(docBase.printBlob);
                expect(stubs.open).toBeCalledWith(docBase.printURL);
                expect(stubs.browser).toBeCalled();
                expect(stubs.emit).toBeCalled();
            });

            test('should use a timeout in safari', () => {
                jest.useFakeTimers();

                window.navigator.msSaveOrOpenBlob = undefined;
                stubs.open.mockReturnValue(stubs.printResult);
                stubs.browser.mockReturnValue('Safari');

                docBase.browserPrint();
                jest.advanceTimersByTime(PRINT_TIMEOUT_MS + 1);

                expect(stubs.createObject).toBeCalledWith(docBase.printBlob);
                expect(stubs.open).toBeCalled();
                expect(stubs.browser).toBeCalled();
                expect(stubs.printResult.print).toBeCalled();
                expect(stubs.emit).toBeCalled();

                jest.clearAllTimers();
            });
        });

        describe('Page Methods', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    currentPageNumber: 1,
                };
                stubs.cachePage = jest.spyOn(docBase, 'cachePage').mockImplementation();
                stubs.setPage = jest.spyOn(docBase, 'setPage');
            });

            describe('previousPage()', () => {
                test('should call setPage', () => {
                    docBase.previousPage();
                    expect(stubs.setPage).toBeCalledWith(0);
                });
            });

            describe('nextPage()', () => {
                test('should call setPage', () => {
                    docBase.pdfViewer = {
                        currentPageNumber: 0,
                    };

                    docBase.nextPage();
                    expect(stubs.setPage).toBeCalledWith(1);
                });
            });

            describe('setPage()', () => {
                test("should set the pdfViewer's page and cache it", () => {
                    docBase.pdfViewer = {
                        currentPageNumber: 1,
                        pagesCount: 3,
                    };

                    docBase.setPage(2);

                    expect(docBase.pdfViewer.currentPageNumber).toBe(2);
                    expect(stubs.cachePage).toBeCalled();
                });

                test('should not do anything if setting an invalid page', () => {
                    docBase.pdfViewer = {
                        currentPageNumber: 1,
                        pagesCount: 3,
                    };

                    // Too low
                    docBase.setPage(0);

                    expect(docBase.pdfViewer.currentPageNumber).toBe(1);
                    expect(stubs.cachePage).not.toBeCalled();

                    // Too high
                    docBase.setPage(4);
                    expect(docBase.pdfViewer.currentPageNumber).toBe(1);
                    expect(stubs.cachePage).not.toBeCalled();
                });

                test('should scroll to doc first page when thumbnail is clicked in the preloader', () => {
                    const fileId = '1234';
                    const docBaseObj = new DocBaseViewer({
                        cache: {
                            set: () => {},
                            has: () => {},
                            get: () => {},
                            unset: () => {},
                        },

                        file: {
                            id: fileId,
                            extension: 'pdf',
                        },
                        enableThumbnailsSidebar: true,
                    });

                    const pageNumber = 2;
                    const mockElement = {
                        scrollIntoView: jest.fn(),
                    };

                    jest.spyOn(document, 'querySelector').mockImplementation(query => {
                        if (query === `[data-preload-index="${pageNumber}"]`) {
                            return mockElement;
                        }
                        return null;
                    });

                    const setCachePage = jest.spyOn(docBaseObj, 'cachePage').mockImplementation();
                    const setCurrentPage = jest.fn();

                    docBaseObj.pdfViewer = {
                        currentPageNumber: 0,
                        pagesCount: 0,
                    };

                    docBaseObj.thumbnailsSidebar = {
                        currentPage: 0,
                        setCurrentPage,
                    };

                    docBaseObj.preloader = { thumbnailsOpen: true };
                    docBaseObj.setPage(pageNumber);
                    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
                    expect(setCurrentPage).toHaveBeenCalledWith(pageNumber);
                    expect(setCachePage).toHaveBeenCalledWith(pageNumber);
                });
            });
        });

        describe('getCachedPage()', () => {
            beforeEach(() => {
                stubs.has = jest.spyOn(docBase.cache, 'has').mockReturnValue(true);
                stubs.get = jest.spyOn(docBase.cache, 'get').mockReturnValue({ 0: 10 });
            });

            test('should return the cached current page if present', () => {
                docBase.options = {
                    file: {
                        id: 0,
                    },
                };

                const page = docBase.getCachedPage();
                expect(stubs.has).toBeCalled();
                expect(stubs.get).toBeCalled();
                expect(page).toBe(10);
            });

            test('should return the first page if the current page is not cached', () => {
                stubs.has.mockReturnValue(false);

                const page = docBase.getCachedPage();
                expect(stubs.has).toBeCalled();
                expect(page).toBe(1);
            });
        });

        describe('cachePage()', () => {
            beforeEach(() => {
                docBase.options = {
                    file: {
                        id: 0,
                    },
                };
                stubs.has = jest.spyOn(docBase.cache, 'has').mockReturnValue(true);
                stubs.get = jest.spyOn(docBase.cache, 'get').mockReturnValue({ 0: 10 });
                stubs.set = jest.spyOn(docBase.cache, 'set').mockReturnValue({ 0: 10 });
            });

            test('should get the current page map if it does not exist and cache the given page', () => {
                docBase.cachePage(10);
                expect(stubs.has).toBeCalled();
                expect(stubs.get).toBeCalled();
                expect(stubs.set).toBeCalled();
            });

            test('should use the current page map if it exists', () => {
                stubs.has.mockReturnValue(false);

                docBase.cachePage(10);
                expect(stubs.has).toBeCalled();
                expect(stubs.get).not.toBeCalled();
                expect(stubs.set).toBeCalled();
            });
        });

        describe('zoom methods', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    currentScale: 8.9,
                };
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
            });

            afterEach(() => {
                docBase.pdfViewer = undefined;
            });

            describe('zoomIn()', () => {
                test('should zoom in until it hits the number of ticks or the max scale', () => {
                    docBase.zoomIn(12);
                    expect(docBase.pdfViewer.currentScaleValue).toBe(MAX_SCALE);

                    docBase.pdfViewer.currentScale = 1;
                    docBase.zoomIn(1);
                    expect(docBase.pdfViewer.currentScaleValue).toBe(DEFAULT_SCALE_DELTA);
                });

                test('should emit the zoom event', () => {
                    docBase.zoomIn(1);
                    expect(stubs.emit).toBeCalledWith('zoom', { canZoomIn: true, canZoomOut: true, zoom: 9 });
                });

                test("should not emit the zoom event if we can't zoom in", () => {
                    docBase.pdfViewer.currentScale = MAX_SCALE;

                    docBase.zoomIn(1);
                    expect(stubs.emit).not.toBeCalledWith('zoom');
                });
            });

            describe('zoomOut()', () => {
                test('should zoom out until it hits the number of ticks or the min scale', () => {
                    docBase.pdfViewer.currentScale = 0.2;

                    docBase.zoomOut(10);
                    expect(docBase.pdfViewer.currentScaleValue).toBe(MIN_SCALE);

                    docBase.pdfViewer.currentScale = DEFAULT_SCALE_DELTA;
                    docBase.zoomOut(1);
                    expect(docBase.pdfViewer.currentScaleValue).toBe(1);
                });

                test('should emit the zoom event', () => {
                    docBase.zoomOut(1);
                    expect(stubs.emit).toBeCalledWith('zoom', { canZoomIn: true, canZoomOut: true, zoom: 8.8 });
                });

                test("should not emit the zoom event if we can't zoom out", () => {
                    docBase.pdfViewer.currentScale = MIN_SCALE;

                    docBase.zoomOut(1);
                    expect(stubs.emit).not.toBeCalledWith('zoom');
                });
            });
        });

        describe('onKeydown()', () => {
            beforeEach(() => {
                stubs.previousPage = jest.spyOn(docBase, 'previousPage').mockImplementation();
                stubs.nextPage = jest.spyOn(docBase, 'nextPage').mockImplementation();
            });

            test('should call the correct method and return true if the binding exists', () => {
                const arrowLeft = docBase.onKeydown('ArrowLeft');
                expect(stubs.previousPage).toBeCalledTimes(1);
                expect(arrowLeft).toBe(true);

                const arrowRight = docBase.onKeydown('ArrowRight');
                expect(stubs.nextPage).toBeCalledTimes(1);
                expect(arrowRight).toBe(true);

                const leftBracket = docBase.onKeydown('[');
                expect(stubs.previousPage).toBeCalledTimes(2);
                expect(leftBracket).toBe(true);

                const rightBracket = docBase.onKeydown(']');
                expect(stubs.nextPage).toBeCalledTimes(2);
                expect(rightBracket).toBe(true);
            });

            test('should call the findBar onKeydown if present', () => {
                const keys = 'ctrl+f';
                const mockEvent = jest.fn();
                const onKeydownStub = jest.fn();
                docBase.findBar = {
                    onKeydown: onKeydownStub,
                    destroy: jest.fn(),
                    removeListener: jest.fn(),
                };
                docBase.onKeydown(keys, mockEvent);
                expect(onKeydownStub).toBeCalledTimes(1);
            });

            test('should return false if there is no match', () => {
                const arrowLeft = docBase.onKeydown('ArrowUp');
                expect(stubs.previousPage).not.toBeCalled();
                expect(stubs.nextPage).not.toBeCalled();
                expect(arrowLeft).toBe(false);
            });
        });

        describe('initViewer()', () => {
            beforeEach(() => {
                stubs.bindDOMListeners = jest.spyOn(docBase, 'bindDOMListeners').mockImplementation();
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                stubs.getDocument = jest.fn(() => ({
                    destroy: jest.fn(),
                    promise: Promise.resolve(),
                }));
                stubs.getViewerOption = jest.spyOn(docBase, 'getViewerOption').mockImplementation();
                stubs.pdfEventBus = {
                    off: jest.fn(),
                    on: jest.fn(),
                };
                stubs.pdfViewer = {
                    setDocument: jest.fn(),
                };
                stubs.pdfViewerClass = jest.fn(() => stubs.pdfViewer);
                stubs.shouldThumbnailsBeToggled = jest.spyOn(docBase, 'shouldThumbnailsBeToggled').mockImplementation();
                stubs.resize = jest.spyOn(docBase, 'resize').mockImplementation();

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
                    LinkTarget: { NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4 }, // Legacy PDFJS
                };
                docBase.pdfjsViewer = {
                    EventBus: jest.fn(() => stubs.pdfEventBus),
                    LinkTarget: { NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4 },
                    PDFFindController: jest.fn(() => ({
                        setLinkService: jest.fn(),
                    })),
                    PDFLinkService: jest.fn(() => ({
                        setDocument: jest.fn(),
                        setViewer: jest.fn(),
                    })),
                    PDFViewer: stubs.pdfViewerClass,
                };
            });

            test('should create an event bus and subscribe to relevant events', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).toBeCalled();
                    expect(stubs.pdfEventBus.on).toBeCalledWith('pagechanging', docBase.pagechangingHandler);
                    expect(stubs.pdfEventBus.on).toBeCalledWith('pagerendered', docBase.pagerenderedHandler);
                    expect(stubs.pdfEventBus.on).toBeCalledWith('pagesinit', docBase.pagesinitHandler);
                });
            });

            test('should set maxCanvasPixels if on mobile', () => {
                docBase.isMobile = true;

                return docBase.initViewer('').then(() => {
                    expect(stubs.pdfViewerClass).toBeCalledWith(
                        expect.objectContaining({ maxCanvasPixels: MOBILE_MAX_CANVAS_SIZE }),
                    );
                });
            });

            test('should enable the text layer if the user is on mobile', () => {
                docBase.isMobile = true;
                stubs.checkPermission.mockReturnValueOnce(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('disableTextLayer');
                    // Text Layer mode 1 = enabled
                    expect(stubs.pdfViewerClass).toBeCalledWith(expect.objectContaining({ textLayerMode: 1 }));
                });
            });

            test('should add view only class if user does not have download permissions', () => {
                docBase.containerEl = containerEl;
                stubs.checkPermission.mockReturnValueOnce(false);

                return docBase.initViewer('').then(() => {
                    expect(stubs.checkPermission).toBeCalledWith(docBase.options.file, PERMISSION_DOWNLOAD);
                    expect(docBase.viewerEl).toHaveClass('pdfViewer--viewOnly');
                });
            });

            test('should not add view only class if user has download permissions', () => {
                docBase.containerEl = containerEl;
                stubs.checkPermission.mockReturnValueOnce(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.checkPermission).toBeCalledWith(docBase.options.file, PERMISSION_DOWNLOAD);
                    expect(docBase.viewerEl).not.toHaveClass('pdfViewer--viewOnly');
                });
            });

            test('should use proper text layer mode if user has download permissions and disableTextLayer viewer option is not set', () => {
                stubs.getViewerOption.mockReturnValue(false);
                stubs.checkPermission.mockReturnValueOnce(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.checkPermission).toBeCalledWith(docBase.options.file, PERMISSION_DOWNLOAD);
                    expect(stubs.getViewerOption).toBeCalledWith('disableTextLayer');
                    // Text Layer mode 1 = enabled
                    expect(stubs.pdfViewerClass).toBeCalledWith(expect.objectContaining({ textLayerMode: 1 }));
                });
            });

            test('should use proper text layer mode if user does not have download permissions and disableTextLayer viewer option is not set', () => {
                stubs.getViewerOption.mockReturnValue(false);
                stubs.checkPermission.mockReturnValueOnce(false);

                return docBase.initViewer('').then(() => {
                    expect(stubs.checkPermission).toBeCalledWith(docBase.options.file, PERMISSION_DOWNLOAD);
                    expect(stubs.getViewerOption).toBeCalledWith('disableTextLayer');
                    // Text Layer mode 2 = enabled permissions
                    expect(stubs.pdfViewerClass).toBeCalledWith(expect.objectContaining({ textLayerMode: 2 }));
                });
            });

            test('should disable the text layer if disableTextLayer viewer option is set', () => {
                stubs.getViewerOption.mockReturnValue(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('disableTextLayer');
                    // Text Layer mode 0 = disabled
                    expect(stubs.pdfViewerClass).toBeCalledWith(expect.objectContaining({ textLayerMode: 0 }));
                });
            });

            test('should setup the link controller settings correctly', () => {
                return docBase.initViewer('').then(() => {
                    expect(docBase.pdfjsViewer.PDFLinkService).toBeCalledWith(
                        expect.objectContaining({
                            externalLinkRel: 'noopener noreferrer nofollow',
                            externalLinkTarget: 2, // window.pdfjsLib.LinkTarget.BLANK
                        }),
                    );
                });
            });

            test('should test if browser has font rendering issue', () => {
                jest.spyOn(Browser, 'hasFontIssue').mockReturnValue(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableFontFace: true }));
                });
            });

            test('should disable font face if supplied the option', () => {
                stubs.getViewerOption.mockReturnValue(true);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('disableFontFace');
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableFontFace: true }));
                });
            });

            test('should disable streaming by default', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableStream: true }));
                });
            });

            test('should enable streaming if the proper option is provided', () => {
                stubs.getViewerOption.mockReturnValue(false);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('disableFontFace');
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableStream: false }));
                });
            });

            test('should enable range requests if the file is greater than 25MB', () => {
                docBase.options.file.size = 26500000;

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableRange: false }));
                });
            });

            test('should disable range requests if the file is smaller than 25MB', () => {
                docBase.options.file.size = 26000000;

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableRange: true }));
                });
            });

            test('should disable range requests if the file is greater than 25MB but watermarked', () => {
                docBase.options.file.size = 26500000;
                docBase.options.file.watermark_info.is_watermarked = true;
                docBase.options.location.locale = 'ja-JP';

                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableRange: true }));
                });
            });

            test('should enable range requests if the file is smaller than the provided minimum size', () => {
                stubs.getViewerOption.mockReturnValue(2097152); // 2 MB minimum

                docBase.options.file.size = 5242880; // 5 MB file size

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('rangeMinSize');
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ disableRange: false }));
                });
            });

            test('should set disableCreateObjectURL to false', () => {
                return docBase.initViewer('').then(() => {
                    expect(stubs.getDocument).toBeCalledWith(
                        expect.objectContaining({ disableCreateObjectURL: false }),
                    );
                });
            });

            test('should set a chunk size based on viewer options if available', () => {
                stubs.getViewerOption.mockReturnValue(100);

                return docBase.initViewer('').then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('rangeChunkSize');
                    expect(stubs.getDocument).toBeCalledWith(expect.objectContaining({ rangeChunkSize: 100 }));
                });
            });

            test('should set a default chunk size if no viewer option set and locale is not en-US', () => {
                const url = 'url';
                const defaultChunkSize = 524288; // 512KB

                docBase.options.location = {
                    locale: 'not-en-US',
                };
                stubs.getViewerOption.mockReturnValue(null);

                return docBase.initViewer(url).then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('rangeChunkSize');
                    expect(stubs.getDocument).toBeCalledWith(
                        expect.objectContaining({ rangeChunkSize: defaultChunkSize }),
                    );
                });
            });

            test('should set a large chunk size if no viewer option set and locale is en-US', () => {
                const url = 'url';
                const defaultChunkSize = 1048576; // 1024KB

                docBase.options.location = {
                    locale: 'en-US',
                };
                stubs.getViewerOption.mockReturnValue(null);

                return docBase.initViewer(url).then(() => {
                    expect(stubs.getViewerOption).toBeCalledWith('rangeChunkSize');
                    expect(stubs.getDocument).toBeCalledWith(
                        expect.objectContaining({
                            rangeChunkSize: defaultChunkSize,
                        }),
                    );
                });
            });

            test('should avoid preflight requests by not adding non-standard headers', done => {
                docBase.options.location = {
                    locale: 'en-US',
                };
                docBase.pdfjsLib.getDocument = jest.fn(docInitParams => ({
                    promise: new Promise(() => {
                        const { httpHeaders = {} } = docInitParams;
                        const headerKeys = Object.keys(httpHeaders);

                        const containsNonStandardHeader = headerKeys.some(header => {
                            return !STANDARD_HEADERS.includes(header);
                        });

                        expect(containsNonStandardHeader).toBe(false);
                        done();
                    }),
                }));

                return docBase.initViewer('');
            });

            test('should resolve the loading task and set the document/viewer', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
                stubs.getViewerOption.mockReturnValue(100);

                return docBase.initViewer('url').then(() => {
                    expect(stubs.bindDOMListeners).toBeCalled();
                    expect(stubs.classListAdd).not.toBeCalled();
                    expect(stubs.getDocument).toBeCalled();
                    expect(stubs.pdfViewerClass).toBeCalled();
                    expect(stubs.pdfViewer.setDocument).toBeCalled();
                    expect(docBase.pdfLinkService.setDocument).toBeCalled();
                });
            });

            test('should invoke startLoadTimer()', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
                stubs.getViewerOption.mockReturnValue(100);
                jest.spyOn(docBase, 'startLoadTimer').mockImplementation();
                docBase.initViewer('url');

                expect(docBase.startLoadTimer).toBeCalled();
            });

            test('should handle any download error', () => {
                const doc = {
                    url: 'url',
                };

                stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
                stubs.handleDownloadError = jest.spyOn(docBase, 'handleDownloadError').mockImplementation();
                stubs.getDocument.mockReturnValue({ promise: Promise.reject(doc) });
                docBase.options.location = {
                    locale: 'en-US',
                };

                return docBase.initViewer('url').catch(() => {
                    expect(stubs.handleDownloadError).toBeCalled();
                });
            });

            test('should adjust the layout if thumbnails should be toggled', () => {
                const doc = {
                    url: 'url',
                };
                stubs.getViewerOption.mockReturnValue(100);
                stubs.getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
                stubs.shouldThumbnailsBeToggled.mockReturnValue(true);

                return docBase.initViewer('url').then(() => {
                    expect(stubs.pdfViewerClass).toBeCalled();
                    expect(stubs.getDocument).toBeCalled();
                    expect(stubs.bindDOMListeners).toBeCalled();
                    expect(stubs.pdfViewer.setDocument).toBeCalled();
                    expect(docBase.pdfLinkService.setDocument).toBeCalled();
                    expect(stubs.classListAdd).toBeCalledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                    expect(stubs.resize).toBeCalled();
                });
            });

            test('should bind the listeners if the page tracker object exists', () => {
                docBase.addListener = jest.fn();
                docBase.pageTracker = new PageTracker();
                const previewTrackerAddListener = jest.spyOn(docBase.pageTracker, 'addListener').mockImplementation();
                docBase.initViewer('url');
                expect(docBase.addListener).toBeCalledWith('preview_event_report', docBase.handlePreviewEventReport);
                expect(previewTrackerAddListener).toBeCalledWith(
                    'page_tracker_report',
                    docBase.handleAdvancedInsightsReport,
                );
            });

            describe('operations check', () => {
                test('should check operations count for .numbers files', async () => {
                    docBase.options.file.extension = 'numbers';

                    const mockDoc = {
                        numPages: 2,
                        getPage: jest.fn(),
                    };

                    const mockPage = {
                        getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(100000) }),
                    };

                    mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));
                    stubs.getDocument.mockReturnValue({
                        destroy: jest.fn(),
                        promise: Promise.resolve(mockDoc),
                    });

                    await docBase.initViewer('url');

                    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
                    expect(mockDoc.getPage).toHaveBeenCalledWith(2);
                    expect(docBase.pdfLinkService.setDocument).toHaveBeenCalledWith(mockDoc, 'url');
                    expect(docBase.pdfViewer.setDocument).toHaveBeenCalledWith(mockDoc);
                });

                test('should skip operations check for non-.numbers files', async () => {
                    docBase.options.file.extension = 'pdf';

                    const mockDoc = {
                        numPages: 2,
                        getPage: jest.fn(),
                    };

                    stubs.getDocument.mockReturnValue({
                        destroy: jest.fn(),
                        promise: Promise.resolve(mockDoc),
                    });

                    await docBase.initViewer('url');

                    // Should not call getPage for operations counting
                    expect(mockDoc.getPage).not.toHaveBeenCalled();
                    expect(docBase.pdfLinkService.setDocument).toHaveBeenCalledWith(mockDoc, 'url');
                    expect(docBase.pdfViewer.setDocument).toHaveBeenCalledWith(mockDoc);
                });

                test('should throw error when .numbers file has too many operations', async () => {
                    docBase.options.file.extension = 'numbers';

                    const mockDoc = {
                        numPages: 2,
                        getPage: jest.fn(),
                    };

                    const mockPage = {
                        getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(200000) }),
                    };

                    mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));
                    stubs.getDocument.mockReturnValue({
                        destroy: jest.fn(),
                        promise: Promise.resolve(mockDoc),
                    });

                    stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
                    stubs.handleDownloadError = jest.spyOn(docBase, 'handleDownloadError').mockImplementation();

                    await docBase.initViewer('url').catch(() => {
                        expect(stubs.handleDownloadError).toHaveBeenCalled();
                    });
                });

                test('should handle operations check error properly', async () => {
                    docBase.options.file.extension = 'numbers';

                    const mockDoc = {
                        numPages: 2,
                        getPage: jest.fn(),
                    };

                    const mockPage = {
                        getOperatorList: jest.fn().mockRejectedValue(new Error('Page error')),
                    };

                    mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));
                    stubs.getDocument.mockReturnValue({
                        destroy: jest.fn(),
                        promise: Promise.resolve(mockDoc),
                    });

                    stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
                    stubs.handleDownloadError = jest.spyOn(docBase, 'handleDownloadError').mockImplementation();

                    await docBase.initViewer('url').catch(() => {
                        expect(stubs.handleDownloadError).toHaveBeenCalled();
                    });
                });

                test('should use correct error code for too many operations', async () => {
                    docBase.options.file.extension = 'numbers';

                    const mockDoc = {
                        numPages: 2,
                        getPage: jest.fn(),
                    };

                    const mockPage = {
                        getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(400000) }),
                    };

                    mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));
                    stubs.getDocument.mockReturnValue({
                        destroy: jest.fn(),
                        promise: Promise.resolve(mockDoc),
                    });

                    stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
                    stubs.handleDownloadError = jest.spyOn(docBase, 'handleDownloadError').mockImplementation();

                    await docBase.initViewer('url').catch(() => {
                        expect(stubs.handleDownloadError).toHaveBeenCalledWith(
                            expect.objectContaining({
                                code: 'error_viewer_too_many_operations',
                                message:
                                    'The file is too complex to display in your browser. Please download it to view.',
                            }),
                            'url',
                        );
                    });
                });

                test.each([['doc'], ['docx'], ['ppt'], ['pptx'], ['xls'], ['xlsx'], ['pdf']])(
                    'should skip operations check for %s files',
                    async extension => {
                        docBase.options.file.extension = extension;

                        const mockDoc = {
                            numPages: 1,
                            getPage: jest.fn(),
                        };

                        stubs.getDocument.mockReturnValue({
                            destroy: jest.fn(),
                            promise: Promise.resolve(mockDoc),
                        });

                        await docBase.initViewer('url');

                        expect(mockDoc.getPage).not.toHaveBeenCalled();
                        expect(docBase.pdfLinkService.setDocument).toHaveBeenCalledWith(mockDoc, 'url');
                        expect(docBase.pdfViewer.setDocument).toHaveBeenCalledWith(mockDoc);
                    },
                );
            });
        });

        describe('resize()', () => {
            const resizeFunc = BaseViewer.prototype.resize;

            beforeEach(() => {
                docBase.pdfViewer = {
                    update: jest.fn(),
                    currentScaleValue: 0,
                    currentPageNumber: 0,
                };

                docBase.somePageRendered = true;

                stubs.setPage = jest.spyOn(docBase, 'setPage').mockImplementation();
                Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                    value: jest.fn(),
                });
                stubs.thumbnailsResize = jest.fn();
                docBase.thumbnailsSidebar = { resize: stubs.thumbnailsResize, destroy: () => {} };
            });

            afterEach(() => {
                Object.defineProperty(Object.getPrototypeOf(DocBaseViewer.prototype), 'resize', {
                    value: resizeFunc,
                });
            });

            test('should do nothing if pdfViewer does not exist', () => {
                docBase.pdfViewer = null;
                docBase.resize();
                expect(BaseViewer.prototype.resize).not.toBeCalled();
                expect(stubs.thumbnailsResize).not.toBeCalled();
            });

            test('should attempt to resize the preload if no PDF pages are ready ', () => {
                docBase.somePageRendered = false;
                docBase.resize();
                expect(BaseViewer.prototype.resize).not.toBeCalled();
                expect(stubs.thumbnailsResize).not.toBeCalled();
            });

            test('should resize the preload', () => {
                docBase.pdfViewer = null;
                docBase.preloader = {
                    resize: jest.fn(),
                };
                docBase.resize();
                expect(docBase.preloader.resize).toBeCalled();
                expect(BaseViewer.prototype.resize).not.toBeCalled();
                expect(stubs.thumbnailsResize).not.toBeCalled();
            });

            test('should update the pdfViewer and reset the page', () => {
                docBase.resize();
                expect(docBase.pdfViewer.update).toBeCalled();
                expect(stubs.setPage).toBeCalled();
                expect(BaseViewer.prototype.resize).toBeCalled();
                expect(stubs.thumbnailsResize).toBeCalled();
            });
        });

        describe('startPreloadTimer()', () => {
            afterEach(() => {
                Timer.reset();
            });

            test('should create a tag and start a timer related to preload for the file being loaded', () => {
                const id = '12345';
                const tag = Timer.createTag(id, LOAD_METRIC.preloadTime);
                docBase.options.file = {
                    id,
                };

                const startStub = jest.spyOn(Timer, 'start').mockImplementation();
                docBase.startPreloadTimer();

                expect(startStub).toBeCalledWith(tag);
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

            test('should do nothing if preload timer was not started for that file', () => {
                const stopStub = jest.spyOn(Timer, 'stop').mockImplementation();
                docBase.stopPreloadTimer();

                expect(stopStub).not.toBeCalled();
            });

            test('should stop and reset the timer for the file preload event', () => {
                const stopStub = jest.spyOn(Timer, 'stop').mockImplementation();
                const resetStub = jest.spyOn(Timer, 'reset').mockImplementation();
                Timer.start(tag);

                docBase.stopPreloadTimer();

                expect(stopStub).toBeCalledWith(tag);
                expect(resetStub).toBeCalledWith(tag);
            });

            test('should emit a preload event for metrics logging', () => {
                const elapsed = 100;
                const preloadTime = {
                    start: 1,
                    end: 101,
                    elapsed,
                };
                jest.spyOn(Timer, 'get').mockReturnValue(preloadTime);
                jest.spyOn(docBase, 'emitMetric').mockImplementation();

                docBase.stopPreloadTimer();

                expect(docBase.emitMetric).toBeCalledWith({
                    name: LOAD_METRIC.previewPreloadEvent,
                    data: elapsed,
                });
            });
        });

        describe('onPreload()', () => {
            let logger;
            beforeEach(() => {
                logger = {
                    setPreloaded: jest.fn(),
                };
                docBase.options.logger = logger;
            });

            test('should invoke "setPreloaded" on logger for legacy metrics preload calculation', () => {
                docBase.onPreload();

                expect(logger.setPreloaded).toBeCalled();
            });

            test('should stop preload timer for that file', () => {
                jest.spyOn(docBase, 'stopPreloadTimer').mockImplementation();

                docBase.onPreload();

                expect(docBase.stopPreloadTimer).toBeCalled();
            });

            test('should reset load timeout to prevent preview timeout', () => {
                jest.spyOn(docBase, 'resetLoadTimeout').mockImplementation();

                docBase.onPreload();

                expect(docBase.resetLoadTimeout).toBeCalled();
            });
        });

        describe('setupPdfjs()', () => {
            test('should set the worker source asset url', () => {
                docBase.options = {
                    file: {},
                    location: {
                        staticBaseURI: 'test/',
                        locale: 'en-US',
                    },
                };

                docBase.setupPdfjs();

                expect(docBase.pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('asset');
            });
        });

        describe('initPrint()', () => {
            test('should add print checkmark', () => {
                docBase.initPrint();

                const mockCheckmark = document.createElement('div');
                mockCheckmark.innerHTML = `${ICON_PRINT_CHECKMARK}`.trim();
                expect(docBase.printPopup.printCheckmark.innerHTML).toBe(mockCheckmark.innerHTML);
            });

            test('should hide the print checkmark', () => {
                docBase.initPrint();

                expect(docBase.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN));
            });

            test('should add the loading indicator', () => {
                docBase.initPrint();

                const mockIndicator = document.createElement('div');
                mockIndicator.innerHTML = `
                <div></div>
                <div></div>
                <div></div>
                `.trim();
                expect(docBase.printPopup.loadingIndicator.innerHTML.replace(/\s/g, '')).toBe(
                    mockIndicator.innerHTML.replace(/\s/g, ''),
                );
                expect(docBase.printPopup.loadingIndicator.classList.contains('bp-crawler')).toBe(true);
            });
        });

        describe('print()', () => {
            beforeEach(() => {
                jest.useFakeTimers();

                docBase.printBlob = undefined;
                stubs.fetchPrintBlob = jest.spyOn(docBase, 'fetchPrintBlob').mockReturnValue({
                    then: jest.fn(),
                });
                docBase.initPrint();
                stubs.show = jest.spyOn(docBase.printPopup, 'show');
            });

            afterEach(() => {
                jest.clearAllTimers();
            });

            test('should request the print blob if it is not ready', () => {
                docBase.print();
                expect(stubs.fetchPrintBlob).toBeCalled();
            });

            test('should show the print popup and disable the print button if the blob is not ready', () => {
                jest.spyOn(docBase.printPopup, 'disableButton').mockImplementation();

                docBase.print();

                jest.advanceTimersByTime(PRINT_DIALOG_TIMEOUT_MS + 1);

                expect(stubs.show).toBeCalledWith(__('print_loading'), __('print'), expect.any(Function));
                expect(docBase.printPopup.disableButton).toBeCalled();
            });

            test("should directly print if print blob is ready and the print dialog hasn't been shown yet", () => {
                docBase.printBlob = {};
                docBase.printDialogTimeout = setTimeout(() => {});
                jest.spyOn(docBase, 'browserPrint').mockImplementation();

                docBase.print();
                expect(docBase.browserPrint).toBeCalled();
            });

            test("should directly print if print blob is ready and the print dialog isn't visible", () => {
                docBase.printBlob = {};
                docBase.printDialogTimeout = null;
                jest.spyOn(docBase.printPopup, 'isVisible').mockReturnValue(false);
                jest.spyOn(docBase, 'browserPrint').mockImplementation();

                docBase.print();
                expect(docBase.browserPrint).toBeCalled();
            });

            test('should update the print popup UI if popup is visible and there is no current print timeout', () => {
                docBase.printBlob = {};

                jest.spyOn(docBase.printPopup, 'isVisible').mockReturnValue(true);

                docBase.print();

                expect(docBase.printPopup.buttonEl.classList.contains('is-disabled')).toBe(false);
                expect(docBase.printPopup.messageEl.textContent).toBe(__('print_ready'));
                expect(docBase.printPopup.loadingIndicator.classList.contains(CLASS_HIDDEN)).toBe(true);
                expect(docBase.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN)).toBe(false);
            });
        });

        describe('setupPageIds()', () => {
            test('should add page IDs', () => {
                const pageEl = document.createElement('div');
                pageEl.classList.add('page');
                pageEl.dataset.pageNumber = 2;
                docBase.containerEl.appendChild(pageEl);

                docBase.setupPageIds();

                expect(pageEl.id).toBe('bp-page-2');
            });
        });

        describe('fetchPrintBlob()', () => {
            beforeEach(() => {
                stubs.get = jest.spyOn(stubs.api, 'get').mockResolvedValue('blob');
            });

            test('should get and set the blob', () => {
                return docBase.fetchPrintBlob('url').then(() => {
                    expect(docBase.printBlob).toBe('blob');
                });
            });
        });

        describe('handlePageSubmit()', () => {
            test('should handle setting page and focusing wrapper', () => {
                const pageNumber = 3;
                jest.spyOn(docBase, 'setPage').mockImplementation();
                jest.spyOn(docBase.docEl, 'focus').mockImplementation();

                docBase.handlePageSubmit(pageNumber);

                expect(docBase.setPage).toHaveBeenCalledWith(pageNumber);
                expect(docBase.docEl.focus).toHaveBeenCalled();
            });
        });

        describe('loadUI()', () => {
            test('should create controls root and render the controls', () => {
                jest.spyOn(docBase, 'renderUI').mockImplementation();

                docBase.loadUI();

                expect(docBase.controls).toBeInstanceOf(ControlsRoot);
                expect(docBase.renderUI).toBeCalled();
            });
        });

        describe('renderUI()', () => {
            const getProps = instance => instance.controls.render.mock.calls[0][0].props;

            beforeEach(() => {
                jest.spyOn(docBase, 'areNewAnnotationsEnabled').mockReturnValue(true);
                jest.spyOn(docBase, 'hasAnnotationCreatePermission').mockReturnValue(true);
                jest.spyOn(docBase, 'isFindDisabled').mockReturnValue(false);

                docBase.controls = {
                    render: jest.fn(),
                };
                docBase.pdfViewer = {
                    currentPageNumber: 1,
                    currentScale: 0.9,
                    pagesCount: 4,
                };
                stubs.checkPermission.mockReturnValue(true);
            });

            test('should create all controls with their default values', () => {
                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    annotationColor: '#0061d5',
                    annotationMode: 'none',
                    hasHighlight: true,
                    hasRegion: true,
                    maxScale: 10,
                    minScale: 0.1,
                    onAnnotationColorChange: docBase.handleAnnotationColorChange,
                    onAnnotationModeClick: docBase.handleAnnotationControlsClick,
                    onAnnotationModeEscape: docBase.handleAnnotationControlsEscape,
                    onFindBarToggle: docBase.toggleFindBar,
                    onFullscreenToggle: docBase.toggleFullscreen,
                    onPageChange: docBase.setPage,
                    onPageSubmit: docBase.handlePageSubmit,
                    onThumbnailsToggle: docBase.toggleThumbnails,
                    onZoomIn: docBase.zoomIn,
                    onZoomOut: docBase.zoomOut,
                    pageCount: docBase.pdfViewer.pagesCount,
                    pageNumber: docBase.pdfViewer.currentPageNumber,
                    scale: 0.9,
                });
            });

            test('should not add annotation controls if missing create permission', () => {
                docBase.hasAnnotationCreatePermission.mockReturnValue(false);
                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    hasDrawing: false,
                    hasHighlight: false,
                    hasRegion: false,
                });
            });

            test('should not add annotation controls if new annotations are not enabled', () => {
                docBase.areNewAnnotationsEnabled.mockReturnValue(false);
                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    hasDrawing: false,
                    hasHighlight: false,
                    hasRegion: false,
                });
            });

            test('should not add highlight control if download permissions are missing', () => {
                stubs.checkPermission.mockReturnValue(false);
                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    hasHighlight: false,
                });
            });

            test.each([true, false])('should enable or disable the findbar toggle based on its option', option => {
                jest.spyOn(docBase, 'isFindDisabled').mockReturnValue(!option);

                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    onFindBarToggle: option ? docBase.toggleFindBar : undefined,
                });
            });

            test.each([true, false])('should enable or disable the thumbnail toggle based on its option', option => {
                docBase.options.enableThumbnailsSidebar = option;
                docBase.renderUI();

                expect(getProps(docBase)).toMatchObject({
                    onThumbnailsToggle: option ? docBase.toggleThumbnails : undefined,
                });
            });
        });

        describe('bindDOMListeners()', () => {
            beforeEach(() => {
                stubs.addEventListener = jest.spyOn(docBase.docEl, 'addEventListener').mockImplementation();
                stubs.addListener = jest.spyOn(fullscreen, 'addListener').mockImplementation();
            });

            test('should add the correct listeners', () => {
                docBase.hasTouch = false;
                docBase.bindDOMListeners();

                expect(stubs.addEventListener).toBeCalledWith('keydown', docBase.handleDocElKeydown);
                expect(stubs.addEventListener).toBeCalledWith('scroll', docBase.throttledScrollHandler);
                expect(stubs.addEventListener).not.toBeCalledWith('touchstart', docBase.pinchToZoomStartHandler);
                expect(stubs.addEventListener).not.toBeCalledWith('touchmove', docBase.pinchToZoomChangeHandler);
                expect(stubs.addEventListener).not.toBeCalledWith('touchend', docBase.pinchToZoomEndHandler);
            });

            test('should add the pinch to zoom handler if touch is detected', () => {
                docBase.hasTouch = true;
                docBase.bindDOMListeners();

                expect(stubs.addEventListener).toBeCalledWith('touchstart', docBase.pinchToZoomStartHandler);
                expect(stubs.addEventListener).toBeCalledWith('touchmove', docBase.pinchToZoomChangeHandler);
                expect(stubs.addEventListener).toBeCalledWith('touchend', docBase.pinchToZoomEndHandler);
            });
        });

        describe('unbindDOMListeners()', () => {
            beforeEach(() => {
                stubs.removeEventListener = jest.spyOn(docBase.docEl, 'removeEventListener').mockImplementation();
                stubs.removeFullscreenListener = jest.spyOn(fullscreen, 'removeListener').mockImplementation();
            });

            test('should remove the docBase element listeners if the docBase element exists', () => {
                docBase.unbindDOMListeners();

                expect(stubs.removeEventListener).toBeCalledWith('keydown', docBase.handleDocElKeydown);
                expect(stubs.removeEventListener).toBeCalledWith('scroll', docBase.throttledScrollHandler);
            });

            test('should not remove the doc element listeners if the doc element does not exist', () => {
                const docElTemp = docBase.docEl;
                docBase.docEl = null;

                docBase.unbindDOMListeners();
                expect(stubs.removeEventListener).not.toBeCalled();

                docBase.docEl = docElTemp;
            });

            test('should remove pinch to zoom listeners if the browser has touch', () => {
                docBase.hasTouch = true;

                docBase.unbindDOMListeners();
                expect(stubs.removeEventListener).toBeCalledWith('touchstart', docBase.pinchToZoomStartHandler);
                expect(stubs.removeEventListener).toBeCalledWith('touchmove', docBase.pinchToZoomChangeHandler);
                expect(stubs.removeEventListener).toBeCalledWith('touchend', docBase.pinchToZoomEndHandler);
            });

            test('should not remove the pinch to zoom listeners if the browser does not have touch', () => {
                docBase.hasTouch = false;

                docBase.unbindDOMListeners();
                expect(stubs.removeEventListener).not.toBeCalledWith('touchstart', docBase.pinchToZoomStartHandler);
                expect(stubs.removeEventListener).not.toBeCalledWith('touchmove', docBase.pinchToZoomChangeHandler);
                expect(stubs.removeEventListener).not.toBeCalledWith('touchend', docBase.pinchToZoomEndHandler);
            });
        });

        describe('unbindEventBusListeners', () => {
            test('should remove all the event listeners on the internal PDFJS event bus', () => {
                docBase.pdfEventBus = {
                    _listeners: {
                        event1: [() => {}],
                        event2: [() => {}, () => {}],
                    },
                    off: jest.fn(),
                };

                docBase.unbindEventBusListeners();

                expect(docBase.pdfEventBus.off).toBeCalledTimes(3);
            });
        });

        describe('pagesinitHandler()', () => {
            beforeEach(() => {
                stubs.loadUI = jest.spyOn(docBase, 'loadUI').mockImplementation();
                stubs.setPage = jest.spyOn(docBase, 'setPage').mockImplementation();
                stubs.getCachedPage = jest.spyOn(docBase, 'getCachedPage').mockImplementation();
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                stubs.setupPages = jest.spyOn(docBase, 'setupPageIds').mockImplementation();
            });

            test('should load UI, check the pagination buttons, set the page, and make document scrollable', () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };

                docBase.pagesinitHandler();
                expect(docBase.docEl).toHaveClass('bp-is-scrollable');
                expect(stubs.loadUI).toBeCalled();
                expect(stubs.setPage).toBeCalled();
                expect(stubs.setupPages).toBeCalled();
            });

            test("should broadcast that the preview is loaded if it hasn't already", () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };
                docBase.loaded = false;
                docBase.pdfViewer.pagesCount = 5;
                docBase.startPageNum = 1;

                docBase.pagesinitHandler();
                expect(stubs.emit).toBeCalledWith(VIEWER_EVENT.load, {
                    numPages: 5,
                    scale: 'unknown',
                    currentPage: 1,
                });
                expect(docBase.loaded).toBe(true);
            });

            test('should set the start page based', () => {
                const START_PAGE_NUM = 2;
                const PAGES_COUNT = 3;
                docBase.startPageNum = START_PAGE_NUM;
                docBase.pdfViewer = {
                    pagesCount: PAGES_COUNT,
                };
                docBase.pagesinitHandler();

                expect(stubs.setPage).toBeCalledWith(START_PAGE_NUM);
            });

            test('should set the current page and file length', () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };
                docBase.pageTracker = new PageTracker({ isActive: true });
                stubs.setCurrentPage = jest.spyOn(docBase.pageTracker, 'setCurrentPage').mockImplementation();
                stubs.setFileLength = jest.spyOn(docBase.pageTracker, 'setFileLength').mockImplementation();
                docBase.pagesinitHandler();
                expect(stubs.setCurrentPage).toBeCalled();
                expect(stubs.setFileLength).toBeCalled();
            });

            test('should not call the PageTracker init function', () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };
                docBase.pageTracker = new PageTracker({});
                stubs.pageTrackerInit = jest.spyOn(docBase.pageTracker, 'init');
                docBase.pagesinitHandler();
                expect(stubs.pageTrackerInit).not.toBeCalled();
            });

            test('should call the PageTracker init function', () => {
                docBase.pdfViewer = {
                    currentScale: 'unknown',
                };
                docBase.pageTracker = new PageTracker({ isActive: true });
                stubs.pageTrackerInit = jest.spyOn(docBase.pageTracker, 'init');
                docBase.pagesinitHandler();
                expect(stubs.pageTrackerInit).toBeCalled();
            });
        });

        describe('pagerenderedHandler()', () => {
            beforeEach(() => {
                docBase.event = {
                    pageNumber: 1,
                };
                docBase.pdfViewer = {
                    currentScale: 0.5,
                    currentScaleValue: 0.5,
                };
                docBase.somePageRendered = false;
                docBase.startPageRendered = false;

                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                stubs.emitMetric = jest.spyOn(docBase, 'emitMetric').mockImplementation();
                stubs.initThumbnails = jest.spyOn(docBase, 'initThumbnails').mockImplementation();
                stubs.hidePreload = jest.spyOn(docBase, 'hidePreload').mockImplementation();
                stubs.resize = jest.spyOn(docBase, 'resize').mockImplementation();
                stubs.resize = jest.spyOn(docBase, 'renderUI').mockImplementation();
                stubs.stop = jest.spyOn(Timer, 'stop').mockReturnValue({ elapsed: 1000 });
            });

            afterEach(() => {
                jest.restoreAllMocks();
            });

            test('should emit render metric event for start page if not already emitted', () => {
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.emitMetric).toBeCalledWith({
                    name: RENDER_EVENT,
                    data: 1000,
                });
            });

            test('should not emit render metric event if it was already emitted', () => {
                docBase.startPageRendered = true;
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.emitMetric).not.toBeCalled();
            });

            test('should not emit render metric event if rendered page is not start page', () => {
                docBase.pagerenderedHandler({ pageNumber: 5 });
                expect(stubs.emitMetric).not.toBeCalled();
            });

            test('should hide the preload and init thumbnails if no pages were previously rendered', () => {
                docBase.options.enableThumbnailsSidebar = true;
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.initThumbnails).toBeCalled();
                expect(stubs.hidePreload).toBeCalled();
                expect(docBase.somePageRendered).toBe(true);
                expect(docBase.resize).toBeCalled();
                expect(docBase.renderUI).toBeCalled();
            });

            test('should not init thumbnails if not enabled', () => {
                docBase.options.enableThumbnailsSidebar = false;
                docBase.pagerenderedHandler(docBase.event);
                expect(stubs.initThumbnails).not.toBeCalled();
                expect(docBase.renderUI).toBeCalled();
            });

            test('should emit doc first pages metric if webp representation is available', () => {
                jest.spyOn(Date, 'now').mockReturnValue(100);
                docBase.startPageRendered = false;
                docBase.docFirstPagesEnabled = true;
                docBase.preloader = new DocFirstPreloader();
                docBase.preloader.loadTime = 20;
                docBase.preloader.retrievedPagesCount = 4;
                docBase.preloader.isWebp = true;
                docBase.pagerenderedHandler({ pageNumber: 1 });

                expect(stubs.emitMetric).toHaveBeenCalledWith({
                    data: 80,
                    name: 'preload_content_load_time_diff',
                });
            });

            test('should not emit doc first pages metric if no webp representation is available', () => {
                jest.spyOn(Date, 'now').mockReturnValue(100);
                docBase.startPageRendered = false;
                docBase.docFirstPagesEnabled = true;
                docBase.preloader = new DocFirstPreloader();
                docBase.preloader.loadTime = 20;
                docBase.preloader.retrievedPagesCount = 1;
                docBase.preloader.isWebp = false;
                docBase.pagerenderedHandler({ pageNumber: 1 });

                expect(stubs.emitMetric).not.toHaveBeenCalledWith({
                    data: 80,
                    name: 'preload_content_load_time_diff',
                });
            });
        });

        describe('pagechangingHandler()', () => {
            beforeEach(() => {
                stubs.cachePage = jest.spyOn(docBase, 'cachePage').mockImplementation();
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                stubs.renderUI = jest.spyOn(docBase, 'renderUI').mockImplementation();
                docBase.event = {
                    pageNumber: 1,
                };
                docBase.pdfViewer = {
                    pageCount: 1,
                };
            });

            test('should emit the pagefocus event', () => {
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.emit).toBeCalledWith('pagefocus', 1);
            });

            test('should update the current page', () => {
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.renderUI);
            });

            test('should cache the page if it is loaded', () => {
                docBase.loaded = true;
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.cachePage).toBeCalledWith(docBase.event.pageNumber);
            });

            test('should not cache the page if it is not loaded', () => {
                docBase.loaded = false;
                docBase.pagechangingHandler(docBase.event);

                expect(stubs.cachePage).not.toBeCalled();
            });

            test('should call the PageTracker handler page change', () => {
                docBase.pageTracker = new PageTracker({ isActive: true });
                stubs.handleViewerPageChange = jest.spyOn(docBase.pageTracker, 'handleViewerPageChange');
                docBase.pagechangingHandler(docBase.event);
                expect(stubs.handleViewerPageChange).toBeCalled();
            });
        });

        describe('handleDocElKeydown()', () => {
            test.each(['Enter', 'Escape', 'Space'])('should ignore %s key events', key => {
                const event = { key, stopPropagation: jest.fn() };

                docBase.handleDocElKeydown(event);

                expect(event.stopPropagation).not.toBeCalled();
            });

            test.each(['Left', 'Right', 'Up', 'Down'])('should ignore %s key events without alt', key => {
                const event = { altKey: false, key, stopPropagation: jest.fn() };

                docBase.handleDocElKeydown(event);

                expect(event.stopPropagation).not.toBeCalled();
            });

            test.each(['Left', 'Right', 'Up', 'Down'])('should stop propagation for %s key events with alt', key => {
                const event = { altKey: true, key, stopPropagation: jest.fn() };

                docBase.handleDocElKeydown(event);

                expect(event.stopPropagation).toBeCalled();
            });
        });

        describe('handleFullscreenEnter()', () => {
            test('should update the scale value, and resize the page', () => {
                docBase.pdfViewer = {
                    presentationModeState: 'normal',
                    currentScaleValue: 'normal',
                };
                const resizeStub = jest.spyOn(docBase, 'resize').mockImplementation();

                docBase.handleFullscreenEnter();
                expect(resizeStub).toBeCalled();
                expect(docBase.pdfViewer.currentScaleValue).toBe('page-fit');
            });
        });

        describe('handleFullscreenExit()', () => {
            beforeEach(() => {
                jest.spyOn(docBase, 'areNewAnnotationsEnabled').mockReturnValue(true);
                jest.spyOn(docBase, 'enableAnnotationControls').mockImplementation();

                docBase.pdfViewer = {
                    presentationModeState: 'fullscreen',
                    currentScaleValue: 'pagefit',
                };
                docBase.annotator = {
                    emit: jest.fn(),
                    toggleAnnotationMode: jest.fn(),
                };
                docBase.annotationControls = {
                    destroy: jest.fn(),
                };
                docBase.processAnnotationModeChange = jest.fn();
            });

            test('should update the scale value, and resize the page', () => {
                const resizeStub = jest.spyOn(docBase, 'resize').mockImplementation();

                docBase.handleFullscreenExit();
                expect(resizeStub).toBeCalled();
                expect(docBase.pdfViewer.currentScaleValue).toBe('auto');
            });

            test('should not change mode if enableAnnotationsDiscoverability is false', () => {
                docBase.handleFullscreenExit();

                expect(docBase.annotator.toggleAnnotationMode).not.toBeCalled();
            });

            test(`should show annotations and toggle annotations mode to REGION if enableAnnotationsDiscoverability is true`, () => {
                docBase.options.enableAnnotationsDiscoverability = true;

                docBase.handleFullscreenExit();

                expect(docBase.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setVisibility, true);
                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.REGION);
                expect(docBase.enableAnnotationControls).toBeCalled();
            });
        });

        describe('getScrollHandler()', () => {
            let scrollHandler;

            beforeEach(() => {
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                docBase.scrollStarted = false;
                scrollHandler = docBase.getScrollHandler();
            });

            test('should emit the scrollstart event on a new scroll', () => {
                scrollHandler();
                expect(stubs.emit).toBeCalledWith('scrollstart', { scrollLeft: 0, scrollTop: 0 });
            });

            test('should not emit the scrollstart event on a continued scroll', () => {
                docBase.scrollStarted = true;
                scrollHandler();
                expect(stubs.emit).not.toBeCalledWith('scrollstart');
            });

            test('should emit a scrollend event after scroll timeout', () => {
                jest.useFakeTimers();

                scrollHandler();
                expect(stubs.emit).toBeCalledWith('scrollstart', { scrollLeft: 0, scrollTop: 0 });

                jest.advanceTimersByTime(SCROLL_END_TIMEOUT + 1);
                expect(stubs.emit).toBeCalledWith('scrollend', { scrollLeft: 0, scrollTop: 0 });
            });
        });

        describe('pinchToZoomStartHandler()', () => {
            let event;

            beforeEach(() => {
                event = {
                    stopPropagation: jest.fn(),
                    preventDefault: jest.fn(),
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
                    _getVisiblePages: jest.fn(),
                };
                jest.spyOn(util, 'getClosestPageToPinch').mockReturnValue(document.createElement('div'));
                jest.spyOn(util, 'getDistance').mockImplementation();
            });

            test('should do nothing if we are already pinching or if the event does not use two finger', () => {
                event.touches.length = 1;

                docBase.pinchToZoomStartHandler(event);
                expect(event.stopPropagation).not.toBeCalled();

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
                expect(event.stopPropagation).toBeCalled();
            });

            test('should prevent default behavior and indicate that we are pinching', () => {
                docBase.pinchToZoomStartHandler(event);

                expect(docBase.isPinching).toBe(true);
                expect(event.stopPropagation).toBeCalled();
                expect(event.preventDefault).toBeCalled();
            });

            test('should get the closest page and setup the pinching clases', () => {
                docBase.docEl = document.createElement('div');
                const pdfViewer = document.createElement('div');
                docBase.docEl.appendChild(pdfViewer);
                docBase.pinchToZoomStartHandler(event);

                expect(docBase.pdfViewer._getVisiblePages).toBeCalled();
                expect(util.getClosestPageToPinch).toBeCalled();
            });

            test('should save the original distance for later scale calculation', () => {
                docBase.pinchToZoomStartHandler(event);
                expect(util.getDistance).toBeCalledWith(
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

                jest.spyOn(util, 'getDistance').mockImplementation();
            });

            test('should do nothing if we are not pinching', () => {
                docBase.isPinching = false;

                docBase.pinchToZoomChangeHandler(eventWithoutScale);
                expect(util.getDistance).not.toBeCalled();

                docBase.isPinching = true;

                docBase.pinchToZoomChangeHandler(eventWithoutScale);
                expect(util.getDistance).toBeCalled();
            });

            describe('ignored chages', () => {
                test('should do nothing if the scale is 1', () => {
                    eventWithScale.scale = 1;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });

                test('should do nothing if the scale change is less than 0.01', () => {
                    docBase.pinchScale = 1.5;
                    eventWithScale.scale = 1.501;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });

                test('should do nothing if the scale change bigger than 3', () => {
                    docBase.pinchScale = 1;
                    eventWithScale.scale = 3.5;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });

                test('should do nothing if the scale change bigger than .25', () => {
                    docBase.pinchScale = 1;
                    eventWithScale.scale = 0.1;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });

                test('should do nothing if the proposed scale is greater than the MAX_SCALE', () => {
                    docBase.pdfViewer = {
                        currentScale: 7,
                    };

                    eventWithScale.scale = 2;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });

                test('should do nothing if the proposed scale is less than the MIN_SCALE', () => {
                    docBase.pdfViewer = {
                        currentScale: 0.12,
                    };

                    eventWithScale.scale = 0.25;
                    docBase.pinchToZoomChangeHandler(eventWithScale);

                    expect(docBase.pinchPage.style.transform).toBeFalsy();
                });
            });

            test('should transform the pinched page based on the new scale value', () => {
                docBase.pinchToZoomChangeHandler(eventWithScale);
                expect(docBase.pinchPage.style.transform).toBe('scale(1.5)');
                expect(docBase.pinchPage.classList.contains('pinch-page')).toBe(true);
            });
        });

        describe('pinchToZoomEndHandler()', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    currentScaleValue: 1,
                    currentScale: 1,
                    update: jest.fn(),
                };

                docBase.pinchScale = 1.5;

                docBase.docEl.scroll = jest.fn();

                docBase.isPinching = true;
                docBase.pinchPage = document.createElement('div');
            });

            test('should do nothing if we are not pinching', () => {
                docBase.isPinching = false;
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).toBe(1);
            });

            test('should do nothing if no pinched page exists', () => {
                docBase.pinchPage = null;
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).toBe(1);
            });

            test('should perform a pdf.js zoom', () => {
                docBase.pinchToZoomEndHandler();
                expect(docBase.pdfViewer.currentScaleValue).toBe(1.5);
            });

            test('should scroll to offset the zoom', () => {
                docBase.pinchToZoomEndHandler();
                expect(docBase.docEl.scroll).toBeCalled();
            });

            test('should reset pinching state variables', () => {
                docBase.pinchToZoomEndHandler();

                expect(docBase.isPinching).toBe(false);
                expect(docBase.originalDistance).toBe(0);
                expect(docBase.pinchScale).toBe(1);
                expect(docBase.pinchPage).toBeNull();
            });
        });

        describe('getStartPage()', () => {
            test('should return the start page as a number', () => {
                const startAt = {
                    value: 3,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).toBe(3);
            });

            test('should return the floored number if a floating point number is passed', () => {
                const startAt = {
                    value: 4.1,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).toBe(4);
            });

            test('should return undefined if a value < 1 is passed', () => {
                let startAt = {
                    value: 0,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).toBeUndefined();

                startAt = {
                    value: -100,
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).toBeUndefined();
            });

            test('should return undefined if an invalid unit is passed', () => {
                jest.spyOn(console, 'error').mockImplementation();

                const startAt = {
                    value: 3,
                    unit: 'foo',
                };

                expect(docBase.getStartPage(startAt)).toBeUndefined();
            });

            test('should return undefined if an invalid value is passed', () => {
                const startAt = {
                    value: 'foo',
                    unit: PAGES_UNIT_NAME,
                };

                expect(docBase.getStartPage(startAt)).toBeUndefined();
            });

            test('should return undefined if no unit and value is passed', () => {
                const startAt = {};
                expect(docBase.getStartPage(startAt)).toBeUndefined();
            });
        });

        describe('toggleThumbnails()', () => {
            let thumbnailsSidebar;

            beforeEach(() => {
                jest.useFakeTimers();
                jest.spyOn(docBase, 'resize').mockImplementation();
                jest.spyOn(docBase, 'emitMetric').mockImplementation();
                jest.spyOn(docBase, 'emit').mockImplementation();

                stubs.toggleSidebar = jest.fn();
                stubs.isSidebarOpen = jest.fn();

                thumbnailsSidebar = {
                    toggle: stubs.toggleSidebar,
                    isOpen: false,
                    destroy: () => {},
                };
            });

            afterEach(() => {
                jest.clearAllTimers();
            });

            test('should do nothing if thumbnails sidebar does not exist', () => {
                docBase.thumbnailsSidebar = undefined;

                docBase.toggleThumbnails();
                jest.advanceTimersByTime(300);

                expect(docBase.resize).not.toBeCalled();
            });

            test('should toggle open and resize the viewer', () => {
                docBase.thumbnailsSidebar = thumbnailsSidebar;
                docBase.pdfViewer = { pagesCount: 10 };
                thumbnailsSidebar.isOpen = true;

                docBase.toggleThumbnails();
                jest.advanceTimersByTime(301);

                expect(stubs.classListAdd).toBeCalledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                expect(stubs.toggleSidebar).toBeCalled();
                expect(docBase.resize).toBeCalled();
                expect(docBase.emitMetric).toBeCalledWith({ name: USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN, data: 10 });
                expect(docBase.emit).toBeCalledWith('thumbnailsOpen');
            });

            test('should toggle close and resize the viewer', () => {
                docBase.thumbnailsSidebar = thumbnailsSidebar;
                docBase.pdfViewer = { pagesCount: 10 };

                docBase.toggleThumbnails();
                jest.advanceTimersByTime(301);

                expect(stubs.classListRemove).toBeCalledWith(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                expect(stubs.toggleSidebar).toBeCalled();
                expect(docBase.resize).toBeCalled();
                expect(docBase.emitMetric).toBeCalledWith({ name: USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE, data: 10 });
                expect(docBase.emit).toBeCalledWith('thumbnailsClose');
            });
        });

        describe('getMetricsWhitelist()', () => {
            test('should return the thumbnail sidebar events', () => {
                const expWhitelist = [
                    USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE,
                    USER_DOCUMENT_THUMBNAIL_EVENTS.NAVIGATE,
                    USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN,
                ];

                expect(docBase.getMetricsWhitelist()).toEqual(expWhitelist);
            });
        });

        describe('handleAnnotatorEvents()', () => {
            beforeEach(() => {
                jest.spyOn(docBase.rootEl, 'removeChild').mockImplementation();

                stubs.classListAdd = jest.fn();
                stubs.classListRemove = jest.fn();
                stubs.handleAnnotatorEvents = jest
                    .spyOn(BaseViewer.prototype, 'handleAnnotatorEvents')
                    .mockImplementation();

                docBase.thumbnailsSidebarEl = {
                    classList: {
                        add: stubs.classListAdd,
                        remove: stubs.classListRemove,
                    },
                };
            });

            test('should do nothing if thumbnails sidebar element does not exist', () => {
                docBase.thumbnailsSidebarEl = null;
                docBase.handleAnnotatorEvents();

                expect(stubs.classListAdd).not.toBeCalled();
                expect(stubs.classListRemove).not.toBeCalled();
            });

            test('should add a class if annotator mode enter', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationmodeenter' });

                expect(stubs.classListAdd).toBeCalled();
                expect(stubs.classListRemove).not.toBeCalled();
            });

            test('should remove a class if annotator mode exit', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationmodeexit' });

                expect(stubs.classListAdd).not.toBeCalled();
                expect(stubs.classListRemove).toBeCalled();
            });

            test('should do nothing if another annotator mode event', () => {
                docBase.handleAnnotatorEvents({ event: 'annotationeventfoo' });

                expect(stubs.classListAdd).not.toBeCalled();
                expect(stubs.classListRemove).not.toBeCalled();
            });
        });

        describe('getCachedThumbnailsToggleState()', () => {
            beforeEach(() => {
                stubs.get = jest.spyOn(docBase.cache, 'get').mockImplementation();
            });

            test('should return undefined if there is no existing cache entry', () => {
                stubs.get.mockReturnValue(undefined);

                expect(docBase.getCachedThumbnailsToggledState()).toBeUndefined();
            });

            test('should return undefined if there is no existing cache entry for the file', () => {
                stubs.get.mockReturnValue({ '123': true });

                expect(docBase.getCachedThumbnailsToggledState()).toBeUndefined();
            });

            test('should return the cached value if there is an existing cache entry for the file', () => {
                stubs.get.mockReturnValue({ '0': true });

                expect(docBase.getCachedThumbnailsToggledState()).toBe(true);
            });
        });

        describe('cacheThumbnailsToggleState()', () => {
            const THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY = 'doc-thumbnails-toggled-map';

            beforeEach(() => {
                stubs.set = jest.spyOn(docBase.cache, 'set').mockImplementation();
                stubs.get = jest.spyOn(docBase.cache, 'get').mockImplementation();
            });

            test('should set toggled state to new object', () => {
                stubs.get.mockReturnValue(undefined);

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).toBeCalledWith(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, { '0': true }, true);
            });

            test('should set toggled state to existing object', () => {
                stubs.get.mockReturnValue({ '123': false });

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).toBeCalledWith(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, { '0': true, '123': false }, true);
            });

            test('should update toggled state to existing object', () => {
                stubs.get.mockReturnValue({ '0': false });

                docBase.cacheThumbnailsToggledState(true);

                expect(stubs.set).toBeCalledWith(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, { '0': true }, true);
            });
        });

        describe('shouldThumbnailsBeToggled()', () => {
            let mockPdfViewer;

            beforeEach(() => {
                stubs.getCachedThumbnailsToggledState = jest
                    .spyOn(docBase, 'getCachedThumbnailsToggledState')
                    .mockImplementation();
                mockPdfViewer = {
                    pdfDocument: { numPages: 5 },
                };
                docBase.pdfViewer = mockPdfViewer;
            });

            test('should return true if cached value is true', () => {
                stubs.getCachedThumbnailsToggledState.mockReturnValue(true);
                expect(docBase.shouldThumbnailsBeToggled()).toBe(true);
            });

            test('should return false if cached value is false', () => {
                stubs.getCachedThumbnailsToggledState.mockReturnValue(false);
                expect(docBase.shouldThumbnailsBeToggled()).toBe(false);
            });

            test('should return true if cached value is anything other than false', () => {
                stubs.getCachedThumbnailsToggledState.mockReturnValue(undefined);
                expect(docBase.shouldThumbnailsBeToggled()).toBe(true);

                stubs.getCachedThumbnailsToggledState.mockReturnValue(null);
                expect(docBase.shouldThumbnailsBeToggled()).toBe(true);

                stubs.getCachedThumbnailsToggledState.mockReturnValue('123');
                expect(docBase.shouldThumbnailsBeToggled()).toBe(true);
            });

            test('should return false if document only has 1 page, even if cached state is true', () => {
                stubs.getCachedThumbnailsToggledState.mockReturnValue(true);
                mockPdfViewer = {
                    pdfDocument: { numPages: 1 },
                };
                docBase.pdfViewer = mockPdfViewer;

                expect(docBase.shouldThumbnailsBeToggled()).toBe(false);
            });

            test('should return false if pdfDocument is not found', () => {
                stubs.getCachedThumbnailsToggledState.mockReturnValue(true);
                mockPdfViewer = {
                    pdfDocument: {},
                };
                docBase.pdfViewer = mockPdfViewer;

                expect(docBase.shouldThumbnailsBeToggled()).toBe(false);
            });

            test('should return true if preloader num pages is greater than 1 and the document is not available yet', () => {
                docBase.preloader = {
                    numPages: 2,
                };
                docBase.pdfViewer = {};
                const result = docBase.shouldThumbnailsBeToggled();
                expect(result).toBe(true);
            });

            test('should return false if preloader num pages is 1 and the document is not available yet', () => {
                docBase.preloader = {
                    numPages: 1,
                };
                docBase.pdfViewer = {};
                const result = docBase.shouldThumbnailsBeToggled();
                expect(result).toBe(false);
            });
        });

        describe('initAnnotations()', () => {
            beforeEach(() => {
                docBase.options = {
                    container: document,
                    file: {
                        file_version: {
                            id: 123,
                        },
                    },
                    location: {
                        locale: 'en-US',
                    },
                };
                docBase.scale = 1.5;
                docBase.annotator = {
                    init: jest.fn(),
                    addListener: jest.fn(),
                };
                docBase.annotatorConf = {
                    CONSTRUCTOR: jest.fn(() => docBase.annotator),
                };
                docBase.annotationControls = {
                    destroy: jest.fn(),
                    resetControls: jest.fn(),
                };

                jest.spyOn(docBase, 'areNewAnnotationsEnabled').mockReturnValue(true);
            });

            test('should initialize the annotator', () => {
                jest.spyOn(docBase, 'emit');
                docBase.addListener = jest.fn();
                docBase.initAnnotations();

                expect(docBase.annotator.init).toBeCalledWith(1.5);
                expect(docBase.addListener).toBeCalledWith('toggleannotationmode', expect.any(Function));
                expect(docBase.addListener).toBeCalledWith('scale', expect.any(Function));
                expect(docBase.addListener).toBeCalledWith('scrolltoannotation', docBase.handleScrollToAnnotation);
                expect(docBase.annotator.addListener).toBeCalledWith('annotatorevent', expect.any(Function));
                expect(docBase.annotator.addListener).toBeCalledWith(
                    'annotations_create',
                    docBase.handleAnnotationCreateEvent,
                );
                expect(docBase.annotator.addListener).toBeCalledWith(
                    'annotations_initialized',
                    docBase.handleAnnotationsInitialized,
                );
                expect(docBase.annotator.addListener).toBeCalledWith(
                    'creator_staged_change',
                    docBase.handleAnnotationCreatorChangeEvent,
                );
                expect(docBase.annotator.addListener).toBeCalledWith(
                    'creator_status_change',
                    docBase.handleAnnotationCreatorChangeEvent,
                );
                expect(docBase.emit).toBeCalledWith('annotator', docBase.annotator);
            });
        });

        describe('handleAnnotationCreateEvent()', () => {
            beforeEach(() => {
                docBase.annotator = {
                    emit: jest.fn(),
                };
                docBase.annotationControls = {
                    destroy: jest.fn(),
                    setMode: jest.fn(),
                };
                docBase.processAnnotationModeChange = jest.fn();
            });

            const createEvent = status => ({
                annotation: { id: '123' },
                meta: {
                    status,
                },
            });

            ['error', 'pending'].forEach(status => {
                test(`should not do anything if status is ${status}`, () => {
                    const event = createEvent(status);
                    docBase.handleAnnotationCreateEvent(event);

                    expect(docBase.annotator.emit).not.toBeCalled();
                });
            });

            test('should reset controls if status is success', () => {
                const event = createEvent('success');
                docBase.handleAnnotationCreateEvent(event);

                expect(docBase.annotator.emit).toBeCalledWith('annotations_active_set', '123');
                expect(docBase.processAnnotationModeChange).toBeCalledWith(AnnotationMode.NONE);
            });
        });

        describe('handleAnnotationCreatorChangeEvent()', () => {
            test('should set mode', () => {
                docBase.annotationControls = {
                    destroy: jest.fn(),
                    setMode: jest.fn(),
                };

                docBase.processAnnotationModeChange = jest.fn();
                docBase.handleAnnotationCreatorChangeEvent({
                    status: AnnotationInput.CREATE,
                    type: AnnotationMode.HIGHLIGHT,
                });

                expect(docBase.processAnnotationModeChange).toBeCalledWith(AnnotationMode.HIGHLIGHT);
            });
        });

        describe('handleAnnotationControlsEscape()', () => {
            test('should reset annotationControlsFSM state and call toggleAnnotationMode with AnnotationMode.REGION if enableAnnotationsDiscoverability is true', () => {
                docBase.annotator = {
                    toggleAnnotationMode: jest.fn(),
                };
                docBase.options.enableAnnotationsDiscoverability = true;
                docBase.processAnnotationModeChange = jest.fn();

                docBase.handleAnnotationControlsEscape();

                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.REGION);
                expect(docBase.processAnnotationModeChange).toBeCalledWith(AnnotationMode.NONE);
                expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('true');
            });

            test('should set annotations mode to none', () => {
                docBase.annotator = {
                    toggleAnnotationMode: jest.fn(),
                };
                docBase.options.enableAnnotationsDiscoverability = false;
                docBase.processAnnotationModeChange = jest.fn();
                docBase.containerEl.setAttribute('data-resin-discoverability', false);

                docBase.handleAnnotationControlsEscape();

                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.NONE);
                expect(docBase.processAnnotationModeChange).not.toBeCalled();
                expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
            });
        });

        describe('handleAnnotationColorChange', () => {
            beforeEach(() => {
                docBase.annotationModule = {
                    setColor: jest.fn(),
                };
                docBase.annotator = {
                    emit: jest.fn(),
                };
                docBase.renderUI = jest.fn();
            });

            test('should call setColor and renderUI, and emit color', () => {
                const color = '#fff';
                docBase.handleAnnotationColorChange(color);

                expect(docBase.annotationModule.setColor).toBeCalledWith(color);
                expect(docBase.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setColor, color);
                expect(docBase.renderUI).toHaveBeenCalled();
            });
        });

        describe('handleAnnotationControlsClick', () => {
            beforeEach(() => {
                docBase.annotator = {
                    toggleAnnotationMode: jest.fn(),
                };
                docBase.processAnnotationModeChange = jest.fn();
                docBase.applyCursorFtux = jest.fn();
                docBase.cache = {
                    get: jest.fn(),
                    set: jest.fn(),
                };
            });

            test('should call toggleAnnotationMode and processAnnotationModeChange', () => {
                docBase.handleAnnotationControlsClick({ mode: AnnotationMode.REGION });

                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.REGION);
                expect(docBase.processAnnotationModeChange).toBeCalledWith(AnnotationMode.REGION);
            });

            test('should call toggleAnnotationMode with appropriate mode if discoverability is enabled', () => {
                docBase.options.enableAnnotationsDiscoverability = false;
                docBase.handleAnnotationControlsClick({ mode: AnnotationMode.NONE });
                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.NONE);
                expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('false');

                docBase.options.enableAnnotationsDiscoverability = true;
                docBase.handleAnnotationControlsClick({ mode: AnnotationMode.NONE });
                expect(docBase.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.REGION);
                expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('true');
            });
        });

        describe('getInitialAnnotationMode()', () => {
            test.each`
                enableAnnotationsDiscoverability | expectedMode
                ${false}                         | ${AnnotationMode.NONE}
                ${true}                          | ${AnnotationMode.REGION}
            `(
                'should return initial annotations mode based as $expectedMode if enableAnnotationsDiscoverability is $enableAnnotationsDiscoverability',
                ({ enableAnnotationsDiscoverability, expectedMode }) => {
                    docBase.options.enableAnnotationsDiscoverability = enableAnnotationsDiscoverability;
                    expect(docBase.getInitialAnnotationMode()).toBe(expectedMode);
                },
            );
        });

        describe('updateDiscoverabilityResinTag()', () => {
            const REMAINING_STATES = Object.values(AnnotationState).filter(
                state => !DISCOVERABILITY_STATES.includes(state),
            );

            beforeEach(() => {
                docBase.containerEl = document.createElement('div');
            });

            test.each(Object.values(AnnotationState))(
                'should set resin tag to false if enableAnnotationsDiscoverability is false even if state=%s',
                state => {
                    docBase.options.enableAnnotationsDiscoverability = false;
                    docBase.annotationControlsFSM = new AnnotationControlsFSM(state);

                    docBase.updateDiscoverabilityResinTag();

                    expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
                },
            );

            test.each(REMAINING_STATES)(
                'should set resin tag to false if enableAnnotationsDiscoverability is true but state is %s',
                state => {
                    docBase.options.enableAnnotationsDiscoverability = true;
                    docBase.annotationControlsFSM = new AnnotationControlsFSM(state);

                    docBase.updateDiscoverabilityResinTag();

                    expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
                },
            );

            test.each(DISCOVERABILITY_STATES)(
                'should set resin tag to true if enableDiscoverability is true and state is %s',
                state => {
                    docBase.options.enableAnnotationsDiscoverability = true;
                    docBase.annotationControlsFSM = new AnnotationControlsFSM(state);

                    docBase.updateDiscoverabilityResinTag();

                    expect(docBase.containerEl.getAttribute('data-resin-discoverability')).toBe('true');
                },
            );
        });

        describe('applyCursorFtux()', () => {
            beforeEach(() => {
                docBase.containerEl = {
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                    },
                    removeEventListener: jest.fn(),
                };
                docBase.annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION);
                docBase.cache = {
                    get: jest.fn(),
                    set: jest.fn(),
                };
            });

            test('should add CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN to the container classList if the cache contains DOCUMENT_FTUX_CURSOR_SEEN_KEY', () => {
                docBase.cache.get = jest.fn().mockImplementation(() => true);

                docBase.applyCursorFtux();

                expect(docBase.containerEl.classList.add).toBeCalledWith(CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN);
            });

            test('should set DOCUMENT_FTUX_CURSOR_SEEN_KEY in cache if cache does not contain DOCUMENT_FTUX_CURSOR_SEEN_KEY', () => {
                docBase.cache.get = jest.fn().mockImplementation(() => false);

                docBase.applyCursorFtux();

                expect(docBase.cache.set).toBeCalledWith(DOCUMENT_FTUX_CURSOR_SEEN_KEY, true, true);
            });
        });

        describe('getSessionId()', () => {
            test('should return null if the page tracker object does not exists', () => {
                const sessionId = docBase.getSessionId();
                expect(sessionId).toBe(null);
            });

            test('should return a string the page tracker object exists', () => {
                docBase.pageTracker = new PageTracker();
                docBase.pageTracker.init();
                const sessionId = docBase.getSessionId();
                expect(sessionId).toEqual(expect.any(String));
            });
        });

        describe('getThumbnail()', () => {
            beforeEach(() => {
                docBase.pdfViewer = {
                    pdfDocument: {
                        getPage: jest.fn(),
                    },
                };
                stubs.promiseResolve = Promise.resolve({
                    getViewport: jest.fn().mockReturnValue({ width: 0, height: 0 }),
                    render: jest.fn().mockReturnValue(Promise.resolve()),
                });
                jest.spyOn(docBase.pdfViewer.pdfDocument, 'getPage').mockReturnValue(stubs.promiseResolve);
            });

            test('should call createThumbnailImage on the Thumbnail', () => {
                docBase.advancedInsightsThumbs = new Thumbnail(docBase.pdfViewer);
                stubs.createThumb = jest
                    .spyOn(docBase.advancedInsightsThumbs, 'createThumbnailImage')
                    .mockReturnValue(stubs.promiseResolve);
                docBase.getThumbnail();
                expect(stubs.createThumb).toBeCalled();
            });

            test('should create a new Thumbnail instance', () => {
                expect(docBase.advancedInsightsThumbs).toBe(undefined);
                docBase.getThumbnail();
                expect(docBase.advancedInsightsThumbs).toBeInstanceOf(Thumbnail);
            });
        });

        describe('handleAdvancedInsightsReport()', () => {
            test('should call the emit event', () => {
                const data = {
                    page: 1,
                };
                stubs.emit = jest.spyOn(docBase, 'emit').mockImplementation();
                docBase.handleAdvancedInsightsReport(data);
                expect(stubs.emit).toBeCalledWith(REPORT_ACI, data);
            });
        });

        describe('handlePreviewEventReport()', () => {
            test('should set the preview event report flag on the page tracker if the preview event was succesfully reported', () => {
                docBase.pageTracker = new PageTracker();
                stubs.previewEventReported = jest.spyOn(docBase.pageTracker, 'setPreviewEventReported');

                docBase.handlePreviewEventReport(true);
                expect(stubs.previewEventReported).toBeCalled();
                expect(docBase.pageTracker.previewEventReported).toBe(true);
            });

            test('should destroy the page tracker if the preview event fails', () => {
                docBase.pageTracker = new PageTracker();
                stubs.previewEventReported = jest.spyOn(docBase.pageTracker, 'setPreviewEventReported');

                docBase.handlePreviewEventReport(false);
                expect(stubs.previewEventReported).not.toBeCalled();
                expect(docBase.pageTracker).toBe(null);
            });
        });

        describe('intThumbnails()', () => {
            let docBaseObj;
            beforeEach(() => {
                docBaseObj = new DocBaseViewer({
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

                docBaseObj.pdfViewer = {
                    currentPageNumber: 1,
                };

                docBaseObj.preloader = {};

                docBaseObj.thumbnailsSidebarEl = document.createElement('div');
                jest.spyOn(docBaseObj, 'shouldThumbnailsBeToggled').mockReturnValue(true);
            });

            test('should call render next thumbnail image if the preloader has already loaded its thumbnails', () => {
                docBaseObj.preloader = {};
                const renderNextThumbnailImage = jest.fn();
                docBaseObj.thumbnailsSidebar = {
                    renderNextThumbnailImage,
                };
                docBaseObj.initThumbnails();
                expect(renderNextThumbnailImage).toHaveBeenCalled();
            });

            test('should create a new ThumbnailSidebar if it is null and initialize it', () => {
                const init = jest.fn();
                Object.defineProperty(ThumbnailsSidebar.prototype, 'init', { value: init });
                docBaseObj.initThumbnails();
                expect(docBaseObj.thumbnailsSidebar).toBeInstanceOf(ThumbnailsSidebar);
                expect(docBaseObj.thumbnailsSidebar.anchorEl).toBe(docBaseObj.thumbnailsSidebarEl);
                expect(docBaseObj.thumbnailsSidebar.pdfViewer).toBe(docBaseObj.pdfViewer);
                expect(docBaseObj.thumbnailsSidebar.preloader).toBe(docBaseObj.preloader);
                const params = {
                    currentPage: docBaseObj.pdfViewer.currentPageNumber,
                    isOpen: true,
                    onSelect: docBaseObj.onThumbnailSelectHandler,
                };
                expect(init).toHaveBeenCalledWith(params);
            });
        });
        describe('prefetchPreloaderImages()', () => {
            let mockFile;
            let jpegRep;
            let webpRep;
            const webpUrl =
                'https://example.com/webp/page_number?access_token=auth_token&box_client_name=name&box_client_version=version';
            const jpegUrl =
                'https://example.com/jpeg/{+asset}?access_token=auth_token&box_client_name=name&box_client_version=version';
            beforeEach(() => {
                // Mock representations
                jpegRep = {
                    representation: 'jpg',
                    content: {
                        url_template: 'https://example.com/jpeg/{+asset}',
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                };

                webpRep = {
                    representation: 'webp',
                    content: {
                        url_template: 'https://example.com/webp/{page_number}',
                    },
                    metadata: {
                        pages: 5,
                    },
                    status: {
                        state: STATUS_SUCCESS,
                    },
                };

                mockFile = {
                    id: 'test-file-id',
                    representations: {
                        entries: [jpegRep, webpRep],
                    },
                };
                // Mock options
                docBase.options = {
                    file: { id: 'test-file-id' }, // Add file to options to prevent destroy errors
                    sharedLink: 'original-shared-link',
                    sharedLinkPassword: 'original-password',
                    token: 'auth_token',
                };
            });

            afterEach(() => {
                jest.restoreAllMocks();
            });

            test('should clear sharedLink and sharedLinkPassword options and reset them after prefetching', () => {
                docBase.prefetchPreloaderImages(mockFile);
                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(docBase.api, '', 5, webpUrl);
                expect(docBase.options.sharedLink).toBe('original-shared-link');
                expect(docBase.options.sharedLinkPassword).toBe('original-password');
            });

            test('should not prefetch when neither jpeg nor webp representations exists', () => {
                mockFile.representations.entries = [];
                docBase.prefetchPreloaderImages(mockFile);

                expect(stubs.getPreloadImageRequestPromises).not.toHaveBeenCalled();
            });

            test('should not prefetch when representations exist but are not ready', () => {
                jpegRep.status.state = STATUS_ERROR;
                webpRep.status.state = STATUS_ERROR;
                docBase.prefetchPreloaderImages(mockFile);

                expect(stubs.getPreloadImageRequestPromises).not.toHaveBeenCalled();
            });

            test('should prefetch jpeg representation when only jpeg is ready', () => {
                webpRep.status.state = STATUS_NONE;
                webpRep.metadata = null;
                docBase.prefetchPreloaderImages(mockFile);

                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                    docBase.api,
                    jpegUrl,
                    1, // default fallback page count when webp metadata is not available
                    '',
                );
            });

            test('should only prefetch webp representations when webp is ready', () => {
                docBase.prefetchPreloaderImages(mockFile);
                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(docBase.api, '', 5, webpUrl);
            });

            test('should handle webp representation without metadata pages', () => {
                webpRep.metadata.pages = null;
                docBase.prefetchPreloaderImages(mockFile);

                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                    docBase.api,
                    '',
                    8,
                    expect.any(String),
                );
            });

            test('should handle webp representation with empty metadata', () => {
                webpRep.metadata = null;

                docBase.prefetchPreloaderImages(mockFile);

                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                    docBase.api,
                    '', // jpegUrlAuthTemplate should be false when webp is available
                    8, // default page count when pages is not specified
                    expect.any(String),
                );
            });

            test('should handle jpeg representation without content', () => {
                jpegRep.content = null;
                docBase.prefetchPreloaderImages(mockFile);
                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(
                    docBase.api,
                    '', // jpegUrlAuthTemplate should be false when webp is available
                    5,
                    webpUrl,
                );
            });

            test('should handle webp representation without content', () => {
                webpRep.content = null;
                docBase.prefetchPreloaderImages(mockFile);
                expect(stubs.getPreloadImageRequestPromises).toHaveBeenCalledWith(docBase.api, jpegUrl, 1, '');
            });

            test('should call Promise.all with the returned promises', () => {
                const mockPromises = [Promise.resolve('promise1'), Promise.resolve('promise2')];
                stubs.getPreloadImageRequestPromises.mockReturnValue(mockPromises);
                const promiseAllSpy = jest.spyOn(Promise, 'all');

                docBase.prefetchPreloaderImages(mockFile);

                expect(promiseAllSpy).toHaveBeenCalledWith(mockPromises);

                promiseAllSpy.mockRestore();
            });

            test('should handle null file parameter gracefully', () => {
                // Mock getRepresentation to handle null file without throwing
                expect(() => {
                    docBase.prefetchPreloaderImages(null);
                }).not.toThrow();
                expect(stubs.getPreloadImageRequestPromises).not.toHaveBeenCalled();
            });
        });

        describe('countPdfOperations', () => {
            test('should count operations from multiple pages', async () => {
                const mockDoc = {
                    numPages: 3,
                    getPage: jest.fn(),
                };

                const mockPage1 = {
                    getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(100) }),
                };
                const mockPage2 = {
                    getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(200) }),
                };
                const mockPage3 = {
                    getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(300) }),
                };

                mockDoc.getPage
                    .mockReturnValueOnce(Promise.resolve(mockPage1))
                    .mockReturnValueOnce(Promise.resolve(mockPage2))
                    .mockReturnValueOnce(Promise.resolve(mockPage3));

                const result = await countPdfOperations(mockDoc, 3);
                expect(result).toBe(600);
                expect(mockDoc.getPage).toHaveBeenCalledTimes(3);
            });

            test('should limit to maxPages parameter', async () => {
                const mockDoc = {
                    numPages: 10,
                    getPage: jest.fn(),
                };

                const mockPage = {
                    getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(100) }),
                };

                mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));

                const result = await countPdfOperations(mockDoc, 2);
                expect(result).toBe(200);
                expect(mockDoc.getPage).toHaveBeenCalledTimes(2);
            });

            test('should use default maxPages when not specified', async () => {
                const mockDoc = {
                    numPages: 10,
                    getPage: jest.fn(),
                };

                const mockPage = {
                    getOperatorList: jest.fn().mockResolvedValue({ fnArray: new Array(100) }),
                };

                mockDoc.getPage.mockReturnValue(Promise.resolve(mockPage));

                const result = await countPdfOperations(mockDoc);
                expect(result).toBe(500); // 5 pages * 100 operations each
                expect(mockDoc.getPage).toHaveBeenCalledTimes(5);
            });
        });
    });
});
