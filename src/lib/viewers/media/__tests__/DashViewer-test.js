/* eslint-disable no-unused-expressions */
import DashViewer from '../DashViewer';
import VideoBaseViewer from '../VideoBaseViewer';
import BaseViewer from '../../BaseViewer';
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
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {}
            },
            file: {
                id: 0,
                permissions: {
                    can_download: true
                }
            },
            container: containerEl,
            location: { locale: 'en-US' },
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
            getTextTracks: () => {},
            getVariantTracks: () => {},
            isAudioOnly: () => {},
            load: () => {},
            selectTextTrack: () => {},
            selectVariantTrack: () => {},
            selectAudioLanguage: () => {},
            setTextTrackVisibility: () => {}
        };
        stubs.mockPlayer = sandbox.mock(dash.player);

        dash.mediaControls = {
            addListener: () => {},
            destroy: () => {},
            initFilmstrip: () => {},
            initSubtitles: () => {},
            initAlternateAudio: () => {},
            removeAllListeners: () => {},
            removeListener: () => {},
            show: sandbox.stub()
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
            expect(dash.hdVideoId).to.equal(-1);
            expect(dash.sdVideoId).to.equal(-1);
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
            sandbox.stub(dash, 'isAutoplayEnabled').returns(true);
            sandbox.stub(dash, 'autoplay');

            sandbox.stub(dash, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(Promise, 'all').returns(stubs.promise);

            return dash
                .load()
                .then(() => {
                    expect(dash.setup).to.be.called;
                    expect(dash.loadDashPlayer).to.be.called;
                    expect(dash.resetLoadTimeout).to.be.called;
                    expect(dash.autoplay).to.be.called;
                })
                .catch(() => {});
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
            stubs.mockPlayer.expects('addEventListener').withArgs('error', sinon.match.func);
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
            dash.options = {
                file: {
                    watermark_info: {
                        is_watermarked: false
                    },
                    representations: {
                        entries: [
                            { representation: 'dash' },
                        ]
                    }
                }
            }

            dash.requestFilter('', stubs.req);

            expect(stubs.createUrl).to.be.calledOnce;
            expect(stubs.req.uris).to.deep.equal(['auth_url']);
        });

        it('should append watermark cache-busting query params if file is watermarked', () => {
            stubs.createUrl = sandbox.stub(dash, 'createContentUrlWithAuthParams').returns('www.authed.com/?foo=bar');
            stubs.req = { uris: ['uri'] };
            dash.watermarkCacheBust = '123'
            dash.options = {
                file: {
                    watermark_info: {
                        is_watermarked: true
                    },
                    representations: {
                        entries: [
                            { representation: 'dash' },
                        ]
                    }
                }
            }

            dash.requestFilter('', stubs.req);

            expect(stubs.createUrl).to.be.calledOnce;
            expect(stubs.req.uris).to.deep.equal(['www.authed.com/?foo=bar&watermark-cache=123']);
        });
    });

    describe('getActiveTrack()', () => {
        it('should get active track', () => {
            stubs.inactive = { active: false };
            stubs.active = { active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([stubs.inactive, stubs.active]);
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

    describe('enableVideoId()', () => {
        it('should enable videoId while maintaining the same audio', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: false };
            const variant3 = { id: 3, videoId: 1, audioId: 6, active: false };
            const variant4 = { id: 4, videoId: 2, audioId: 6, active: true };
            const variant5 = { id: 5, videoId: 1, audioId: 7, active: false };
            const variant6 = { id: 6, videoId: 2, audioId: 7, active: false };
            stubs.mockPlayer.expects('getVariantTracks').returns([
                variant1, variant2, variant3, variant4, variant5, variant6
            ]);
            sandbox.stub(dash, 'getActiveTrack').returns(variant4);
            sandbox.stub(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').withArgs(variant3, true);

            dash.enableVideoId(1);

            expect(dash.showLoadingIcon).to.be.calledWith(3);
        });

        it('should do nothing if enabling a videoId which is already active', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([
                variant1, variant2
            ]);
            sandbox.stub(dash, 'getActiveTrack').returns(variant2);
            sandbox.stub(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableVideoId(2);

            expect(dash.showLoadingIcon).to.not.be.called;
        });

        it('should do nothing if enabling an invalid videoId', () => {
            const variant1 = { id: 1, videoId: 1, audioId: 5, active: false };
            const variant2 = { id: 2, videoId: 2, audioId: 5, active: true };
            stubs.mockPlayer.expects('getVariantTracks').returns([
                variant1, variant2
            ]);
            sandbox.stub(dash, 'getActiveTrack').returns(variant2);
            sandbox.stub(dash, 'showLoadingIcon');
            stubs.mockPlayer.expects('selectVariantTrack').never();

            dash.enableVideoId(-1);

            expect(dash.showLoadingIcon).to.not.be.called;
        });
    });

    describe('enableAdaptation()', () => {
        it('should configure player to enable adaptation by default', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: true } });
            dash.enableAdaptation(true);
        });

        it('should configure player to disable adaptation', () => {
            stubs.mockPlayer.expects('configure').withArgs({ abr: { enabled: false } });
            dash.enableAdaptation(false);
        });
    });

    describe('handleQuality()', () => {
        beforeEach(() => {
            dash.hdVideoId = 1;
            dash.sdVideoId = 2;
            stubs.enableVideoId = sandbox.stub(dash, 'enableVideoId');
            stubs.adapt = sandbox.stub(dash, 'enableAdaptation');
        });

        it('should enable HD video', () => {
            sandbox.stub(dash.cache, 'get').returns('hd');
            dash.handleQuality();
            expect(stubs.adapt).to.be.calledWith(false);
            expect(stubs.enableVideoId).to.be.calledWith(dash.hdVideoId);
            expect(dash.emit).to.be.calledWith('qualitychange', 'hd');
        });

        it('should enable SD video', () => {
            sandbox.stub(dash.cache, 'get').returns('sd');
            dash.handleQuality();
            expect(stubs.adapt).to.be.calledWith(false);
            expect(stubs.enableVideoId).to.be.calledWith(dash.sdVideoId);
            expect(dash.emit).to.be.calledWith('qualitychange', 'sd');
        });

        it('should enable auto video', () => {
            sandbox.stub(dash.cache, 'get').returns('auto');
            dash.handleQuality();
            expect(stubs.adapt).to.be.calledWith(true);
            expect(dash.emit).to.be.calledWith('qualitychange', 'auto');
        });

        it('should not emit "qualitychange" event if no quality was cached', () => {
            sandbox.stub(dash.cache, 'get');
            dash.handleQuality();
            expect(stubs.adapt).to.be.calledWith(true); // default to adapt=true
            expect(dash.emit).to.not.be.called;
        });
    });

    describe('adaptationHandler()', () => {
        beforeEach(() => {
            stubs.active = { id: 1, bandwidth: 'bandwidth', videoId: 1 };
            stubs.getActive = sandbox.stub(dash, 'getActiveTrack').returns(stubs.active);
            stubs.loaded = sandbox.stub(dash, 'isLoaded').returns(true);
            stubs.hide = sandbox.stub(dash, 'hideLoadingIcon');
            dash.hdVideoId = 1;
            dash.adapting = false;
        });

        it('should handle change to HD resolution', () => {
            dash.adaptationHandler();
            expect(dash.wrapperEl).to.have.class(CSS_CLASS_HD);
            expect(stubs.hide).to.be.called;
        });

        it('should handle change from HD resolution', () => {
            stubs.getActive.returns({ id: 2, videoId: 2 });
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

    describe('shakaErrorHandler()', () => {
        it('should emit error on critical shaka errors', () => {
            const shakaError = {
                detail: {
                    severity: 2, // critical severity
                    category: 1,
                    code: 1100,
                    data: ['foobar']
                }
            };

            dash.shakaErrorHandler(shakaError);

            expect(dash.emit).to.be.calledWith('error');
        });

        it('should not emit error on recoverable shaka errors', () => {
            const shakaError = {
                detail: {
                    severity: 1, // recoverable severity
                    category: 1,
                    code: 1100,
                    data: ['foobar']
                }
            };

            dash.shakaErrorHandler(shakaError);

            expect(dash.emit).to.not.be.called;
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        const listenerFunc = DashViewer.prototype.addEventListenersForMediaControls;

        afterEach(() => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', {
                value: listenerFunc
            });
        });

        it('should add event listeners to the media controls', () => {
            Object.defineProperty(VideoBaseViewer.prototype, 'addEventListenersForMediaControls', {
                value: sandbox.mock()
            });
            stubs.mockControls.expects('addListener').withArgs('qualitychange', sinon.match.func);
            stubs.mockControls.expects('addListener').withArgs('subtitlechange', sinon.match.func);
            stubs.mockControls.expects('addListener').withArgs('audiochange', sinon.match.func);
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

        it('should load the meta data for the media element, show the media/play button, load subs, check for autoplay, and set focus', () => {
            sandbox.stub(dash, 'isDestroyed').returns(false);
            sandbox.stub(dash, 'showMedia');
            sandbox.stub(dash, 'isAutoplayEnabled').returns(true);
            sandbox.stub(dash, 'autoplay');
            sandbox.stub(dash, 'calculateVideoDimensions');
            sandbox.stub(dash, 'loadUI');
            sandbox.stub(dash, 'loadFilmStrip');
            sandbox.stub(dash, 'loadAlternateAudio');
            sandbox.stub(dash, 'resize');
            sandbox.stub(dash, 'handleVolume');
            sandbox.stub(dash, 'startBandwidthTracking');
            sandbox.stub(dash, 'handleQuality');
            sandbox.stub(dash, 'loadSubtitles');
            sandbox.stub(dash, 'showPlayButton');

            dash.loadeddataHandler();
            expect(dash.autoplay).to.be.called;
            expect(dash.showMedia).to.be.called;
            expect(dash.showPlayButton).to.be.called;
            expect(dash.loadSubtitles).to.be.called;
            expect(dash.loadAlternateAudio).to.be.called;
            expect(dash.emit).to.be.calledWith('load');
            expect(dash.loaded).to.be.true;
            expect(document.activeElement).to.equal(dash.mediaContainerEl);
            expect(dash.mediaControls.show).to.be.called;
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

    describe('loadSubtitles()', () => {
        it('should translate and initialize subtitles in sorted order if there are available subtitles', () => {
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

            expect(dash.textTracks).to.deep.equal([korean, russian, english, spanish, chinese]);
        });

        it('should be robust to capital iso639 codes', () => {
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

            expect(dash.textTracks).to.deep.equal([russian, spanish, korean, chinese]);
        });

        it('should pass through unrecognized codes', () => {
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

            expect(dash.textTracks).to.deep.equal([russian, foo, und, empty, doesntmatter, zero]);
        });

        it('should do nothing if there are no available subtitles', () => {
            const subs = [];
            stubs.mockPlayer.expects('getTextTracks').returns(subs);
            stubs.mockControls.expects('initSubtitles').never();

            dash.loadSubtitles();
        });
    });

    describe('loadAlternateAudio()', () => {
        it('should select unique audio tracks', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0']};
            const variant2 = { videoId: 1, audioId: 0, language: 'eng', roles: ['audio0']};
            const variant3 = { videoId: 0, audioId: 1, language: 'rus', roles: ['audio1']};
            const variant4 = { videoId: 1, audioId: 1, language: 'rus', roles: ['audio1']};
            const variant5 = { videoId: 2, audioId: 1, language: 'rus', roles: ['audio1']};
            const allVariants = [variant1, variant2, variant3, variant4, variant5];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls.expects('initAlternateAudio');

            dash.loadAlternateAudio();

            expect(dash.audioTracks).to.deep.equal([
                { language: 'eng', role: 'audio0' },
                { language: 'rus', role: 'audio1' }
            ]);
        });

        it('should translate and initialize audio in sorted order', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0']};
            const variant2 = { videoId: 0, audioId: 1, language: 'rus', roles: ['audio0']};
            const variant3 = { videoId: 0, audioId: 2, language: 'spa', roles: ['audio0']};
            const variant4 = { videoId: 0, audioId: 3, language: 'kor', roles: ['audio0']};
            const variant5 = { videoId: 0, audioId: 4, language: 'fra', roles: ['audio0']};
            const allVariants = [variant3, variant1, variant4, variant2, variant5];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls
                .expects('initAlternateAudio')
                .withArgs(['English', 'Russian', 'Spanish', 'Korean', 'French']);

            dash.loadAlternateAudio();
        });

        it('should not initialize alternate audio if there is none', () => {
            const variant1 = { videoId: 0, audioId: 0, language: 'eng', roles: ['audio0']};
            const variant2 = { videoId: 1, audioId: 0, language: 'eng', roles: ['audio0']};
            const allVariants = [variant1, variant2];
            stubs.mockPlayer.expects('getVariantTracks').returns(allVariants);
            stubs.mockControls.expects('initAlternateAudio').never();

            dash.loadAlternateAudio();

            expect(dash.audioTracks).to.deep.equal([
                { language: 'eng', role: 'audio0' }
            ]);
        });
    });

    describe('handleSubtitle()', () => {
        it('should select track from front of text track list', () => {
            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fra', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            sandbox.stub(dash.cache, 'get').returns('0');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(english);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).to.be.calledWith('subtitlechange', 'eng');
        });

        it('should select track from end of text track list', () => {
            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            sandbox.stub(dash.cache, 'get').returns('3');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(spanish);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).to.be.calledWith('subtitlechange', 'spa');
        });

        it('should select track from middle of text track list', () => {
            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            sandbox.stub(dash.cache, 'get').returns('1');
            stubs.mockPlayer.expects('selectTextTrack').withArgs(russian);
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(true);

            dash.handleSubtitle();

            expect(stubs.emit).to.be.calledWith('subtitlechange', 'rus');
        });

        it('should turn off subtitles when idx out of bounds', () => {
            const english = { language: 'eng', id: 3 };
            const russian = { language: 'rus', id: 4 };
            const french = { language: 'fre', id: 5 };
            const spanish = { language: 'spa', id: 6 };
            dash.textTracks = [english, russian, french, spanish];
            sandbox.stub(dash.cache, 'get').returns('-1');
            stubs.mockPlayer.expects('selectTextTrack').never();
            stubs.mockPlayer.expects('setTextTrackVisibility').withArgs(false);

            dash.handleSubtitle();

            expect(stubs.emit).to.be.calledWith('subtitlechange', null);
        });
    });

    describe('handleAudioTrack()', () => {
        it('should select correct audio', () => {
            dash.audioTracks = [
                { language: 'eng', role: 'audio0' },
                { language: 'eng', role: 'audio1' },
                { language: 'eng', role: 'audio2' }
            ];
            sandbox.stub(dash.cache, 'get').returns('1');
            stubs.mockPlayer.expects('selectAudioLanguage').withArgs('eng', 'audio1');

            dash.handleAudioTrack();
        });

        it('should not select audio if index out of bounds', () => {
            dash.audioTracks = [
                { language: 'eng', role: 'audio0' },
                { language: 'eng', role: 'audio1' },
                { language: 'eng', role: 'audio2' }
            ];
            sandbox.stub(dash.cache, 'get').returns('3');
            stubs.mockPlayer.expects('selectAudioLanguage').never();

            dash.handleAudioTrack();
        });
    });

    describe('calculateVideoDimensions()', () => {
        it('should calculate the video dimensions based on the reps', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(false);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: 200, videoId: 1 },
                { width: 100, videoId: 2 }
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).to.equal(1);
            expect(dash.sdVideoId).to.equal(2);
            expect(dash.videoWidth).to.equal(200);
        });

        it('should use SD video dimensions if no HD', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(false);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: 640, videoId: 1, audioId: 2 },
                { width: 640, videoId: 1, audioId: 3 }
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).to.equal(-1);
            expect(dash.sdVideoId).to.equal(1);
            expect(dash.videoWidth).to.equal(640);
        });

        it('should default video dimensions when video is audio-only', () => {
            stubs.mockPlayer.expects('isAudioOnly').returns(true);
            stubs.mockPlayer.expects('getVariantTracks').returns([
                { width: null, videoId: null, audioId: 1 },
                { width: null, videoId: null, audioId: 2 }
            ]);
            dash.calculateVideoDimensions();
            expect(dash.hdVideoId).to.equal(-1);
            expect(dash.sdVideoId).to.equal(-1);
            expect(dash.videoWidth).to.equal(854); // default to width of 854 (480p)
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
            expect(dash.bandwidthHistory[0]).to.deep.equal({ bandwidth: 2000, stream: 1000 });
            expect(dash.switchHistory[0]).to.deep.equal({ switchHistory: 'history', stream: 1000 });
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
