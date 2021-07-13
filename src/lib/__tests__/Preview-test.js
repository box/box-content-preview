/* eslint-disable no-unused-expressions */
import * as file from '../file';
import * as util from '../util';
import Api from '../api';
import Browser from '../Browser';
import DownloadReachability from '../DownloadReachability';
import Logger from '../Logger';
import Preview from '../Preview';
import PreviewError from '../PreviewError';
import PreviewPerf from '../PreviewPerf';
import Timer from '../Timer';
import loaders from '../loaders';
import { API_HOST, CLASS_NAVIGATION_VISIBILITY, ENCODING_TYPES } from '../constants';
import { VIEWER_EVENT, ERROR_CODE, LOAD_METRIC, PREVIEW_METRIC } from '../events';

jest.mock('../Logger');
jest.mock('../util', () => ({
    ...jest.requireActual('../util'),
    appendQueryParams: jest.fn(),
    decodeKeydown: jest.fn(),
    findScriptLocation: () => ({
        hostname: 'localhost',
        location: 'en-US',
    }),
    getHeaders: jest.fn(),
}));

const tokens = require('../tokens');

const PREFETCH_COUNT = 4; // number of files to prefetch
const MOUSEMOVE_THROTTLE = 1500; // for showing or hiding the navigation icons
const KEYDOWN_EXCEPTIONS = ['INPUT', 'SELECT', 'TEXTAREA']; // Ignore keydown events on these elements
const sandbox = sinon.createSandbox();

let stubs = {};
let preview;
let containerEl;

