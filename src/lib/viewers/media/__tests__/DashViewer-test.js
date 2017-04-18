/* eslint-disable no-unused-expressions */
import DashViewer from '../DashViewer';
import VideoBaseViewer from '../VideoBaseViewer';
import BaseViewer from '../../BaseViewer';
import cache from '../../../Cache';
import fullscreen from '../../../Fullscreen';
import * as util from '../../../util';
import { MEDIA_STATIC_ASSETS_VERSION } from '../../../constants';

let dash;
let stubs = {};

const CSS_CLASS_MEDIA = 'bp-media';
const CSS_CLASS_HD = 'bp-media-controls-is-hd';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/DashViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/DashViewer-test.html');
        const containerEl = document.querySelector('.container');

        dash = new DashViewer({
            file: {
                id: 0,
                permissions: {
                    can_download: true
                }
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'url'
                },
                status: {}
            }
        });

        // Stubbing out sub-components of the dash player
        stubs.emit = sandbox.stub(dash, 'emit');
        dash.filmstripStatus = {
            destroy: () => {}
        };

        stubs.networkEngine = {
            registerRequestFilter: () => {}
        };
        dash.player = {
            addEventListener: () => {},
            configure: () => {},
            destroy: () => {},
            getNetworkingEngine: sandbox.stub().returns(stubs.networkEngine),
            getStats: () => {},
            getTracks: () => {},
            load: () => {},
            selectTrack: () => {}
        };
        stubs.mockPlayer = sandbox.mock(dash.player);

        dash.mediaControls = {
            addListener: () => {},
            destroy: () => {},
            initFilmstrip: () => {},
            removeAllListeners: () => {},
            removeListener: () => {}
        };
        stubs.mockControls = sandbox.mock(dash.mediaControls);

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
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
        it('should set up dash element', () => {
            expect(dash.bandwidthHistory).to.deep.equal([]);
            expect(dash.switchHistory).to.deep.equal([]);
            expect(dash.hdRepresentation).to.deep.equal({});
            expect(dash.sdRepresentation).to.deep.equal({});
            expect(dash.wrapperEl).to.have.class(CSS_CLASS_MEDIA);
        });
    });

    describe('destroy()', () => {
        it('should remove event listeners on the dash', () => {
            stubs.removeStats = sandbox.stub(dash, 'removeStats');
            stubs.resize = sandbox.stub(dash, 'resize');

            dash.destroy();
            expect(stubs.emit).to.be.calledWith('bandwidthhistory', []);
            expect(stubs.emit).to.be.calledWith('switchhistory', []);
            expect(stubs.emit).to.be.calledWith('destroy');
            expect(stubs.removeStats).to.be.called;

            // Ensures that afterEach() cleanup doesn't trigger destroy() again
            dash = null;
        });
    });

    describe('load()', () => {
        it('should load a media source', () => {
            stubs.promise = Promise.resolve();
            sandbox.stub(dash, 'setup');
            sandbox.stub(dash, 'loadDashPlayer');
            sandbox.stub(dash, 'resetLoadTimeout');
            sandbox.stub(dash, 'loadAssets');
            sandbox.stub(dash, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(Promise, 'all').returns(stubs.promise);

            return dash.load().then(() => {
                expect(dash.setup).to.be.called;
                expect(dash.loadDashPlayer).to.be.called;
                expect(dash.resetLoadTimeout).to.be.called;
            }).catch(() => {});
        });
    });

    describe('prefetch()', () => {
        beforeEach(() => {
            stubs.prefetchAssets = sandbox.stub(dash, 'prefetchAssets');
            stubs.createUrl = sandbox.stub(dash, 'createContentUrlWithAuthParams');
            stubs.repReady = sandbox.stub(dash, 'isRepresentationReady').returns(true);
        });

        it('should prefetch static assets assets if assets are true', () => {
            dash.prefetch({ assets: true, content: false });
            expect(stubs.prefetchAssets).to.be.called;
        });

        it('should not prefetch rep content if content is false', () => {
            sandbox.mock(util).expects('get').never();
            dash.prefetch({ assets: false, content: false });
            expect(stubs.prefetchAssets).to.not.be.called;
        });

        it('should not prefetch rep content if representation is not ready', () => {
            stubs.repReady.returns(false);
            sandbox.mock(util).expects('get').never();

            dash.prefetch({ assets: false, content: true });
            expect(stubs.prefetchAssets).to.not.be.called;
        });

        it('should prefetch rep content if representation is ready', () => {
            const contentUrl = 'someUrl';
            stubs.createUrl.returns(contentUrl);
            sandbox.mock(util).expects('get').withArgs(contentUrl, 'any');

            dash.prefetch({ assets: false, content: true });
            expect(stubs.prefetchAssets).to.not.be.called;
        });
    });

    describe('getJSAssets()', () => {
        it('should return shaka player assets', () => {
            const assets = [`third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/shaka-player.compiled.js`];
            const returnedAssets = dash.getJSAssets();
            expect(returnedAssets).to.deep.equal(assets);
        });
    });

    describe('loadDashPlayer()', () => {
        it('should create a new shaka player', () => {
            /* global shaka */
            dash.mediaUrl = 'url';
            sandbox.stub(shaka, 'Player').returns(dash.player);
            stubs.mockPlayer.expects('addEventListener').withArgs('adaptation', sinon.match.func);
            stubs.mockPlayer.expects('configure');
            stubs.mockPlayer.expects('load').withArgs('url');

            dash.loadDashPlayer();

            expect(stubs.mockPlayer).to.not.be.null;
        });
    });

    describe('requestFilter()', () => {
        it('should append representation URLs with tokens', () => {
            stubs.createUrl = sandbox.stub(dash, 'createContentUrlWithAuthParams').returns('auth_url');
            stubs.req = { uris: ['uri'] };
            dash.requestFilter('', stubs.req);
            expect(stubs.createUrl).to.be.calledOnce;
            expect(stubs.req.uris).to.deep.equal(['auth_url']);
        });
    });

    describe('getActiveTrack()', () => {
        it('should get active track', () => {
            stubs.inactive = { active: false };
            stubs.active = { active: true };
            stubs.mockPlayer.expects('getTracks').returns([stubs.inactive, stubs.active]);
            expect(dash.getActiveTrack()).to.equal(stubs.active);
        });
    });

    describe('showLoadingIcon()', () => {
        const loadingFunc = DashViewer.prototype.showLoadingIcon;

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'showLoadingIcon', { value: loadingFunc });
        });

        it('should show the loading indicator if active track does not equal the rep id', () => {
            sandbox.stub(dash, 'getActiveTrack').returns({ id: 1 });
            Object.defineProperty(VideoBaseViewer.prototype, 'showLoadingIcon', { value: sandbox.mock() });
            dash.showLoadingIcon(2);
        });
    });

    describe('enableHD()', () => {
        it('should enable HD video for the file', () => {
            dash.hdRepresentation = { id: '1' };
            sandbox.stub(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectTrack').withArgs(dash.hdRepresentation, true);
            dash.enableHD();
            expect(dash.showLoadingIcon).to.be.calledWith('1');
        });
    });

    describe('enableSD()', () => {
        it('should enable SD video for the file', () => {
            dash.sdRepresentation = { id: '1' };
            sandbox.stub(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectTrack').withArgs(dash.sdRepresentation, true);
            dash.enableSD();
            expect(dash.showLoadingIcon).to.be.calledWith('1');
        });
    });

    describe('enableAdaptation()', () => {
        it('should configure player to enable adaptation by default', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: true } });
            dash.enableAdaptation();
        });

        it('should configure player to disable adaptation', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: false } });
            dash.enableAdaptation(false);
        });
    });

    describe('handleQuality()', () => {
        beforeEach(() => {
            stubs.hd = sandbox.stub(dash, 'enableHD');
            stubs.sd = sandbox.stub(dash, 'enableSD');
            stubs.auto = sandbox.stub(dash, 'enableAdaptation');
        });

        it('should enable HD video', () => {
            sandbox.stub(cache, 'get').returns('hd');
            dash.handleQuality();
            expect(stubs.hd).to.be.called;
            expect(dash.emit).to.be.calledWith('qualitychange', 'hd');
        });

        it('should enable SD video', () => {
            sandbox.stub(cache, 'get').returns('sd');
            dash.handleQuality();
            expect(stubs.sd).to.be.called;
            expect(dash.emit).to.be.calledWith('qualitychange', 'sd');
        });

        it('should enable auto video', () => {
            sandbox.stub(cache, 'get').returns('auto');
            dash.handleQuality();
            expect(stubs.auto).to.be.called;
            expect(dash.emit).to.be.calledWith('qualitychange', 'auto');
        });

        it('should not emit "qualitychange" event if no quality was cached', () => {
            sandbox.stub(cache, 'get');
            dash.handleQuality();
            expect(stubs.auto).to.be.called;
            expect(dash.emit).to.not.be.called;
        });
    });

    describe('adaptationHandler()', () => {
        beforeEach(() => {
            stubs.active = { id: 1, bandwidth: 'bandwidth' };
            stubs.getActive = sandbox.stub(dash, 'getActiveTrack').returns(stubs.active);
            stubs.loaded = sandbox.stub(dash, 'isLoaded').returns(true);
            stubs.hide = sandbox.stub(dash, 'hideLoadingIcon');
            dash.hdRepresentation = { id: 1 };
            dash.adapting = false;
        });

        it('should handle change to HD resolution', () => {
            dash.adaptationHandler();
            expect(dash.wrapperEl).to.have.class(CSS_CLASS_HD);
            expect(stubs.hide).to.be.called;
        });

        it('should handle change from HD resolution', () => {
            stubs.getActive.returns({ id: 2 });
            dash.wrapperEl.classList.add(CSS_CLASS_HD);
            dash.adaptationHandler();
            expect(dash.wrapperEl).to.not.have.class(CSS_CLASS_HD);
            expect(stubs.hide).to.be.called;
        });

        it('should not hide loading indicator if video is still loading', () => {
            stubs.loaded.returns(false);
            dash.adaptationHandler();
            expect(stubs.hide).to.not.be.called;
        });

        it('should emit bandwidth if video resolution is adapting', () => {
            dash.adapting = true;
            dash.adaptationHandler();
            expect(dash.emit).to.be.calledWith('adaptation', stubs.active.bandwidth);
            expect(stubs.hide).to.be.called;
        });

        it('should not emit bandwidth if video resolution is not adapting', () => {
            dash.adapting = false;
            dash.adaptationHandler();
            expect(dash.emit).to.not.be.called;
            expect(stubs.hide).to.be.called;
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        const listenerFunc = DashViewer.prototype.addEventListenersForMediaControls;

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', { value: listenerFunc });
        });

        it('should add event listeners to the media controls', () => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', { value: sandbox.mock() });
            stubs.mockControls.expects('addListener').withArgs('qualitychange', sinon.match.func);
            dash.addEventListenersForMediaControls();
        });
    });

    describe('loadeddataHandler()', () => {
        it('should do nothing if the player is destroyed', () => {
            sandbox.stub(dash, 'isDestroyed').returns(true);
            sandbox.stub(dash, 'showMedia');
            dash.loadeddataHandler();
            expect(dash.showMedia).to.not.be.called;
        });

        it('should load the meta data for the media element and show the media/play button', () => {
            sandbox.stub(dash, 'isDestroyed').returns(false);
            sandbox.stub(dash, 'showMedia');
            sandbox.stub(dash, 'calculateVideoDimensions');
            sandbox.stub(dash, 'loadUI');
            sandbox.stub(dash, 'loadFilmStrip');
            sandbox.stub(dash, 'resize');
            sandbox.stub(dash, 'handleVolume');
            sandbox.stub(dash, 'startBandwidthTracking');
            sandbox.stub(dash, 'handleQuality');
            sandbox.stub(dash, 'showPlayButton');

            dash.loadeddataHandler();
            expect(dash.showMedia).to.be.called;
            expect(dash.showPlayButton).to.be.called;
            expect(dash.emit).to.be.calledWith('load');
            expect(dash.loaded).to.be.true;
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
                                metadata: { interval: 1 }
                            }
                        ]
                    }
                }
            };
            stubs.createUrl = sandbox.stub(dash, 'createContentUrlWithAuthParams');
            sandbox.stub(dash, 'getRepStatus');
        });

        it('should do nothing if the filmstrip does not exist', () => {
            dash.options.file.representations.entries = [];
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.not.be.called;
        });

        it('should do nothing if the filmstrip metadata field does not exist', () => {
            dash.options.file.representations.entries[1] = {
                representation: 'filmstrip',
                content: { url_template: '' }
                // Missing metadata field
            };
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.not.be.called;
        });

        it('should do nothing if the filmstrip interval does not exist', () => {
            dash.options.file.representations.entries[1].metadata = {};
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.not.be.called;
        });

        it('should do nothing if the filmstrip interval is 0', () => {
            dash.options.file.representations.entries[1].metadata.interval = 0;
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.not.be.called;
        });

        it('should do nothing if the filmstrip interval is negative', () => {
            dash.options.file.representations.entries[1].metadata.interval = -2;
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.not.be.called;
        });

        it('should load the film strip', () => {
            dash.loadFilmStrip();
            expect(stubs.createUrl).to.be.called;
        });
    });

    describe('calculateVideoDimensions()', () => {
        it('should calculate the video dimensions based on the reps', () => {
            stubs.mockPlayer.expects('getTracks').returns([{ width: 200 }, { width: 100 }]);
            dash.calculateVideoDimensions();
            expect(dash.hdRepresentation.width).to.equal(200);
            expect(dash.sdRepresentation.width).to.equal(100);
        });
    });

    describe('resize()', () => {
        beforeEach(() => {
            stubs.resizeFunc = DashViewer.prototype.resize;
            Object.defineProperty(VideoBaseViewer.prototype, 'resize', { value: sandbox.mock() });
            dash.aspect = 1;
            dash.videoWidth = 500;
            dash.videoHeight = 500;
            dash.wrapperEl.style.width = '600px';
            dash.wrapperEl.style.height = '650px';
        });

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'resize', { value: stubs.resizeFunc });
        });

        it('should fit video to at least 420px wide for calculation', () => {
            dash.aspect = 0.5;
            dash.videoWidth = 0;
            dash.resize();
            expect(dash.mediaEl.style.width).to.equal('325px');
        });

        describe('Full screen mode', () => {
            it('should set mediaEl width to viewport width if aspect ratio is >= 1', () => {
                sandbox.stub(fullscreen, 'isFullscreen').returns(true);
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('600px');
            });

            it('should set mediaEl width to adjusted viewport height if aspect ratio is < 1', () => {
                sandbox.stub(fullscreen, 'isFullscreen').returns(true);
                dash.aspect = 0.5;
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('325px');
            });
        });

        describe('Video fits in the viewport of preview', () => {
            it('should set mediaEl width to video width if aspect ratio is >= 1', () => {
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('500px');
            });

            it('should set mediaEl width to adjusted video height if aspect ratio is < 1', () => {
                dash.aspect = 0.5;
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('250px');
            });
        });

        describe('Video overflows the viewport of preview', () => {
            it('should set mediaEl width to viewport width if video is stretched horizontally', () => {
                dash.videoWidth = 800;
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('600px');
            });

            it('should set mediaEl width to adjusted viewport height if video is stretched vertically', () => {
                dash.videoHeight = 800;
                dash.aspect = 0.5;
                dash.resize();
                expect(dash.mediaEl.style.width).to.equal('325px');
            });
        });
    });

    describe('getBandwidthInterval()', () => {
        beforeEach(() => {
            stubs.destroyed = sandbox.stub(dash, 'isDestroyed').returns(false);
            dash.mediaEl = { paused: false, ended: false };
        });

        afterEach(() => {
            dash.mediaEl = null;
        });

        it('should do nothing if the player does not exist', () => {
            stubs.destroyed.returns(true);
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).to.be.empty;
        });

        it('should do nothing if the player cannot get stats', () => {
            dash.player.getStats = undefined;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).to.be.empty;
        });

        it('should do nothing if the playback is paused', () => {
            dash.mediaEl.paused = true;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).to.be.empty;
        });

        it('should do nothing if the playback ended', () => {
            dash.mediaEl.ended = true;
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).to.be.empty;
        });

        it('should get bandwidth stats at current interval', () => {
            stubs.mockPlayer.expects('getStats').returns({
                estimatedBandwidth: 2000,
                streamBandwidth: 1000,
                switchHistory: 'history'
            });
            dash.getBandwidthInterval();
            expect(dash.bandwidthHistory).to.contain({ bandwidth: 2000, stream: 1000 });
            expect(dash.switchHistory).to.contain({ switchHistory: 'history', stream: 1000 });
        });

        it('should display stats visually if stats element exists', () => {
            stubs.mockPlayer.expects('getStats').returns({
                estimatedBandwidth: 2000,
                streamBandwidth: 1000,
                switchHistory: 'history'
            });
            dash.statsEl = { textContent: '' };
            dash.mediaContainerEl = null;

            dash.getBandwidthInterval();
            expect(dash.statsEl.textContent).to.equal('2 kbps');
        });
    });

    describe('startBandwidthTracking()', () => {
        it('should start tracking bandwidth', () => {
            dash.startBandwidthTracking();
            expect(dash.statsIntervalId).to.not.be.null;
        });
    });

    describe('removeStats()', () => {
        beforeEach(() => {
            dash.mediaContainerEl = {
                removeChild: () => {}
            };
            stubs.mock = sandbox.mock(dash.mediaContainerEl);
        });

        it('should remove the stats element if it exists', () => {
            dash.statsEl = {};
            stubs.mock.expects('removeChild');
            dash.removeStats();
            expect(dash.statsEl).to.be.undefined;
        });

        it('should do nothing if the stats element does not exist already', () => {
            stubs.mock.expects('removeChild').never();
            dash.removeStats();
            expect(dash.statsEl).to.be.undefined;
        });
    });

    describe('toggleStats()', () => {
        beforeEach(() => {
            stubs.mock = sandbox.mock(dash.mediaContainerEl);
        });

        it('should hide the stats if they were being shown', () => {
            sandbox.stub(dash, 'removeStats');
            dash.statsEl = { className: '' };
            dash.toggleStats();
            expect(dash.removeStats).to.be.called;
            expect(dash.statsEl.className).to.be.empty;
            dash.statsEl = null;
        });

        it('should show the stats if they were being hidden', () => {
            sandbox.stub(dash, 'removeStats');
            dash.toggleStats();
            expect(dash.removeStats).to.not.be.called;
            expect(dash.statsEl).to.have.class('bp-media-dash-stats');
        });
    });

    describe('onKeydown()', () => {
        const keydownFunc = DashViewer.prototype.onKeydown;

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'onKeydown', { value: keydownFunc });
        });

        it('should toggle the stats on Shift+I', () => {
            sandbox.stub(dash, 'toggleStats');
            const result = dash.onKeydown('Shift+I');
            expect(dash.toggleStats).to.be.called;
            expect(result).to.be.true;
        });

        it('should call super keydown handler for all other keys', () => {
            sandbox.stub(dash, 'toggleStats');
            Object.defineProperty(VideoBaseViewer.prototype, 'onKeydown', { value: sandbox.mock() });
            const result = dash.onKeydown('blah');
            expect(dash.toggleStats).to.not.be.called;
            expect(result).to.not.be.true;
        });
    });
});
