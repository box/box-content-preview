/* eslint-disable no-unused-expressions */
import fetchMock from 'fetch-mock';
import '../preview';
import ErrorLoader from '../viewers/error/error-loader';
import loaders from '../loaders';
import Logger from '../logger';
import Browser from '../browser';
import cache from '../cache';
import * as ui from '../ui';
import * as file from '../file';
import * as util from '../util';
import { API, CLASS_NAVIGATION_VISIBILITY } from '../constants';

const tokens = require('../tokens');

const RETRY_TIMEOUT = 500; // retry network request interval for a file
const PREFETCH_COUNT = 4; // number of files to prefetch
const MOUSEMOVE_THROTTLE = 1500; // for showing or hiding the navigation icons
const KEYDOWN_EXCEPTIONS = ['INPUT', 'SELECT', 'TEXTAREA']; // Ignore keydown events on these elements


const sandbox = sinon.sandbox.create();

let stubs = {};
let preview = Box.Preview;
let containerEl;

describe('Preview', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/preview-test.html');
        containerEl = document.querySelector('.container');
        preview = Box.Preview;
        preview.container = containerEl;
        preview.viewer = {};
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fetchMock.restore();
        stubs = null;

        if (typeof preview.destroy === 'function') {
            preview.destroy();
        }

        preview = null;
    });

    describe('constructor()', () => {
        beforeEach(() => {
            sandbox.stub(util, 'findScriptLocation').returns('en-US');
            stubs.preview = preview;
            stubs.location = preview.location;
        });

        afterEach(() => {
            preview.location = stubs.location;
        });

        it('should set the preview to be closed', () => {
            preview.constructor();
            expect(preview.open).to.be.false;
        });

        it('should initialize the various preview objects', () => {
            preview.constructor();
            expect(preview.count.success).to.equal(0);
            expect(preview.count.error).to.equal(0);
            expect(preview.count.navigation).to.equal(0);
            expect(preview.file).to.deep.equal({});
            expect(preview.options).to.deep.equal({});
            expect(preview.disabledViewers).to.deep.equal({ Office: 1 });
            expect(preview.token).to.equal('');
            expect(preview.loaders).to.equal(loaders);
            expect(preview.location).to.equal('en-US');
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.repStatus = {
                destroy: sandbox.stub()
            };

            stubs.viewer = {
                destroy: sandbox.stub()
            };
        });

        it('should destroy the repstatus if it exists', () => {
            preview.repStatus = undefined;

            preview.destroy();
            expect(stubs.repStatus.destroy).to.not.be.called;


            preview.repStatus = stubs.repStatus;

            preview.destroy();
            expect(preview.repStatus.destroy).to.be.called;
        });

        it('should destroy the viewer if it exists', () => {
            preview.viewer = {
                destroy: undefined
            };

            preview.destroy();
            expect(stubs.viewer.destroy).to.not.be.called;

            preview.viewer = stubs.viewer;

            preview.destroy();
            expect(preview.repStatus.destroy).to.be.called;
        });

        it('should clear the viewer', () => {
            preview.destroy();
            expect(preview.viewer).to.equal(undefined);
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.load = sandbox.stub(preview, 'load');
        });

        it('should set the preview options DEPRECATED REMOVE ME EVENTUALLY', () => {
            const options = {
                token: 'token',
                viewer: 'viewer'
            };

            preview.show('file', options);
            expect(preview.previewOptions).to.deep.equal(options);
        });

        it('should set the preview options with string token', () => {
            preview.show('file', 'token', { viewer: 'viewer' });
            expect(preview.previewOptions).to.deep.equal({
                token: 'token',
                viewer: 'viewer'
            });
        });

        it('should set the preview options with function token', () => {
            const foo = () => {};
            preview.show('file', foo, { viewer: 'viewer' });
            expect(preview.previewOptions).to.deep.equal({
                token: foo,
                viewer: 'viewer'
            });
        });

        it('should load the given file', () => {
            preview.show('file', 'token');
            expect(stubs.load).to.be.calledWith('file');
        });

        it('should throw an error if there is no auth token', () => {
            const spy = sandbox.spy(preview, 'show');

            try {
                preview.show('file');
            } catch (e) {
                expect(spy.threw());
                expect(e.message).to.equal('Missing Auth Token!');
            }
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            stubs.destroy = sandbox.stub(preview, 'destroy');
            stubs.cleanup = sandbox.stub(ui, 'cleanup');
        });

        it('should indicate that the preview is closed', () => {
            preview.open = true;

            preview.hide();
            expect(preview.open).to.equal(false);
        });

        it('should destroy the viewer', () => {
            preview.hide();
            expect(stubs.destroy).to.be.called;
        });

        it('should cleanup the ui', () => {
            preview.hide();
            expect(stubs.cleanup).to.be.called;
        });

        it('should clear the file', () => {
            preview.file = 'file';

            preview.hide();
            expect(preview.file).to.equal(undefined);
        });
    });

    describe('updateCollection()', () => {
        beforeEach(() => {
            stubs.showNavigation = sandbox.stub(ui, 'showNavigation');
        });

        it('should set the preview and preview options collection to an array', () => {
            let array = [1, 2, 3, 4];

            preview.updateCollection(array);
            expect(preview.collection).to.deep.equal(array);
            expect(preview.previewOptions.collection).to.deep.equal(array);

            array = '1,2,3,4';

            preview.updateCollection(array);
            expect(preview.collection).to.deep.equal([]);
            expect(preview.previewOptions.collection).to.deep.equal([]);
        });

        it('should show navigation if the file exists', () => {
            preview.file = undefined;

            preview.updateCollection();
            expect(stubs.showNavigation).to.not.be.called;

            preview.file = {
                id: 0
            };

            preview.updateCollection();
            expect(stubs.showNavigation).to.be.calledWith(0, []);
        });
    });

    describe('updateFileCache()', () => {
        beforeEach(() => {
            stubs.checkFileValid = sandbox.stub(file, 'checkFileValid');
            stubs.set = sandbox.stub(cache, 'set');
            stubs.error = sandbox.stub(console, 'error');
        });

        it('should format the metadata into an array', () => {
            const files = {
                id: 0,
                watermark_info: {
                    is_watermarked: false
                }
            };

            stubs.checkFileValid.onCall(0).returns(true);

            preview.updateFileCache(files);
            expect(stubs.set).calledOnce;
        });

        it('should add the file to the cache if it is valid', () => {
            const files = [
                {
                    id: 0,
                    watermark_info: {
                        is_watermarked: false
                    }
                },
                {
                    id: 1,
                    watermark_info: {
                        is_watermarked: false
                    }
                }
            ];

            stubs.checkFileValid.onCall(0).returns(true)
            .onCall(1).returns(false);

            preview.updateFileCache(files);
            expect(stubs.set).calledOnce;
            expect(stubs.error).calledOnce;
        });

        it('should not cache a file if it is watermarked', () => {
            const files = {
                id: 0,
                watermark_info: {
                    is_watermarked: true
                }
            };

            stubs.checkFileValid.returns(true);

            preview.updateFileCache(files);
            expect(stubs.set).to.not.be.called;
            expect(stubs.error).to.not.be.called;
        });
    });

    describe('getCurrentViewer()', () => {
        it('should return the viewer', () => {
            const viewer = preview.getCurrentViewer();
            expect(viewer).to.equal(preview.viewer);
        });
    });

    describe('getCurrentFile()', () => {
        it('should return the current file', () => {
            const currentFile = preview.getCurrentFile();
            expect(currentFile).to.equal(preview.file);
        });
    });

    describe('getCurrentCollection()', () => {
        it('should return the current collection', () => {
            const collection = preview.getCurrentCollection();
            expect(collection).to.equal(preview.collection);
        });
    });

    describe('getViewers()', () => {
        it('should add the viewers from the given loaders', () => {
            const textLoader = preview.loaders[0];
            const viewers = textLoader.getViewers();
            preview.loaders = [textLoader];

            const getViewers = preview.getViewers();
            expect(getViewers).to.deep.equal(viewers);
        });
    });

    describe('prefetchViewers()', () => {
        beforeEach(() => {
            const mockViewers = [
                {
                    CONSTRUCTOR: 'text'
                },
                {
                    CONSTRUCTOR: 'csv'
                },
                {
                    CONSTRUCTOR: 'excel'
                }
            ];

            stubs.getViewers = sandbox.stub(preview, 'getViewers').returns(mockViewers);
            preview.loaders = [
                {
                    prefetchAssets: sandbox.stub()
                }
            ];

            sandbox.stub(util, 'prefetchAssets');
        });

        it('should prefetch all viewers if no viewer names are specified', () => {
            const numViewers = preview.getViewers().length;

            preview.prefetchViewers();
            expect(preview.loaders[0].prefetchAssets.callCount).to.equal(numViewers);
        });

        it('should prefetch only passed in viewers', () => {
            const viewerToPrefetch = preview.getViewers()[0];
            const viewerName = viewerToPrefetch.CONSTRUCTOR;

            preview.prefetchViewers([viewerName]);
            expect(preview.loaders[0].prefetchAssets).to.be.calledOnce;
            expect(preview.loaders[0].prefetchAssets).to.be.calledWith(viewerToPrefetch);
        });
    });

    describe('disableViewers()', () => {
        beforeEach(() => {
            preview.disabledViewers = {};
        });

        it('should disable each viewer passed in', () => {
            const viewersToDisable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToDisable));
            Object.keys(viewersToDisable).forEach((viewer) => {
                expect(preview.disabledViewers[viewer]).to.equal(1);
            });
        });

        it('should disable only one viewer if only one is passed in', () => {
            const viewerToDisable = 'text';

            preview.disableViewers(viewerToDisable);
            expect(preview.disabledViewers.text).to.equal(1);
        });
    });

    describe('enableViewers()', () => {
        it('should enable an array of passed in viewers', () => {
            const viewersToEnable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToEnable));
            preview.enableViewers(Object.keys(viewersToEnable));
            expect(preview.disabledViewers).to.deep.equal({});
        });

        it('should enable a single viewer that is passed in', () => {
            const viewersToEnable = { text: 'viewer', csv: 'viewer', excel: 'viewer' };

            preview.disableViewers(Object.keys(viewersToEnable));
            preview.enableViewers('text');
            expect(preview.disabledViewers.text).to.equal(undefined);
            expect(preview.disabledViewers.csv).to.equal(1);
        });
    });

    describe('disableHotkeys()', () => {
        it('should turn off hot keys in the options', () => {
            preview.disableHotkeys();
            expect(preview.options.useHotkeys).to.be.false;
        });
    });

    describe('enableHotkeys()', () => {
        it('should turn on hot keys in the options', () => {
            preview.enableHotkeys();
            expect(preview.options.useHotkeys).to.be.true;
        });
    });

    describe('resize()', () => {
        it('should resize if the viewer exists', () => {
            preview.viewer = {
                resize: sandbox.stub()
            };

            preview.resize();
            expect(preview.viewer.resize).to.be.called;
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.checkPermission = sandbox.stub(file, 'checkPermission').returns(false);
            stubs.checkFeature = sandbox.stub(file, 'checkFeature').returns(false);
            preview.viewer = {
                print: sandbox.stub()
            };
        });

        it('should print if the feature and permissions exist', () => {
            stubs.checkPermission.returns(true);
            stubs.checkFeature.returns(true);

            preview.print();
            expect(preview.viewer.print).to.be.called;
        });

        it('should not print if feature does not exists', () => {
            stubs.checkFeature.returns(true);

            preview.print();
            expect(preview.viewer.print).to.not.be.called;
        });

        it('should not print if permissions do not exist', () => {
            stubs.checkPermission.returns(true);

            preview.print();
            expect(preview.viewer.print).to.not.be.called;
        });

        it('should not print if permissions or feature do not exist', () => {
            preview.print();
            expect(preview.viewer.print).to.not.be.called;
        });
    });

    describe('download()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve({
                data: {
                    download_url: 'dl.box'
                }
            });

            stubs.checkPermission = sandbox.stub(file, 'checkPermission');
            stubs.get = sandbox.stub(util, 'get').returns(stubs.promise);
            stubs.openUrlInsideIframe = sandbox.stub(util, 'openUrlInsideIframe');
            stubs.getRequestHeaders = sandbox.stub(preview, 'getRequestHeaders');
            stubs.getDownloadURL = sandbox.stub(file, 'getDownloadURL');
        });

        it('should not do anything if there is no download permission', () => {
            stubs.checkPermission.returns(false);

            preview.download();
            expect(stubs.openUrlInsideIframe).to.not.be.called;
        });

        it('get the file and then open in an iframe', () => {
            stubs.checkPermission.returns(true);

            preview.download();
            return stubs.promise.then((data) => {
                expect(stubs.openUrlInsideIframe).to.be.calledWith(data.download_url);
            });
        });
    });

    describe('updateToken()', () => {
        it('should update token in options with the passed in string or function', () => {
            const newToken = 'daredevil';
            preview.updateToken(newToken);
            expect(preview.previewOptions.token).to.equal(newToken);
        });

        it('should reload preview by default', () => {
            preview.file = {};
            sandbox.stub(preview, 'load');
            preview.updateToken('dr-strange');
            expect(preview.load).to.be.calledWith(preview.file);
        });

        it('should not reload preview if reloadPreview is false', () => {
            preview.file = {};
            sandbox.stub(preview, 'load');
            preview.updateToken('nick-fury', false);
            expect(preview.load).to.not.be.calledWith(preview.file);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            stubs.tokens = {
                0: 'file0'
            };

            stubs.promise = Promise.resolve({
                token: 'token'
            });

            stubs.getTokens = sandbox.stub(tokens, 'default').returns(stubs.promise);
            stubs.loadPreviewWithTokens = sandbox.stub(preview, 'loadPreviewWithTokens');
            stubs.get = sandbox.stub(cache, 'get').returns('file');
            stubs.destroy = sandbox.stub(preview, 'destroy');
        });

        it('should cleanup any existing viewer', () => {
            preview.load({ id: 0 });
            expect(stubs.destroy).to.be.called;
        });

        it('should set the preview to open, and initialize the performance logger', () => {
            preview.load({ id: 0 });
            expect(preview.open).to.be.true;
            expect(preview.logger instanceof Logger);
        });

        it('should clear the retry timeout', () => {
            preview.load({ id: 0 });
            expect(preview.retryTimeout).to.equal(undefined);
        });

        it('should set the file based on input', () => {
            preview.load('file');
            expect(stubs.get).to.be.called;
            expect(preview.file).to.equal('file');

            stubs.get.returns(false);

            preview.load('file');
            expect(stubs.get).to.be.called;
            expect(preview.file).to.deep.equal({ id: 'file' });

            preview.load({ id: 0 });
            expect(preview.file).to.deep.equal({ id: 0 });
        });

        it('should set the retry count', () => {
            preview.retryCount = 0;
            preview.file.id = 0;

            preview.load({ id: 0 });
            expect(preview.retryCount).to.equal(1);

            preview.file = undefined;

            preview.load({ id: 0 });
            expect(preview.retryCount).to.equal(0);
        });

        it('should get the tokens and either handle the response or error', () => {
            preview.previewOptions.token = 'token';

            preview.load({ id: 0 });
            return stubs.promise.then(() => {
                expect(stubs.getTokens).to.be.calledWith(0, 'token');
                expect(stubs.loadPreviewWithTokens).to.be.called;
            });
        });
    });

    describe('loadPreviewWithTokens()', () => {
        beforeEach(() => {
            stubs.loadFromServer = sandbox.stub(preview, 'loadFromServer');
            stubs.parseOptions = sandbox.stub(preview, 'parseOptions');
            stubs.setup = sandbox.stub(ui, 'setup');
            stubs.showLoadingIndicator = sandbox.stub(ui, 'showLoadingIndicator');
            stubs.checkPermission = sandbox.stub(file, 'checkPermission');
            stubs.showLoadingDownloadButton = sandbox.stub(ui, 'showLoadingDownloadButton');
            stubs.showNavigation = sandbox.stub(ui, 'showNavigation');
            stubs.set = sandbox.stub(cache, 'set');
            stubs.checkFileValid = sandbox.stub(file, 'checkFileValid');
            stubs.loadFromCache = sandbox.stub(preview, 'loadFromCache');
        });

        it('should short circuit and load from server if it is a retry', () => {
            preview.retryCount = 1;

            preview.loadPreviewWithTokens({});
            expect(stubs.loadFromServer).to.be.called;
            expect(stubs.parseOptions).to.not.be.called;
        });

        it('should parse the preview options', () => {
            preview.retryCount = 0;

            preview.loadPreviewWithTokens({});
            expect(stubs.parseOptions).to.be.called;
        });

        it('should setup the container and show the loading indicator', () => {
            preview.loadPreviewWithTokens({});
            expect(stubs.setup).to.be.called;
            expect(stubs.showLoadingIndicator).to.be.called;
        });

        it('should show the loading download button if there are sufficient permissions', () => {
            stubs.checkPermission.returns(false);
            preview.options.showDownload = false;

            preview.loadPreviewWithTokens({});
            expect(stubs.showLoadingDownloadButton).to.not.be.called;

            stubs.checkPermission.returns(true);

            preview.loadPreviewWithTokens({});
            expect(stubs.showLoadingDownloadButton).to.not.be.called;

            stubs.checkPermission.returns(false);
            preview.options.showDownload = true;

            preview.loadPreviewWithTokens({});
            expect(stubs.showLoadingDownloadButton).to.not.be.called;

            stubs.checkPermission.returns(true);
            preview.options.showDownload = true;

            preview.loadPreviewWithTokens({});
            expect(stubs.showLoadingDownloadButton).to.be.called;
        });

        it('should show navigation and cache the file', () => {
            preview.loadPreviewWithTokens({});
            expect(stubs.showNavigation).to.be.called;
            expect(stubs.set).to.be.called;
        });

        it('should load from cache if the file is valid', () => {
            stubs.checkFileValid.returns(true);

            preview.loadPreviewWithTokens({});
            expect(stubs.loadFromCache).to.be.called;
            expect(stubs.loadFromServer).to.not.be.called;
        });

        it('should load from the server on a cache miss', () => {
            stubs.checkFileValid.returns(false);

            preview.loadPreviewWithTokens({});
            expect(stubs.loadFromCache).to.not.be.called;
            expect(stubs.loadFromServer).to.be.called;
        });
    });

    describe('parseOptions()', () => {
        beforeEach(() => {
            stubs.sharedLink = 'www.app.box.com/shared';
            stubs.sharedLinkPassword = 'password';
            stubs.api = 'endpoint/';
            stubs.header = 'dark';
            stubs.logoUrl = 'www.app.box.com/logo';
            stubs.collection = ['file0', 'file1'];
            stubs.loaders = ['customloader'];
            preview.previewOptions = {
                container: containerEl,
                sharedLink: stubs.sharedLink,
                sharedLinkPassword: stubs.sharedLinkPassword,
                api: stubs.api,
                header: stubs.header,
                logoUrl: stubs.logoUrl,
                showDownload: true,
                showAnnotations: true,
                collection: stubs.collection,
                loaders: stubs.loaders
            };

            stubs.assign = sandbox.spy(Object, 'assign');
            stubs.disableViewers = sandbox.stub(preview, 'disableViewers');
            stubs.enableViewers = sandbox.stub(preview, 'enableViewers');
            stubs.tokens = {
                0: 'file0'
            };

            preview.file = {
                id: 0
            };
        });

        it('should use the saved preview options', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(stubs.assign).to.be.calledWith(preview.previewOptions);
        });

        it('should set the container', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.container).to.equal(containerEl);
        });

        it('should set the token based on the file id', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.token).to.equal(stubs.tokens[0]);
        });

        it('should set shared link and shared link password', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.sharedLink).to.equal(stubs.sharedLink);
            expect(preview.options.sharedLinkPassword).to.equal(stubs.sharedLinkPassword);
        });

        it('should set the location that was saved', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(stubs.assign).to.be.calledWith(preview.location);
        });

        it('should save a reference to the api endpoint', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.api).to.equal('endpoint');

            preview.previewOptions.api = undefined;

            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.api).to.equal('https://api.box.com');
        });

        it('should set whether to show the header or a custom logo', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.header).to.equal(stubs.header);
            expect(preview.options.logoUrl).to.equal(stubs.logoUrl);

            preview.previewOptions.header = undefined;
            preview.previewOptions.logoUrl = undefined;

            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.header).to.equal('light');
            expect(preview.options.logoUrl).to.equal('');
        });

        it('should set whether to show a download link or annotations', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.options.showDownload).to.be.true;
            expect(preview.options.showAnnotations).to.be.true;
        });

        it('should save the files to iterate through and any options for custom viewers', () => {
            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.collection).to.equal(stubs.collection);
            expect(preview.options.viewers instanceof Object).to.be.true;
        });

        it('should add user created loaders before standard loaders', () => {
            const expectedLoaders = stubs.loaders.concat(loaders);

            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(preview.loaders[0]).to.equal(expectedLoaders[0]);
            expect(preview.loaders).to.deep.equal(expectedLoaders);
        });

        it('should disable any specified viewers, otherwise enable', () => {
            preview.previewOptions.viewers = {
                Office: {
                    disabled: true
                },
                text: {
                    disabled: false
                }
            };

            preview.parseOptions(preview.previewOptions, stubs.tokens);
            expect(stubs.disableViewers).to.be.calledWith('Office');
            expect(stubs.enableViewers).to.be.calledWith('text');
        });
    });

    describe('loadFromCache()', () => {
        beforeEach(() => {
            preview.logger = {
                setCached: sandbox.stub()
            };

            stubs.loadViewer = sandbox.stub(preview, 'loadViewer');
            stubs.loadFromServer = sandbox.stub(preview, 'loadFromServer');
        });

        it('should set the file as cached in the logger', () => {
            preview.loadFromCache();
            expect(preview.logger.setCached).to.be.called;
        });

        it('should load the viewer', () => {
            preview.loadFromCache();
            expect(stubs.loadViewer).to.be.called;
        });

        it('should refresh the file from the server to update the cache', () => {
            preview.loadFromCache();
            expect(preview.loadFromServer).to.be.called;
        });
    });

    describe('loadFromServer()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve('file');
            stubs.get = sandbox.stub(util, 'get').returns(stubs.promise);
            stubs.handleLoadResponse = sandbox.stub(preview, 'handleLoadResponse');
            stubs.triggerFetchError = sandbox.stub(preview, 'triggerFetchError');
            stubs.getURL = sandbox.stub(file, 'getURL').returns('/get_url');
            preview.file.id = 0;
        });

        it('should handle load response on a successful get', () => {
            preview.loadFromServer();
            expect(stubs.get).to.be.called;
            expect(stubs.getURL).to.be.called;
            return stubs.promise.then(() => {
                expect(stubs.handleLoadResponse).to.be.called;
                expect(stubs.triggerFetchError).to.not.be.called;
            });
        });

        it('should trigger a fetch error on a failed get', () => {
            stubs.promise = Promise.reject('file');

            preview.loadFromServer();
            expect(stubs.get).to.be.called;
            expect(stubs.getURL).to.be.called;
            return stubs.promise.should.be.rejectedWith('file');
        });
    });

    describe('handleLoadResponse()', () => {
        beforeEach(() => {
            preview.logger = {
                setFile: sandbox.stub(),
                setCacheStale: sandbox.stub()
            };

            stubs.get = sandbox.stub(cache, 'get').returns(true);
            stubs.set = sandbox.stub(cache, 'set');
            stubs.triggerError = sandbox.stub(preview, 'triggerError');
            stubs.loadViewer = sandbox.stub(preview, 'loadViewer');
            stubs.file = {
                id: 0,
                name: 'file',
                file_version: {
                    sha1: 2
                },
                watermark_info: {
                    is_watermarked: false
                }
            };
        });

        it('should do nothing if the preview is closed', () => {
            preview.open = false;
            preview.handleLoadResponse(stubs.file);
            expect(stubs.set).to.not.be.called;
        });

        it('should do nothing if response comes back for an incorrect file', () => {
            preview.open = true;
            preview.file = {
                id: 0
            };
            stubs.file.id = 1;

            preview.handleLoadResponse(stubs.file);
            expect(stubs.set).to.not.be.called;
        });

        it('should save a reference to the file and update the logger', () => {
            preview.open = true;

            preview.handleLoadResponse(stubs.file);
            expect(preview.file).to.equal(stubs.file);
            expect(preview.logger.setFile).to.be.called;
        });

        it('should get the latest cache, then update it with the new file', () => {
            preview.open = true;
            stubs.get.returns({
                file_version: {
                    sha1: 0
                }
            });

            stubs.file.file_version.sha1 = 0;

            preview.handleLoadResponse(stubs.file);
            expect(stubs.get).to.be.calledWith(stubs.file.id);
            expect(stubs.set).to.be.calledWith(stubs.file.id);
            expect(stubs.loadViewer).to.not.be.called;
        });

        it('should not cache the file if the file is watermarked', () => {
            stubs.file.watermark_info.is_watermarked = true;
            preview.open = true;
            stubs.get.returns({
                file_version: {
                    sha1: 0
                }
            });

            stubs.file.file_version.sha1 = 0;

            preview.handleLoadResponse(stubs.file);
            expect(stubs.set).to.be.not.be.called;
        });

        it('should set the cache stale and re-load the viewer if the file is not in the cache', () => {
            stubs.get.returns(false);

            preview.handleLoadResponse(stubs.file);
            expect(preview.logger.setCacheStale).to.be.called;
            expect(stubs.loadViewer).to.be.called;
        });

        it('should set the cache stale and re-load the viewer if the file version is not in the cache', () => {
            stubs.get.returns({
                file_version: false
            });

            preview.handleLoadResponse(stubs.file);
            expect(preview.logger.setCacheStale).to.be.called;
            expect(stubs.loadViewer).to.be.called;
        });

        it('should set the cache stale and re-load the viewer if the cached sha1 does not match the files sha1', () => {
            stubs.get.returns({
                file_version: {
                    sha1: 0
                }
            });

            stubs.file.file_version.sha1 = 2;

            preview.handleLoadResponse(stubs.file);
            expect(preview.logger.setCacheStale).to.be.called;
            expect(stubs.loadViewer).to.be.called;
        });

        it('should set the cache stale and re-load the viewer if the file is watermarked', () => {
            stubs.file.watermark_info.is_watermarked = true;
            stubs.get.returns({
                file_version: {
                    sha1: 0
                }
            });

            stubs.file.file_version.sha1 = 2;

            preview.handleLoadResponse(stubs.file);
            expect(preview.logger.setCacheStale).to.be.called;
            expect(stubs.loadViewer).to.be.called;
        });

        it('should trigger an error if any cache or load operations fail', () => {
            stubs.get.throws(new Error());

            preview.handleLoadResponse(stubs.file);
            expect(stubs.triggerError).to.be.called;
        });
    });

    describe('loadViewer()', () => {
        beforeEach(() => {
            stubs.destroy = sandbox.stub(preview, 'destroy');
            stubs.checkPermission = sandbox.stub(file, 'checkPermission').returns(true);

            stubs.loadPromiseResolve = Promise.resolve();
            stubs.determineRepresentationStatusPromise = Promise.resolve();
            stubs.loader = {
                determineViewer: sandbox.stub().returns({ CONSTRUCTOR: 'viewer' }),
                determineRepresentation: sandbox.stub().returns({
                    links: {
                        content: {
                            url: 'url'
                        }
                    }
                }),
                determineRepresentationStatus: sandbox.stub().returns(stubs.determineRepresentationStatusPromise),
                load: sandbox.stub().returns(stubs.loadPromiseResolve)
            };

            stubs.getLoader = sandbox.stub(preview, 'getLoader').returns(stubs.loader);

            preview.logger = {
                setType: sandbox.stub()
            };

            function Viewer() {
                return {
                    load: sandbox.stub(),
                    addListener: sandbox.stub()
                };
            }

            Box.Preview.viewer = Viewer;

            stubs.triggerError = sandbox.stub(preview, 'triggerError');
            stubs.emit = sandbox.stub(preview, 'emit');
            stubs.attachViewerListeners = sandbox.stub(preview, 'attachViewerListeners');
            preview.open = true;
        });

        it('should do nothing if the preview is closed', () => {
            preview.open = false;

            preview.loadViewer();
            expect(stubs.destroy).to.not.be.called;
        });

        it('should cleanup before showing a new preview', () => {
            preview.loadViewer();
            expect(stubs.destroy).to.be.called;
        });

        it('should throw an error if there is no preview permission', () => {
            stubs.checkPermission.returns(false);
            const spy = sandbox.spy(preview, 'loadViewer');

            try {
                preview.loadViewer();
            } catch (e) {
                expect(spy.threw('Error'));
            }
        });

        it('should get the loader, viewer, and log the type of file', () => {
            preview.loadViewer();
            expect(stubs.getLoader).to.be.called;
            expect(stubs.loader.determineViewer).to.be.called;
            expect(preview.logger.setType).to.be.called;
        });

        it('should determine the representation to use', () => {
            preview.loadViewer();
            expect(stubs.loader.determineRepresentation).to.be.called;
        });

        it('should trigger an error if loading static assets fails', () => {
            const promise = Promise.reject();
            stubs.loader.load.returns(promise);

            preview.loadViewer();
            return promise.catch(() => {
                expect(stubs.triggerError).to.be.called;
            });
        });

        it('should trigger an error if loading representation assets fails', () => {
            const promise = Promise.reject();
            stubs.loader.determineRepresentationStatus.returns(promise);

            preview.loadViewer();
            return promise.catch(() => {
                expect(stubs.triggerError).to.be.called;
            });
        });
    });

    describe('attachViewerListeners()', () => {
        beforeEach(() => {
            stubs.download = sandbox.stub(preview, 'download');
            preview.viewer = {
                addListener: sandbox.stub()
            };
        });

        it('should add listeners for error and viewer events', () => {
            preview.attachViewerListeners();
            expect(preview.viewer.addListener).to.be.calledWith('error');
            expect(preview.viewer.addListener).to.be.calledWith('viewerevent');
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            stubs.checkPermission = sandbox.stub(file, 'checkPermission');
            stubs.checkFeature = sandbox.stub(file, 'checkFeature');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile');
            stubs.showDownloadButton = sandbox.stub(ui, 'showDownloadButton');
            stubs.showPrintButton = sandbox.stub(ui, 'showPrintButton');
            stubs.showAnnotateButton = sandbox.stub(ui, 'showAnnotateButton');
            stubs.hideLoadingIndicator = sandbox.stub(ui, 'hideLoadingIndicator');
            stubs.emit = sandbox.stub(preview, 'emit');
            stubs.logPreviewEvent = sandbox.stub(preview, 'logPreviewEvent');
            stubs.prefetch = sandbox.stub(preview, 'prefetch');

            stubs.logger = {
                done: sandbox.stub()
            };

            preview.viewer = {
                getPointModeClickHandler: sandbox.stub()
            };

            preview.logger = stubs.logger;
            preview.download = 'download';
            preview.options.showDownload = true;
            stubs.isMobile.returns(false);
            stubs.checkPermission.returns(true);
            stubs.checkFeature.returns(true);
        });

        it('should show download button if there is download permission', () => {
            stubs.checkPermission.returns(false);

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.not.be.called;


            stubs.checkPermission.returns(true);

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.be.calledWith('download');
        });

        it('should show download button if it is requested in the options', () => {
            preview.options.showDownload = false;

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.not.be.called;


            preview.options.showDownload = true;

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.be.calledWith('download');
        });

        it('should show download button if not on mobile', () => {
            stubs.isMobile.returns(true);

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.not.be.called;


            stubs.isMobile.returns(false);

            preview.finishLoading();
            expect(stubs.showDownloadButton).to.be.calledWith('download');
        });

        it('should show print button if print is supported', () => {
            stubs.checkFeature.returns(false);

            preview.finishLoading();
            expect(stubs.showPrintButton).to.not.be.called;

            stubs.checkFeature.returns(true);

            preview.finishLoading();
            expect(stubs.showPrintButton).to.be.called;
        });

        it('should show the annotation button if you have annotation permissions', () => {
            stubs.checkPermission.onCall(1).returns(false).onCall(2).returns(true);


            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.not.be.called;

            stubs.checkPermission.onCall(3).returns(true);

            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.be.called;
        });

        it('should show the annotation button if you are not on a mobile browser', () => {
            stubs.isMobile.returns(true);

            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.not.be.called;

            stubs.isMobile.returns(false);

            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.be.called;
        });

        it('should show the annotation button if the viewer has annotation functionality', () => {
            stubs.checkFeature.returns(false);

            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.not.be.called;

            stubs.checkFeature.returns(true);

            preview.finishLoading();
            expect(stubs.showAnnotateButton).to.be.called;
        });

        it('should hide the loading indicator', () => {
            preview.finishLoading();
            expect(stubs.hideLoadingIndicator).to.be.called;
        });

        it('should increment the preview count', () => {
            preview.count.success = 0;

            preview.finishLoading();
            expect(preview.count.success).to.equal(1);
        });

        it('should emit the load event', () => {
            preview.finishLoading();
            expect(stubs.emit).to.be.called;
            expect(preview.logger.done).to.be.called;
        });

        it('should log a preview event via the Events API if there was not an error', () => {
            preview.finishLoading({ error: 'error!' });
            expect(stubs.logPreviewEvent).to.not.be.called;

            preview.finishLoading({ error: undefined });
            expect(stubs.logPreviewEvent).to.be.called;
        });

        it('should call phantom for a health check, if it is available', () => {
            window.callPhantom = undefined;

            preview.finishLoading();

            // setting the function after the first call so that it can be spyed
            window.callPhantom = () => {};

            const callPhantomSpy = sandbox.spy(window, 'callPhantom');
            expect(window.callPhantom).to.not.be.called;

            preview.finishLoading();
            expect(callPhantomSpy).to.be.called;
        });

        it('should prefetch next content', () => {
            preview.finishLoading();
            expect(stubs.prefetch).to.be.called;
        });
    });

    describe('logPreviewEvent()', () => {
        beforeEach(() => {
            stubs.promiseResolve = Promise.resolve({});
            stubs.getHeaders = sandbox.stub(util, 'getHeaders');
            stubs.url = `${API}/2.0/events`;
        });

        it('should get the headers for the post request', () => {
            sandbox.stub(util, 'post').returns(stubs.promiseResolve);

            preview.logPreviewEvent(0, {});
            expect(stubs.getHeaders).to.be.called;
        });

        it('should reset the log retry count on a successful post', () => {
            sandbox.stub(util, 'post').returns(stubs.promiseResolve);
            preview.logRetryCount = 3;

            preview.logPreviewEvent(0, {});
            return stubs.promiseResolve.then(() => {
                expect(preview.logRetryCount).to.equal(0);
            });
        });

        it('should reset the log retry count if the post fails and retry limit has been reached', () => {
            const promiseReject = Promise.reject({});
            sandbox.stub(util, 'post').returns(promiseReject);
            preview.logRetryCount = 3;
            preview.logRetryTimeout = true;

            preview.logPreviewEvent(0, {});
            return stubs.promiseResolve.catch(() => {
                expect(preview.logRetryCount).to.equal(0);
                expect(preview.logRetryTimeout).to.be.true;
            });
        });

        it('should set a timeout to try to log the preview event again if post fails and the limit has not been met', () => {
            const promiseReject = Promise.reject({});
            sandbox.stub(util, 'post').onCall(0).returns(promiseReject);
            preview.logRetryCount = 3;
            preview.logRetryTimeout = undefined;

            preview.logPreviewEvent(0, { api: API });
            return stubs.promiseResolve.catch(() => {
                expect(preview.logRetryCount).to.equal(4);
                expect(preview.logRetryTimeout).to.not.equal(undefined);
            });
        });
    });

    describe('triggerFetchError()', () => {
        beforeEach(() => {
            stubs.unset = sandbox.stub(cache, 'unset');
            stubs.triggerError = sandbox.stub(preview, 'triggerError');
            stubs.load = sandbox.stub(preview, 'load');
        });

        it('should do nothing if the preview is closed', () => {
            preview.open = false;

            preview.triggerFetchError();
            expect(stubs.unset).to.not.be.called;
        });

        it('should clear the current file from the cache', () => {
            preview.open = true;

            preview.triggerFetchError();
            expect(stubs.unset).to.be.called;
        });

        it('should trigger an error if we have hit our retry count limit', () => {
            preview.open = true;
            preview.retryCount = 6;

            preview.triggerFetchError();
            expect(stubs.triggerError).to.be.called;
        });

        it('should reset a timeout that tries to load the file again', () => {
            const clock = sinon.useFakeTimers();
            preview.open = true;
            preview.retryCount = 1;
            preview.file.id = 1;

            preview.triggerFetchError();
            expect(stubs.triggerError).to.not.be.called;

            clock.tick(RETRY_TIMEOUT + 1);
            expect(stubs.load).to.be.calledWith(1);
        });
    });

    describe('triggerError()', () => {
        beforeEach(() => {
            stubs.unset = sandbox.stub(cache, 'unset');
            stubs.destroy = sandbox.stub(preview, 'destroy');
            stubs.determineViewer = sandbox.stub(ErrorLoader, 'determineViewer').returns({ CONSTRUCTOR: 'error' });
            stubs.promiseResolve = Promise.resolve();
            stubs.load = sandbox.stub(ErrorLoader, 'load').returns(stubs.promiseResolve);
            stubs.hideLoadingIndicator = sandbox.stub(ui, 'hideLoadingIndicator');
            stubs.checkPermission = sandbox.stub(file, 'checkPermission');
            stubs.showDownloadButton = sandbox.stub(ui, 'showDownloadButton');
            stubs.emit = sandbox.stub(preview, 'emit');
            stubs.attachViewerListeners = sandbox.stub(preview, 'attachViewerListeners');

            preview.viewer = {
                load: sandbox.stub
            };

            preview.open = true;

            function ErrorViewer() {
                this.load = sandbox.stub().returns(stubs.promiseResolve);
                this.addListener = sandbox.stub();
            }

            Box.Preview.error = ErrorViewer;
        });

        it('should do nothing if the preview is closed', () => {
            preview.open = false;

            preview.triggerError();
            expect(stubs.unset).to.not.be.called;
            expect(stubs.destroy).to.not.be.called;
        });

        it('should prevent any other viewers from loading, clear the cache, and destroy anything still visible', () => {
            preview.triggerError();
            expect(preview.open).to.be.false;
            expect(stubs.unset).to.be.called;
            expect(stubs.destroy).to.be.called;
        });

        it('should determine which viewer to load with the ErrorLoader', () => {
            preview.triggerError();
            expect(stubs.determineViewer).to.be.called;
        });

        it('should load the new viewer, hide the loading indicator, and attach listeners', () => {
            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(preview.viewer.load).to.be.called;
                expect(stubs.hideLoadingIndicator).to.be.called;
                expect(stubs.attachViewerListeners).to.be.called;
            });
        });

        it('should not show the download button if there are not file and options permissions', () => {
            stubs.checkPermission.returns(false);
            preview.options.showDownload = false;

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(stubs.showDownloadButton).to.not.be.called;
            });
        });

        it('should not show the download button if there are file permissions but not options', () => {
            stubs.checkPermission.returns(true);
            preview.options.showDownload = false;

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(stubs.showDownloadButton).to.not.be.called;
            });
        });

        it('should not show the download button if there are not file permissions but there are options permissions', () => {
            stubs.checkPermission.returns(false);
            preview.options.showDownload = true;

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(stubs.showDownloadButton).to.not.be.called;
            });
        });

        it('should show the download button if there are file and options permissions', () => {
            stubs.checkPermission.returns(true);
            preview.options.showDownload = true;

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(stubs.showDownloadButton).to.be.called;
            });
        });

        it('should bump up the preview error count, and emit a load message', () => {
            preview.count.error = 0;

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(preview.count.error).to.equal(1);
                expect(stubs.emit).to.be.calledWith('load');
            });
        });

        it('should make a health check if PhantomJS exists', () => {
            window.callPhantom = sandbox.stub();

            preview.triggerError();
            return stubs.promiseResolve.then(() => {
                expect(window.callPhantom).to.be.called;
            });
        });

        it('should emit a preview error message', () => {
            preview.triggerError();
            expect(stubs.emit).to.be.calledWith('previewerror');
        });
    });

    describe('getRequestHeaders()', () => {
        beforeEach(() => {
            stubs.canPlayDash = sandbox.stub(Browser, 'canPlayDash').returns(false);
            stubs.getHeaders = sandbox.stub(util, 'getHeaders');
            stubs.headers = {
                'X-Rep-Hints': '[3d][pdf][text][jpg?dimensions=2048x2048,jpg?dimensions=1024x1024,' +
                'png?dimensions=2048x2048,png?dimensions=1024x1024][mp3][original]'
            };

            preview.options.sharedLink = 'link';
            preview.options.sharedLinkPassword = 'Passw0rd!';
            preview.options.token = 'previewtoken';
        });

        it('should get headers with the provided token', () => {
            stubs.headers['X-Rep-Hints'] += '[mp4]';

            preview.getRequestHeaders('token');
            expect(stubs.getHeaders).to.be.calledWith(stubs.headers, 'token', 'link', 'Passw0rd!');
        });

        it('should get headers with the options token if none are provided', () => {
            stubs.headers['X-Rep-Hints'] += '[mp4]';

            preview.getRequestHeaders();
            expect(stubs.getHeaders).to.be.calledWith(stubs.headers, 'previewtoken', 'link', 'Passw0rd!');
        });

        it('should add dash hints if the browser supports dash', () => {
            stubs.canPlayDash.returns(true);
            stubs.headers['X-Rep-Hints'] += '[dash,mp4][filmstrip]';

            preview.getRequestHeaders();
            expect(stubs.getHeaders).to.be.calledWith(stubs.headers, 'previewtoken', 'link', 'Passw0rd!');
        });
    });

    describe('prefetch()', () => {
        beforeEach(() => {
            stubs.getTokensPromiseResolve = Promise.resolve({
                0: 'token0',
                1: 'token1',
                2: 'token2',
                3: 'token3',
                4: 'token4',
                5: 'token5'
            });

            stubs.getTokens = sandbox.stub(tokens, 'default');

            stubs.getPromiseResolve = Promise.resolve({
                id: 0
            });

            stubs.get = sandbox.stub(util, 'get').returns(stubs.getPromiseResolve);
            stubs.getURL = sandbox.stub(file, 'getURL');
            stubs.getRequestHeaders = sandbox.stub(preview, 'getRequestHeaders');
            stubs.set = sandbox.stub(cache, 'set');
            stubs.prefetchContent = sandbox.stub(preview, 'prefetchContent');
            preview.prefetchedCollection = [];
        });

        it('should not prefetch if there are less than 2 files to prefetch', () => {
            preview.collection = [1];

            preview.prefetch();
            expect(stubs.getTokens).to.not.be.called;
        });

        it('should do nothing if there are no new files to prefetch', () => {
            preview.file = {
                id: 3
            };

            preview.collection = [1, 2, 3];

            preview.prefetch();
            expect(stubs.getTokens).to.not.be.called;
        });

        it('should get tokens for the next PREFETCH_COUNT files in the collection', () => {
            stubs.getTokens.returns(stubs.getTokensPromiseResolve);
            preview.file.id = 0;
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetch();
            return stubs.getTokensPromiseResolve.then(() => {
                expect(stubs.getTokens).to.be.calledWith([1, 2, 3, 4], 'token');
            });
        });

        it('should get info for the next PREFETCH_COUNT files', () => {
            stubs.getTokens.returns(stubs.getTokensPromiseResolve);
            preview.file.id = 0;
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetch();
            return stubs.getTokensPromiseResolve.then(() => {
                expect(stubs.getRequestHeaders.callCount).to.equal(PREFETCH_COUNT);
                expect(stubs.get.callCount).to.equal(PREFETCH_COUNT);
            });
        });

        it('should set the cache, add to the prefetched collection, and prefetch the actual content', () => {
            stubs.getTokens.returns(stubs.getTokensPromiseResolve);
            preview.file.id = 0;
            preview.previewOptions.token = 'token';
            preview.collection = [0, 1, 2, 3, 4, 5];

            preview.prefetch();
            return stubs.getTokensPromiseResolve.then(() => {
                return stubs.getPromiseResolve.then(() => {
                    expect(stubs.set.callCount).to.equal(PREFETCH_COUNT);
                    expect(stubs.prefetchContent.callCount).to.equal(PREFETCH_COUNT);
                    expect(preview.prefetchedCollection.length).to.equal(PREFETCH_COUNT);
                });
            });
        });
    });

    describe('prefetchContent()', () => {
        beforeEach(() => {
            stubs.getLoader = sandbox.stub(preview, 'getLoader').returns({
                prefetch: sandbox.stub().returns('file')
            });
        });

        it('should return the result of the loader\'s prefetch', () => {
            const prefetch = preview.prefetchContent('file', 'token');
            expect(prefetch).to.equal('file');
            expect(stubs.getLoader).to.be.called;
        });

        it('should reject a promise if the loader does not exist', () => {
            stubs.getLoader.returns(undefined);

            const prefetch = preview.prefetchContent('file', 'token');
            return expect(prefetch).to.be.rejected;
        });
    });

    describe('getGlobalMousemoveHandler()', () => {
        beforeEach(() => {
            preview.throttledMousemoveHandler = undefined;
        });

        it('should return the throttled mouse move handler if it already exists', () => {
            preview.throttledMousemoveHandler = true;

            const handler = preview.getGlobalMousemoveHandler();
            expect(handler).to.be.true;
        });

        it('should clear the timeout handler and do nothing if the container doesn\'t exist', () => {
            preview.container = false;

            const handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.timeoutHandler).to.equal(undefined);
        });

        it('should remove the navigation arrows', () => {
            preview.viewer = {
                allowNavigationArrows: sandbox.stub().returns(false)
            };

            const handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).to.be.false;
        });

        it('should add the navigation arrows back if the viewer allows them or we aren\'t previewing', () => {
            preview.viewer = false;

            let handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).to.be.true;

            preview.viewer = {
                allowNavigationArrows: sandbox.stub().returns(true)
            };

            handler = preview.getGlobalMousemoveHandler();
            handler();
            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).to.be.true;
        });

        it('should set a timeout to remove the arrows if the container exists', () => {
            const clock = sinon.useFakeTimers();
            const handler = preview.getGlobalMousemoveHandler();
            preview.viewer.allowNavigationArrows = sandbox.stub();

            handler();
            clock.tick(MOUSEMOVE_THROTTLE + 1);

            expect(preview.container.classList.contains(CLASS_NAVIGATION_VISIBILITY)).to.be.false;
        });
    });

    describe('navigateToIndex()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(preview, 'emit');
            stubs.load = sandbox.stub(preview, 'load');

            preview.count = {
                navigation: 0
            };

            preview.collection = {
                2: 'file'
            };
        });

        it('should emit the navigation event', () => {
            preview.navigateToIndex(1);
            expect(stubs.emit).to.be.called;
        });

        it('should increment the navigation count', () => {
            preview.navigateToIndex(1);
            expect(preview.count.navigation).to.equal(1);
        });

        it('should load the requested file', () => {
            preview.navigateToIndex(2);
            expect(stubs.load).to.be.calledWith('file');
        });
    });

    describe('navigateLeft()', () => {
        beforeEach(() => {
            stubs.navigateToIndex = sandbox.stub(preview, 'navigateToIndex');
            preview.file = {
                id: 1
            };
            preview.collection = [3, 2, 1];
        });

        it('should navigate to index if it is not the first file in the collection', () => {
            preview.navigateLeft();
            expect(stubs.navigateToIndex).to.be.called;
        });

        it('should not navigate to index if it is the first file in the collection', () => {
            preview.collection = [1, 2, 3];

            preview.navigateLeft();
            expect(stubs.navigateToIndex).to.not.be.called;
        });
    });

    describe('navigateRight()', () => {
        beforeEach(() => {
            stubs.navigateToIndex = sandbox.stub(preview, 'navigateToIndex');
            preview.file.id = 1;
            preview.collection = [1, 2, 3];
        });

        it('should navigate to index if it is not the last file in the collection', () => {
            preview.navigateRight();
            expect(stubs.navigateToIndex).to.be.called;
        });

        it('should not navigate to index if it is the last file in the collection', () => {
            preview.collection = [3, 2, 1];

            preview.navigateRight();
            expect(stubs.navigateToIndex).to.not.be.called;
        });
    });

    describe('getLoader()', () => {
        it('should return the first capable loader based on file info', () => {
            preview.loaders = [
                {
                    name: 'error',
                    canLoad: sandbox.stub().returns(false)
                },
                {
                    name: 'text',
                    canLoad: sandbox.stub().returns(false)
                },
                {
                    name: 'csv',
                    canLoad: sandbox.stub().returns(true)
                }
            ];

            const loader = preview.getLoader('file');
            expect(loader.name).to.equal('csv');
        });
    });

    describe('keydownHandler()', () => {
        beforeEach(() => {
            stubs.decodeKeydown = sandbox.stub(util, 'decodeKeydown');
            preview.options.useHotkeys = true;
            stubs.navigateLeft = sandbox.stub(preview, 'navigateLeft');
            stubs.navigateRight = sandbox.stub(preview, 'navigateRight');
            stubs.event = {
                target: {
                    nodeName: KEYDOWN_EXCEPTIONS[0]
                }
            };

            preview.viewer = {

            };
        });

        it('should do nothing if keyboard shortcuts are disabled', () => {
            preview.options.useHotkeys = false;

            preview.keydownHandler({ target: undefined });
            expect(stubs.decodeKeydown).to.not.be.called;
        });

        it('should do nothing if there is no target', () => {
            preview.keydownHandler({ target: undefined });
            expect(stubs.decodeKeydown).to.not.be.called;
        });

        it('should do nothing if there is no target the target is a keydown exception', () => {
            preview.keydownHandler(stubs.event);
            expect(stubs.decodeKeydown).to.not.be.called;
        });

        it('should do nothing if the target is a content editable div', () => {
            stubs.event.target.nodeName = 'DIV';
            stubs.event.target.getAttribute = sandbox.stub().returns(true);

            preview.keydownHandler(stubs.event);
            expect(stubs.decodeKeydown).to.not.be.called;
        });

        it('should do nothing if the target is not a decodable key', () => {
            preview.viewer.onKeydown = sandbox.stub().returns(false);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.event.preventDefault = sandbox.stub();
            stubs.decodeKeydown.returns(false);

            preview.keydownHandler(stubs.event);
            expect(stubs.event.preventDefault).to.not.be.called;
        });

        it('should navigate left is key is ArrowLeft and the event has not been consumed', () => {
            preview.viewer.onKeydown = sandbox.stub().returns(false);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.event.preventDefault = sandbox.stub();
            stubs.event.stopPropagation = sandbox.stub();
            stubs.decodeKeydown.returns('ArrowLeft');

            preview.keydownHandler(stubs.event);
            expect(stubs.navigateLeft).to.be.called;
        });

        it('should navigate right is key is ArrowRight and the event has not been consumed', () => {
            stubs.event.preventDefault = sandbox.stub();
            stubs.event.stopPropagation = sandbox.stub();
            stubs.event.target.nodeName = 'ArrowRight';
            stubs.decodeKeydown.returns('ArrowRight');

            preview.keydownHandler(stubs.event);
            expect(stubs.navigateRight).to.be.called;
        });

        it('should prevent default and stop propagation if the event has been consumed by the viewer', () => {
            preview.viewer.onKeydown = sandbox.stub().returns(true);
            stubs.event.target.nodeName = 'ArrowLeft';
            stubs.event.preventDefault = sandbox.stub();
            stubs.event.stopPropagation = sandbox.stub();
            stubs.decodeKeydown.returns('ArrowRight');

            preview.keydownHandler(stubs.event);
            expect(stubs.event.preventDefault).to.be.called;
            expect(stubs.event.stopPropagation).to.be.called;
        });
    });
});
/* eslint-enable no-unused-expressions */