describe('lib/Preview', () => {
    beforeEach(() => {
        fixture.load('__tests__/Preview-test.html');
        containerEl = document.querySelector('.container');
        preview = new Preview();
        preview.container = containerEl;
        preview.logger = new Logger();
        stubs = {};
        stubs.api = new Api();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        preview.destroy();
        preview = null;
        stubs = null;
    });

    describe('constructor()', () => {
        test('should set the preview to be closed', () => {
            expect(preview.open).toBe(false);
        });

        test('should initialize the various preview objects', () => {
            expect(preview.count.success).toBe(0);
            expect(preview.count.error).toBe(0);
            expect(preview.count.navigation).toBe(0);
            expect(preview.file).toEqual({});
            expect(preview.options).toEqual({});
            expect(preview.disabledViewers).toEqual({ Office: 1 });
            expect(preview.loaders).toBe(loaders);
            expect(preview.location.hostname).toBe('localhost');
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.repStatus = {
                destroy: jest.fn(),
            };

            stubs.viewer = {
                destroy: jest.fn(),
                getLoadStatus: jest.fn(),
            };
        });

        test('should invoke emitLoadMetrics()', () => {
            stubs.emitLoadMetrics = jest.spyOn(preview, 'emitLoadMetrics');
            preview.destroy();
            expect(stubs.emitLoadMetrics).toBeCalled();
        });

        test('should destroy the viewer if it exists', () => {
            preview.viewer = {
                destroy: undefined,
                getLoadStatus: jest.fn(),
            };

            preview.destroy();
            expect(stubs.viewer.destroy).not.toBeCalled();

            preview.viewer = stubs.viewer;

            preview.destroy();
            expect(stubs.viewer.destroy).toBeCalled();
        });

        test('should stop the duration timer, reset it, and log a preview end event', () => {
            preview.file = {
                id: 1,
            };

            jest.spyOn(preview, 'emitLogEvent').mockImplementation();
            jest.spyOn(Timer, 'createTag').mockImplementation(() => 'duration_tag');
            jest.spyOn(Timer, 'get').mockImplementation(() => ({ elapsed: 7 }));
            jest.spyOn(Timer, 'stop');
            jest.spyOn(Timer, 'reset');
            preview.viewer = stubs.viewer;

            preview.destroy();
            expect(Timer.createTag).toBeCalled();
            expect(Timer.stop).toBeCalledWith('duration_tag');
            expect(preview.emitLogEvent).toBeCalledWith(PREVIEW_METRIC, {
                event_name: 'preview_end',
                value: 7,
            });
        });

        test('should clear the viewer', () => {
            preview.destroy();
            expect(preview.viewer).toBeUndefined();
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.load = jest.spyOn(preview, 'load');
            stubs.updateCollection = jest.spyOn(preview, 'updateCollection');
            stubs.parseOptions = jest.fn();
        });

        test('should set the preview options with string token', () => {
            preview.show('123', 'token', { viewer: 'viewer' });
            expect(preview.previewOptions).toEqual({
                token: 'token',
                viewer: 'viewer',
            });
        });

        test('should set the preview options with function token', () => {
            const foo = () => {}; // eslint-disable-line require-jsdoc

            preview.show('123', foo, { viewer: 'viewer' });
            expect(preview.previewOptions).toEqual({
                token: foo,
                viewer: 'viewer',
            });
        });

        test('should set the preview options with null token', () => {
            preview.show('123', null);
            expect(preview.previewOptions).toEqual({
                token: null,
            });
        });

        test('should set the preview options with no token', () => {
            preview.show('123');
            expect(preview.previewOptions).toEqual({
                token: undefined,
            });
        });

        test('should call update collection with optional collection', () => {
            preview.show('123', 'token', { collection: 'collection' });
            expect(stubs.updateCollection).toBeCalledWith('collection');
        });

        test('should load file associated with the passed in file ID', () => {
            preview.show('123', 'token');
            expect(stubs.load).toBeCalledWith('123');
        });

        test('should call update collection with passed in collection', () => {
            preview.show('123', 'token', { collection: 'collection' });
            expect(stubs.updateCollection).toBeCalledWith('collection');
        });

        test('should load file matching the passed in file object', () => {
            const file123 = {
                id: '123',
                permissions: {},
                shared_link: null,
                sha1: 'sha1',
                file_version: {},
                name: 'blah',
                size: 123,
                extension: 'pdf',
                representations: {},
                watermark_info: {},
                authenticated_download_url: 'url',
                is_download_available: true,
            };

            preview.show(file123, 'foken');
            expect(stubs.load).toBeCalledWith(file123);
        });

        test('should throw an error if auth token is a random object', () => {
            const spy = jest.spyOn(preview, 'show');

            try {
                preview.show('123', {});
            } catch (e) {
                expect(spy).toThrow();
                expect(e.message).toBe('Bad access token!');
            }
        });

        test('should parse the preview options', () => {
            preview.retryCount = 0;
            preview.parseOptions = stubs.parseOptions;

            const token = 'token';
            const options = {
                foo: 'bar',
            };

            preview.show('123', token, options);

            expect(stubs.parseOptions).toBeCalledWith({ ...options, token });
        });

        test('should initialize performance observers', () => {
            preview.show('123', 'token');

            expect(preview.perf).toBeInstanceOf(PreviewPerf);
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            stubs.destroy = jest.spyOn(preview, 'destroy').mockImplementation();
            stubs.cleanup = jest.spyOn(preview.ui, 'cleanup').mockImplementation();
        });

        test('should indicate that the preview is closed', () => {
            preview.open = true;

            preview.hide();
            expect(preview.open).toBe(false);
        });

        test('should destroy the viewer', () => {
            preview.hide();
            expect(stubs.destroy).toBeCalled();
        });

        test('should cleanup the ui', () => {
            preview.hide();
            expect(stubs.cleanup).toBeCalled();
        });

        test('should clear the file', () => {
            preview.file = 'file';

            preview.hide();
            expect(preview.file).toBeUndefined();
        });

        test('should initialize performance observers', () => {
            preview.perf = {
                destroy: jest.fn(),
            };
            preview.hide();

            expect(preview.perf.destroy).toBeCalled();
        });
    });

    describe('reload()', () => {
        beforeEach(() => {
            jest.spyOn(preview, 'destroy');
            jest.spyOn(preview, 'setupUI');
            jest.spyOn(preview, 'loadViewer');
            jest.spyOn(preview, 'load');

            preview.file = {
                id: '123',
                permissions: [],
                shared_link: '',
                sha1: '',
                file_version: {},
                name: 'blah',
                size: 123,
                extension: 'docx',
                representations: {},
                watermark_info: {},
                authenticated_download_url: 'url',
                is_download_available: true,
            };
        });

        test('should default to skipServerUpdate Preview option if no params are passed in', () => {
            preview.options.skipServerUpdate = true;
            preview.reload();
            expect(preview.load).not.toBeCalled();
        });

        test('should not do anything if skipServerUpdate is true and file is not valid', () => {
            preview.file = {};

            preview.reload(true);

            expect(preview.destroy).not.toBeCalled();
            expect(preview.setupUI).not.toBeCalled();
            expect(preview.loadViewer).not.toBeCalled();
        });

        test('should reload preview without fetching file info if skipServerUpdate is true', () => {
            preview.reload(true);

            expect(preview.destroy).toBeCalled();
            expect(preview.setupUI).toBeCalled();
            expect(preview.loadViewer).toBeCalled();
            expect(preview.load).not.toBeCalled();
        });

        test('should not do anything if skipServerUpdate is false and file ID does not exist', () => {
            preview.file = {};

            preview.reload(false);

            expect(preview.load).not.toBeCalled();
        });

        test('should fetch file info and reload preview if skipServerUpdate is false', () => {
            preview.reload(false);
            expect(preview.load).toBeCalled();
        });
    });

    describe('updateCollection()', () => {
        beforeEach(() => {
            stubs.showNavigation = jest.spyOn(preview.ui, 'showNavigation').mockImplementation();
            stubs.updateFileCache = jest.spyOn(preview, 'updateFileCache').mockImplementation();
        });

        test('should set the preview collection to an array of file ids', () => {
            const array = ['1', '2', '3', '4'];

            preview.updateCollection(array);
            expect(stubs.updateFileCache).toBeCalledWith([]);
            expect(preview.collection).toEqual(array);
        });

        test('should set the preview collection to an array of file ids when files passed in', () => {
            const files = ['1', { id: '2' }, 3, { id: '4' }, { id: 5 }];

            preview.updateCollection(files);
            expect(stubs.updateFileCache).toBeCalledWith([{ id: '2' }, { id: '4' }, { id: '5' }]);
            expect(preview.collection).toEqual(['1', '2', '3', '4', '5']);
        });

        test('should throw when bad array of files passed in', () => {
            const files = ['1', {}, '3'];

            expect(preview.updateCollection.bind(preview, files)).toThrowError(Error);
            expect(stubs.updateFileCache).not.toBeCalled();
        });

        test('should throw when bad array of file ids passed in', () => {
            const files = ['', '3'];

            expect(preview.updateCollection.bind(preview, files)).toThrowError(Error);
            expect(stubs.updateFileCache).not.toBeCalled();
        });

        test('should reset the preview collection to an empty array', () => {
            const array = '1,2,3,4';

            preview.updateCollection(array);
            expect(stubs.updateFileCache).toBeCalledWith([]);
            expect(preview.collection).toEqual([]);
        });

        test('should show navigation if the file exists', () => {
            preview.file = undefined;

            preview.updateCollection();
            expect(stubs.showNavigation).not.toBeCalled();

            preview.file = {
                id: 0,
            };

            preview.updateCollection();
            expect(stubs.showNavigation).toBeCalledWith(0, []);
        });
    });

    describe('updateFileCache()', () => {
        beforeEach(() => {
            stubs.checkFileValid = jest.spyOn(file, 'checkFileValid').mockImplementation();
            stubs.cacheFile = jest.spyOn(file, 'cacheFile').mockImplementation();
            stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
            stubs.emitPreviewError = jest.spyOn(preview, 'emitPreviewError').mockImplementation();
        });

        test('should format the metadata into an array', () => {
            const files = {
                id: 0,
                watermark_info: {
                    is_watermarked: false,
                },
            };

            stubs.checkFileValid.mockReturnValueOnce(true);

            preview.updateFileCache(files);
            expect(stubs.cacheFile).toBeCalledWith(preview.cache, files);
        });

        test('should add the file to the cache if it is valid', () => {
            const files = [
                {
                    id: 0,
                    watermark_info: {
                        is_watermarked: false,
                    },
                },
                {
                    id: 1,
                    watermark_info: {
                        is_watermarked: false,
                    },
                },
            ];

            stubs.checkFileValid.mockReturnValueOnce(true).mockReturnValueOnce(false);

            preview.updateFileCache(files);
            expect(stubs.cacheFile).toBeCalledTimes(1);
            expect(stubs.consoleError).toBeCalledTimes(1);
            expect(stubs.emitPreviewError).toBeCalledTimes(1);
        });

        test('should not cache a file if it is watermarked', () => {
            const files = {
                id: 0,
                watermark_info: {
                    is_watermarked: true,
                },
            };

            stubs.checkFileValid.mockReturnValue(true);

            preview.updateFileCache(files);
            expect(stubs.cacheFile).not.toBeCalled();
            expect(stubs.consoleError).not.toBeCalled();
        });
    });

    describe('getCurrentViewer()', () => {
        test('should return the viewer', () => {
            const viewer = preview.getCurrentViewer();
            expect(viewer).toBe(preview.viewer);
        });
    });

    describe('getCurrentFile()', () => {
        test('should return the current file', () => {
            const currentFile = preview.getCurrentFile();
            expect(currentFile).toBe(preview.file);
        });
    });

    describe('getCurrentCollection()', () => {
        test('should return the current collection', () => {
            const collection = preview.getCurrentCollection();
            expect(collection).toBe(preview.collection);
        });
    });

    describe('getViewers()', () => {
        test('should add the viewers from the given loaders', () => {
            const textLoader = preview.loaders[0];
            const viewers = textLoader.getViewers();
            preview.loaders = [textLoader];

            const getViewers = preview.getViewers();
            expect(getViewers).toEqual(viewers);
        });
    });

    describe('prefetch()', () => {
        let fileId;
        let token;
        let sharedLink;
        let sharedLinkPassword;
        let loader;
        let viewer;
        let someFile;

        beforeEach(() => {
            fileId = '0';
            token = 'someToken';
            sharedLink = 'someSharedLink';
            sharedLinkPassword = 'someSharedLinkPassword';
            someFile = {};
            loader = {
                determineViewer: () => {},
                determineRepresentation: () => {},
            };
            viewer = {
                CONSTRUCTOR: () => {},
            };

            sandbox
                .stub(file, 'getCachedFile')
                .withArgs(preview.cache, sinon.match.any)
                .returns(someFile);
            sandbox
                .stub(preview, 'getLoader')
                .withArgs(someFile)
                .returns(loader);
        });

        test('should short circuit if no appropriate viewer is found', () => {
            jest.spyOn(loader, 'determineViewer').mockReturnValue(null);
            sandbox
                .mock(loader)
                .expects('determineRepresentation')
                .never();
            sandbox
                .mock(viewer)
                .expects('CONSTRUCTOR')
                .never();
            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword });
        });

        test('should get the appropriate viewer', () => {
            sandbox
                .mock(loader)
                .expects('determineViewer')
                .withArgs(someFile, undefined, { viewer: {} })
                .returns(viewer);
            preview.options.viewers = { viewer: {} };
            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword });
        });

        test('should determine representation', () => {
            jest.spyOn(loader, 'determineViewer').mockReturnValue(viewer);
            sandbox
                .mock(loader)
                .expects('determineRepresentation')
                .withArgs(someFile, viewer);
            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword });
        });

        test('should set sharedLink and sharedLinkPassword when preload is true', () => {
            jest.spyOn(loader, 'determineViewer').mockReturnValue(viewer);
            jest.spyOn(preview, 'createViewerOptions');

            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword, preload: true });

            expect(preview.createViewerOptions).toBeCalledWith({
                viewer,
                file: someFile,
                token,
                representation: undefined,
                sharedLink,
                sharedLinkPassword,
            });
        });

        test('should prefetch assets, preload, and content if viewer defines a prefetch function and preload is false, but viewer preload option is true', () => {
            viewer = {
                CONSTRUCTOR: () => {
                    return {
                        prefetch: sandbox.mock().withArgs({
                            assets: true,
                            preload: true,
                            content: true,
                        }),
                        getViewerOption: sandbox
                            .stub()
                            .withArgs('preload')
                            .returns(true),
                    };
                },
            };
            jest.spyOn(loader, 'determineViewer').mockReturnValue(viewer);

            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword, preload: false });
        });

        test('should prefetch assets and content but not preload if viewer defines a prefetch function and preload is false, and viewer preload option is false', () => {
            viewer = {
                CONSTRUCTOR: () => {
                    return {
                        prefetch: sandbox.mock().withArgs({
                            assets: true,
                            preload: false,
                            content: true,
                        }),
                        getViewerOption: sandbox
                            .stub()
                            .withArgs('preload')
                            .returns(false),
                    };
                },
            };
            jest.spyOn(loader, 'determineViewer').mockReturnValue(viewer);

            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword, preload: false });
        });

        test('should prefetch assets and preload, but not content if viewer defines a prefetch function and preload is true', () => {
            viewer = {
                CONSTRUCTOR: () => {
                    return {
                        prefetch: sandbox.mock().withArgs({
                            assets: true,
                            preload: true,
                            content: false,
                        }),
                    };
                },
            };
            jest.spyOn(loader, 'determineViewer').mockReturnValue(viewer);

            preview.prefetch({ fileId, token, sharedLink, sharedLinkPassword, preload: true });
        });
    });

    describe('prefetchViewers()', () => {
        describe('prefetch stubbed', () => {
            let prefetchStub;

            beforeEach(() => {
                prefetchStub = jest.fn();

                /* eslint-disable require-jsdoc */
                const stubViewer = () => {
                    return { prefetch: prefetchStub };
                };
                /* eslint-enable require-jsdoc */

                const mockViewers = [
                    {
                        NAME: 'viewer1',
                        CONSTRUCTOR: stubViewer,
                    },
                    {
                        NAME: 'viewer2',
                        CONSTRUCTOR: stubViewer,
                    },
                    {
                        NAME: 'viewer3',
                        CONSTRUCTOR: stubViewer,
                    },
                ];

                stubs.getViewers = jest.spyOn(preview, 'getViewers').mockReturnValue(mockViewers);
            });

            test('should prefetch no viewers if no viewer names are specified', () => {
                preview.prefetchViewers();
                expect(prefetchStub).not.toBeCalled();
            });

            test('should prefetch only passed in viewers', () => {
                const viewerToPrefetch = preview.getViewers()[0];
                const viewerName = viewerToPrefetch.NAME;

                preview.prefetchViewers([viewerName]);
                expect(prefetchStub).toBeCalledTimes(1);
                expect(prefetchStub).toBeCalledWith({
                    assets: true,
                    preload: false,
                    content: false,
                });
            });
        });

        test('should not throw when prefetching the viewers', () => {
            // Get the list of all possible viewers and extract the names
            const PREVIEW_SDK_VIEWERS_TO_PREFETCH = preview.getViewers().map(viewer => viewer.NAME);

            expect(() => preview.prefetchViewers(PREVIEW_SDK_VIEWERS_TO_PREFETCH)).not.toThrow();
        });
    });

    describe('disableViewers()', () => {
        beforeEach(() => {
            preview.disabledViewers = {};
        });

        test('should disable each viewer passed in', () => {
            const viewersToDisable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToDisable));
            Object.keys(viewersToDisable).forEach(viewer => {
                expect(preview.disabledViewers[viewer]).toBe(1);
            });
        });

        test('should disable only one viewer if only one is passed in', () => {
            const viewerToDisable = 'text';

            preview.disableViewers(viewerToDisable);
            expect(preview.disabledViewers.text).toBe(1);
        });
    });

    describe('enableViewers()', () => {
        test('should enable an array of passed in viewers', () => {
            const viewersToEnable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToEnable));
            preview.enableViewers(Object.keys(viewersToEnable));
            expect(preview.disabledViewers).toEqual({ Office: 1 });
        });

        test('should enable a single viewer that is passed in', () => {
            const viewersToEnable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToEnable));
            preview.enableViewers('text');
            expect(preview.disabledViewers.text).toBeUndefined();
            expect(preview.disabledViewers.csv).toBe(1);
        });
    });

    describe('disableHotkeys()', () => {
        test('should turn off hot keys in the options', () => {
            preview.disableHotkeys();
            expect(preview.options.useHotkeys).toBe(false);
        });
    });

    describe('enableHotkeys()', () => {
        test('should turn on hot keys in the options', () => {
            preview.enableHotkeys();
            expect(preview.options.useHotkeys).toBe(true);
        });
    });

    describe('resize()', () => {
        test('should resize if the viewer exists', () => {
            preview.viewer = {
                resize: jest.fn(),
            };

            preview.resize();
            expect(preview.viewer.resize).toBeCalled();
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.canDownload = jest.spyOn(file, 'canDownload');
            stubs.checkFeature = jest.spyOn(file, 'checkFeature');
            preview.viewer = {
                print: jest.fn(),
            };
        });

        test('should print if file can be downloaded and feature exists', () => {
            stubs.canDownload.mockReturnValue(true);
            stubs.checkFeature.mockReturnValue(true);

            preview.print();
            expect(preview.viewer.print).toBeCalled();
        });

        test('should not print if feature does not exist', () => {
            stubs.canDownload.mockReturnValue(true);
            stubs.checkFeature.mockReturnValue(false);

            preview.print();
            expect(preview.viewer.print).not.toBeCalled();
        });

        test('should not print if file cannot be downloaded', () => {
            stubs.canDownload.mockReturnValue(false);
            stubs.checkFeature.mockReturnValue(false);

            preview.print();
            expect(preview.viewer.print).not.toBeCalled();
        });
    });

    describe('canPrint()', () => {
        beforeEach(() => {
            stubs.canDownload = jest.spyOn(file, 'canDownload');
            stubs.checkFeature = jest.spyOn(file, 'checkFeature');
        });

        test('should return true is file is downloadable and has printing feature', () => {
            stubs.canDownload.mockReturnValue(true);
            stubs.checkFeature.mockReturnValue(true);

            expect(preview.canPrint()).toBe(true);
        });

        test('should return false is file is not downloadable and has printing feature', () => {
            stubs.canDownload.mockReturnValue(false);
            stubs.checkFeature.mockReturnValue(true);

            expect(preview.canPrint()).toBe(false);
        });

        test('should return false is file is downloadable and but does not have printing feature', () => {
            stubs.canDownload.mockReturnValue(true);
            stubs.checkFeature.mockReturnValue(false);

            expect(preview.canPrint()).toBe(false);
        });
    });

    describe('download()', () => {
        beforeEach(() => {
            stubs.downloadReachability = new DownloadReachability({});

            stubs.promise = Promise.resolve({
                data: {
                    download_url: 'dl.boxcloud.com',
                },
            });

            preview.ui = {
                showNotification: jest.fn(),
            };
            preview.viewer = {
                getRepresentation: jest.fn(),
                getAssetPath: jest.fn(),
                getLoadStatus: jest.fn(),
                createContentUrlWithAuthParams: jest.fn(),
                options: {
                    viewer: {
                        ASSET: '',
                    },
                },
            };
            jest.spyOn(preview, 'emit');
            jest.spyOn(file, 'canDownload');
            jest.spyOn(file, 'shouldDownloadWM');
            jest.spyOn(util, 'openUrlInsideIframe');
            jest.spyOn(util, 'appendQueryParams');
            jest.spyOn(DownloadReachability.prototype, 'downloadWithReachabilityCheck');

            jest.spyOn(file, 'getDownloadURL');
            jest.spyOn(preview, 'getRequestHeaders');
            jest.spyOn(Api.prototype, 'get');
        });

        test('should show error notification and not download file if file cannot be downloaded', () => {
            file.canDownload.mockReturnValue(false);
            preview.download();
            expect(preview.ui.showNotification).toBeCalled();
            expect(util.openUrlInsideIframe).not.toBeCalled();
        });

        test('should show error notification and not download watermarked file if file should be downloaded as watermarked, but file does not have a previewable representation', () => {
            file.canDownload.mockReturnValue(true);
            file.shouldDownloadWM.mockReturnValue(true);
            preview.viewer.getRepresentation.mockReturnValue({});

            preview.download();

            expect(preview.ui.showNotification).toBeCalled();
            expect(util.openUrlInsideIframe).not.toBeCalled();
        });

        test('should download watermarked representation if file should be downloaded as watermarked', () => {
            file.canDownload.mockReturnValue(true);
            file.shouldDownloadWM.mockReturnValue(true);

            const template = 'someTemplate';
            const representation = {
                content: {
                    url_template: template,
                },
            };
            const url = 'someurl';

            preview.viewer.getRepresentation.mockReturnValue(representation);
            preview.viewer.getAssetPath.mockReturnValue('1.jpg');
            preview.viewer.createContentUrlWithAuthParams.mockReturnValue(url);

            util.appendQueryParams.mockReturnValue(url);

            preview.download();

            expect(util.appendQueryParams).toBeCalledWith(url, {
                response_content_disposition_type: 'attachment',
            });
            expect(stubs.downloadReachability.downloadWithReachabilityCheck).toBeCalledWith(url);
        });

        test('should download original file if file should not be downloaded as watermarked', () => {
            file.canDownload.mockReturnValue(true);
            file.shouldDownloadWM.mockReturnValue(false);

            const url = 'someurl';
            util.appendQueryParams.mockReturnValue(url);

            const promise = Promise.resolve({
                download_url: url,
            });

            stubs.api.get.mockReturnValue(promise);

            preview.download();

            return promise.then(() => {
                expect(stubs.downloadReachability.downloadWithReachabilityCheck).toBeCalledWith(url);
            });
        });

        test('should emit the download attempted metric', () => {
            file.canDownload.mockReturnValue(true);
            file.shouldDownloadWM.mockReturnValue(false);
            const url = 'someurl';
            util.appendQueryParams.mockReturnValue(url);

            stubs.api.get.mockResolvedValue({
                download_url: url,
            });

            preview.download();
            expect(preview.emit).toBeCalledWith('preview_metric', expect.any(Object));
        });
    });

    describe('updateToken()', () => {
        beforeEach(() => {
            jest.spyOn(preview, 'reload');
        });

        test('should update token in options with the passed in string or function', () => {
            const newToken = 'daredevil';
            preview.updateToken(newToken, false);
            expect(preview.previewOptions.token).toBe(newToken);
        });

        test('should reload preview by default', () => {
            preview.file = { id: '1' };
            jest.spyOn(preview, 'load');
            preview.updateToken('DownloadReachability-strange');
            expect(preview.reload).toBeCalled();
        });

        test('should not reload preview if reload is false', () => {
            preview.file = { id: '123' };
            jest.spyOn(preview, 'load');
            preview.updateToken('nick-fury', false);
            expect(preview.reload).not.toBeCalled();
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            stubs.tokens = {
                0: 'file0',
            };
            stubs.file = {
                id: '123',
                permissions: {},
                shared_link: null,
                sha1: 'sha1',
                file_version: {},
                name: 'blah',
                size: 123,
                extension: 'pdf',
                representations: {
                    entries: [],
                },
                watermark_info: {},
                authenticated_download_url: 'url',
                is_download_available: true,
            };

            stubs.promise = Promise.resolve({
                token: 'token',
            });

            stubs.getTokens = jest.spyOn(tokens, 'default').mockReturnValue(stubs.promise);
            stubs.handleTokenResponse = jest.spyOn(preview, 'handleTokenResponse').mockImplementation();
            stubs.apiAddRequestInterceptor = jest.spyOn(Api.prototype, 'addRequestInterceptor');
            stubs.apiAddResponseInterceptor = jest.spyOn(Api.prototype, 'addResponseInterceptor');

            stubs.get = jest.spyOn(preview.cache, 'get');
            stubs.destroy = jest.spyOn(preview, 'destroy');

            stubs.getCachedFile = jest.spyOn(file, 'getCachedFile');

            preview.fileVersions = {};
        });

        test('should cleanup any existing viewer', () => {
            preview.load('0');
            expect(stubs.destroy).toBeCalled();
        });

        test('should set the preview to open, and initialize the performance logger', () => {
            jest.spyOn(Browser, 'getBrowserInfo');
            preview.load('0');
            expect(preview.open).toBe(true);
            expect(preview.logger).toBeDefined();
            expect(Browser.getBrowserInfo).not.toBeCalled(); // cached from preview constructor
        });

        test('should fetch file from cache using file ID as key if file version ID is not in options', () => {
            const fileId = '123';
            preview.load(fileId);
            expect(file.getCachedFile).toBeCalledWith(preview.cache, { fileId });
        });

        test('should fetch file from cache and convert file id to string when file id passed as a number', () => {
            const fileId = 123;
            preview.load(fileId);
            expect(file.getCachedFile).toBeCalledWith(preview.cache, { fileId: fileId.toString() });
        });

        test('should fetch file from cache using file version ID as key if file version ID is in options', () => {
            const fileId = '123';
            const fileVersionId = '1234';

            sandbox
                .stub(preview, 'getFileOption')
                .withArgs(fileId, 'fileVersionId')
                .returns(fileVersionId);
            preview.load(fileId);

            expect(file.getCachedFile).toBeCalledWith(preview.cache, { fileVersionId });
        });

        test('should clear the retry timeout', () => {
            preview.load('0');
            expect(preview.retryTimeout).toBeUndefined();
        });

        test('should load preview when a well-formed file object is passed and server update should be skipped', () => {
            preview.options.skipServerUpdate = true;

            preview.load(stubs.file);
            expect(stubs.handleTokenResponse).toBeCalledWith({});
            expect(stubs.getTokens).not.toBeCalled();
        });

        test('should set the retry count if we are retrying by file ID', () => {
            preview.retryCount = 0;
            preview.file.id = '0';

            preview.load('0');
            expect(preview.retryCount).toBe(1);

            preview.file = undefined;

            preview.load('0');
            expect(preview.retryCount).toBe(0);
        });

        test('should set the retry count if we are retrying by file version ID', () => {
            preview.retryCount = 0;

            // The current file we are attempting to preview has file version '1234'
            preview.file.file_version = {
                id: '1234',
            };

            // Calling load() with file version ID '1234'
            stubs.getFileVersionId = sandbox
                .stub(preview, 'getFileOption')
                .withArgs(sinon.match.any, 'fileVersionId')
                .returns('1234');
            preview.load('0');

            expect(preview.retryCount).toBe(1);

            // Calling load() with file version ID '12345'
            stubs.getFileVersionId.returns('12345');
            preview.load('0');

            expect(preview.retryCount).toBe(0);
        });

        test('should throw an error if incompatible file object is passed in', () => {
            const invalidFile = {
                not: 'the',
                right: 'fields',
            };

            expect(preview.load.bind(preview, invalidFile)).toThrowError(PreviewError);
        });

        test('should start a timer for the total preview load time, for the file', () => {
            const id = 'my_file_id';
            const tag = Timer.createTag(id, LOAD_METRIC.previewLoadTime);

            preview.load({ id });

            const timer = Timer.get(tag);

            expect(timer).toBeDefined();
            expect(timer.start).toBeDefined();
        });

        test('should get the tokens when file id is available', () => {
            preview.previewOptions.token = 'token';

            preview.load({ id: '123' });
            return stubs.promise.then(() => {
                expect(stubs.getTokens).toBeCalledWith('123', 'token');
                expect(stubs.handleTokenResponse).toBeCalled();
            });
        });

        test('should get the tokens and either handle the response or error', () => {
            preview.previewOptions.token = 'token';

            preview.load('0');
            return stubs.promise.then(() => {
                expect(stubs.getTokens).toBeCalledWith('0', 'token');
                expect(stubs.handleTokenResponse).toBeCalled();
            });
        });

        test('should load response interceptor if an option', () => {
            preview.options.responseInterceptor = jest.fn();

            preview.load('0');
            expect(stubs.apiAddResponseInterceptor).toBeCalled();
        });

        test('should load request interceptor if an option', () => {
            preview.options.requestInterceptor = jest.fn();

            preview.load('0');
            expect(stubs.apiAddRequestInterceptor).toBeCalled();
        });
    });

    describe('handleTokenResponse()', () => {
        beforeEach(() => {
            stubs.cacheFile = jest.spyOn(file, 'cacheFile');
            stubs.checkFileValid = jest.spyOn(file, 'checkFileValid');
            stubs.checkPermission = jest.spyOn(file, 'checkPermission');
            stubs.loadFromCache = jest.spyOn(preview, 'loadFromCache').mockImplementation();
            stubs.loadFromServer = jest.spyOn(preview, 'loadFromServer').mockImplementation();
            stubs.setupUI = jest.spyOn(preview, 'setupUI');
            stubs.ui = jest.spyOn(preview.ui, 'isSetup');
        });

        test('should set the token option', () => {
            preview.retryCount = 0;
            const TOKEN = 'bar';
            const FILE_ID = '123';
            preview.file = {
                id: FILE_ID,
            };
            preview.handleTokenResponse({
                [FILE_ID]: TOKEN,
            });

            expect(preview.options.token).toBe(TOKEN);
        });

        test('should setup UI', () => {
            preview.handleTokenResponse({});
            expect(stubs.setupUI).toBeCalled();
        });

        test('should load from cache if the file is valid', () => {
            stubs.checkFileValid.mockReturnValue(true);

            preview.handleTokenResponse({});
            expect(stubs.cacheFile).toBeCalledWith(preview.cache, preview.file);
            expect(stubs.loadFromCache).toBeCalled();
            expect(stubs.loadFromServer).not.toBeCalled();
        });

        test('should load from the server on a cache miss', () => {
            stubs.checkFileValid.mockReturnValue(false);

            preview.handleTokenResponse({});
            expect(stubs.loadFromCache).not.toBeCalled();
            expect(stubs.loadFromServer).toBeCalled();
        });

        test('should setup UI if ui is not setup', () => {
            stubs.ui.mockReturnValue(false);
            preview.handleTokenResponse({});
            expect(stubs.setupUI).toBeCalled();
        });

        test('should setup UI if not retrying', () => {
            stubs.ui.mockReturnValue(true);
            preview.retryCount = 0;
            preview.handleTokenResponse({});
            expect(stubs.setupUI).toBeCalled();
        });

        test('should not setup UI if UI is setup and is retrying', () => {
            stubs.ui.mockReturnValue(true);
            preview.retryCount = 1;
            preview.handleTokenResponse({});
            expect(stubs.setupUI).not.toBeCalled();
        });
    });

    describe('setupUI', () => {
        test('should setup the shell, update navigation, and show loading/start progress', () => {
            const previewUIMock = sandbox.mock(preview.ui);
            previewUIMock.expects('setup');
            previewUIMock.expects('showLoadingIcon');
            previewUIMock.expects('showLoadingIndicator');
            previewUIMock.expects('showNavigation');
            previewUIMock.expects('setupNotification');

            preview.setupUI();
        });
    });

    describe('parseOptions()', () => {
        beforeEach(() => {
            stubs.sharedLink = 'www.app.box.com/shared';
            stubs.sharedLinkPassword = 'password';
            stubs.apiHost = 'endpoint/';
            stubs.appHost = 'https://host.app.box.com';
            stubs.header = 'dark';
            stubs.logoUrl = 'www.app.box.com/logo';
            stubs.collection = ['file0', 'file1'];
            stubs.loaders = ['customloader'];
            preview.previewOptions = {
                container: containerEl,
                sharedLink: stubs.sharedLink,
                sharedLinkPassword: stubs.sharedLinkPassword,
                apiHost: stubs.apiHost,
                appHost: stubs.appHost,
                header: stubs.header,
                logoUrl: stubs.logoUrl,
                showDownload: true,
                showAnnotations: true,
                fixDependencies: true,
                collection: stubs.collection,
                loaders: stubs.loaders,
                enableThumbnailsSidebar: true,
            };

            stubs.assign = jest.spyOn(Object, 'assign');
            stubs.disableViewers = jest.spyOn(preview, 'disableViewers');
            stubs.enableViewers = jest.spyOn(preview, 'enableViewers');

            preview.file = {
                id: 0,
            };
        });

        test('should set the container', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.container).toBe(containerEl);
        });

        test('should set shared link and shared link password', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.sharedLink).toBe(stubs.sharedLink);
            expect(preview.options.sharedLinkPassword).toBe(stubs.sharedLinkPassword);
        });

        test('should save a reference to the api host', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.apiHost).toBe('endpoint');

            // Check default
            preview.previewOptions.apiHost = undefined;
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.apiHost).toBe('https://api.box.com');
        });

        test('should save a reference to the app host', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.appHost).toBe(stubs.appHost);

            // Check default
            preview.previewOptions.appHost = undefined;
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.appHost).toBe('https://app.box.com');
        });

        test('should set whether to show the header or a custom logo', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.header).toBe(stubs.header);
            expect(preview.options.logoUrl).toBe(stubs.logoUrl);

            preview.previewOptions.header = undefined;
            preview.previewOptions.logoUrl = undefined;

            preview.parseOptions(preview.previewOptions);
            expect(preview.options.header).toBe('light');
            expect(preview.options.logoUrl).toBe('');
        });

        test('should set whether to show a download link or annotations', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.showDownload).toBe(true);
            expect(preview.options.showAnnotations).toBe(true);
        });

        test('should set whether to show loading indicators', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.showLoading).toBe(true);

            preview.previewOptions.showLoading = false;
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.showLoading).toBe(false);
        });

        test('should set whether to skip load from the server and any server updates', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.skipServerUpdate).toBe(false);

            preview.previewOptions.skipServerUpdate = true;
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.skipServerUpdate).toBe(true);
        });

        test('should set whether to fix dependencies', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.fixDependencies).toBe(true);
        });

        test('should allow auto focussing by default', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.autoFocus).toBe(true);
        });

        test('should not allow auto focussing when told not to', () => {
            preview.parseOptions({ ...preview.previewOptions, autoFocus: false });
            expect(preview.options.autoFocus).toBe(false);
        });

        test('should add user created loaders before standard loaders', () => {
            const expectedLoaders = stubs.loaders.concat(loaders);

            preview.parseOptions(preview.previewOptions);
            expect(preview.loaders).toEqual(expectedLoaders);
            expect(preview.loaders[0]).toEqual(expectedLoaders[0]);
        });

        test('should disable any specified viewers, otherwise enable', () => {
            preview.previewOptions.viewers = {
                Office: {
                    disabled: true,
                },
                text: {
                    disabled: false,
                },
            };

            preview.parseOptions(preview.previewOptions);
            expect(stubs.disableViewers).toBeCalledWith('Office');
            expect(stubs.enableViewers).toBeCalledWith('text');
        });

        test('should set whether to enable thumbnails sidebar', () => {
            preview.parseOptions(preview.previewOptions);
            expect(preview.options.enableThumbnailsSidebar).toBe(true);
        });

        test('should set the request interceptor if provided', () => {
            const requestInterceptor = jest.fn();
            preview.previewOptions.requestInterceptor = requestInterceptor;
            preview.parseOptions(preview.previewOptions);

            expect(preview.options.requestInterceptor).toBe(requestInterceptor);
        });

        test('should set the response interceptor if provided', () => {
            const responseInterceptor = jest.fn();
            preview.previewOptions.responseInterceptor = responseInterceptor;
            preview.parseOptions(preview.previewOptions);

            expect(preview.options.responseInterceptor).toBe(responseInterceptor);
        });
    });

    describe('createViewerOptions()', () => {
        test('should create viewer options with location', () => {
            preview.location = 'someLocation';
            expect(preview.createViewerOptions().location).toBe(preview.location);
        });

        test('should deep clone options', () => {
            const someOption = {};
            expect(preview.createViewerOptions({ someOption }).someOption).not.toBe(someOption);
        });
    });

    describe('loadFromCache()', () => {
        beforeEach(() => {
            stubs.loadViewer = jest.spyOn(preview, 'loadViewer').mockImplementation();
            stubs.loadFromServer = jest.spyOn(preview, 'loadFromServer').mockImplementation();
        });

        test('should set the file as cached in the logger', () => {
            preview.loadFromCache();
            expect(preview.logger.setCached).toBeCalled();
        });

        test('should load the viewer', () => {
            preview.loadFromCache();
            expect(stubs.loadViewer).toBeCalled();
        });

        test('should not refresh the file from the server when need to skip server update', () => {
            preview.options.skipServerUpdate = true;
            preview.loadFromCache();
            expect(preview.loadFromServer).not.toBeCalled();
        });

        test('should refresh the file from the server to update the cache', () => {
            preview.loadFromCache();
            expect(preview.loadFromServer).toBeCalled();
        });
    });

    describe('loadFromServer()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve('file');
            stubs.get = jest.spyOn(Api.prototype, 'get').mockReturnValue(stubs.promise);
            stubs.handleFileInfoResponse = jest.spyOn(preview, 'handleFileInfoResponse');
            stubs.handleFetchError = jest.spyOn(preview, 'handleFetchError');
            stubs.getURL = jest.spyOn(file, 'getURL').mockReturnValue('/get_url');
            preview.file = {
                id: 0,
            };
        });

        test('should handle load response on a successful get', () => {
            preview.loadFromServer();
            expect(stubs.get).toBeCalled();
            expect(stubs.getURL).toBeCalled();
            return stubs.promise.then(() => {
                expect(stubs.handleFileInfoResponse).toBeCalled();
                expect(stubs.handleFetchError).not.toBeCalled();
            });
        });

        test('should start a Timer for file info timing', () => {
            const startStub = jest.spyOn(Timer, 'start');
            const expectedTag = Timer.createTag(preview.file.id, LOAD_METRIC.fileInfoTime);
            preview.loadFromServer();
            expect(startStub).toBeCalledWith(expectedTag);
        });
    });

    describe('handleFileInfoResponse()', () => {
        beforeEach(() => {
            preview.open = true;
            preview.file = {
                id: 0,
            };

            stubs.getCachedFile = jest.spyOn(file, 'getCachedFile');
            stubs.set = jest.spyOn(preview.cache, 'set');
            stubs.triggerError = jest.spyOn(preview, 'triggerError');
            stubs.loadViewer = jest.spyOn(preview, 'loadViewer');
            stubs.reload = jest.spyOn(preview, 'reload');
            stubs.cacheFile = jest.spyOn(file, 'cacheFile');
            stubs.uncacheFile = jest.spyOn(file, 'uncacheFile');
            stubs.checkFileValid = jest.spyOn(file, 'checkFileValid').mockReturnValue(true);
            stubs.isWatermarked = jest.spyOn(file, 'isWatermarked').mockReturnValue(false);
            stubs.file = {
                id: '123',
                name: 'file',
                file_version: {
                    id: '1234',
                    sha1: 2,
                },
                representations: {
                    entries: [],
                },
            };
            preview.fileVersions = {};
        });

        test('should normalize the file version object from server if previewing a file verison', () => {
            preview.file.id = '123';
            jest.spyOn(file, 'normalizeFileVersion').mockReturnValue({
                id: preview.file.id,
                shared_link: {},
                file_version: {
                    id: '1234',
                },
            });
            const fileVersion = {
                id: '1234',
            };
            sandbox
                .stub(preview, 'getFileOption')
                .withArgs('123', 'fileVersionId')
                .returns(fileVersion.id);

            preview.handleFileInfoResponse(fileVersion);

            expect(file.normalizeFileVersion).toBeCalledWith(fileVersion, preview.file.id);
        });

        test('should do nothing if the preview is closed', () => {
            preview.open = false;
            preview.file.id = '123';
            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.set).not.toBeCalled();
        });

        test('should do nothing if response comes back for an incorrect file', () => {
            preview.file = {
                id: '123',
                file_version: {
                    id: '1234',
                },
            };
            stubs.file.file_version.id = '1233';

            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.set).not.toBeCalled();
        });

        test('should save a reference to the file and update the logger', () => {
            preview.handleFileInfoResponse(stubs.file);
            expect(preview.file).toBe(stubs.file);
            expect(preview.logger.setFile).toBeCalled();
        });

        test('should get the latest cache, then update it with the new file', () => {
            stubs.getCachedFile.mockReturnValue({
                file_version: {
                    sha1: 0,
                },
            });

            stubs.file.file_version.sha1 = 0;

            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.getCachedFile).toBeCalledWith(preview.cache, {
                fileVersionId: stubs.file.file_version.id,
            });
            expect(stubs.cacheFile).toBeCalledWith(preview.cache, stubs.file);
            expect(stubs.loadViewer).not.toBeCalled();
        });

        test('should uncache the file if the file is watermarked', () => {
            stubs.isWatermarked.mockReturnValue(true);
            stubs.getCachedFile.mockReturnValue({
                file_version: {
                    sha1: 0,
                },
            });

            stubs.file.file_version.sha1 = 0;

            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.uncacheFile).toBeCalledWith(preview.cache, stubs.file);
        });

        test('should load the viewer if the file is not in the cache', () => {
            stubs.getCachedFile.mockReturnValue(null);

            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.loadViewer).toBeCalled();
        });

        test('should load the viewer if the cached file is not valid', () => {
            stubs.checkFileValid.mockReturnValue(false);

            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.loadViewer).toBeCalled();
        });

        test('should set the cache stale and re-load the viewer if the cached sha1 does not match the files sha1', () => {
            stubs.getCachedFile.mockReturnValue({
                file_version: {
                    sha1: 0,
                },
            });

            stubs.file.file_version.sha1 = 2;

            preview.handleFileInfoResponse(stubs.file);
            expect(preview.logger.setCacheStale).toBeCalled();
            expect(stubs.reload).toBeCalled();
        });

        test('should set the cache stale and re-load the viewer if the file is watermarked', () => {
            stubs.isWatermarked.mockReturnValue(true);
            stubs.getCachedFile.mockReturnValue({
                file_version: {
                    sha1: 0,
                },
            });

            stubs.file.file_version.sha1 = 2;

            preview.handleFileInfoResponse(stubs.file);
            expect(preview.logger.setCacheStale).toBeCalled();
            expect(stubs.reload).toBeCalled();
        });

        test('should trigger an error if any cache or load operations fail', () => {
            const error = new PreviewError('some_code');
            stubs.getCachedFile.mockImplementationOnce(() => {
                throw error;
            });
            preview.handleFileInfoResponse(stubs.file);
            expect(stubs.triggerError).toBeCalledWith(error);
        });

        test('should trigger a viewer load error if a non-PreviewError is thrown', () => {
            stubs.getCachedFile.mockImplementationOnce(() => {
                throw new Error('random');
            });
            preview.handleFileInfoResponse(stubs.file);

            expect(stubs.triggerError).toBeCalled();
        });

        test('should stop the Timer for file info time', () => {
            const stopStub = jest.spyOn(Timer, 'stop');
            preview.file = {
                id: 12345,
            };
            Timer.createTag(preview.file.id, LOAD_METRIC.fileInfoTime);
            preview.handleFileInfoResponse(stubs.file);
            expect(stopStub).toBeCalled();
        });
    });

    describe('loadViewer()', () => {
        beforeEach(() => {
            stubs.viewer = {
                load: jest.fn(),
                addListener: jest.fn(),
                getName: jest.fn(),
                setup: jest.fn(),
            };

            /* eslint-disable require-jsdoc */
            function Viewer() {
                return stubs.viewer;
            }
            /* eslint-enable require-jsdoc */

            stubs.destroy = jest.spyOn(preview, 'destroy');
            stubs.checkPermission = jest.spyOn(file, 'checkPermission').mockReturnValue(true);
            stubs.canDownload = jest.spyOn(file, 'canDownload').mockReturnValue(false);
            stubs.loadPromiseResolve = Promise.resolve();
            stubs.determineRepresentationStatusPromise = Promise.resolve();
            stubs.loader = {
                determineViewer: jest.fn(() => ({
                    CONSTRUCTOR: Viewer,
                })),
                determineRepresentation: jest.fn(() => ({
                    links: {
                        content: {
                            url: 'url',
                        },
                    },
                })),
                determineRepresentationStatus: jest.fn(() => stubs.determineRepresentationStatusPromise),
                load: jest.fn(() => stubs.loadPromiseResolve),
            };

            stubs.getLoader = jest.spyOn(preview, 'getLoader').mockReturnValue(stubs.loader);

            preview.file = {
                is_download_available: true,
            };

            stubs.emit = jest.spyOn(preview, 'emit');
            stubs.attachViewerListeners = jest.spyOn(preview, 'attachViewerListeners');
            preview.open = true;
        });

        test('should do nothing if the preview is closed', () => {
            preview.open = false;
            preview.loadViewer();
            expect(stubs.destroy).not.toBeCalled();
        });

        test('should trigger error if file is not downloadable', () => {
            preview.file.is_download_available = false;
            expect(() => preview.loadViewer()).toThrowError(PreviewError);
        });

        test('should throw an error if user does not have permission to preview', () => {
            stubs.checkPermission.mockReturnValue(false);
            expect(() => preview.loadViewer()).toThrowError(PreviewError);
        });

        test('should throw an unsupported error if there is no loader for general file types', () => {
            stubs.getLoader.mockReturnValue(undefined);

            try {
                preview.loadViewer();
            } catch (e) {
                expect(e.message).toBe(__('error_unsupported'));
            }
        });

        test('should throw an account upgrade error if there is no loader but the file type is supported', () => {
            preview.file.extension = 'mp4';
            stubs.getLoader.mockReturnValue(undefined);

            try {
                preview.loadViewer();
            } catch (e) {
                expect(e.message).toBe(__('error_account'));
            }
        });

        test('should get the loader, viewer, and log the type of file', () => {
            preview.loadViewer();
            expect(stubs.getLoader).toBeCalledWith(expect.any(Object));
            expect(stubs.loader.determineViewer).toBeCalled();
            expect(preview.logger.setType).toBeCalled();
        });

        test('should determine the representation to use', () => {
            preview.loadViewer();
            expect(stubs.loader.determineRepresentation).toBeCalled();
        });

        test('should instantiate the viewer, set logger, attach viewer events, and load the viewer', () => {
            stubs.loader.determineViewer.mockReturnValue({
                CONSTRUCTOR: () => {
                    return stubs.viewer;
                },
                NAME: 'someViewerName',
            });

            preview.loadViewer();

            expect(preview.logger.setType).toBeCalledWith('someViewerName');
            expect(stubs.viewer.load).toBeCalled();
        });

        test('should emit viewer with the viewer instance', () => {
            preview.loadViewer();
            expect(stubs.emit).toBeCalledWith('viewer', stubs.viewer);
        });

        test('should reset retry count', () => {
            preview.loadViewer();
            expect(preview.retryCount).toBe(0);
        });
    });

    describe('attachViewerListeners()', () => {
        test('should add listeners for error and viewer events', () => {
            stubs.download = jest.spyOn(preview, 'download');
            preview.viewer = {
                addListener: jest.fn(),
            };

            preview.attachViewerListeners();
            expect(preview.viewer.addListener).toBeCalledWith('error', expect.any(Function));
            expect(preview.viewer.addListener).toBeCalledWith(VIEWER_EVENT.default, expect.any(Function));
            expect(preview.viewer.addListener).toBeCalledWith(VIEWER_EVENT.metric, expect.any(Function));
        });
    });

    describe('handleViewerEvents()', () => {
        test('should call download on download event', () => {
            jest.spyOn(preview, 'download').mockImplementation();
            preview.handleViewerEvents({ event: VIEWER_EVENT.download });
            expect(preview.download).toBeCalled();
        });

        test('should reload preview on reload event', () => {
            jest.spyOn(preview, 'reload').mockImplementation();
            preview.handleViewerEvents({ event: VIEWER_EVENT.reload });
            expect(preview.reload).toBeCalled();
        });

        test('should finish loading preview on load event', () => {
            jest.spyOn(preview, 'finishLoading').mockImplementation();
            preview.handleViewerEvents({ event: VIEWER_EVENT.load });
            expect(preview.finishLoading).toBeCalled();
        });

        test('should emit viewerevent when event does not match', () => {
            jest.spyOn(preview, 'emit');
            const data = {
                event: 'no match',
                data: 'message',
            };
            preview.handleViewerEvents(data);
            expect(preview.emit).toBeCalledWith(data.event, data.data);
            expect(preview.emit).toBeCalledWith(VIEWER_EVENT.default, data);
        });

        test('should not emit any messages error events', () => {
            jest.spyOn(preview, 'emit');
            const data = {
                event: 'error',
                data: ':(',
            };
            preview.handleViewerEvents(data);
            expect(preview.emit).not.toBeCalled();
        });
    });

    describe('handleViewerMetrics()', () => {
        test('should create a formatted event and emit a preview_metric', () => {
            jest.spyOn(preview, 'emitLogEvent');
            const fakeEvent = {
                event: 'test',
                data: 7,
            };

            preview.handleViewerMetrics(fakeEvent);

            expect(preview.emitLogEvent).toBeCalledWith(PREVIEW_METRIC, {
                event_name: fakeEvent.event,
                value: fakeEvent.data,
            });
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            stubs.canDownload = jest.spyOn(file, 'canDownload');
            stubs.checkFeature = jest.spyOn(file, 'checkFeature');
            stubs.isMobile = jest.spyOn(Browser, 'isMobile');
            stubs.showDownloadButton = jest.spyOn(preview.ui, 'showDownloadButton').mockImplementation();
            stubs.showPrintButton = jest.spyOn(preview.ui, 'showPrintButton').mockImplementation();
            stubs.hideLoadingIndicator = jest.spyOn(preview.ui, 'hideLoadingIndicator').mockImplementation();
            stubs.emit = jest.spyOn(preview, 'emit');
            stubs.logPreviewEvent = jest.spyOn(preview, 'logPreviewEvent');
            stubs.prefetchNextFiles = jest.spyOn(preview, 'prefetchNextFiles');
            stubs.setupNotification = jest.spyOn(preview.ui, 'setupNotification').mockImplementation();

            stubs.perf = {
                report: jest.fn(() => {}),
            };

            preview.file = {
                id: 0,
            };
            preview.perf = stubs.perf;
            preview.viewer = {
                getPointModeClickHandler: jest.fn(),
            };
        });

        test('should show download button if file can be downloaded', () => {
            stubs.canDownload.mockReturnValue(true);
            preview.finishLoading();
            expect(stubs.showDownloadButton).toBeCalled();
        });

        test("should not show download button if file can't be downloaded", () => {
            stubs.canDownload.mockReturnValue(false);
            preview.finishLoading();
            expect(stubs.showDownloadButton).not.toBeCalled();
        });

        test('should show print button if print is supported', () => {
            stubs.checkFeature.mockReturnValue(true);
            stubs.canDownload.mockReturnValue(true);
            preview.finishLoading();
            expect(stubs.showPrintButton).toBeCalled();
        });

        test('should not show print button if print is not supported', () => {
            stubs.checkFeature.mockReturnValue(false);
            stubs.canDownload.mockReturnValue(true);
            preview.finishLoading();
            expect(stubs.showPrintButton).not.toBeCalled();
        });

        test("should not show print button if file can't be downloaded", () => {
            stubs.checkFeature.mockReturnValue(true);
            stubs.canDownload.mockReturnValue(false);
            preview.finishLoading();
            expect(stubs.showPrintButton).not.toBeCalled();
        });

        test('should increment the preview count', () => {
            preview.count.success = 0;

            preview.finishLoading();
            expect(preview.count.success).toBe(1);
        });

        test('should emit a metrics message for successful preview', () => {
            const eventName = 'success';
            const emitLogEvent = jest.spyOn(preview, 'emitLogEvent');

            preview.finishLoading();

            expect(emitLogEvent).toBeCalledWith(PREVIEW_METRIC, { event_name: eventName });
        });

        test('should emit a metrics message for failed preview', () => {
            const eventName = 'failure';
            const emitLogEvent = jest.spyOn(preview, 'emitLogEvent');

            preview.finishLoading({ error: {} });

            expect(emitLogEvent).toBeCalledWith(PREVIEW_METRIC, { event_name: eventName });
        });

        test('should emit the load event', () => {
            preview.finishLoading();
            expect(stubs.emit).toBeCalled();
            expect(preview.logger.done).toBeCalled();
        });

        test('should log a preview event via the Events API if there was not an error', () => {
            preview.finishLoading({ error: 'error!' });
            expect(stubs.logPreviewEvent).not.toBeCalled();

            preview.finishLoading({ error: undefined });
            expect(stubs.logPreviewEvent).toBeCalled();
        });

        test('should call phantom for a health check, if it is available', () => {
            window.callPhantom = undefined;

            preview.finishLoading();

            // setting the function after the first call so that it can be spyed
            window.callPhantom = () => {};

            const callPhantomSpy = jest.spyOn(window, 'callPhantom');
            expect(window.callPhantom).not.toBeCalled();

            preview.finishLoading();
            expect(callPhantomSpy).toBeCalled();
        });

        test('should focus the viewer container', () => {
            preview.options.autoFocus = true;
            preview.viewer.containerEl = {
                focus: () => {},
            };
            sandbox.mock(preview.viewer.containerEl).expects('focus');
            preview.finishLoading();
        });

        test('should not focus the viewer container with autoFocus is false', () => {
            preview.options.autoFocus = false;
            preview.viewer.containerEl = {
                focus: () => {},
            };
            sandbox
                .mock(preview.viewer.containerEl)
                .expects('focus')
                .never();
            preview.finishLoading();
        });

        test('should hide the loading indicator', () => {
            preview.finishLoading();
            expect(stubs.hideLoadingIndicator).toBeCalled();
        });

        test('should prefetch next files', () => {
            preview.finishLoading();
            expect(stubs.prefetchNextFiles).toBeCalled();
        });

        test('should stop the timer for full document load if a file exists', () => {
            preview.file.id = 1234;
            const expectedTag = Timer.createTag(preview.file.id, LOAD_METRIC.contentLoadTime);
            jest.spyOn(Timer, 'stop');
            preview.finishLoading();
            expect(Timer.stop).toBeCalledWith(expectedTag);
        });

        test('should stop the timer for preview load if a file exists', () => {
            preview.file.id = 1234;
            const expectedTag = Timer.createTag(preview.file.id, LOAD_METRIC.previewLoadTime);
            jest.spyOn(Timer, 'stop');
            preview.finishLoading();
            expect(Timer.stop).toBeCalledWith(expectedTag);
        });

        test('should invoke emitLoadMetrics()', () => {
            stubs.emitLoadMetrics = jest.spyOn(preview, 'emitLoadMetrics');
            preview.finishLoading();
            expect(stubs.emitLoadMetrics).toBeCalled();
        });
    });

    describe('logPreviewEvent()', () => {
        beforeEach(() => {
            stubs.promiseResolve = Promise.resolve({});
            stubs.getHeaders = jest.spyOn(util, 'getHeaders');
            stubs.url = `${API_HOST}/2.0/events`;
        });

        test('should get the headers for the post request', () => {
            jest.spyOn(stubs.api, 'post').mockReturnValue(stubs.promiseResolve);

            preview.logPreviewEvent(0, {});
            expect(stubs.getHeaders).toBeCalled();
        });

        test('should reset the log retry count on a successful post', () => {
            jest.spyOn(Api.prototype, 'post').mockReturnValue(stubs.promiseResolve);
            preview.logRetryCount = 3;

            preview.logPreviewEvent(0, {});
            return stubs.promiseResolve.then(() => {
                expect(preview.logRetryCount).toBe(0);
            });
        });

        test('should reset the log retry count if the post fails and retry limit has been reached', () => {
            jest.spyOn(stubs.api, 'post').mockRejectedValue({});
            preview.logRetryCount = 3;
            preview.logRetryTimeout = true;

            preview.logPreviewEvent(0, {});
            return stubs.promiseResolve.catch(() => {
                expect(preview.logRetryCount).toBe(0);
                expect(preview.logRetryTimeout).toBe(true);
            });
        });

        test('should set a timeout to try to log the preview event again if post fails and the limit has not been met', () => {
            jest.spyOn(stubs.api, 'post').mockRejectedValueOnce({});
            preview.logRetryCount = 3;
            preview.logRetryTimeout = undefined;

            preview.logPreviewEvent(0, { apiHost: API_HOST });
            return stubs.promiseResolve.catch(() => {
                expect(preview.logRetryCount).toBe(4);
                expect(preview.logRetryTimeout).toBeDefined();
            });
        });
    });

    describe('handleFetchError()', () => {
        beforeEach(() => {
            jest.useFakeTimers();

            stubs.uncacheFile = jest.spyOn(file, 'uncacheFile').mockImplementation();
            stubs.triggerError = jest.spyOn(preview, 'triggerError').mockImplementation();
            stubs.load = jest.spyOn(preview, 'load').mockImplementation();
            stubs.error = {
                response: {
                    status: 400,
                },
            };
        });

        test('should do nothing if the preview is closed', () => {
            preview.file = {
                id: '0',
            };
            preview.open = false;

            preview.handleFetchError(stubs.error);
            expect(stubs.uncacheFile).not.toBeCalled();
        });

        test('should clear the current file from the cache', () => {
            preview.file = {
                id: '0',
            };
            preview.open = true;

            preview.handleFetchError(stubs.error);
            expect(stubs.uncacheFile).toBeCalled();
        });

        test('should trigger an error if we have hit our retry count limit', () => {
            preview.file = {
                id: '0',
            };
            preview.open = true;
            preview.retryCount = 6;

            preview.handleFetchError(stubs.error);
            expect(stubs.triggerError).toBeCalled();
        });

        test('should trigger a rate limit error if the status code is 429', () => {
            preview.file = {
                id: '0',
            };
            preview.open = true;
            preview.retryCount = 6;
            stubs.error.response.status = 429;

            preview.handleFetchError(stubs.error);
            try {
                expect(stubs.triggerError).toBeCalledWith(new Error(__('error_rate_limit')));
            } catch (e) {
                /* no op */
            }
        });

        test('should reset a timeout that tries to load the file again', () => {
            preview.file = {
                id: '0',
            };
            preview.open = true;
            preview.retryCount = 1;
            preview.file.id = 1;

            preview.handleFetchError(stubs.error);
            expect(stubs.triggerError).not.toBeCalled();

            jest.advanceTimersByTime(2001);
            expect(stubs.load).toBeCalledWith(1);
        });

        test('should retry using full jitter', () => {
            preview.file = {
                id: '0',
            };
            preview.open = true;
            preview.retryCount = 3;

            preview.handleFetchError(stubs.error);

            jest.advanceTimersByTime(8001);
            expect(stubs.load).toBeCalled();
        });

        test.each(['retry-after', 'Retry-After'])(
            'should retry after length specified in %s header if set',
            retryAfter => {
                preview.file = {
                    id: '0',
                };
                stubs.error.headers = {
                    get: sandbox
                        .stub()
                        .withArgs(retryAfter)
                        .returns(5),
                };
                preview.open = true;
                preview.retryCount = 1;

                preview.handleFetchError(stubs.error);

                jest.advanceTimersByTime(4000);
                expect(stubs.load).not.toBeCalled();

                jest.advanceTimersByTime(5001);
                expect(stubs.load).toBeCalled();
            },
        );
    });

    describe('triggerError()', () => {
        const ErrorViewer = {
            load: jest.fn(),
            addListener: jest.fn(),
            setup: jest.fn(),
        };

        beforeEach(() => {
            stubs.uncacheFile = jest.spyOn(file, 'uncacheFile');
            stubs.destroy = jest.spyOn(preview, 'destroy');
            stubs.finishLoading = jest.spyOn(preview, 'finishLoading');
            stubs.getErrorViewer = jest.spyOn(preview, 'getErrorViewer').mockReturnValue(ErrorViewer);
            stubs.promiseResolve = Promise.resolve();
            stubs.hideLoadingIndicator = jest.spyOn(preview.ui, 'hideLoadingIndicator').mockImplementation();
            stubs.checkPermission = jest.spyOn(file, 'checkPermission');
            stubs.showDownloadButton = jest.spyOn(preview.ui, 'showDownloadButton').mockImplementation();
            stubs.emit = jest.spyOn(preview, 'emit');
            stubs.emitPreviewError = jest.spyOn(preview, 'emitPreviewError').mockImplementation();
            stubs.attachViewerListeners = jest.spyOn(preview, 'attachViewerListeners');
            stubs.setupUI = jest.spyOn(preview, 'setupUI');

            preview.open = true;
        });

        test('should only log an error if the preview is closed', () => {
            preview.open = false;

            preview.triggerError(new PreviewError('fail'));
            expect(stubs.uncacheFile).not.toBeCalled();
            expect(stubs.destroy).not.toBeCalled();
            expect(stubs.emitPreviewError).toBeCalled();
        });

        test('should only log an error if the error is silent', () => {
            preview.triggerError(new PreviewError('fail', '', { silent: true }));
            expect(stubs.uncacheFile).not.toBeCalled();
            expect(stubs.destroy).not.toBeCalled();
            expect(stubs.emitPreviewError).toBeCalled();
        });

        test('should prevent any other viewers from loading, clear the cache, complete postload tasks, and destroy anything still visible', () => {
            preview.triggerError();
            expect(preview.open).toBe(false);
            expect(stubs.uncacheFile).toBeCalled();
            expect(stubs.destroy).toBeCalled();
            expect(stubs.setupUI).toBeCalled();
        });

        test('should get the error viewer, attach viewer listeners, and load the error viewer', () => {
            const err = new PreviewError();
            preview.triggerError(err);

            expect(stubs.getErrorViewer).toBeCalled();
            expect(stubs.attachViewerListeners).toBeCalled();
            expect(ErrorViewer.load).toBeCalledWith(err);
        });
    });

    describe('emitLogEvent()', () => {
        beforeEach(() => {
            jest.spyOn(preview, 'emit');
        });

        test('should emit an event containing correct file info properties', () => {
            preview.file = { id: '12345' };
            preview.emitLogEvent('test');

            expect(preview.emit).toBeCalledWith(
                'test',
                expect.objectContaining({
                    content_type: '',
                    extension: '',
                    file_id: '12345',
                    file_version_id: '',
                }),
            );
        });

        test('should use empty string for file_id, if no file', () => {
            preview.file = undefined;
            preview.emitLogEvent('test');

            expect(preview.emit).toBeCalledWith(
                'test',
                expect.objectContaining({
                    file_id: '',
                }),
            );
        });

        test('should use empty string for file_version_id, if no file version', () => {
            preview.file = {
                id: '12345',
                file_version: undefined,
            };
            preview.emitLogEvent('test');

            expect(preview.emit).toBeCalledWith(
                'test',
                expect.objectContaining({
                    file_version_id: '',
                }),
            );
        });

        test('should use empty string for rep_type, if no representation type available in viewer options', () => {
            preview.file = {
                id: '12345',
            };
            preview.viewer = {};
            preview.emitLogEvent('test');

            expect(preview.emit).toBeCalledWith(
                'test',
                expect.objectContaining({
                    rep_type: '',
                }),
            );
        });
    });

    describe('emitPreviewError()', () => {
        test('should emit a "preview_error" message with an object describing the error', done => {
            const code = 'an_error';
            const displayMessage = 'Oh no!';
            const error = new PreviewError(code, displayMessage);

            preview.on('preview_error', data => {
                expect(data.error.code).toBe('an_error');
                expect(data.error.displayMessage).toBe('Oh no!');
                done();
            });

            preview.emitPreviewError(error);
        });

        test('should emit a "preview_error" message with info about the preview session', done => {
            const fileId = '1234';
            const fileVersionId = '999';

            preview.file = {
                id: fileId,
                file_version: {
                    id: fileVersionId,
                },
            };

            preview.on('preview_error', data => {
                expect(data.file_id).toBe(fileId);
                expect(data.file_version_id).toBe(fileVersionId);
                done();
            });

            preview.emitPreviewError({});
        });

        test('should use a default browser error code if none is present', done => {
            preview.on('preview_error', data => {
                expect(data.error.code).toBe(ERROR_CODE.BROWSER_GENERIC);
                done();
            });

            preview.emitPreviewError({});
        });

        test('should strip any auth from the message and displayMessage if it is present', done => {
            const message = 'A message';
            const displayMessage = 'A display message';
            const auth = 'access_token="1234abcd"';
            const filtered = 'access_token=[FILTERED]';
            preview.on('preview_error', data => {
                expect(data.error.message).toBe(`${message}?${filtered}`);
                expect(data.error.displayMessage).toBe(`${displayMessage}?${filtered}`);
                done();
            });

            const error = new PreviewError('bad_thing', `${displayMessage}?${auth}`, {}, `${message}?${auth}`);
            preview.emitPreviewError(error);
        });
    });

    describe('emitLoadMetrics()', () => {
        const fileId = 123456;

        beforeEach(() => {
            preview.file = {
                id: fileId,
            };
        });

        afterEach(() => {
            Timer.reset();
        });

        test('should do nothing and escape early if no file or file id', () => {
            jest.spyOn(Timer, 'reset');
            jest.spyOn(preview, 'emit');
            preview.file = undefined;
            preview.emitLoadMetrics();
            expect(Timer.reset).not.toBeCalled();
            expect(preview.emit).not.toBeCalled();
        });

        test('should emit a preview_metric event', done => {
            preview.once(PREVIEW_METRIC, () => {
                done();
            });
            preview.emitLoadMetrics();
        });

        test('should emit a preview_metric event with event_name "load"', done => {
            preview.once(PREVIEW_METRIC, metric => {
                expect(metric.event_name).toBe(LOAD_METRIC.previewLoadEvent);
                done();
            });
            preview.emitLoadMetrics();
        });

        test('should emit a preview_metric event with an object, with all of the proper load properties', done => {
            preview.once(PREVIEW_METRIC, metric => {
                expect(metric[LOAD_METRIC.fileInfoTime]).toBeDefined();
                expect(metric[LOAD_METRIC.convertTime]).toBeDefined();
                expect(metric[LOAD_METRIC.downloadResponseTime]).toBeDefined();
                expect(metric[LOAD_METRIC.contentLoadTime]).toBeDefined();
                expect(metric.value).toBeDefined();
                done();
            });
            preview.emitLoadMetrics();
        });

        test('should reset the Timer', () => {
            jest.spyOn(Timer, 'reset');
            jest.spyOn(preview, 'emit');
            preview.emitLoadMetrics();
            expect(Timer.reset).toBeCalled();
            expect(preview.emit).toBeCalled();
        });

        test('should append encoding field to load metric, when provided', done => {
            preview.once(PREVIEW_METRIC, metric => {
                expect(metric.encoding).toBe(ENCODING_TYPES.GZIP);
                done();
            });
            preview.emitLoadMetrics({ encoding: ENCODING_TYPES.GZIP });
        });
    });

    describe('getRequestHeaders()', () => {
        beforeEach(() => {
            stubs.canPlayDash = jest.spyOn(Browser, 'canPlayDash').mockReturnValue(false);
            stubs.getHeaders = jest.spyOn(util, 'getHeaders');
            stubs.headers = {
                'X-Rep-Hints':
                    '[3d][pdf][text][mp3][json][jpg?dimensions=1024x1024&paged=false][jpg?dimensions=2048x2048,png?dimensions=2048x2048]',
            };

            preview.options.sharedLink = 'link';
            preview.options.sharedLinkPassword = 'Passw0rd!';
            preview.options.token = 'previewtoken';
        });

        test('should get headers with the provided token', () => {
            stubs.headers['X-Rep-Hints'] += '[mp4]';

            preview.getRequestHeaders('token');
            expect(stubs.getHeaders).toBeCalledWith(stubs.headers, 'token', 'link', 'Passw0rd!');
        });

        test('should get headers with the options token if none are provided', () => {
            stubs.headers['X-Rep-Hints'] += '[mp4]';

            preview.getRequestHeaders();
            expect(stubs.getHeaders).toBeCalledWith(stubs.headers, 'previewtoken', 'link', 'Passw0rd!');
        });

        test('should add dash hints if the browser supports dash', () => {
            stubs.canPlayDash.mockReturnValue(true);
            stubs.headers['X-Rep-Hints'] += '[dash,mp4][filmstrip]';

            preview.getRequestHeaders();
            expect(stubs.getHeaders).toBeCalledWith(stubs.headers, 'previewtoken', 'link', 'Passw0rd!');
        });

        test('should not add dash hints if the browser supports dash but dash is disabled', () => {
            stubs.canPlayDash.mockReturnValue(true);
            preview.disabledViewers.Dash = 1;
            stubs.headers['X-Rep-Hints'] += '[mp4]';

            preview.getRequestHeaders();
            expect(stubs.getHeaders).toBeCalledWith(stubs.headers, 'previewtoken', 'link', 'Passw0rd!');
        });
    });

    describe('prefetchNextFiles()', () => {
        beforeEach(() => {
            stubs.getTokensPromiseResolve = Promise.resolve({
                0: 'token0',
                1: 'token1',
                2: 'token2',
                3: 'token3',
                4: 'token4',
                5: 'token5',
            });

            stubs.getTokens = jest.spyOn(tokens, 'default');

            stubs.getPromiseResolve = Promise.resolve({
                id: 0,
            });

            stubs.get = jest.spyOn(Api.prototype, 'get').mockReturnValue(stubs.getPromiseResolve);
            stubs.getURL = jest.spyOn(file, 'getURL');
            stubs.getRequestHeaders = jest.spyOn(preview, 'getRequestHeaders');
            stubs.set = jest.spyOn(preview.cache, 'set');
            stubs.prefetch = jest.spyOn(preview, 'prefetch');
            preview.prefetchedCollection = [];
        });

        test('should not prefetch if there are less than 2 files to prefetch', () => {
            preview.collection = [1];

            preview.prefetchNextFiles();
            expect(stubs.getTokens).not.toBeCalled();
        });

        test('should not prefetch when skipServerUpdate option is present', () => {
            preview.options.skipServerUpdate = true;

            preview.prefetchNextFiles();
            expect(stubs.getTokens).not.toBeCalled();
        });

        test('should do nothing if there are no new files to prefetch', () => {
            preview.file = {
                id: 3,
            };

            preview.collection = [1, 2, 3];

            preview.prefetchNextFiles();
            expect(stubs.getTokens).not.toBeCalled();
        });

        test('should get tokens for the next PREFETCH_COUNT files in the collection', () => {
            stubs.getTokens.mockReturnValue(stubs.getTokensPromiseResolve);
            preview.file = {
                id: 0,
            };
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetchNextFiles();
            return stubs.getTokensPromiseResolve.then(() => {
                expect(stubs.getTokens).toBeCalledWith([1, 2, 3, 4], 'token');
            });
        });

        test('should get info for the next PREFETCH_COUNT files', () => {
            stubs.getTokens.mockReturnValue(stubs.getTokensPromiseResolve);
            preview.file = {
                id: 0,
            };
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetchNextFiles();
            return stubs.getTokensPromiseResolve.then(() => {
                expect(stubs.getRequestHeaders).toBeCalledTimes(PREFETCH_COUNT);
                expect(stubs.get).toBeCalledTimes(PREFETCH_COUNT);
            });
        });

        test('should set the cache, add to the prefetched collection, and prefetch the actual content', () => {
            stubs.getTokens.mockReturnValue(stubs.getTokensPromiseResolve);
            preview.file = {
                id: 0,
            };
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetchNextFiles();
            return stubs.getTokensPromiseResolve.then(() => {
                return stubs.getPromiseResolve.then(() => {
                    expect(stubs.set).toBeCalledTimes(PREFETCH_COUNT);
                    expect(stubs.prefetch).toBeCalledTimes(PREFETCH_COUNT);
                    expect(preview.prefetchedCollection.length).toBe(PREFETCH_COUNT);
                });
            });
        });
    });

    describe('getGlobalMousemoveHandler()', () => {
        test("should clear the timeout handler and do nothing if the container doesn't exist", () => {
            preview.container = false;

            const handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.timeoutHandler).toBeUndefined();
        });

        test('should remove the navigation arrows', () => {
            preview.viewer = {
                allowNavigationArrows: jest.fn(() => false),
            };

            const handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).toBe(false);
        });

        test("should add the navigation arrows back if the viewer allows them or we aren't previewing", () => {
            preview.viewer = false;

            let handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).toBe(true);

            preview.viewer = {
                allowNavigationArrows: jest.fn(() => true),
            };

            handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).toBe(true);
        });

        test('should set a timeout to remove the arrows if the container exists', () => {
            jest.useFakeTimers();

            const handler = preview.getGlobalMousemoveHandler();
            preview.viewer = {
                allowNavigationArrows: jest.fn(),
            };

            handler();
            jest.advanceTimersByTime(MOUSEMOVE_THROTTLE + 1);

            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).toBe(false);
        });
    });

    describe('navigateToIndex()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(preview, 'emit');
            stubs.load = jest.spyOn(preview, 'load');

            preview.count = {
                navigation: 0,
            };

            preview.collection = ['file', 'file2', 'file3'];
        });

        test('should do nothing if the collection is invalid', () => {
            preview.collection = 'foo';
            preview.navigateToIndex(1);
            expect(stubs.emit).not.toBeCalled();

            preview.collection = [];
            preview.navigateToIndex(1);
            expect(stubs.emit).not.toBeCalled();
        });

        test('should emit the navigation event', () => {
            preview.navigateToIndex(1);
            expect(stubs.emit).toBeCalled();
        });

        test('should increment the navigation count', () => {
            preview.navigateToIndex(1);
            expect(preview.count.navigation).toBe(1);
        });

        test('should load the requested file', () => {
            preview.navigateToIndex(2);
            expect(stubs.load).toBeCalledWith('file3');
        });
    });

    describe('navigateLeft()', () => {
        beforeEach(() => {
            stubs.navigateToIndex = jest.spyOn(preview, 'navigateToIndex');
            preview.file = {
                id: 1,
            };
            preview.collection = [3, 2, 1];
        });

        test('should navigate to index if it is not the first file in the collection', () => {
            preview.navigateLeft();
            expect(stubs.navigateToIndex).toBeCalled();
        });

        test('should not navigate to index if it is the first file in the collection', () => {
            preview.collection = [1, 2, 3];

            preview.navigateLeft();
            expect(stubs.navigateToIndex).not.toBeCalled();
        });
    });

    describe('navigateRight()', () => {
        beforeEach(() => {
            stubs.navigateToIndex = jest.spyOn(preview, 'navigateToIndex');
            preview.file.id = 1;
            preview.collection = [1, 2, 3];
        });

        test('should navigate to index if it is not the last file in the collection', () => {
            preview.navigateRight();
            expect(stubs.navigateToIndex).toBeCalled();
        });

        test('should not navigate to index if it is the last file in the collection', () => {
            preview.collection = [3, 2, 1];

            preview.navigateRight();
            expect(stubs.navigateToIndex).not.toBeCalled();
        });
    });

    describe('getLoader()', () => {
        test('should return the first capable loader based on file info', () => {
            preview.loaders = [
                {
                    name: 'error',
                    canLoad: jest.fn(() => false),
                },
                {
                    name: 'text',
                    canLoad: jest.fn(() => false),
                },
                {
                    name: 'csv',
                    canLoad: jest.fn(() => true),
                },
            ];
            preview.options.viewers = { viewer: {} };

            const loader = preview.getLoader('file');

            expect(loader.name).toBe('csv');
            preview.loaders.forEach(loaderMock => {
                expect(loaderMock.canLoad).toBeCalledWith('file', ['Office'], { viewer: {} });
            });
        });
    });

    describe('keydownHandler()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = jest.spyOn(util, 'decodeKeydown');
            stubs.navigateLeft = jest.spyOn(preview, 'navigateLeft');
            stubs.navigateRight = jest.spyOn(preview, 'navigateRight');
            stubs.event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                target: {
                    getAttribute: jest.fn(),
                    nodeName: KEYDOWN_EXCEPTIONS[0],
                },
            };

            preview.options.useHotkeys = true;
            preview.viewer = {};
        });

        test('should do nothing if keyboard shortcuts are disabled', () => {
            preview.options.useHotkeys = false;

            preview.keydownHandler({ target: undefined });
            expect(stubs.decodeKeydown).not.toBeCalled();
        });

        test('should do nothing if there is no target', () => {
            preview.keydownHandler({ target: undefined });
            expect(stubs.decodeKeydown).not.toBeCalled();
        });

        test('should do nothing if there is no target or the target is a keydown exception', () => {
            preview.keydownHandler(stubs.event);
            expect(stubs.decodeKeydown).not.toBeCalled();
        });

        test('should do nothing if the target is a content editable div', () => {
            stubs.event.target.nodeName = 'DIV';
            stubs.event.target.getAttribute = jest.fn(() => true);

            preview.keydownHandler(stubs.event);
            expect(stubs.decodeKeydown).not.toBeCalled();
        });

        test('should do nothing if the target is not a decodable key', () => {
            preview.viewer.onKeydown = jest.fn(() => false);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.decodeKeydown.mockReturnValue(false);

            preview.keydownHandler(stubs.event);
            expect(stubs.event.preventDefault).not.toBeCalled();
        });

        test('should navigate left is key is ArrowLeft and the event has not been consumed', () => {
            preview.viewer.onKeydown = jest.fn(() => false);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.decodeKeydown.mockReturnValue('ArrowLeft');

            preview.keydownHandler(stubs.event);
            expect(stubs.navigateLeft).toBeCalled();
        });

        test('should navigate right is key is ArrowRight and the event has not been consumed', () => {
            stubs.event.target.nodeName = 'ArrowRight';
            stubs.decodeKeydown.mockReturnValue('ArrowRight');

            preview.keydownHandler(stubs.event);
            expect(stubs.navigateRight).toBeCalled();
        });

        test('should prevent default and stop propagation if the event has been consumed by the viewer', () => {
            preview.viewer.onKeydown = jest.fn(() => true);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.decodeKeydown.mockReturnValue('ArrowRight');

            preview.keydownHandler(stubs.event);
            expect(stubs.event.preventDefault).toBeCalled();
            expect(stubs.event.stopPropagation).toBeCalled();
        });
    });

    describe('getFileOption()', () => {
        test('should return matching file option', () => {
            preview.previewOptions = {
                fileOptions: {
                    123: {
                        fileVersionId: '1234',
                    },
                },
            };

            expect(preview.getFileOption('123', 'fileVersionId')).toBe('1234');
        });

        test('should return matching file option when file object is passed', () => {
            preview.previewOptions = {
                fileOptions: {
                    123: {
                        fileVersionId: '1234',
                    },
                },
            };

            expect(preview.getFileOption({ id: '123' }, 'fileVersionId')).toBe('1234');
        });

        test('should return undefined when no matching file option is set', () => {
            preview.previewOptions = {
                fileOptions: {
                    123: {
                        fileVersionId: '1234',
                    },
                },
            };

            expect(preview.getFileOption({ id: '1234' }, 'fileVersionId')).toBeUndefined();
            expect(preview.getFileOption('1234', 'fileVersionId')).toBeUndefined();
            expect(preview.getFileOption('123', 'location')).toBeUndefined();

            preview.previewOptions = undefined;

            expect(preview.getFileOption('123', 'fileVersionId')).toBeUndefined();
        });
    });

    describe('refreshToken()', () => {
        test('should return a new token if the previewOptions.token is a function', done => {
            preview.file = {
                id: 'file_123',
            };
            preview.previewOptions.token = id => Promise.resolve({ [id]: 'new_token' });
            preview.refreshToken().then(token => {
                expect(token).toBe('new_token');
                done();
            });
        });

        test('should reject if previewOptions.token is not a function', done => {
            preview.previewOptions.token = 'token';
            preview.refreshToken().catch(error => {
                expect(error.message).toBe('Token is not a function and cannot be refreshed.');
                done();
            });
        });
    });
});
/* eslint-enable no-unused-expressions */
