/* eslint-disable no-unused-expressions */
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import MediaBaseViewer from '../MediaBaseViewer';
import MediaControlsRoot from '../MediaControlsRoot';
import PreviewError from '../../../PreviewError';
import Timer from '../../../Timer';
import { CLASS_ELEM_KEYBOARD_FOCUS } from '../../../constants';
import { ERROR_CODE, VIEWER_EVENT } from '../../../events';

const MAX_RETRY_TOKEN = 3; // number of times to retry refreshing token for unauthorized error

let media;
let stubs;
let containerEl;

describe('lib/viewers/media/MediaBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

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
                    url_template: 'www.box.com',
                },
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });

        media.containerEl = containerEl;
        media.setup();
        media.mediaControls = {
            addListener: jest.fn(),
            destroy: jest.fn(),
            removeAllListeners: jest.fn(),
            setTimeCode: jest.fn(),
            show: jest.fn(),
            showPauseIcon: jest.fn(),
            showPlayIcon: jest.fn(),
            toggleFullscreen: jest.fn(),
            toggleSubtitles: jest.fn(),
            updateProgress: jest.fn(),
            updateVolumeIcon: jest.fn(),
            increaseSpeed: jest.fn(),
            decreaseSpeed: jest.fn(),
            isVolumeScrubberFocused: jest.fn(),
            isTimeScrubberFocused: jest.fn(),
        };
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });
        media.destroy();
        media = null;
        stubs = null;
    });

    describe('MediaBase()', () => {
        test('should setup wrapper and container and load timeout', () => {
            expect(media.wrapperEl.className).toBe('bp-media');
            expect(media.mediaContainerEl.className).toBe('bp-media-container');
            expect(media.loadTimeout).toBe(100000);
        });

        test('should setup click-handler to remove keyboard-focus class', () => {
            media.mediaContainerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);

            media.mediaContainerEl.click();

            expect(media.mediaContainerEl).not.toHaveClass(CLASS_ELEM_KEYBOARD_FOCUS);
        });
    });

    describe('destroy()', () => {
        test('should clean up media controls', () => {
            media.destroy();

            expect(media.mediaControls.removeAllListeners).toBeCalled();
            expect(media.mediaControls.destroy).toBeCalled();
        });

        test('should remove event listeners from media element and then remove the element', () => {
            media.mediaEl = document.createElement('video');
            media.mediaContainerEl.appendChild(media.mediaEl);

            media.mediaEl.removeEventListener = jest.fn();
            media.mediaEl.removeAttribute = jest.fn();
            media.mediaEl.load = jest.fn();
            jest.spyOn(media, 'removePauseEventListener');

            media.destroy();

            expect(media.mediaEl.removeEventListener).toBeCalledTimes(11);
            expect(media.mediaEl.removeAttribute).toBeCalledWith('src');
            expect(media.mediaEl.load).toBeCalled();
            expect(media.removePauseEventListener).toBeCalledTimes(1);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            media.mediaEl = document.createElement('video');
            media.mediaEl.addEventListener = jest.fn();
        });

        test('should load mediaUrl in the media element', () => {
            jest.spyOn(media, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });

            return media.load().then(() => {
                expect(media.mediaEl.addEventListener).toBeCalledWith('loadedmetadata', media.loadeddataHandler);
                expect(media.mediaEl.addEventListener).toBeCalledWith('error', media.errorHandler);
                expect(media.mediaEl.src).toBe('http://localhost/www.box.com');
            });
        });

        test('should enable autoplay if on iOS', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            jest.spyOn(media, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            media.mediaEl = document.createElement('video');

            return media.load().then(() => {
                expect(media.mediaEl.autoplay).toBe(true);
            });
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(media, 'startLoadTimer');
            jest.spyOn(media, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });

            return media.load().then(() => {
                expect(media.startLoadTimer).toBeCalled();
            });
        });
    });

    describe('loadeddataHandler()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'handleVolume').mockImplementation();
            jest.spyOn(media, 'loadUI').mockImplementation();
            jest.spyOn(media, 'loadUIReact').mockImplementation();
            jest.spyOn(media, 'resize').mockImplementation();
        });

        test('should finish loading, resize the media viewer, and focus on mediaContainerEl', () => {
            jest.spyOn(media, 'emit').mockImplementation();
            jest.spyOn(media, 'getViewerOption').mockReturnValueOnce(false);
            jest.spyOn(media, 'showMedia').mockImplementation();

            media.options.autoFocus = true;
            media.loadeddataHandler();

            expect(media.handleVolume).toBeCalled();
            expect(media.loaded).toBe(true);
            expect(media.emit).toBeCalledWith(VIEWER_EVENT.load);
            expect(media.resize).toBeCalled();
            expect(media.showMedia).toBeCalled();
            expect(media.loadUI).toBeCalled();
            expect(media.loadUIReact).not.toBeCalled();
            expect(document.activeElement).toBe(media.mediaContainerEl);
        });

        test('should finish loading and render react ui if option is enabled', () => {
            jest.spyOn(media, 'getViewerOption').mockReturnValueOnce(true);

            media.loadeddataHandler();

            expect(media.loadUI).not.toBeCalled();
            expect(media.loadUIReact).toBeCalled();
        });

        test('should autoplay if enabled', () => {
            jest.spyOn(media, 'isAutoplayEnabled').mockReturnValue(true);
            jest.spyOn(media, 'autoplay').mockImplementation();
            media.mediaEl = document.createElement('video');

            media.loadeddataHandler();

            expect(media.autoplay).toBeCalled();
        });
    });

    describe('showMedia()', () => {
        test('should add the bp-is-visible class to make wrapper visible', () => {
            media.showMedia();
            expect(media.wrapperEl.classList.contains('bp-is-visible')).toBe(true);
        });
    });

    describe('handleExpiredTokenError()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'triggerError').mockImplementation();
        });

        test('should not trigger error if is not an ExpiredTokenError', () => {
            jest.spyOn(media, 'isExpiredTokenError').mockReturnValue(false);

            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.handleExpiredTokenError(error);
            expect(media.triggerError).not.toBeCalled();
        });

        test('should trigger error if retry token count reaches max retry limit', () => {
            jest.spyOn(media, 'isExpiredTokenError').mockReturnValue(true);

            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.retryTokenCount = MAX_RETRY_TOKEN + 1;
            media.handleExpiredTokenError(error);
            expect(media.triggerError).toBeCalledWith(expect.objectContaining({ code: ERROR_CODE.TOKEN_NOT_VALID }));
        });

        test('should call refreshToken if retry token count did not reach max retry limit', () => {
            jest.spyOn(media, 'isExpiredTokenError').mockReturnValue(true);

            const error = new PreviewError(ERROR_CODE.LOAD_MEDIA);
            media.retryTokenCount = 0;
            media.options.refreshToken = jest.fn(() => Promise.resolve());
            media.handleExpiredTokenError(error);

            expect(media.options.refreshToken).toBeCalled();
            expect(media.retryTokenCount).toBe(1);
        });
    });

    describe('errorHandler()', () => {
        test('should handle download error if the viewer was not yet loaded', () => {
            const err = new Error();
            media.mediaUrl = 'foo';

            jest.spyOn(console, 'error').mockImplementation();
            jest.spyOn(media, 'isLoaded').mockReturnValue(false);
            jest.spyOn(media, 'handleDownloadError').mockImplementation();

            media.errorHandler(err);

            expect(media.handleDownloadError).toBeCalledWith(expect.anything(), 'foo');
        });

        test('should trigger an error if Preview is already loaded', () => {
            const err = new Error();

            jest.spyOn(console, 'error').mockImplementation();
            jest.spyOn(media, 'isLoaded').mockReturnValue(true);
            jest.spyOn(media, 'triggerError').mockImplementation();

            media.errorHandler(err);

            expect(media.triggerError).toBeCalled();
        });
    });

    describe('handleRate()', () => {
        test('should emit speed change if speed has changed', () => {
            const speed = 2;
            jest.spyOn(media, 'emit');
            jest.spyOn(media.cache, 'get').mockReturnValue(speed);
            media.mediaEl = document.createElement('video');
            media.mediaEl.playbackRate = 1;

            media.handleRate();

            expect(media.emit).toBeCalledWith('ratechange', speed);
            expect(media.mediaEl.playbackRate).toBe(speed);
        });
    });

    describe('handleVolume()', () => {
        beforeEach(() => {
            stubs.volume = 0.5;
            jest.spyOn(media.cache, 'has').mockReturnValue(true);
            jest.spyOn(media.cache, 'get').mockReturnValue(stubs.volume);
            stubs.debouncedEmit = jest.spyOn(media, 'debouncedEmit').mockImplementation();
        });

        test('should set volume from cache', () => {
            media.mediaEl = document.createElement('video');

            media.handleVolume();
            expect(media.mediaEl.volume).toBe(stubs.volume);
        });

        test('should set emit volumechange if the volume has changed', () => {
            media.mediaEl = document.createElement('video');
            media.mediaEl.volume = 0;

            media.handleVolume();

            expect(stubs.debouncedEmit).toBeCalledWith('volume', 0.5);
        });
    });

    describe('handleAutoplay()', () => {
        test('should emit the new autoplay value', () => {
            jest.spyOn(media, 'isAutoplayEnabled').mockReturnValue(false);
            jest.spyOn(media, 'emit');

            media.handleAutoplay();
            expect(media.emit).toBeCalledWith('autoplay', false);

            media.isAutoplayEnabled.mockReturnValue(true);

            media.handleAutoplay();
            expect(media.emit).toBeCalledWith('autoplay', true);
        });
    });

    describe('autoplay()', () => {
        const PLAY_PROMISE_NOT_SUPPORTED = 'play_promise_not_supported';

        beforeEach(() => {
            media.mediaEl = {};
            media.play = jest.fn(() => Promise.resolve());
        });

        test('should set autoplay if setting is enabled and handle the promise if it is a valid promise', () => {
            media.autoplay();
            expect(media.play).toBeCalled();
            expect(media.mediaEl.autoplay).toBeUndefined();
        });

        test('should set autoplay to true if mediaEl.play does not return a promise', done => {
            media.play.mockReturnValue(Promise.reject(new Error(PLAY_PROMISE_NOT_SUPPORTED)));
            media
                .autoplay()
                .then(() => {
                    expect(media.mediaEl.autoplay).toBe(true);
                    done();
                })
                .catch(() => {});
        });

        test('should call handleAutoplayFail if the promise is rejected', done => {
            jest.spyOn(media, 'handleAutoplayFail');
            media.play.mockReturnValue(Promise.reject(new Error('NotAllowedError')));
            media
                .autoplay()
                .then(() => {
                    expect(media.handleAutoplayFail).toBeCalled();
                    done();
                })
                .catch(() => {});
        });
    });

    describe('loadUI()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'addEventListenersForMediaControls').mockImplementation();
            jest.spyOn(media, 'addEventListenersForMediaElement').mockImplementation();
        });

        test('should set up media controls and element', () => {
            const duration = 10;
            media.mediaEl = { duration };

            media.loadUI();

            expect(media.addEventListenersForMediaControls).toBeCalled();
        });
    });

    describe('loadUIReact()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'addEventListenersForMediaElement').mockImplementation();
            jest.spyOn(media, 'renderUI').mockImplementation();
            jest.spyOn(media.cache, 'has').mockImplementation();
            jest.spyOn(media.cache, 'set').mockImplementation();
        });

        test('should create controls root and render the react controls', () => {
            media.loadUIReact();

            expect(media.controls).toBeInstanceOf(MediaControlsRoot);
            expect(media.addEventListenersForMediaElement).toBeCalled();
            expect(media.renderUI).toBeCalled();
        });

        test('should create cache entries for autoplay and speed if they are not available', () => {
            media.loadUIReact();

            expect(media.cache.has).toBeCalledWith('media-autoplay');
            expect(media.cache.has).toBeCalledWith('media-speed');
            expect(media.cache.set).toBeCalledWith('media-autoplay', 'Disabled');
            expect(media.cache.set).toBeCalledWith('media-speed', '1.0');
        });

        test('should not set cache entries for autoplay and speed if already set', () => {
            media.cache.has.mockReturnValue(true);

            media.loadUIReact();

            expect(media.cache.set).not.toBeCalled();
            expect(media.cache.set).not.toBeCalled();
        });
    });

    describe('handleTimeupdateFromMediaControls()', () => {
        test('should set media time and remove pause listener', () => {
            jest.spyOn(media, 'setMediaTime');
            jest.spyOn(media, 'removePauseEventListener');
            media.handleTimeupdateFromMediaControls(100.23);
            expect(media.setMediaTime).toBeCalledWith(100.23);
            expect(media.removePauseEventListener).toBeCalledTimes(1);
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        test('should add event listeners for time and volume updates, play and mute toggles, and speed change', () => {
            media.addEventListenersForMediaControls();

            expect(media.mediaControls.addListener).toBeCalledWith('timeupdate', expect.any(Function));
            expect(media.mediaControls.addListener).toBeCalledWith('volumeupdate', expect.any(Function));
            expect(media.mediaControls.addListener).toBeCalledWith('toggleplayback', expect.any(Function));
            expect(media.mediaControls.addListener).toBeCalledWith('togglemute', expect.any(Function));
            expect(media.mediaControls.addListener).toBeCalledWith('ratechange', expect.any(Function));
            expect(media.mediaControls.addListener).toBeCalledWith('autoplaychange', expect.any(Function));
        });
    });

    describe('setTimeCode()', () => {
        test('should set the current time in controls', () => {
            const currentTime = 1000;
            media.mediaEl = { currentTime };
            media.setTimeCode();

            expect(media.mediaControls.setTimeCode).toBeCalledWith(currentTime);
        });

        test('should re-render the react controls if they are available', () => {
            jest.spyOn(media, 'renderUI').mockImplementation();

            media.mediaControls = null;
            media.setTimeCode();

            expect(media.renderUI).toBeCalled();
        });
    });

    describe('setMediaTime()', () => {
        test('should set the time on the media element', () => {
            media.mediaEl = document.createElement('video');
            Object.defineProperty(media.mediaEl, 'duration', { value: 4, writable: true });
            const newTime = 3.14;

            media.setMediaTime(newTime);

            expect(media.mediaEl.currentTime).toBe(newTime);
        });
    });

    describe('setVolume()', () => {
        test('should set volume', () => {
            jest.spyOn(media, 'handleVolume').mockImplementation();
            jest.spyOn(media.cache, 'set').mockImplementation();
            const newVol = 0.159;
            media.setVolume(newVol);
            expect(media.cache.set).toBeCalledWith('media-volume', newVol, true);
            expect(media.handleVolume).toBeCalled();
        });
    });

    describe('updateVolumeIcon()', () => {
        test('should update the controls volume icon', () => {
            const volume = 0.5;
            media.mediaEl = { volume };
            media.updateVolumeIcon();

            expect(media.mediaControls.updateVolumeIcon).toBeCalledWith(volume);
        });

        test('should re-render the react controls if they are available', () => {
            jest.spyOn(media, 'renderUI').mockImplementation();

            media.mediaControls = null;
            media.updateVolumeIcon();

            expect(media.renderUI).toBeCalled();
        });
    });

    describe('playingHandler()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'emit').mockImplementation();
            jest.spyOn(media, 'handleRate').mockImplementation();
            jest.spyOn(media, 'handleVolume').mockImplementation();
            jest.spyOn(media, 'hideLoadingIcon').mockImplementation();
            jest.spyOn(media, 'renderUI').mockImplementation();
        });

        test('should show pause icon, hide loading icon, and handle speed and volume', () => {
            media.playingHandler();

            expect(media.mediaControls.showPauseIcon).toBeCalled();
            expect(media.hideLoadingIcon).toBeCalled();
            expect(media.handleRate).toBeCalled();
            expect(media.handleVolume).toBeCalled();
            expect(media.emit).toBeCalledWith('play');
        });

        test('should re-render the react controls if they are available', () => {
            media.mediaControls = null;
            media.playingHandler();

            expect(media.renderUI).toBeCalled();
        });
    });

    describe('progressHandler()', () => {
        test('should update controls progress', () => {
            media.progressHandler();

            expect(media.mediaControls.updateProgress).toBeCalled();
        });

        test('should re-render the react controls if they are available', () => {
            jest.spyOn(media, 'renderUI').mockImplementation();

            media.mediaControls = null;
            media.progressHandler();

            expect(media.renderUI).toBeCalled();
        });
    });

    describe('pauseHandler()', () => {
        test('should show the controls play icon', () => {
            media.pauseHandler();

            expect(media.mediaControls.showPlayIcon).toBeCalled();
        });

        test('should re-render the react controls if they are available', () => {
            jest.spyOn(media, 'renderUI').mockImplementation();

            media.mediaControls = null;
            media.pauseHandler();

            expect(media.renderUI).toBeCalled();
        });
    });

    describe('seekHandler()', () => {
        test('should hide loading icon and emit current time', () => {
            jest.spyOn(media, 'hideLoadingIcon');
            const currentTime = 20;
            media.mediaEl = { currentTime };
            stubs.debouncedEmit = jest.spyOn(media, 'debouncedEmit');

            expect(media.metrics.seeked).toBe(false);

            media.seekHandler();

            expect(media.hideLoadingIcon).toBeCalled();
            expect(media.debouncedEmit).toBeCalledWith('seeked', currentTime);
            expect(media.metrics.seeked).toBe(true);
        });
    });

    describe('mediaendHandler()', () => {
        test('emit the mediaendautoplay event if autoplay is enabled', () => {
            jest.spyOn(media, 'isAutoplayEnabled').mockReturnValue(false);
            jest.spyOn(media, 'emit');
            jest.spyOn(media, 'resetPlayIcon');

            media.mediaendHandler();
            expect(media.isAutoplayEnabled).toBeCalled();
            expect(media.emit).not.toBeCalled();

            media.isAutoplayEnabled.mockReturnValue(true);

            media.mediaendHandler();
            expect(media.emit).toBeCalledWith(VIEWER_EVENT.mediaEndAutoplay);
            expect(media.resetPlayIcon).toBeCalled();
        });
    });

    describe('showPlayButton', () => {
        test('should show the play button if it exists', () => {
            media.playButtonEl = document.createElement('button');
            media.playButtonEl.classList.add('bp-is-hidden');
            media.showPlayButton();
            expect(media.playButtonEl.classList.contains('bp-is-hidden')).toBe(false);
        });
    });

    describe('hidePlayButton', () => {
        test('should hide the play button if it exists', () => {
            media.playButtonEl = document.createElement('button');
            media.hidePlayButton();
            expect(media.playButtonEl.classList.contains('bp-is-hidden')).toBe(true);
        });
    });

    describe('resetPlayIcon()', () => {
        test('should set media controls timecode, hide loading icon, and pause', () => {
            jest.spyOn(media, 'hideLoadingIcon');
            jest.spyOn(media, 'pauseHandler');

            media.resetPlayIcon();

            expect(media.mediaControls.setTimeCode).toBeCalledWith(0);
            expect(media.hideLoadingIcon).toBeCalled();
            expect(media.pauseHandler).toBeCalled();
        });
    });

    describe('isValidTime', () => {
        test('should validate time parameter', () => {
            media.mediaEl = { duration: 100 };
            const nullCheck = media.isValidTime(null);
            const undefinedCheck = media.isValidTime(undefined);
            const stringCheck = media.isValidTime('abc');
            const InfinityCheck = media.isValidTime(Infinity);
            const durationCheck = media.isValidTime(105);
            const numberCheck = media.isValidTime(50);

            expect(nullCheck).toBe(false);
            expect(undefinedCheck).toBe(false);
            expect(stringCheck).toBe(false);
            expect(InfinityCheck).toBe(false);
            expect(durationCheck).toBe(false);
            expect(numberCheck).toBe(true);
        });
    });

    describe('removePauseEventListener()', () => {
        test('should remove pause event listener if it exists', () => {
            let pauseListener = null;
            media.mediaEl = { removeEventListener: jest.fn() };

            media.pauseListener = pauseListener;
            media.removePauseEventListener();
            expect(media.mediaEl.removeEventListener).not.toBeCalled();

            pauseListener = () => {};
            media.pauseListener = pauseListener;
            media.removePauseEventListener();
            expect(media.mediaEl.removeEventListener).toBeCalledWith('timeupdate', pauseListener);
        });
    });

    describe('play()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'emit').mockImplementation();
            jest.spyOn(media, 'handleRate').mockImplementation();
            jest.spyOn(media, 'handleVolume').mockImplementation();
            jest.spyOn(media, 'pause').mockImplementation();
            jest.spyOn(media, 'removePauseEventListener').mockImplementation();
            jest.spyOn(media, 'setMediaTime').mockImplementation();

            media.mediaEl = { play: jest.fn().mockResolvedValue(null) };
        });

        test('should play the media when no time parameters are passed', () => {
            media.play();

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.mediaEl.play).toBeCalledTimes(1);
            expect(media.handleRate).toBeCalledTimes(1);
            expect(media.handleVolume).toBeCalledTimes(1);
        });

        test('should start playing from start time without pausing, when only one parameter is passed', () => {
            jest.spyOn(media, 'isValidTime')
                .mockImplementation()
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);
            media.play(100);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(100);
            expect(media.mediaEl.play).toBeCalledTimes(1);
            expect(media.handleRate).toBeCalledTimes(1);
            expect(media.handleVolume).toBeCalledTimes(1);
            expect(media.pause).toBeCalledTimes(0);
        });

        test('should start playing from start time and pause at end time', () => {
            jest.spyOn(media, 'isValidTime').mockReturnValue(true);
            media.play(100, 200);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(100);
            expect(media.pause).toBeCalledWith(200);
            expect(media.mediaEl.play).toBeCalledTimes(1);
            expect(media.handleRate).toBeCalledTimes(1);
            expect(media.handleVolume).toBeCalledTimes(1);
        });

        test('should ignore when invalid time parameters are passed', () => {
            jest.spyOn(media, 'isValidTime').mockReturnValue(false);
            media.play(200, 100);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledTimes(0);
            expect(media.pause).toBeCalledTimes(0);
            expect(media.mediaEl.play).toBeCalledTimes(0);
            expect(media.emit).toBeCalledTimes(0);
            expect(media.handleRate).toBeCalledTimes(0);
            expect(media.handleVolume).toBeCalledTimes(0);
        });
    });

    describe('pause()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'emit').mockImplementation();
            jest.spyOn(media, 'removePauseEventListener').mockImplementation();
        });

        test('should pause the media when no time parameter is passed', () => {
            const pauseListener = () => {}; // eslint-disable-line require-jsdoc
            media.mediaEl = {
                duration: 100,
                pause: jest.fn(),
            };
            media.pauseListener = pauseListener;
            media.pause();

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.mediaEl.pause).toBeCalledTimes(1);
            expect(media.emit).toBeCalledWith('pause', {
                userInitiated: false,
            });
        });

        test('should update userInitiated flag IF the pause has been triggered by user interaction', () => {
            media.mediaEl = {
                duration: 100,
                pause: jest.fn(),
            };
            media.pause(undefined, true);

            expect(media.emit).toBeCalledWith('pause', {
                userInitiated: true,
            });
        });

        test('should add eventListener to pause the media when valid time parameter is passed', () => {
            const pauseListener = () => {}; // eslint-disable-line require-jsdoc
            media.mediaEl = {
                duration: 100,
                addEventListener: jest.fn(),
            };
            media.pauseListener = pauseListener;
            media.pause(100);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.mediaEl.addEventListener).toBeCalledTimes(1);
        });
    });

    describe('togglePlay()', () => {
        beforeEach(() => {
            jest.spyOn(media, 'pause').mockImplementation();
            jest.spyOn(media, 'play').mockImplementation();
        });

        test('should pause if media element was playing', () => {
            media.mediaEl = { paused: false };
            media.togglePlay();
            expect(media.pause).toBeCalledTimes(1);
            expect(media.play).toBeCalledTimes(0);
        });

        test('should play if media element was paused', () => {
            media.mediaEl = { paused: true };
            media.togglePlay();
            expect(media.pause).toBeCalledTimes(0);
            expect(media.play).toBeCalledTimes(1);
        });
    });

    describe('toggleMute()', () => {
        test('should mute if volume was on', () => {
            jest.spyOn(media.cache, 'set');

            media.mediaEl = {
                volume: 0.3,
            };

            media.toggleMute();

            expect(media.cache.set).toBeCalledWith('media-volume', 0, true);
        });

        test('should restore old volume if volume was muted', () => {
            jest.spyOn(media.cache, 'set');

            const oldVol = 0.3;
            media.mediaEl = {
                volume: 0,
            };
            media.oldVolume = oldVol;

            media.toggleMute();

            expect(media.cache.set).toBeCalledWith('media-volume', oldVol, true);
        });

        test('should leave no change if called twice', () => {
            jest.spyOn(media.cache, 'set');

            const vol = 0.3;
            media.mediaEl = {
                volume: vol,
            };

            media.toggleMute();
            media.toggleMute();

            expect(media.cache.set).toBeCalledWith('media-volume', 0, true);
        });
    });

    describe('hideLoadingIcon()', () => {
        test('should add the loaded class to the container', () => {
            media.hideLoadingIcon();
            expect(media.containerEl.classList.contains('bp-is-buffering')).toBe(false);
        });
    });

    describe('showLoadingIcon()', () => {
        test('should remove the loaded class and hide the play button if media is not paused nor ended', () => {
            media.mediaEl = {
                paused: false,
                ended: false,
            };
            jest.spyOn(media, 'hidePlayButton');

            media.showLoadingIcon();

            expect(media.hidePlayButton).toBeCalled();
            expect(media.containerEl.classList.contains('bp-is-buffering')).toBe(true);
        });
    });

    describe('addEventListenersForMediaElement()', () => {
        test('should add event listeners to media element', () => {
            media.mediaEl = {
                addEventListener: jest.fn(),
            };

            media.addEventListenersForMediaElement();

            expect(media.mediaEl.addEventListener).toBeCalledTimes(7);
        });
    });

    describe('quickSeek()', () => {
        test('should seek with positive increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60,
            };
            jest.spyOn(media, 'setMediaTime');
            jest.spyOn(media, 'removePauseEventListener');

            media.quickSeek(5);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(35);
        });

        test('should seek with negative increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60,
            };
            jest.spyOn(media, 'setMediaTime');
            jest.spyOn(media, 'removePauseEventListener');

            media.quickSeek(-5);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(25);
        });

        test('should not go beyond beginning of video', () => {
            media.mediaEl = {
                currentTime: 3,
                duration: 60,
            };
            jest.spyOn(media, 'setMediaTime');
            jest.spyOn(media, 'removePauseEventListener');

            media.quickSeek(-5);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(0);
        });

        test('should not go beyond end of video', () => {
            media.mediaEl = {
                currentTime: 57,
                duration: 60,
            };
            jest.spyOn(media, 'setMediaTime');
            jest.spyOn(media, 'removePauseEventListener');

            media.quickSeek(5);

            expect(media.removePauseEventListener).toBeCalledTimes(1);
            expect(media.setMediaTime).toBeCalledWith(60);
        });
    });

    describe('increaseVolume', () => {
        test('should not exceed maximum volume', () => {
            media.mediaEl = {
                volume: 0.99,
            };
            jest.spyOn(media, 'setVolume');

            media.increaseVolume();

            expect(media.setVolume).toBeCalledWith(1);
        });
    });

    describe('decreaseVolume', () => {
        test('should not fall below minimum volume', () => {
            media.mediaEl = {
                volume: 0.01,
            };
            jest.spyOn(media, 'setVolume');

            media.decreaseVolume();

            expect(media.setVolume).toBeCalledWith(0);
        });
    });

    describe('onKeydown()', () => {
        test('should return false if media controls are not initialized', () => {
            media.mediaControls = null;
            expect(media.onKeydown()).toBe(false);
        });
    });

    describe('handleKeydown', () => {
        test('should add keyboard-focus class on tab and return false', () => {
            expect(media.handleKeydown('Tab')).toBe(false);
            expect(media.mediaContainerEl).toHaveClass(CLASS_ELEM_KEYBOARD_FOCUS);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should add keyboard-focus class on shift+tab and return false', () => {
            expect(media.handleKeydown('Shift+Tab')).toBe(false);
            expect(media.mediaContainerEl).toHaveClass(CLASS_ELEM_KEYBOARD_FOCUS);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle play and return true on Space', () => {
            jest.spyOn(media, 'togglePlay').mockImplementation();

            expect(media.handleKeydown('Space')).toBe(true);
            expect(media.togglePlay).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle play and return true on k', () => {
            jest.spyOn(media, 'togglePlay').mockImplementation();

            expect(media.handleKeydown('k')).toBe(true);
            expect(media.togglePlay).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek backwards 5 seconds and return true on ArrowLeft', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('ArrowLeft')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(-5);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should lower volume on ArrowLeft if volume scrubber is focused', () => {
            media.mediaControls.isVolumeScrubberFocused = jest.fn(() => true);
            jest.spyOn(media, 'decreaseVolume').mockImplementation();

            expect(media.handleKeydown('ArrowLeft')).toBe(true);
            expect(media.decreaseVolume).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek backwards 10 seconds and return true on j', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('j')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(-10);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek forwards 5 seconds and return true on ArrowRight', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('ArrowRight')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(5);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should increase volume on ArrowRight if volume scrubber is focused', () => {
            media.mediaControls.isVolumeScrubberFocused = jest.fn(() => true);
            jest.spyOn(media, 'increaseVolume').mockImplementation();

            expect(media.handleKeydown('ArrowRight')).toBe(true);
            expect(media.increaseVolume).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek forwards 10 seconds and return true on l', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('l')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(10);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should go to beginning of media and return true on 0', () => {
            jest.spyOn(media, 'setMediaTime').mockImplementation();

            expect(media.handleKeydown('0')).toBe(true);
            expect(media.setMediaTime).toBeCalledWith(0);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should go to beginning of media and return true on Home', () => {
            jest.spyOn(media, 'setMediaTime').mockImplementation();

            expect(media.handleKeydown('Home')).toBe(true);
            expect(media.setMediaTime).toBeCalledWith(0);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should increase volume and return true on ArrowUp', () => {
            jest.spyOn(media, 'increaseVolume').mockImplementation();

            expect(media.handleKeydown('ArrowUp')).toBe(true);
            expect(media.increaseVolume).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek forwards 5 seconds on ArrowUp if time scrubber is focused', () => {
            media.mediaControls.isTimeScrubberFocused = jest.fn(() => true);
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('ArrowUp')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(5);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should decrease volume and return true on ArrowDown', () => {
            jest.spyOn(media, 'decreaseVolume').mockImplementation();

            expect(media.handleKeydown('ArrowDown')).toBe(true);
            expect(media.decreaseVolume).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should seek backwards 5 seconds on ArrowDown if time scrubber is focused', () => {
            media.mediaControls.isTimeScrubberFocused = jest.fn(() => true);
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydown('ArrowDown')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(-5);
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should increase speed and return true on Shift+>', () => {
            expect(media.handleKeydown('Shift+>')).toBe(true);
            expect(media.mediaControls.increaseSpeed).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should increase speed and return true on Shift+<', () => {
            expect(media.handleKeydown('Shift+<')).toBe(true);
            expect(media.mediaControls.decreaseSpeed).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle fullscreen and return true on f', () => {
            expect(media.handleKeydown('f')).toBe(true);
            expect(media.mediaControls.toggleFullscreen).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle fullscreen and return true on Shift+F', () => {
            expect(media.handleKeydown('Shift+F')).toBe(true);
            expect(media.mediaControls.toggleFullscreen).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle mute and return true on m', () => {
            jest.spyOn(media, 'toggleMute').mockImplementation();

            expect(media.handleKeydown('m')).toBe(true);
            expect(media.toggleMute).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle mute and return true on Shift+M', () => {
            jest.spyOn(media, 'toggleMute').mockImplementation();

            expect(media.handleKeydown('Shift+M')).toBe(true);
            expect(media.toggleMute).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle subtitles and return true on c', () => {
            expect(media.handleKeydown('c')).toBe(true);
            expect(media.mediaControls.toggleSubtitles).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should toggle subtitles and return true on Shift+C', () => {
            expect(media.handleKeydown('Shift+C')).toBe(true);
            expect(media.mediaControls.toggleSubtitles).toBeCalled();
            expect(media.mediaControls.show).toBeCalled();
        });

        test('should return false if another key is pressed', () => {
            expect(media.handleKeydown('Esc')).toBe(false);
            expect(media.mediaControls.show).toBeCalledTimes(0);
        });
    });

    describe('handleKeydownReact', () => {
        beforeEach(() => {
            jest.spyOn(media, 'renderUI').mockImplementation();
        });

        test('should toggle play and return true on Space', () => {
            jest.spyOn(media, 'togglePlay').mockImplementation();

            expect(media.handleKeydownReact('Space')).toBe(true);
            expect(media.togglePlay).toBeCalled();
        });

        test('should toggle play and return true on k', () => {
            jest.spyOn(media, 'togglePlay').mockImplementation();

            expect(media.handleKeydownReact('k')).toBe(true);
            expect(media.togglePlay).toBeCalled();
        });

        test('should seek backwards 5 seconds and return true on ArrowLeft', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydownReact('ArrowLeft')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(-5);
        });

        test('should seek backwards 10 seconds and return true on j', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydownReact('j')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(-10);
        });

        test('should seek forwards 5 seconds and return true on ArrowRight', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydownReact('ArrowRight')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(5);
        });

        test('should seek forwards 10 seconds and return true on l', () => {
            jest.spyOn(media, 'quickSeek').mockImplementation();

            expect(media.handleKeydownReact('l')).toBe(true);
            expect(media.quickSeek).toBeCalledWith(10);
        });

        test('should go to beginning of media and return true on 0', () => {
            jest.spyOn(media, 'setMediaTime').mockImplementation();

            expect(media.handleKeydownReact('0')).toBe(true);
            expect(media.setMediaTime).toBeCalledWith(0);
            expect(media.renderUI).toBeCalled();
        });

        test('should go to beginning of media and return true on Home', () => {
            jest.spyOn(media, 'setMediaTime').mockImplementation();

            expect(media.handleKeydownReact('Home')).toBe(true);
            expect(media.setMediaTime).toBeCalledWith(0);
            expect(media.renderUI).toBeCalled();
        });

        test('should increase volume and return true on ArrowUp', () => {
            jest.spyOn(media, 'increaseVolume').mockImplementation();

            expect(media.handleKeydownReact('ArrowUp')).toBe(true);
            expect(media.increaseVolume).toBeCalled();
        });

        test('should decrease volume and return true on ArrowDown', () => {
            jest.spyOn(media, 'decreaseVolume').mockImplementation();

            expect(media.handleKeydownReact('ArrowDown')).toBe(true);
            expect(media.decreaseVolume).toBeCalled();
        });

        test('should toggle mute and return true on m', () => {
            jest.spyOn(media, 'toggleMute').mockImplementation();

            expect(media.handleKeydownReact('m')).toBe(true);
            expect(media.toggleMute).toBeCalled();
        });

        test('should toggle mute and return true on Shift+M', () => {
            jest.spyOn(media, 'toggleMute').mockImplementation();

            expect(media.handleKeydownReact('Shift+M')).toBe(true);
            expect(media.toggleMute).toBeCalled();
        });

        test('should return false if another key is pressed', () => {
            expect(media.handleKeydownReact('Esc')).toBe(false);
        });
    });

    describe('getStartTimeInSeconds()', () => {
        test('should parse seconds', () => {
            const startAt = {
                unit: 'seconds',
                value: 55,
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(55);
        });

        test('should parse timestamp', () => {
            const startAt = {
                unit: 'timestamp',
                value: '1m2s',
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(62);
        });

        test('should return the default value if invalid unit', () => {
            jest.spyOn(console, 'error').mockImplementation();

            const startAt = {
                unit: 'foo',
                value: 55,
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(0);
        });

        test('should return the default value if invalid value', () => {
            const startAt = {
                unit: 'seconds',
                value: 'foo',
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(0);
        });

        test('should return the default value if invalid startAt', () => {
            let startAt = {
                value: 'foo',
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(0);

            startAt = {
                unit: 'seconds',
            };

            expect(media.getStartTimeInSeconds(startAt)).toBe(0);
        });
    });

    describe('convertTimestampToSeconds()', () => {
        const ONE_MINUTE_IN_SECONDS = 60;
        const ONE_HOUR_IN_SECONDS = 60 * ONE_MINUTE_IN_SECONDS;

        test('should parse the timestamp with just seconds', () => {
            const timestamp = '3s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(3);
        });

        test('should parse the timestamp with just seconds and ms as floating point', () => {
            const timestamp = '3.5432s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(3.5432);
        });

        test('should parse the timestamp with minutes, and seconds', () => {
            const timestamp = '2m3s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(2 * ONE_MINUTE_IN_SECONDS + 3);
        });

        test('should parse the timestamp with hours and seconds', () => {
            const timestamp = '4h3s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(4 * ONE_HOUR_IN_SECONDS + 3);
        });

        test('should parse the timestamp with just minutes', () => {
            const timestamp = '4m';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(4 * ONE_MINUTE_IN_SECONDS);
        });

        test('should parse the timestamp with hours and minutes', () => {
            const timestamp = '6h7m';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(
                6 * ONE_HOUR_IN_SECONDS + 7 * ONE_MINUTE_IN_SECONDS,
            );
        });

        test('should parse the timestamp with just hours', () => {
            const timestamp = '8h';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(8 * ONE_HOUR_IN_SECONDS);
        });

        test('should parse the timestamp with hours, minutes and seconds', () => {
            const timestamp = '5h30m15s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(
                5 * ONE_HOUR_IN_SECONDS + 30 * ONE_MINUTE_IN_SECONDS + 15,
            );
        });

        test('should parse the timestamp with hours, minutes, and seconds', () => {
            const timestamp = '5h30m15s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(
                5 * ONE_HOUR_IN_SECONDS + 30 * ONE_MINUTE_IN_SECONDS + 15,
            );
        });

        test('should parse the timestamp with hours, minutes, seconds (large values and decimal)', () => {
            const timestamp = '5h75m653.546s';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(
                5 * ONE_HOUR_IN_SECONDS + 75 * ONE_MINUTE_IN_SECONDS + 653.546,
            );
        });

        test('should return 0 if invalid string passed', () => {
            let timestamp = '5h3m2s5d';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(0);

            timestamp = '5h3m2ss';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(0);

            timestamp = '5hms';
            expect(media.convertTimestampToSeconds(timestamp)).toBe(0);

            expect(media.convertTimestampToSeconds()).toBe(0);

            expect(media.convertTimestampToSeconds('fdsfds')).toBe(0);

            expect(media.convertTimestampToSeconds('ah1m3s')).toBe(0);
        });
    });

    describe('handleLoadStart()', () => {
        test('should start the timer', () => {
            jest.spyOn(Timer, 'createTag').mockReturnValue('foo');
            jest.spyOn(Timer, 'start');

            media.handleLoadStart();

            expect(Timer.createTag).toBeCalledWith(1, 'bufferFill');
            expect(Timer.start).toBeCalledWith('foo');
        });
    });

    describe('handleCanPlay()', () => {
        test('should stop the timer and process the metrics', () => {
            jest.spyOn(Timer, 'createTag').mockReturnValue('foo');
            jest.spyOn(Timer, 'stop');
            jest.spyOn(media, 'processBufferFillMetric');

            media.mediaEl = { removeEventListener: jest.fn() };

            media.handleCanPlay();

            expect(Timer.stop).toBeCalledWith('foo');
            expect(media.mediaEl.removeEventListener).toBeCalledWith('canplay', media.handleCanPlay);
            expect(media.processBufferFillMetric).toBeCalled();
        });
    });

    describe('getMetricsWhitelist()', () => {
        test('should whitelist bufferFill and endPlayback metrics', () => {
            const expWhitelist = ['media_metric_buffer_fill', 'media_metric_end_playback'];

            expect(media.getMetricsWhitelist()).toEqual(expWhitelist);
        });
    });
});
