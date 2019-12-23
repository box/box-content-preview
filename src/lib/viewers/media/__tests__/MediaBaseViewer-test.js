/* eslint-disable no-unused-expressions */
import Browser from '../../../Browser';
import MediaBaseViewer from '../MediaBaseViewer';
import BaseViewer from '../../BaseViewer';
import Timer from '../../../Timer';
import { CLASS_ELEM_KEYBOARD_FOCUS } from '../../../constants';
import { ERROR_CODE, VIEWER_EVENT } from '../../../events';
import PreviewError from '../../../PreviewError';

const MAX_RETRY_TOKEN = 3; // number of times to retry refreshing token for unauthorized error

let media;
let stubs;
let containerEl;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/MediaBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MediaBaseViewer-test.html');
        stubs = {};
        containerEl = document.querySelector('.container');
        media = new MediaBaseViewer({
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {},
            },
            file: {
                id: 1,
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'www.netflix.com',
                },
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        media.containerEl = containerEl;
        media.setup();
        media.mediaControls = {
            addListener: sandbox.stub(),
            destroy: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            setTimeCode: sandbox.stub(),
            show: sandbox.stub(),
            showPauseIcon: sandbox.stub(),
            showPlayIcon: sandbox.stub(),
            toggleFullscreen: sandbox.stub(),
            toggleSubtitles: sandbox.stub(),
            updateProgress: sandbox.stub(),
            updateVolumeIcon: sandbox.stub(),
            increaseSpeed: sandbox.stub(),
            decreaseSpeed: sandbox.stub(),
            isVolumeScrubberFocused: sandbox.stub(),
            isTimeScrubberFocused: sandbox.stub(),
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });
        media.destroy();
        media = null;
        stubs = null;
    });

    describe('MediaBase()', () => {
        it('should setup wrapper and container and load timeout', () => {
            expect(media.wrapperEl.className).to.equal('bp-media');
            expect(media.mediaContainerEl.className).to.equal('bp-media-container');
            expect(media.loadTimeout).to.equal(100000);
        });

        it('should setup click-handler to remove keyboard-focus class', () => {
            media.mediaContainerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);

            media.mediaContainerEl.click();

            expect(media.mediaContainerEl).to.not.have.class(CLASS_ELEM_KEYBOARD_FOCUS);
        });
    });

    describe('destroy()', () => {
        it('should clean up media controls', () => {
            media.destroy();

            expect(media.mediaControls.removeAllListeners).to.be.called;
            expect(media.mediaControls.destroy).to.be.called;
        });

        it('should remove event listeners from media element and then remove the element', () => {
            media.mediaEl = document.createElement('video');
            media.mediaContainerEl.appendChild(media.mediaEl);

            media.mediaEl.removeEventListener = sandbox.stub();
            media.mediaEl.removeAttribute = sandbox.stub();
            media.mediaEl.load = sandbox.stub();
            sandbox.stub(media, 'removePauseEventListener');

            media.destroy();

            expect(media.mediaEl.removeEventListener.callCount).to.equal(11);
            expect(media.mediaEl.removeAttribute).to.be.calledWith('src');
            expect(media.mediaEl.load).to.be.called;
            expect(media.removePauseEventListener.callCount).to.equal(1);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            media.mediaEl = document.createElement('video');
            media.mediaEl.addEventListener = sandbox.stub();
        });

        it('should load mediaUrl in the media element', () => {
            sandbox.stub(media, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            return media.load().then(() => {
                expect(media.mediaEl.addEventListener).to.be.calledWith('loadedmetadata', media.loadeddataHandler);
                expect(media.mediaEl.addEventListener).to.be.calledWith('error', media.errorHandler);
                expect(media.mediaEl.src).to.equal('www.netflix.com');
            });
        });

        it('should enable autoplay if on iOS', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            sandbox.stub(media, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            media.mediaEl = document.createElement('video');

            return media.load().then(() => {
                expect(media.mediaEl.autoplay).to.be.true;
            });
        });

        it('should invoke startLoadTimer()', () => {
            sandbox.stub(media, 'startLoadTimer');
            sandbox.stub(media, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });

            return media.load().then(() => {
                expect(media.startLoadTimer).to.be.called;
            });
        });
    });

    describe('loadeddataHandler()', () => {
        it('should finish loading, resize the media viewer, and focus on mediaContainerEl', () => {
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'emit');
            sandbox.stub(media, 'resize');
            sandbox.stub(media, 'showMedia');
            sandbox.stub(media, 'loadUI');

            media.options.autoFocus = true;
            media.loadeddataHandler();

            expect(media.handleVolume).to.be.called;
            expect(media.loaded).to.be.true;
            expect(media.emit).to.be.calledWith(VIEWER_EVENT.load);
            expect(media.resize).to.be.called;
            expect(media.showMedia).to.be.called;
            expect(media.loadUI).to.be.called;
            expect(document.activeElement).to.equal(media.mediaContainerEl);
        });

        it('should autoplay if enabled', () => {
            sandbox.stub(media, 'isAutoplayEnabled').returns(true);
            sandbox.stub(media, 'autoplay');
            media.mediaEl = document.createElement('video');

            media.loadeddataHandler();

            expect(media.autoplay).to.be.called;
        });
    });

    describe('showMedia()', () => {
        it('should add the bp-is-visible class to make wrapper visible', () => {
            media.showMedia();
            expect(media.wrapperEl.classList.contains('bp-is-visible')).to.be.true;
        });
    });

    describe('handleExpiredTokenError()', () => {
        it('should not trigger error if is not an ExpiredTokenError', () => {
            sandbox.stub(media, 'isExpiredTokenError').returns(false);
            sandbox.stub(media, 'triggerError');
            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.handleExpiredTokenError(error);
            expect(media.triggerError).to.not.be.called;
        });

        it('should trigger error if retry token count reaches max retry limit', () => {
            media.retryTokenCount = MAX_RETRY_TOKEN + 1;
            sandbox.stub(media, 'isExpiredTokenError').returns(true);
            sandbox.stub(media, 'triggerError');
            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.handleExpiredTokenError(error);
            expect(media.triggerError).to.be.calledWith(sinon.match.has('code', ERROR_CODE.TOKEN_NOT_VALID));
        });

        it('should call refreshToken if retry token count did not reach max retry limit', () => {
            media.retryTokenCount = 0;
            sandbox.stub(media, 'isExpiredTokenError').returns(true);
            media.options.refreshToken = sandbox.stub().returns(Promise.resolve());
            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.handleExpiredTokenError(error);

            expect(media.options.refreshToken).to.be.called;
            expect(media.retryTokenCount).to.equal(1);
        });
    });

    describe('errorHandler()', () => {
        it('should handle download error if the viewer was not yet loaded', () => {
            const err = new Error();
            media.mediaUrl = 'foo';
            sandbox.stub(media, 'isLoaded').returns(false);
            sandbox.stub(media, 'handleDownloadError');

            media.errorHandler(err);

            expect(media.handleDownloadError).to.be.calledWith(sinon.match.has('code'), 'foo');
        });

        it('should trigger an error if Preview is already loaded', () => {
            const err = new Error();
            sandbox.stub(media, 'isLoaded').returns(true);
            sandbox.stub(media, 'triggerError');

            media.errorHandler(err);

            expect(media.triggerError).to.be.calledWith(sinon.match.has('code'));
        });
    });

    describe('handleRate()', () => {
        it('should emit speed change if speed has changed', () => {
            const speed = 2;
            sandbox.stub(media, 'emit');
            sandbox
                .stub(media.cache, 'get')
                .withArgs('media-speed')
                .returns(speed);
            media.mediaEl = document.createElement('video');
            media.mediaEl.playbackRate = 1;

            media.handleRate();

            expect(media.emit).to.be.calledWith('ratechange', speed);
            expect(media.mediaEl.playbackRate).to.equal(speed);
        });
    });

    describe('handleVolume()', () => {
        beforeEach(() => {
            stubs.volume = 50;
            stubs.has = sandbox
                .stub(media.cache, 'has')
                .withArgs('media-volume')
                .returns(true);
            stubs.get = sandbox
                .stub(media.cache, 'get')
                .withArgs('media-volume')
                .returns(stubs.volume);
            stubs.debouncedEmit = sandbox.stub(media, 'debouncedEmit');
        });

        it('should set volume from cache', () => {
            media.mediaEl = document.createElement('video');

            media.handleVolume();
            expect(media.mediaEl.volume).to.equal(stubs.volume);
        });

        it('should set emit volumechange if the volume has changed', () => {
            media.mediaEl = document.createElement('video');
            media.mediaEl.volume = 0;

            media.handleVolume();

            expect(stubs.debouncedEmit).to.be.calledWith('volume', 50);
        });
    });

    describe('handleAutoplay()', () => {
        it('should emit the new autoplay value', () => {
            sandbox.stub(media, 'isAutoplayEnabled').returns(false);
            sandbox.stub(media, 'emit');

            media.handleAutoplay();
            expect(media.emit).to.be.calledWith('autoplay', false);

            media.isAutoplayEnabled.returns(true);

            media.handleAutoplay();
            expect(media.emit).to.be.calledWith('autoplay', true);
        });
    });

    describe('autoplay()', () => {
        const PLAY_PROMISE_NOT_SUPPORTED = 'play_promise_not_supported';

        beforeEach(() => {
            media.mediaEl = {};
            media.play = sandbox.stub().returns(Promise.resolve());
        });

        it('should set autoplay if setting is enabled and handle the promise if it is a valid promise', () => {
            media.autoplay();
            expect(media.play).to.be.called;
            expect(media.mediaEl.autoplay).to.be.undefined;
        });

        it('should set autoplay to true if mediaEl.play does not return a promise', done => {
            media.play.returns(Promise.reject(new Error(PLAY_PROMISE_NOT_SUPPORTED)));
            media.autoplay().then(() => {
                expect(media.mediaEl.autoplay).to.be.true;
                done();
            });
        });

        it('should call handleAutoplayFail if the promise is rejected', done => {
            sandbox.stub(media, 'handleAutoplayFail');
            media.play.returns(Promise.reject(new Error('NotAllowedError')));
            media.autoplay().then(() => {
                expect(media.handleAutoplayFail).to.be.called;
                done();
            });
        });
    });

    describe('loadUI()', () => {
        it('should set up media controls and element', () => {
            const duration = 10;
            media.mediaEl = { duration };
            sandbox.stub(media, 'addEventListenersForMediaControls');
            sandbox.stub(media, 'addEventListenersForMediaElement');

            media.loadUI();

            expect(media.addEventListenersForMediaControls).to.be.called;
        });
    });

    describe('handleTimeupdateFromMediaControls()', () => {
        it('should set media time and remove pause listener', () => {
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'removePauseEventListener');
            media.handleTimeupdateFromMediaControls(100.23);
            expect(media.setMediaTime).to.be.calledWith(100.23);
            expect(media.removePauseEventListener.callCount).to.equal(1);
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        it('should add event listeners for time and volume updates, play and mute toggles, and speed change', () => {
            media.addEventListenersForMediaControls();

            expect(media.mediaControls.addListener).to.be.calledWith('timeupdate', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('volumeupdate', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('toggleplayback', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('togglemute', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('ratechange', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('autoplaychange', sinon.match.func);
        });
    });

    describe('setTimeCode()', () => {
        it('should set the current time in controls', () => {
            const currentTime = 1337;
            media.mediaEl = { currentTime };

            media.setTimeCode();

            expect(media.mediaControls.setTimeCode).to.be.calledWith(currentTime);
        });
    });

    describe('setMediaTime()', () => {
        it('should set the time on the media element', () => {
            media.mediaEl = document.createElement('video');
            media.mediaEl.duration = 4;
            const newTime = 3.14;

            media.setMediaTime(newTime);

            expect(media.mediaEl.currentTime).to.equal(newTime);
        });
    });

    describe('setVolume()', () => {
        it('should set volume', () => {
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media.cache, 'set');
            const newVol = 0.159;
            media.setVolume(newVol);
            expect(media.cache.set).to.be.calledWith('media-volume', newVol);
            expect(media.handleVolume).to.be.called;
        });
    });

    describe('updateVolumeIcon()', () => {
        it('should update the controls volume icon', () => {
            const volume = 1337;
            media.mediaEl = { volume };

            media.updateVolumeIcon();

            expect(media.mediaControls.updateVolumeIcon).to.be.calledWith(volume);
        });
    });

    describe('playingHandler()', () => {
        it('should show pause icon, hide loading icon, and handle speed and volume', () => {
            sandbox.stub(media, 'hideLoadingIcon');
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'emit');

            media.playingHandler();

            expect(media.mediaControls.showPauseIcon).to.be.called;
            expect(media.hideLoadingIcon).to.be.called;
            expect(media.handleRate).to.be.called;
            expect(media.handleVolume).to.be.called;
            expect(media.emit).to.be.calledWith('play');
        });
    });

    describe('progressHandler()', () => {
        it('should update controls progress', () => {
            media.progressHandler();

            expect(media.mediaControls.updateProgress).to.be.called;
        });
    });

    describe('pauseHandler()', () => {
        it('should show the controls play icon', () => {
            media.pauseHandler();

            expect(media.mediaControls.showPlayIcon).to.be.called;
        });
    });

    describe('seekHandler()', () => {
        it('should hide loading icon and emit current time', () => {
            sandbox.stub(media, 'hideLoadingIcon');
            const currentTime = 20;
            media.mediaEl = { currentTime };
            stubs.debouncedEmit = sandbox.stub(media, 'debouncedEmit');

            expect(media.metrics.seeked).to.be.equal(false);

            media.seekHandler();

            expect(media.hideLoadingIcon).to.be.called;
            expect(media.debouncedEmit).to.be.calledWith('seeked', currentTime);
            expect(media.metrics.seeked).to.be.equal(true);
        });
    });

    describe('mediaendHandler()', () => {
        it('emit the mediaendautoplay event if autoplay is enabled', () => {
            sandbox.stub(media, 'isAutoplayEnabled').returns(false);
            sandbox.stub(media, 'emit');
            sandbox.stub(media, 'resetPlayIcon');

            media.mediaendHandler();
            expect(media.isAutoplayEnabled).to.be.called;
            expect(media.emit).to.not.be.called;

            media.isAutoplayEnabled.returns(true);

            media.mediaendHandler();
            expect(media.emit).to.be.calledWith(VIEWER_EVENT.mediaEndAutoplay);
            expect(media.resetPlayIcon).to.be.called;
        });
    });

    describe('showPlayButton', () => {
        it('should show the play button if it exists', () => {
            media.playButtonEl = document.createElement('button');
            media.playButtonEl.classList.add('bp-is-hidden');
            media.showPlayButton();
            expect(media.playButtonEl.classList.contains('bp-is-hidden')).to.be.false;
        });
    });

    describe('hidePlayButton', () => {
        it('should hide the play button if it exists', () => {
            media.playButtonEl = document.createElement('button');
            media.hidePlayButton();
            expect(media.playButtonEl.classList.contains('bp-is-hidden')).to.be.true;
        });
    });

    describe('resetPlayIcon()', () => {
        it('should set media controls timecode, hide loading icon, and pause', () => {
            sandbox.stub(media, 'hideLoadingIcon');
            sandbox.stub(media, 'pauseHandler');

            media.resetPlayIcon();

            expect(media.mediaControls.setTimeCode).to.be.calledWith(0);
            expect(media.hideLoadingIcon).to.be.called;
            expect(media.pauseHandler).to.be.called;
        });
    });

    describe('isValidTime', () => {
        it('should validate time parameter', () => {
            media.mediaEl = { duration: 100 };
            const nullCheck = media.isValidTime(null);
            const undefinedCheck = media.isValidTime(undefined);
            const stringCheck = media.isValidTime('abc');
            const InfinityCheck = media.isValidTime(Infinity);
            const durationCheck = media.isValidTime(105);
            const numberCheck = media.isValidTime(50);

            expect(nullCheck).to.be.false;
            expect(undefinedCheck).to.be.false;
            expect(stringCheck).to.be.false;
            expect(InfinityCheck).to.be.false;
            expect(durationCheck).to.be.false;
            expect(numberCheck).to.be.true;
        });
    });

    describe('removePauseEventListener()', () => {
        it('should remove pause event listener if it exists', () => {
            let pauseListener = null;
            media.mediaEl = { removeEventListener: sandbox.stub() };

            media.pauseListener = pauseListener;
            media.removePauseEventListener();
            expect(media.mediaEl.removeEventListener).to.be.not.be.called;

            pauseListener = () => {};
            media.pauseListener = pauseListener;
            media.removePauseEventListener();
            expect(media.mediaEl.removeEventListener).to.be.calledWith('timeupdate', pauseListener);
        });
    });

    describe('play()', () => {
        it('should play the media when no time parameters are passed', () => {
            media.mediaEl = { play: sandbox.stub() };
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'removePauseEventListener');
            media.play();
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.mediaEl.play.callCount).to.equal(1);
            expect(media.handleRate.callCount).to.equal(1);
            expect(media.handleVolume.callCount).to.equal(1);
        });

        it('should start playing from start time without pausing, when only one parameter is passed', () => {
            const isValidTimeStub = sandbox.stub(media, 'isValidTime');
            media.mediaEl = { play: sandbox.stub() };
            isValidTimeStub.withArgs(100).returns(true);
            isValidTimeStub.withArgs(undefined).returns(false);
            sandbox.stub(media, 'pause');
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'removePauseEventListener');
            media.play(100);
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).to.be.calledWith(100);
            expect(media.mediaEl.play.callCount).to.equal(1);
            expect(media.handleRate.callCount).to.equal(1);
            expect(media.handleVolume.callCount).to.equal(1);
            expect(media.pause.callCount).to.equal(0);
        });

        it('should start playing from start time and pause at end time', () => {
            const isValidTimeStub = sandbox.stub(media, 'isValidTime');
            media.mediaEl = { play: sandbox.stub() };
            isValidTimeStub.withArgs(100).returns(true);
            isValidTimeStub.withArgs(200).returns(true);
            sandbox.stub(media, 'pause');
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'removePauseEventListener');
            media.play(100, 200);
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).to.be.calledWith(100);
            expect(media.pause).to.be.calledWith(200);
            expect(media.mediaEl.play.callCount).to.equal(1);
            expect(media.handleRate.callCount).to.equal(1);
            expect(media.handleVolume.callCount).to.equal(1);
        });

        it('should ignore when invalid time parameters are passed', () => {
            const isValidTimeStub = sandbox.stub(media, 'isValidTime');
            media.mediaEl = { play: sandbox.stub() };
            isValidTimeStub.withArgs('abc').returns(false);
            isValidTimeStub.withArgs('pqr').returns(false);
            sandbox.stub(media, 'pause');
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'emit');
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'removePauseEventListener');
            media.play(200, 100);
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime.callCount).to.equal(0);
            expect(media.pause.callCount).to.equal(0);
            expect(media.mediaEl.play.callCount).to.equal(0);
            expect(media.emit.callCount).to.equal(0);
            expect(media.handleRate.callCount).to.equal(0);
            expect(media.handleVolume.callCount).to.equal(0);
        });
    });

    describe('pause()', () => {
        it('should pause the media when no time parameter is passed', () => {
            const pauseListener = () => {}; // eslint-disable-line require-jsdoc
            media.mediaEl = {
                duration: 100,
                pause: sandbox.stub(),
            };
            media.pauseListener = pauseListener;
            sandbox.stub(media, 'removePauseEventListener');
            sandbox.stub(media, 'emit');
            media.pause();
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.mediaEl.pause.callCount).to.equal(1);
            expect(media.emit).to.be.calledWith('pause', {
                userInitiated: false,
            });
        });

        it('should update userInitiated flag IF the pause has been triggered by user interaction', () => {
            media.mediaEl = {
                duration: 100,
                pause: sandbox.stub(),
            };
            sandbox.stub(media, 'removePauseEventListener');
            sandbox.stub(media, 'emit');
            media.pause(undefined, true);
            expect(media.emit).to.be.calledWith('pause', {
                userInitiated: true,
            });
        });

        it('should add eventListener to pause the media when valid time parameter is passed', () => {
            const pauseListener = () => {}; // eslint-disable-line require-jsdoc
            media.mediaEl = {
                duration: 100,
                addEventListener: sandbox.stub(),
            };
            media.pauseListener = pauseListener;
            sandbox.stub(media, 'removePauseEventListener');
            media.pause(100);
            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.mediaEl.addEventListener.callCount).to.equal(1);
        });
    });

    describe('togglePlay()', () => {
        it('should pause if media element was playing', () => {
            sandbox.stub(media, 'pause');
            sandbox.stub(media, 'play');
            media.mediaEl = { paused: false };
            media.togglePlay();
            expect(media.pause.callCount).to.equal(1);
            expect(media.play.callCount).to.equal(0);
        });

        it('should play if media element was paused', () => {
            sandbox.stub(media, 'pause');
            sandbox.stub(media, 'play');
            media.mediaEl = { paused: true };
            media.togglePlay();
            expect(media.pause.callCount).to.equal(0);
            expect(media.play.callCount).to.equal(1);
        });
    });

    describe('toggleMute()', () => {
        it('should mute if volume was on', () => {
            sandbox.stub(media.cache, 'set');

            media.mediaEl = {
                volume: 0.3,
            };

            media.toggleMute();

            expect(media.cache.set).to.be.calledWith('media-volume', 0);
        });

        it('should restore old volume if volume was muted', () => {
            sandbox.stub(media.cache, 'set');

            const oldVol = 0.3;
            media.mediaEl = {
                volume: 0,
            };
            media.oldVolume = oldVol;

            media.toggleMute();

            expect(media.cache.set).to.be.calledWith('media-volume', oldVol);
        });

        it('should leave no change if called twice', () => {
            sandbox.stub(media.cache, 'set');

            const vol = 0.3;
            media.mediaEl = {
                volume: vol,
            };

            media.toggleMute();
            media.toggleMute();

            expect(media.cache.set).to.be.calledWith('media-volume', 0);
        });
    });

    describe('hideLoadingIcon()', () => {
        it('should add the loaded class to the container', () => {
            media.hideLoadingIcon();
            expect(media.containerEl.classList.contains('bp-is-buffering')).to.be.false;
        });
    });

    describe('showLoadingIcon()', () => {
        it('should remove the loaded class and hide the play button if media is not paused nor ended', () => {
            media.mediaEl = {
                paused: false,
                ended: false,
            };
            sandbox.stub(media, 'hidePlayButton');

            media.showLoadingIcon();

            expect(media.hidePlayButton).to.be.called;
            expect(media.containerEl.classList.contains('bp-is-buffering')).to.be.true;
        });
    });

    describe('addEventListenersForMediaElement()', () => {
        it('should add event listeners to media element', () => {
            media.mediaEl = {
                addEventListener: sandbox.stub(),
            };

            media.addEventListenersForMediaElement();

            expect(media.mediaEl.addEventListener.callCount).to.equal(7);
        });
    });

    describe('quickSeek()', () => {
        it('should seek with positive increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60,
            };
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'removePauseEventListener');

            media.quickSeek(5);

            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).calledWith(35);
        });

        it('should seek with negative increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60,
            };
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'removePauseEventListener');

            media.quickSeek(-5);

            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).calledWith(25);
        });

        it('should not go beyond beginning of video', () => {
            media.mediaEl = {
                currentTime: 3,
                duration: 60,
            };
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'removePauseEventListener');

            media.quickSeek(-5);

            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).calledWith(0);
        });

        it('should not go beyond end of video', () => {
            media.mediaEl = {
                currentTime: 57,
                duration: 60,
            };
            sandbox.stub(media, 'setMediaTime');
            sandbox.stub(media, 'removePauseEventListener');

            media.quickSeek(5);

            expect(media.removePauseEventListener.callCount).to.equal(1);
            expect(media.setMediaTime).calledWith(60);
        });
    });

    describe('increaseVolume', () => {
        it('should not exceed maximum volume', () => {
            media.mediaEl = {
                volume: 0.99,
            };
            sandbox.stub(media, 'setVolume');

            media.increaseVolume();

            expect(media.setVolume).calledWith(1);
        });
    });

    describe('decreaseVolume', () => {
        it('should not fall below minimum volume', () => {
            media.mediaEl = {
                volume: 0.01,
            };
            sandbox.stub(media, 'setVolume');

            media.decreaseVolume();

            expect(media.setVolume).calledWith(0);
        });
    });

    describe('onKeydown()', () => {
        it('should return false if media controls are not initialized', () => {
            media.mediaControls = null;
            expect(media.onKeydown()).to.be.false;
        });

        it('should add keyboard-focus class on tab and return false', () => {
            expect(media.onKeydown('Tab')).to.be.false;
            expect(media.mediaContainerEl).to.have.class(CLASS_ELEM_KEYBOARD_FOCUS);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should add keyboard-focus class on shift+tab and return false', () => {
            expect(media.onKeydown('Shift+Tab')).to.be.false;
            expect(media.mediaContainerEl).to.have.class(CLASS_ELEM_KEYBOARD_FOCUS);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle play and return true on Space', () => {
            sandbox.stub(media, 'togglePlay');

            expect(media.onKeydown('Space')).to.be.true;
            expect(media.togglePlay).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle play and return true on k', () => {
            sandbox.stub(media, 'togglePlay');

            expect(media.onKeydown('k')).to.be.true;
            expect(media.togglePlay).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek backwards 5 seconds and return true on ArrowLeft', () => {
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('ArrowLeft')).to.be.true;
            expect(media.quickSeek).calledWith(-5);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should lower volume on ArrowLeft if volume scrubber is focused', () => {
            media.mediaControls.isVolumeScrubberFocused = sandbox.stub().returns(true);
            sandbox.stub(media, 'decreaseVolume');

            expect(media.onKeydown('ArrowLeft')).to.be.true;
            expect(media.decreaseVolume).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek backwards 10 seconds and return true on j', () => {
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('j')).to.be.true;
            expect(media.quickSeek).calledWith(-10);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek forwards 5 seconds and return true on ArrowRight', () => {
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('ArrowRight')).to.be.true;
            expect(media.quickSeek).calledWith(5);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should increase volume on ArrowRight if volume scrubber is focused', () => {
            media.mediaControls.isVolumeScrubberFocused = sandbox.stub().returns(true);
            sandbox.stub(media, 'increaseVolume');

            expect(media.onKeydown('ArrowRight')).to.be.true;
            expect(media.increaseVolume).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek forwards 10 seconds and return true on l', () => {
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('l')).to.be.true;
            expect(media.quickSeek).calledWith(10);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should go to beginning of video and return true on 0', () => {
            sandbox.stub(media, 'setMediaTime');

            expect(media.onKeydown('0')).to.be.true;
            expect(media.setMediaTime).calledWith(0);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should go to beginning of video and return true on Home', () => {
            sandbox.stub(media, 'setMediaTime');

            expect(media.onKeydown('Home')).to.be.true;
            expect(media.setMediaTime).calledWith(0);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should increase volume and return true on ArrowUp', () => {
            sandbox.stub(media, 'increaseVolume');

            expect(media.onKeydown('ArrowUp')).to.be.true;
            expect(media.increaseVolume).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek forwards 5 seconds on ArrowUp if time scrubber is focused', () => {
            media.mediaControls.isTimeScrubberFocused = sandbox.stub().returns(true);
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('ArrowUp')).to.be.true;
            expect(media.quickSeek).calledWith(5);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should decrease volume and return true on ArrowDown', () => {
            sandbox.stub(media, 'decreaseVolume');

            expect(media.onKeydown('ArrowDown')).to.be.true;
            expect(media.decreaseVolume).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should seek backwards 5 seconds on ArrowDown if time scrubber is focused', () => {
            media.mediaControls.isTimeScrubberFocused = sandbox.stub().returns(true);
            sandbox.stub(media, 'quickSeek');

            expect(media.onKeydown('ArrowDown')).to.be.true;
            expect(media.quickSeek).calledWith(-5);
            expect(media.mediaControls.show).to.be.called;
        });

        it('should increase speed and return true on Shift+>', () => {
            expect(media.onKeydown('Shift+>')).to.be.true;
            expect(media.mediaControls.increaseSpeed).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should increase speed and return true on Shift+<', () => {
            expect(media.onKeydown('Shift+<')).to.be.true;
            expect(media.mediaControls.decreaseSpeed).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle fullscreen and return true on f', () => {
            expect(media.onKeydown('f')).to.be.true;
            expect(media.mediaControls.toggleFullscreen).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle fullscreen and return true on Shift+F', () => {
            expect(media.onKeydown('Shift+F')).to.be.true;
            expect(media.mediaControls.toggleFullscreen).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle mute and return true on m', () => {
            sandbox.stub(media, 'toggleMute');

            expect(media.onKeydown('m')).to.be.true;
            expect(media.toggleMute).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle mute and return true on Shift+M', () => {
            sandbox.stub(media, 'toggleMute');

            expect(media.onKeydown('Shift+M')).to.be.true;
            expect(media.toggleMute).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle subtitles and return true on c', () => {
            expect(media.onKeydown('c')).to.be.true;
            expect(media.mediaControls.toggleSubtitles).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should toggle subtitles and return true on Shift+C', () => {
            expect(media.onKeydown('Shift+C')).to.be.true;
            expect(media.mediaControls.toggleSubtitles).to.be.called;
            expect(media.mediaControls.show).to.be.called;
        });

        it('should return false if another key is pressed', () => {
            expect(media.onKeydown('Esc')).to.be.false;
            expect(media.mediaControls.show.callCount).to.equal(0);
        });
    });

    describe('getStartTimeInSeconds()', () => {
        it('should parse seconds', () => {
            const startAt = {
                unit: 'seconds',
                value: 55,
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(55);
        });

        it('should parse timestamp', () => {
            const startAt = {
                unit: 'timestamp',
                value: '1m2s',
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(62);
        });

        it('should return the default value if invalid unit', () => {
            const startAt = {
                unit: 'foo',
                value: 55,
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(0);
        });

        it('should return the default value if invalid value', () => {
            const startAt = {
                unit: 'seconds',
                value: 'foo',
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(0);
        });

        it('should return the default value if invalid startAt', () => {
            let startAt = {
                value: 'foo',
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(0);

            startAt = {
                unit: 'seconds',
            };

            expect(media.getStartTimeInSeconds(startAt)).to.equal(0);
        });
    });

    describe('convertTimestampToSeconds()', () => {
        const ONE_MINUTE_IN_SECONDS = 60;
        const ONE_HOUR_IN_SECONDS = 60 * ONE_MINUTE_IN_SECONDS;

        it('should parse the timestamp with just seconds', () => {
            const timestamp = '3s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(3);
        });

        it('should parse the timestamp with just seconds and ms as floating point', () => {
            const timestamp = '3.5432s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(3.5432);
        });

        it('should parse the timestamp with minutes, and seconds', () => {
            const timestamp = '2m3s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(2 * ONE_MINUTE_IN_SECONDS + 3);
        });

        it('should parse the timestamp with hours and seconds', () => {
            const timestamp = '4h3s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(4 * ONE_HOUR_IN_SECONDS + 3);
        });

        it('should parse the timestamp with just minutes', () => {
            const timestamp = '4m';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(4 * ONE_MINUTE_IN_SECONDS);
        });

        it('should parse the timestamp with hours and minutes', () => {
            const timestamp = '6h7m';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(
                6 * ONE_HOUR_IN_SECONDS + 7 * ONE_MINUTE_IN_SECONDS,
            );
        });

        it('should parse the timestamp with just hours', () => {
            const timestamp = '8h';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(8 * ONE_HOUR_IN_SECONDS);
        });

        it('should parse the timestamp with hours, minutes and seconds', () => {
            const timestamp = '5h30m15s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(
                5 * ONE_HOUR_IN_SECONDS + 30 * ONE_MINUTE_IN_SECONDS + 15,
            );
        });

        it('should parse the timestamp with hours, minutes, and seconds', () => {
            const timestamp = '5h30m15s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(
                5 * ONE_HOUR_IN_SECONDS + 30 * ONE_MINUTE_IN_SECONDS + 15,
            );
        });

        it('should parse the timestamp with hours, minutes, seconds (large values and decimal)', () => {
            const timestamp = '5h75m653.546s';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(
                5 * ONE_HOUR_IN_SECONDS + 75 * ONE_MINUTE_IN_SECONDS + 653.546,
            );
        });

        it('should return 0 if invalid string passed', () => {
            let timestamp = '5h3m2s5d';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(0);

            timestamp = '5h3m2ss';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(0);

            timestamp = '5hms';
            expect(media.convertTimestampToSeconds(timestamp)).to.equal(0);

            expect(media.convertTimestampToSeconds()).to.equal(0);

            expect(media.convertTimestampToSeconds('fdsfds')).to.equal(0);

            expect(media.convertTimestampToSeconds('ah1m3s')).to.equal(0);
        });
    });

    describe('handleLoadStart()', () => {
        it('should start the timer', () => {
            sandbox.stub(Timer, 'createTag').returns('foo');
            sandbox.stub(Timer, 'start');

            media.handleLoadStart();

            expect(Timer.createTag).to.be.calledWith(1, 'bufferFill');
            expect(Timer.start).to.be.calledWith('foo');
        });
    });

    describe('handleCanPlay()', () => {
        it('should stop the timer and process the metrics', () => {
            sandbox.stub(Timer, 'createTag').returns('foo');
            sandbox.stub(Timer, 'stop');
            sandbox.stub(media, 'processBufferFillMetric');

            media.mediaEl = { removeEventListener: sandbox.stub() };

            media.handleCanPlay();

            expect(Timer.stop).to.be.calledWith('foo');
            expect(media.mediaEl.removeEventListener).to.be.calledWith('canplay', media.handleCanPlay);
            expect(media.processBufferFillMetric).to.be.called;
        });
    });

    describe('getMetricsWhitelist()', () => {
        it('should whitelist bufferFill and endPlayback metrics', () => {
            const expWhitelist = ['media_metric_buffer_fill', 'media_metric_end_playback'];

            expect(media.getMetricsWhitelist()).to.be.eql(expWhitelist);
        });
    });
});
