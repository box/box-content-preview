/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import DashViewer from '../DashViewer';
import VideoBaseViewer from '../VideoBaseViewer';
import BaseViewer from '../../BaseViewer';
import PreviewError from '../../../PreviewError';
import Timer from '../../../Timer';
import { MEDIA_STATIC_ASSETS_VERSION } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

// eslint-disable-next-line import/no-dynamic-require
const shaka = require(`../../../../third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/shaka-player.compiled.js`);

const CSS_CLASS_MEDIA = 'bp-media';
const CSS_CLASS_HD = 'bp-media-controls-is-hd';
const sandbox = sinon.createSandbox();

let dash;
let stubs = {};

describe('lib/viewers/media/DashViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeAll(() => {
        global.shaka = shaka;
    });

    beforeEach(() => {
        jest.spyOn(shaka.polyfill, 'installAll').mockImplementation();
        fixture.load('viewers/media/__tests__/DashViewer-test.html');
        const containerEl = document.querySelector('.container');
        stubs.api = new Api();
        dash = new DashViewer({
            api: stubs.api,
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {},
            },
            file: {
                id: 0,
                permissions: {
                    can_download: true,
                },
            },
            container: containerEl,
            location: { locale: 'en-US' },
            representation: {
                content: {
                    url_template: 'url',
                },
                status: {},
            },
        });

        // Stubbing out sub-components of the dash player
        stubs.emit = jest.spyOn(dash, 'emit');
        dash.filmstripStatus = {
            destroy: () => {},
        };

        stubs.networkEngine = {
            registerRequestFilter: () => {},
        };
        dash.player = {
            addEventListener: () => {},
            configure: () => {},
            destroy: () => {},
            getNetworkingEngine: jest.fn(() => stubs.networkEngine),
            getStats: () => {},
            getTextTracks: () => {},
            getVariantTracks: () => {},
            isAudioOnly: () => {},
            load: () => {},
            selectTextTrack: () => {},
            selectVariantTrack: () => {},
            selectAudioLanguage: () => {},
            setTextTrackVisibility: () => {},
        };
        dash.autoCaptionDisplayer = {
            append: () => {},
            setTextVisibility: () => {},
        };
        stubs.mockPlayer = sandbox.mock(dash.player);
        stubs.mockDisplayer = sandbox.mock(dash.autoCaptionDisplayer);

        dash.mediaControls = {
            addListener: () => {},
            enableHDSettings: () => {},
            destroy: () => {},
            initFilmstrip: () => {},
            initSubtitles: () => {},
            initAlternateAudio: () => {},
            removeAllListeners: () => {},
            removeListener: () => {},
            show: jest.fn(),
            setLabel: () => {},
        };
        stubs.mockControls = sandbox.mock(dash.mediaControls);

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        dash.containerEl = containerEl;
        dash.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (dash && typeof dash.destroy === 'function' && !dash.destroyed) {
            dash.destroy();
        }

        dash = null;
        stubs = {};
    });

    describe('setup()', () => {
        test('should set up dash element', () => {
            expect(dash.bandwidthHistory).toEqual([]);
            expect(dash.switchHistory).toEqual([]);
            expect(dash.hdVideoId).toBe(-1);
            expect(dash.sdVideoId).toBe(-1);
            expect(dash.wrapperEl).toHaveClass(CSS_CLASS_MEDIA);
        });
    });

    describe('destroy()', () => {
        test('should remove event listeners on the dash', () => {
            stubs.removeStats = jest.spyOn(dash, 'removeStats');
            stubs.resize = jest.spyOn(dash, 'resize');

            dash.destroy();
            expect(stubs.emit).toBeCalledWith('bandwidthhistory', []);
            expect(stubs.emit).toBeCalledWith('switchhistory', []);
            expect(stubs.emit).toBeCalledWith('destroy');
            expect(stubs.removeStats).toBeCalled();

            // Ensures that afterEach() cleanup doesn't trigger destroy() again
            dash = null;
        });
    });

    describe('load()', () => {
        test('should load a media source', () => {
            stubs.promise = Promise.resolve();
            jest.spyOn(dash, 'setup').mockImplementation();
            jest.spyOn(dash, 'loadDashPlayer').mockImplementation();
            jest.spyOn(dash, 'resetLoadTimeout').mockImplementation();
            jest.spyOn(dash, 'loadAssets').mockImplementation();
            jest.spyOn(dash, 'isAutoplayEnabled').mockReturnValue(true);
            jest.spyOn(dash, 'autoplay').mockImplementation();
            jest.spyOn(dash, 'loadUI').mockImplementation();

            jest.spyOn(dash, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            jest.spyOn(Promise, 'all').mockReturnValue(stubs.promise);

            return dash
                .load()
                .then(() => {
                    expect(dash.setup).toBeCalled();
                    expect(dash.loadDashPlayer).toBeCalled();
                    expect(dash.resetLoadTimeout).toBeCalled();
                    expect(dash.autoplay).toBeCalled();
                    expect(dash.loadUI).toBeCalled();
                })
                .catch(() => {});
        });
    });

    describe('prefetch()', () => {
        beforeEach(() => {
            stubs.prefetchAssets = jest.spyOn(dash, 'prefetchAssets').mockImplementation();
            stubs.createUrl = jest.spyOn(dash, 'createContentUrlWithAuthParams').mockImplementation();
            stubs.repReady = jest.spyOn(dash, 'isRepresentationReady').mockReturnValue(true);
        });

        test('should prefetch static assets assets if assets are true', () => {
            dash.prefetch({ assets: true, content: false });
            expect(stubs.prefetchAssets).toBeCalled();
        });

        test('should not prefetch rep content if content is false', () => {
            sandbox
                .mock(stubs.api)
                .expects('get')
                .never();
            dash.prefetch({ assets: false, content: false });
            expect(stubs.prefetchAssets).not.toBeCalled();
        });

        test('should not prefetch rep content if representation is not ready', () => {
            stubs.repReady.mockReturnValue(false);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .never();

            dash.prefetch({ assets: false, content: true });
            expect(stubs.prefetchAssets).not.toBeCalled();
        });

        test('should prefetch rep content if representation is ready', () => {
            const contentUrl = 'someUrl';
            stubs.createUrl.mockReturnValue(contentUrl);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .withArgs(contentUrl, { type: 'document' });

            dash.prefetch({ assets: false, content: true });
            expect(stubs.prefetchAssets).not.toBeCalled();
        });
    });

    describe('getJSAssets()', () => {
        test('should return shaka player assets', () => {
            const assets = [`third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/shaka-player.compiled.js`];
            const returnedAssets = dash.getJSAssets();
            expect(returnedAssets).toEqual(assets);
        });
    });

    describe('loadDashPlayer()', () => {
        test('should create a new shaka player', () => {
            dash.mediaUrl = 'url';
            jest.spyOn(shaka, 'Player').mockReturnValue(dash.player);
            stubs.mockPlayer.expects('addEventListener').withArgs('adaptation', sinon.match.func);
            stubs.mockPlayer.expects('addEventListener').withArgs('error', sinon.match.func);
            stubs.mockPlayer.expects('addEventListener').withArgs('buffering', sinon.match.func);
            stubs.mockPlayer.expects('configure');
            stubs.mockPlayer
                .expects('load')
                .withArgs('url')
                .returns(Promise.resolve());

            dash.loadDashPlayer();

            expect(stubs.mockPlayer).not.toBeNull();
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(dash, 'startLoadTimer').mockImplementation();
            jest.spyOn(shaka, 'Player').mockReturnValue(dash.player);
            stubs.mockPlayer.expects('load').returns(new Promise(() => {}));

            dash.loadDashPlayer();

            expect(dash.startLoadTimer).toBeCalled();
        });

        test('should load the player with the start time', () => {
            const START_TIME_IN_SECONDS = 3;
            dash.mediaUrl = 'url';
            dash.startTimeInSeconds = START_TIME_IN_SECONDS;
            jest.spyOn(shaka, 'Player').mockReturnValue(dash.player);
            stubs.mockPlayer
                .expects('load')
                .withArgs('url', START_TIME_IN_SECONDS)
                .returns(Promise.resolve());

            dash.loadDashPlayer();
        });
    });

    describe('requestFilter()', () => {
        test('should append representation URLs with tokens', () => {
            stubs.createUrl = jest.spyOn(dash, 'createContentUrlWithAuthParams').mockReturnValue('auth_url');
            stubs.req = { uris: ['uri'] };
            dash.options = {
                file: {
                    watermark_info: {
                        is_watermarked: false,
                    },
                    representations: {
                        entries: [{ representation: 'dash' }],
                    },
                },
            };

            dash.requestFilter('', stubs.req);

            expect(stubs.createUrl).toBeCalledTimes(1);
            expect(stubs.req.uris).toEqual(['auth_url']);
        });

        test('should append watermark cache-busting query params if file is watermarked', () => {
            stubs.createUrl = jest
                .spyOn(dash, 'createContentUrlWithAuthParams')
                .mockReturnValue('www.authed.com/?foo=bar');
            stubs.req = { uris: ['uri'] };
            dash.watermarkCacheBust = '123';
            dash.options = {
                file: {
                    watermark_info: {
                        is_watermarked: true,
                    },
                    representations: {
                        entries: [{ representation: 'dash' }],
                    },
                },
            };

            dash.requestFilter('', stubs.req);

            expect(stubs.createUrl).toBeCalledTimes(1);
            expect(stubs.req.uris).toEqual(['www.authed.com/?foo=bar&watermark_content=123']);
        });
    });

    describe('getActiveTrack()', () => {
        test('should get active track', () => {
            stubs.inactive = { active: false };
            stubs.active = { active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([stubs.inactive, stubs.active]);
            expect(dash.getActiveTrack()).toBe(stubs.active);
        });
    });

    describe('showLoadingIcon()', () => {
        afterEach(() => {
            VideoBaseViewer.prototype.showLoadingIcon.restore();
        });

        test('should show the loading indicator if active track does not equal the rep id', () => {
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue({ id: 1 });
            sinon.stub(VideoBaseViewer.prototype, 'showLoadingIcon');
            dash.showLoadingIcon(2);
        });
    });

    describe('enableVideoId()', () => {
        test('should enable videoId while maintaining the same audio', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: false };
            const variant3 = { id: 3, videoId: 1, audioId: 6, active: false };
            const variant4 = { id: 4, videoId: 2, audioId: 6, active: true };
            const variant5 = { id: 5, videoId: 1, audioId: 7, active: false };
            const variant6 = { id: 6, videoId: 2, audioId: 7, active: false };
            stubs.mockPlayer
                .expects('getVariantTracks')
                .returns([variant1, variant2, variant3, variant4, variant5, variant6]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant4);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').withArgs(variant3, true);

            dash.enableVideoId(1);

            expect(dash.showLoadingIcon).toBeCalledWith(3);
        });

        test('should do nothing if enabling a videoId which is already active', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([variant1, variant2]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant2);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableVideoId(2);

            expect(dash.showLoadingIcon).not.toBeCalled();
        });

        test('should do nothing if enabling an invalid videoId', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([variant1, variant2]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant2);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableVideoId(-1);

            expect(dash.showLoadingIcon).not.toBeCalled();
        });
    });

    describe('enableAudioId()', () => {
        test('should enable audioId while maintaining the same video ID', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false, roles: ['1'] };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: false, roles: ['1'] };
            const variant3 = { id: 3, videoId: 1, audioId: 6, active: false, roles: ['2'] };
            const variant4 = { id: 4, videoId: 2, audioId: 6, active: true, roles: ['2'] };
            const variant5 = { id: 5, videoId: 1, audioId: 7, active: false, roles: ['3'] };
            const variant6 = { id: 6, videoId: 2, audioId: 7, active: false, roles: ['3'] };
            stubs.mockPlayer
                .expects('getVariantTracks')
                .returns([variant1, variant2, variant3, variant4, variant5, variant6]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant4);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').withArgs(variant6, true);

            dash.enableAudioId('3');

            expect(dash.showLoadingIcon).toBeCalledWith(6);
        });

        test('should do nothing if enabling a audioId which is already active', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false, roles: ['1'] };
            const variant2 = { id: 2, videoId: 2, audioId: 6, active: true, roles: ['2'] };
            stubs.mockPlayer.expects('getVariantTracks').returns([variant1, variant2]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant2);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableAudioId('2');

            expect(dash.showLoadingIcon).not.toBeCalled();
        });

        test('should do nothing if enabling an invalid audioId', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false, roles: ['1'] };
            const variant2 = { id: 2, videoId: 2, audioId: 6, active: true, roles: ['2'] };
            stubs.mockPlayer.expects('getVariantTracks').returns([variant1, variant2]);
            jest.spyOn(dash, 'getActiveTrack').mockReturnValue(variant2);
            jest.spyOn(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableAudioId(-1);

            expect(dash.showLoadingIcon).not.toBeCalled();
        });
    });

    describe('enableAdaptation()', () => {
        test('should configure player to enable adaptation by default', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: true } });
            dash.enableAdaptation(true);
        });

        test('should configure player to disable adaptation', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: false } });
            dash.enableAdaptation(false);
        });
    });

    describe('handleQuality()', () => {
        beforeEach(() => {
            dash.hdVideoId = 1;
            dash.sdVideoId = -1;
            stubs.enableVideoId = jest.spyOn(dash, 'enableVideoId').mockImplementation();
            stubs.adapt = jest.spyOn(dash, 'enableAdaptation').mockImplementation();
            stubs.showGearHdIcon = jest.spyOn(dash, 'showGearHdIcon').mockImplementation();
            stubs.getActiveTrack = jest.spyOn(dash, 'getActiveTrack').mockImplementation();
        });

        test('should enforce SD if there is no HD video ID', () => {
            dash.hdVideoId = -1;
            jest.spyOn(dash.cache, 'get').mockReturnValue('hd');
            dash.handleQuality();

            expect(stubs.enableVideoId).toBeCalledWith(dash.sdVideoId);
            expect(dash.emit).toBeCalledWith('qualitychange', 'sd');
        });

        test('should enable HD video', () => {
            jest.spyOn(dash.cache, 'get').mockReturnValue('hd');
            dash.handleQuality();
            expect(stubs.adapt).toBeCalledWith(false);
            expect(stubs.enableVideoId).toBeCalledWith(dash.hdVideoId);
            expect(dash.emit).toBeCalledWith('qualitychange', 'hd');
        });

        test('should enable SD video', () => {
            jest.spyOn(dash.cache, 'get').mockReturnValue('sd');
            dash.handleQuality();
            expect(stubs.adapt).toBeCalledWith(false);
            expect(stubs.enableVideoId).toBeCalledWith(dash.sdVideoId);
            expect(dash.emit).toBeCalledWith('qualitychange', 'sd');
        });

        test('should enable auto video', () => {
            jest.spyOn(dash.cache, 'get').mockReturnValue('auto');
            dash.handleQuality();
            expect(stubs.adapt).toBeCalledWith(true);
            expect(dash.emit).toBeCalledWith('qualitychange', 'auto');
        });

        test('should not emit "qualitychange" event if no quality was cached', () => {
            jest.spyOn(dash.cache, 'get');
            dash.handleQuality();
            expect(stubs.adapt).toBeCalledWith(true); // default to adapt=true
            expect(dash.emit).not.toBeCalled();
        });

        test('should enable SD if there is no HD rep available', () => {
            dash.hdVideoId = -1;
            jest.spyOn(dash.cache, 'get').mockReturnValue('hd');
            dash.handleQuality();
            expect(stubs.adapt).toBeCalledWith(false);
            expect(dash.emit).toBeCalledWith('qualitychange', 'sd');
        });
    });

    describe('adaptationHandler()', () => {
        beforeEach(() => {
            stubs.active = { id: 1, bandwidth: 'bandwidth', videoId: 1 };
            stubs.getActive = jest.spyOn(dash, 'getActiveTrack').mockReturnValue(stubs.active);
            stubs.loaded = jest.spyOn(dash, 'isLoaded').mockReturnValue(true);
            stubs.hide = jest.spyOn(dash, 'hideLoadingIcon');
            dash.hdVideoId = 1;
            dash.adapting = false;
        });

        test('should handle change to HD resolution', () => {
            dash.adaptationHandler();
            expect(dash.wrapperEl).toHaveClass(CSS_CLASS_HD);
            expect(stubs.hide).toBeCalled();
        });

        test('should handle change from HD resolution', () => {
            stubs.getActive.mockReturnValue({ id: 2, videoId: 2 });
            dash.wrapperEl.classList.add(CSS_CLASS_HD);
            dash.adaptationHandler();
            expect(dash.wrapperEl).not.toHaveClass(CSS_CLASS_HD);
            expect(stubs.hide).toBeCalled();
        });

        test('should not hide loading indicator if video is still loading', () => {
            stubs.loaded.mockReturnValue(false);
            dash.adaptationHandler();
            expect(stubs.hide).not.toBeCalled();
        });

        test('should emit bandwidth if video resolution is adapting', () => {
            dash.adapting = true;
            dash.adaptationHandler();
            expect(dash.emit).toBeCalledWith('adaptation', stubs.active.bandwidth);
            expect(stubs.hide).toBeCalled();
        });

        test('should not emit bandwidth if video resolution is not adapting', () => {
            dash.adapting = false;
            dash.adaptationHandler();
            expect(dash.emit).not.toBeCalled();
            expect(stubs.hide).toBeCalled();
        });
    });

    describe('shakaErrorHandler()', () => {
        beforeEach(() => {
            jest.spyOn(dash, 'triggerError').mockImplementation();
        });

        test('should emit error on critical shaka errors', () => {
            const shakaError = {
                detail: {
                    severity: 2, // critical severity
                    category: 1,
                    code: 1100,
                    data: ['foobar'],
                },
            };

            dash.shakaErrorHandler(shakaError);

            const [error] = dash.triggerError.mock.calls[0];
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.details.code).toBe(shakaError.detail.code);
            expect(error.details.severity).toBe(shakaError.detail.severity);
            expect(error.code).toBe('error_shaka');
        });

        test('should not emit error on recoverable shaka errors', () => {
            const shakaError = {
                detail: {
                    severity: 1, // recoverable severity
                    category: 1,
                    code: 1100,
                    data: ['foobar'],
                },
            };

            dash.shakaErrorHandler(shakaError);

            expect(dash.emit).not.toBeCalled();
        });

        test('should work when the error does not contain a details object', () => {
            const shakaError = {
                severity: 2, // critical severity
                category: 1,
                code: 1100, // HTTP Error code
                data: ['foobar'],
            };
            dash.shakaErrorHandler(shakaError);

            const [error] = dash.triggerError.mock.calls[0];
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe('error_shaka');
        });

        test('should handle the download error if an HTTP shaka error is thrown', () => {
            const shakaError = {
                severity: 2, // critical severity
                category: 1,
                code: 1002, // hTTP Error code
                data: ['foobar'],
            };
            jest.spyOn(dash, 'handleDownloadError');
            dash.shakaErrorHandler(shakaError);

            expect(dash.handleDownloadError).toBeCalled();
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        const listenerFunc = DashViewer.prototype.addEventListenersForMediaControls;

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', {
                value: listenerFunc,
            });
        });

        test('should add event listeners to the media controls', () => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', {
                value: sandbox.mock(),
            });
            stubs.mockControls.expects('addListener').withArgs('qualitychange', sinon.match.func);
            stubs.mockControls.expects('addListener').withArgs('subtitlechange', sinon.match.func);
            stubs.mockControls.expects('addListener').withArgs('audiochange', sinon.match.func);
            dash.addEventListenersForMediaControls();
        });
    });

    describe('loadeddataHandler()', () => {
        test('should do nothing if the player is destroyed', () => {
            jest.spyOn(dash, 'isDestroyed').mockReturnValue(true);
            jest.spyOn(dash, 'showMedia');
            dash.loadeddataHandler();
            expect(dash.showMedia).not.toBeCalled();
        });

        test('should load the metadata for the media element, show the media/play button, load subs, check for autoplay, and set focus', () => {
            jest.spyOn(dash, 'isDestroyed').mockReturnValue(false);
            jest.spyOn(dash, 'showMedia').mockImplementation();
            jest.spyOn(dash, 'isAutoplayEnabled').mockReturnValue(true);
            jest.spyOn(dash, 'autoplay').mockImplementation();
            jest.spyOn(dash, 'loadFilmStrip').mockImplementation();
            jest.spyOn(dash, 'resize').mockImplementation();
            jest.spyOn(dash, 'handleVolume').mockImplementation();
            jest.spyOn(dash, 'startBandwidthTracking').mockImplementation();
            jest.spyOn(dash, 'handleQuality').mockImplementation();
            jest.spyOn(dash, 'showPlayButton').mockImplementation();
            jest.spyOn(dash, 'calculateVideoDimensions').mockImplementation();
            jest.spyOn(dash, 'loadSubtitles').mockImplementation();
            jest.spyOn(dash, 'loadAlternateAudio').mockImplementation();
            jest.spyOn(dash, 'loadUI').mockImplementation();

            dash.options.autoFocus = true;
            dash.loadeddataHandler();
            expect(dash.autoplay).toBeCalled();
            expect(dash.showMedia).toBeCalled();
            expect(dash.showPlayButton).toBeCalled();
            expect(dash.calculateVideoDimensions).toBeCalled();
            expect(dash.loadSubtitles).toBeCalled();
            expect(dash.loadAlternateAudio).toBeCalled();
            expect(dash.emit).toBeCalledWith(VIEWER_EVENT.load);
            expect(dash.loaded).toBe(true);
            expect(document.activeElement).toBe(dash.mediaContainerEl);
            expect(dash.mediaControls.show).toBeCalled();
            expect(dash.loadUI).toBeCalled();
        });
    });

    describe('loadUI()', () => {
        beforeEach(() => {
            stubs.loadUI = DashViewer.prototype.loadUI;
            dash.mediaControls = {
                enableHDSettings: jest.fn(),
                removeListener: jest.fn(),
                removeAllListeners: jest.fn(),
                destroy: jest.fn(),
            };

            Object.defineProperty(VideoBaseViewer.prototype, 'loadUI', { value: sandbox.mock() });
        });

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'loadUI', { value: stubs.loadUI });
        });

        test('should enable HD settings if an HD rep exists', () => {
            dash.hdVideoId = 3;
            dash.loadUI();
            expect(dash.mediaControls.enableHDSettings).toBeCalled();
        });

        test('should do nothing if there is no HD rep', () => {
            dash.hdVideoId = -1;
            dash.loadUI();
            expect(dash.mediaControls.enableHDSettings).not.toBeCalled();
        });
    });

    describe('loadFilmStrip()', () => {
        beforeEach(() => {
            dash.options = {
                file: {
                    representations: {
                        entries: [
                            { representation: 'dash' },
                            {
                                representation: 'filmstrip',
                                content: { url_template: '' },
                                metadata: { interval: 1 },
                            },
                        ],
                    },
                },
            };
            stubs.createUrl = jest.spyOn(dash, 'createContentUrlWithAuthParams');
            jest.spyOn(dash, 'getRepStatus');
        });

        test('should do nothing if the filmstrip does not exist', () => {
            dash.options.file.representations.entries = [];
            dash.loadFilmStrip();
            expect(stubs.createUrl).not.toBeCalled();
        });

        test('should do nothing if the filmstrip metadata field does not exist', () => {
            dash.options.file.representations.entries[1] = {
                representation: 'filmstrip',
                content: { url_template: '' },
                // Missing metadata field
            };
            dash.loadFilmStrip();
            expect(stubs.createUrl).not.toBeCalled();
        });

        test('should do nothing if the filmstrip interval does not exist', () => {
            dash.options.file.representations.entries[1].metadata = {};
            dash.loadFilmStrip();
            expect(stubs.createUrl).not.toBeCalled();
        });

        test('should do nothing if the filmstrip interval is 0', () => {
            dash.options.file.representations.entries[1].metadata.interval = 0;
            dash.loadFilmStrip();
            expect(stubs.createUrl).not.toBeCalled();
        });

        test('should do nothing if the filmstrip interval is negative', () => {
            dash.options.file.representations.entries[1].metadata.interval = -2;
            dash.loadFilmStrip();
            expect(stubs.createUrl).not.toBeCalled();
        });

        test('should load the film strip', () => {
            dash.loadFilmStrip();
            expect(stubs.createUrl).toBeCalled();
        });
    });

    describe('loadSubtitles()', () => {
        test('should translate and initialize subtitles in sorted order if there are available subtitles', () => {
            const english = { language: 'eng', id: 5 };
            const russian = { language: 'rus', id: 4 };
            const spanish = { language: 'spa', id: 6 };
            const korean = { language: 'kor', id: 3 };
            const chinese = { language: 'zho', id: 7 };
            const subs = [english, russian, spanish, korean, chinese];
            stubs.mockPlayer.expects('getTextTracks').returns(subs);
            stubs.mockControls
                .expects('initSubtitles')
                .withArgs(['Korean', 'Russian', 'English', 'Spanish', 'Chinese'], 'English');

            dash.loadSubtitles();

            expect(dash.textTracks).toEqual([korean, russian, english, spanish, chinese]);
        });

        test('should be robust to capital iso639 codes', () => {
            const russian = { language: 'RUS', id: 3 };
            const spanish = { language: 'spa', id: 4 };
            const korean = { language: 'KoR', id: 5 };
            const chinese = { language: 'zHO', id: 6 };
            const subs = [russian, spanish, korean, chinese];
            stubs.mockPlayer.expects('getTextTracks').returns(subs);
            stubs.mockControls
                .expects('initSubtitles')
                .withArgs(['Russian', 'Spanish', 'Korean', 'Chinese'], 'English');

            dash.loadSubtitles();

            expect(dash.textTracks).toEqual([russian, spanish, korean, chinese]);
        });

        test('should pass through unrecognized codes', () => {
            const russian = { language: 'rus', id: 3 };
            const foo = { language: 'foo', id: 4 };
            const und = { language: 'und', id: 5 };
            const empty = { language: '', id: 6 };
            const doesntmatter = { language: 'doesntmatter', id: 6 };
            const zero = { language: '0', id: 7 };
            const subs = [russian, foo, und, empty, doesntmatter, zero];
            stubs.mockPlayer.expects('getTextTracks').returns(subs);
            stubs.mockControls
                .expects('initSubtitles')
                .withArgs(['Russian', 'foo', 'und', '', 'doesntmatter', '0'], 'English');

            dash.loadSubtitles();

            expect(dash.textTracks).toEqual([russian, foo, und, empty, doesntmatter, zero]);
        });
    });

    describe('loadAutoGeneratedCaptions', () => {
        beforeEach(() => {
            dash.autoCaptionDisplayer = {
                append: () => {},
                setTextVisibility: () => {},
                isTextVisible: () => {},
                destroy: () => {},
            };
            dash.createTextCues = jest.fn();
            dash.setupAutoCaptionDisplayer = jest.fn();
            stubs.mockPlayer = sandbox.mock(dash.player);
            stubs.mockDisplayer = sandbox.mock(dash.autoCaptionDisplayer);
        });

        const transcript = {
            appears: [
                {
                    start: 0,
                    end: 1,
                },
            ],
            text: 'sometext',
        };

        const cues = [{ 1: 'foo' }, { 2: 'bar' }];

        test('should do nothing if the transcript has not changed', () => {
            dash.transcript = transcript;
            dash.loadAutoGeneratedCaptions(transcript);
            expect(dash.createTextCues).not.toBeCalled();
        });

        test('should do nothing if no text cues are found', () => {
            dash.createTextCues.mockReturnValue([]);
            dash.setupAutoCaptionDisplayer = jest.fn();

            dash.loadAutoGeneratedCaptions(transcript);
            expect(dash.setupAutoCaptionDisplayer).not.toBeCalled();
        });

        test('should destroy and reset an existing autoCaptionDisplayer', () => {
            stubs.mockDisplayer.expects('destroy');
            stubs.mockDisplayer.expects('setTextVisibility');
            dash.createTextCues.mockReturnValue(cues);
            dash.loadAutoGeneratedCaptions(transcript);

            expect(dash.setupAutoCaptionDisplayer).toBeCalledWith(cues);
        });

        test('should setup a new autoCaptionDisplayer if setting up for first time', () => {
            dash.autoCaptionDisplayer = null;
            dash.createTextCues.mockReturnValue(cues);
            stubs.mockControls.expects('initSubtitles').withArgs(['Auto-Generated'], 'English');
            stubs.mockControls.expects('setLabel').withArgs(sandbox.match.any, 'Auto-Generated Captions');

            dash.loadAutoGeneratedCaptions(transcript);
            expect(dash.setupAutoCaptionDisplayer).toBeCalledWith(cues);
        });
    });

    describe('createTextCues()', () => {
        test('should correctly map cues', () => {
            const transcript = { entries: [{ appears: [{ start: 1, end: 2 }], text: 'foo' }] };
            const result = dash.createTextCues(transcript)[0];
            expect(result.startTime).toBe(1);
            expect(result.endTime).toBe(2);

            expect(result.payload).toBe('foo');
        });
    });

    describe('setupAutoCaptionDisplayer()', () => {
        beforeEach(() => {
            stubs.appendStub = jest.fn();
            jest.spyOn(shaka.text, 'SimpleTextDisplayer').mockReturnValue({
                append: stubs.appendStub,
            });
        });

        test('should setup a simpleTextDisplayer and configure the player', () => {
            stubs.mockPlayer.expects('configure').withArgs({
                textDisplayFactory: sandbox.match.any,
            });

            dash.setupAutoCaptionDisplayer('foo');
            expect(stubs.appendStub).toBeCalled();
        });
    });

    describe('loadAlternateAudio()', () => {
        test('should select unique audio tracks', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0'] };
            const variant2 = { videoId: 1, audioId: 0, language: 'eng', roles: ['audio0'] };
            const variant3 = { videoId: 0, audioId: 1, language: 'rus', roles: ['audio1'] };
            const variant4 = { videoId: 1, audioId: 1, language: 'rus', roles: ['audio1'] };
            const variant5 = { videoId: 2, audioId: 1, language: 'rus', roles: ['audio1'] };
            const allVariants = [variant1, variant2, variant3, variant4, variant5];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls.expects('initAlternateAudio');

            dash.loadAlternateAudio();

            expect(dash.audioTracks).toEqual([
                { language: 'eng', role: 'audio0' },
                { language: 'rus', role: 'audio1' },
            ]);
        });

        test('should translate and initialize audio in sorted order', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0'] };
            const variant2 = { videoId: 0, audioId: 1, language: 'rus', roles: ['audio0'] };
            const variant3 = { videoId: 0, audioId: 2, language: 'spa', roles: ['audio0'] };
            const variant4 = { videoId: 0, audioId: 3, language: 'kor', roles: ['audio0'] };
            const variant5 = { videoId: 0, audioId: 4, language: 'fra', roles: ['audio0'] };
            const allVariants = [variant3, variant1, variant4, variant2, variant5];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls
                .expects('initAlternateAudio')
                .withArgs(['English', 'Russian', 'Spanish', 'Korean', 'French']);

            dash.loadAlternateAudio();
        });

        test('should not initialize alternate audio if there is none', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0'] };
            const variant2 = { videoId: 1, audioId: 0, language: 'eng', roles: ['audio0'] };
            const allVariants = [variant1, variant2];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls.expects('initAlternateAudio').never();

            dash.loadAlternateAudio();

            expect(dash.audioTracks).toEqual([{ language: 'eng', role: 'audio0' }]);
        });
    });

    describe('handleSubtitle()', () => {
        test('should select auto-generated track if auto-caption displayer exists', () => {
            stubs.mockDisplayer.expects('setTextVisibility').withArgs(true);
            jest.spyOn(dash.cache, 'get').mockReturnValue('0');

            dash.handleSubtitle();

            expect(stubs.emit).toBeCalledWith('subtitlechange', 'Auto-Generated');
        });

        test('should select track from front of text track list', () => {
            dash.autoCaptionDisplayer = undefined;

            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fra', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            jest.spyOn(dash.cache, 'get').mockReturnValue('0');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(english);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).toBeCalledWith('subtitlechange', 'eng');
        });

        test('should select track from end of text track list', () => {
            dash.autoCaptionDisplayer = undefined;

            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            jest.spyOn(dash.cache, 'get').mockReturnValue('3');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(spanish);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).toBeCalledWith('subtitlechange', 'spa');
        });

        test('should select track from middle of text track list', () => {
            dash.autoCaptionDisplayer = undefined;

            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            jest.spyOn(dash.cache, 'get').mockReturnValue('1');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(russian);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).toBeCalledWith('subtitlechange', 'rus');
        });

        test('should turn off subtitles when idx out of bounds', () => {
            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            jest.spyOn(dash.cache, 'get').mockReturnValue('-1');
            stubs.mockPlayer.expects('selectTextTrack').never();
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(false);
            stubs.mockDisplayer.expects('setTextVisibility').withArgs(false);

            dash.handleSubtitle();

            expect(stubs.emit).toBeCalledWith('subtitlechange', null);
        });
    });

    describe('handleAudioTrack()', () => {
        beforeEach(() => {
            jest.spyOn(dash, 'enableAudioId').mockImplementation();
        });

        test('should select correct audio', () => {
            dash.audioTracks = [
                { language: 'eng', role: 'audio0' },
                { language: 'eng', role: 'audio1' },
                { language: 'eng', role: 'audio2' },
            ];
            jest.spyOn(dash.cache, 'get').mockReturnValue('1');

            dash.handleAudioTrack();
            expect(dash.enableAudioId).toBeCalledWith('audio1');
        });

        test('should not select audio if index out of bounds', () => {
            dash.audioTracks = [
                { language: 'eng', role: 'audio0' },
                { language: 'eng', role: 'audio1' },
                { language: 'eng', role: 'audio2' },
            ];
            jest.spyOn(dash.cache, 'get').mockReturnValue('3');

            dash.handleAudioTrack();
            expect(dash.enableAudioId).not.toBeCalled();
        });
    });

    describe('calculateVideoDimensions()', () => {
        test('should calculate the video dimensions based on the reps', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(false);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: 200, videoId: 1 },
                { width: 100, videoId: 2 },
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).toBe(1);
            expect(dash.sdVideoId).toBe(2);
            expect(dash.videoWidth).toBe(200);
        });

        test('should use SD video dimensions if no HD', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(false);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: 640, videoId: 1, audioId: 2 },
                { width: 640, videoId: 1, audioId: 3 },
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).toBe(-1);
            expect(dash.sdVideoId).toBe(1);
            expect(dash.videoWidth).toBe(640);
        });

        test('should default video dimensions when video is audio-only', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(true);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: null, videoId: null, audioId: 1 },
                { width: null, videoId: null, audioId: 2 },
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).toBe(-1);
            expect(dash.sdVideoId).toBe(-1);
            expect(dash.videoWidth).toBe(854);
        });
    });

    describe('resize()', () => {
        const clientHeight = {
            get() {
                return parseInt(this.style.height, 10);
            },
        };
        const clientWidth = {
            get() {
                return parseInt(this.style.width, 10);
            },
        };

        beforeEach(() => {
            stubs.resizeFunc = DashViewer.prototype.resize;
            Object.defineProperty(VideoBaseViewer.prototype, 'resize', { value: jest.fn() });

            dash.aspect = 1;
            dash.videoWidth = 500;
            dash.videoHeight = 500;
            dash.wrapperEl.style.width = '600px';
            dash.wrapperEl.style.height = '650px';

            Object.defineProperty(dash.wrapperEl, 'clientHeight', clientHeight);
            Object.defineProperty(dash.wrapperEl, 'clientWidth', clientWidth);
        });

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'resize', { value: stubs.resizeFunc });
        });

        test('should fit video to at least 420px wide for calculation', () => {
            dash.aspect = 0.5;
            dash.videoWidth = 0;
            dash.resize();
            expect(dash.mediaEl.style.width).toBe('325px');
        });
        describe('Video fits in the viewport of preview', () => {
            test('should set mediaEl width to video width if aspect ratio is >= 1', () => {
                dash.resize();
                expect(dash.mediaEl.style.width).toBe('500px');
            });

            test('should set mediaEl width to adjusted video height if aspect ratio is < 1', () => {
                dash.aspect = 0.5;
                dash.resize();
                expect(dash.mediaEl.style.width).toBe('250px');
            });
        });

        describe('Video overflows the viewport of preview', () => {
            test('should set mediaEl width to viewport width if video is stretched horizontally', () => {
                dash.videoWidth = 800;
                dash.resize();
                expect(dash.mediaEl.style.width).toBe('600px');
            });

            test('should set mediaEl width to adjusted viewport height if video is stretched vertically', () => {
                dash.videoHeight = 800;
                dash.aspect = 0.5;
                dash.resize();
                expect(dash.mediaEl.style.width).toBe('325px');
            });
        });
    });

    describe('getBandwidthInterval()', () => {
        beforeEach(() => {
            stubs.destroyed = jest.spyOn(dash, 'isDestroyed').mockReturnValue(false);
            dash.mediaEl = { paused: false, ended: false };
        });

        afterEach(() => {
            dash.mediaEl = null;
        });

        test('should do nothing if the player does not exist', () => {
            stubs.destroyed.mockReturnValue(true);
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).toEqual([]);
        });

        test('should do nothing if the player cannot get stats', () => {
            dash.player.getStats = undefined;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).toEqual([]);
        });

        test('should do nothing if the playback is paused', () => {
            dash.mediaEl.paused = true;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).toEqual([]);
        });

        test('should do nothing if the playback ended', () => {
            dash.mediaEl.ended = true;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).toEqual([]);
        });

        test('should get bandwidth stats at current interval', () => {
            stubs.mockPlayer.expects('getStats').returns({
                estimatedBandwidth: 2000,
                streamBandwidth: 1000,
                switchHistory: 'history',
            });
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory[0]).toEqual({ bandwidth: 2000, stream: 1000 });
            expect(dash.switchHistory[0]).toEqual({ switchHistory: 'history', stream: 1000 });
        });

        test('should display stats visually if stats element exists', () => {
            stubs.mockPlayer.expects('getStats').returns({
                estimatedBandwidth: 2000,
                streamBandwidth: 1000,
                switchHistory: 'history',
            });
            dash.statsEl = { textContent: '' };
            dash.mediaContainerEl = null;

            dash.getBandwidthInterval();
            expect(dash.statsEl.textContent).toBe('2 kbps');
        });
    });

    describe('startBandwidthTracking()', () => {
        test('should start tracking bandwidth', () => {
            dash.startBandwidthTracking();
            expect(dash.statsIntervalId).not.toBeNull();
        });
    });

    describe('removeStats()', () => {
        beforeEach(() => {
            dash.mediaContainerEl = {
                removeChild: () => {},
            };
            stubs.mock = sandbox.mock(dash.mediaContainerEl);
        });

        test('should remove the stats element if it exists', () => {
            dash.statsEl = {};
            stubs.mock.expects('removeChild');
            dash.removeStats();
            expect(dash.statsEl).toBeUndefined();
        });

        test('should do nothing if the stats element does not exist already', () => {
            stubs.mock.expects('removeChild').never();
            dash.removeStats();
            expect(dash.statsEl).toBeUndefined();
        });
    });

    describe('toggleStats()', () => {
        beforeEach(() => {
            stubs.mock = sandbox.mock(dash.mediaContainerEl);
            stubs.removeStats = jest.spyOn(dash, 'removeStats').mockImplementation();
        });

        test('should hide the stats if they were being shown', () => {
            dash.statsEl = { className: '' };
            dash.toggleStats();
            expect(dash.removeStats).toBeCalled();
            expect(dash.statsEl.className).toBe('');
            dash.statsEl = null;
        });

        test('should show the stats if they were being hidden', () => {
            dash.toggleStats();
            expect(dash.removeStats).not.toBeCalled();
            expect(dash.statsEl).toHaveClass('bp-media-dash-stats');
        });
    });

    describe('onKeydown()', () => {
        beforeEach(() => {
            sinon.stub(VideoBaseViewer.prototype, 'onKeydown');
        });

        afterEach(() => {
            VideoBaseViewer.prototype.onKeydown.restore();
        });

        test('should toggle the stats on Shift+I', () => {
            jest.spyOn(dash, 'toggleStats');
            const result = dash.onKeydown('Shift+I');
            expect(dash.toggleStats).toBeCalled();
            expect(result).toBe(true);
        });

        test('should call super keydown handler for all other keys', () => {
            jest.spyOn(dash, 'toggleStats');
            const result = dash.onKeydown('blah');
            expect(dash.toggleStats).not.toBeCalled();
            expect(result).not.toBe(true);
        });
    });

    describe('showGearHdIcon()', () => {
        const hdTrack = {
            videoId: 1,
        };

        const sdTrack = {
            videoId: 2,
        };

        beforeEach(() => {
            dash.hdVideoId = 1;
        });

        test('should add the hd class', () => {
            expect(dash.wrapperEl).not.toHaveClass(CSS_CLASS_HD);
            dash.showGearHdIcon(hdTrack);
            expect(dash.wrapperEl).toHaveClass(CSS_CLASS_HD);
        });

        test('should remove the hd class', () => {
            expect(dash.wrapperEl).not.toHaveClass(CSS_CLASS_HD);
            dash.showGearHdIcon(hdTrack);
            expect(dash.wrapperEl).toHaveClass(CSS_CLASS_HD);
            dash.showGearHdIcon(sdTrack);
            expect(dash.wrapperEl).not.toHaveClass(CSS_CLASS_HD);
        });
    });

    describe('handleBuffering()', () => {
        beforeEach(() => {
            jest.spyOn(Timer, 'createTag').mockReturnValue('foo');
            jest.spyOn(Timer, 'get').mockReturnValue({ elapsed: 5 });
            jest.spyOn(Timer, 'reset');
            jest.spyOn(Timer, 'start');
            jest.spyOn(Timer, 'stop');
        });

        test('should start a timer if buffering is true', () => {
            dash.handleBuffering({ buffering: true });
            expect(Timer.start).toBeCalled();
            expect(Timer.stop).not.toBeCalled();
            expect(Timer.reset).not.toBeCalled();
            expect(dash.metrics.totalBufferLag).toBe(0);
        });

        test('should stop the timer if buffering is false', () => {
            dash.handleBuffering({ buffering: false });
            expect(Timer.start).not.toBeCalled();
            expect(Timer.stop).toBeCalled();
            expect(Timer.reset).toBeCalled();
            expect(dash.metrics.totalBufferLag).toBe(5);
        });
    });

    describe('processBufferFillMetric()', () => {
        beforeEach(() => {
            jest.spyOn(Timer, 'createTag').mockReturnValue('foo');
            jest.spyOn(Timer, 'get').mockReturnValue({ elapsed: 5 });
            jest.spyOn(dash, 'emitMetric');
        });

        test('should process the buffer fill metric', () => {
            dash.processBufferFillMetric();

            expect(Timer.createTag).toBeCalledWith(0, 'bufferFill');
            expect(Timer.get).toBeCalledWith('foo');
            expect(dash.emitMetric).toBeCalledWith('media_metric_buffer_fill', 5);
            expect(dash.metrics.bufferFill).toBe(5);
        });
    });

    describe('processMetrics()', () => {
        beforeEach(() => {
            jest.spyOn(dash, 'determineWatchLength').mockReturnValue(10);
            jest.spyOn(dash, 'emitMetric');
            dash.mediaEl.duration = 5;
        });

        test('should not emit an event if loaded is false', () => {
            dash.loaded = false;
            const expMetrics = {
                bufferFill: 0,
                duration: 0,
                lagRatio: 0,
                seeked: false,
                totalBufferLag: 0,
                watchLength: 0,
            };

            dash.processMetrics();

            expect(dash.emitMetric).not.toBeCalled();
            expect(dash.metrics).toEqual(expMetrics);
        });

        test('should process the current playback metrics if loaded', () => {
            dash.loaded = true;
            dash.metrics.totalBufferLag = 1000;

            const expMetrics = {
                bufferFill: 0,
                duration: 5000,
                lagRatio: 100,
                seeked: false,
                totalBufferLag: 1000,
                watchLength: 10,
            };

            dash.processMetrics();

            expect(dash.emitMetric).toBeCalledWith('media_metric_end_playback', 100);
            expect(dash.metrics).toEqual(expMetrics);
        });
    });

    describe('determineWatchLength()', () => {
        test('should return -1 if mediaEl does not exist', () => {
            dash.mediaEl = null;

            expect(dash.determineWatchLength()).toBe(-1);
        });

        test('should return -1 if mediaEl.played is falsy', () => {
            dash.mediaEl.played = false;

            expect(dash.determineWatchLength()).toBe(-1);
        });

        test('should return 0 if there are no played parts', () => {
            dash.mediaEl.played = [];

            expect(dash.determineWatchLength()).toBe(0);
        });

        test('should return the sum of all the played parts', () => {
            dash.mediaEl.played = {
                length: 2,
                start: jest
                    .fn()
                    .mockImplementation()
                    .mockReturnValueOnce(0)
                    .mockReturnValueOnce(10),
                end: jest
                    .fn()
                    .mockImplementation()
                    .mockReturnValueOnce(5)
                    .mockReturnValueOnce(15),
            };

            expect(dash.determineWatchLength()).toBe(10000);
        });
    });
});
