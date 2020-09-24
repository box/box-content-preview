/* eslint-disable no-unused-expressions */
import MediaControls from '../MediaControls';
import fullscreen from '../../../Fullscreen';
import Settings from '../Settings';
import Scrubber from '../Scrubber';
import * as util from '../../../util';

let mediaControls;
let stubs;

const PLAYING_CLASS = 'bp-media-is-playing';
const CRAWLER =
    '<div class="bp-media-crawler-wrapper"><div class="bp-crawler"><div></div><div></div><div></div></div></div>';

describe('lib/viewers/media/MediaControls', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fixture.load('viewers/media/__tests__/MediaControls-test.html');
        stubs = {};
    });

    afterEach(() => {
        fixture.cleanup();
        stubs = null;

        if (typeof mediaControls.destroy() === 'function') {
            mediaControls.destroy();
        }

        mediaControls = null;
    });

    describe('constructor()', () => {
        beforeEach(() => {
            stubs.insertTemplate = jest.spyOn(util, 'insertTemplate').mockImplementation();
            mediaControls = new MediaControls(
                document.getElementById('test-controls-container'),
                { duration: 1210 },
                {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {},
                },
            );
        });

        test('should insert the DOM template', () => {
            expect(stubs.insertTemplate).toBeCalled();
        });

        test('should set the duration', () => {
            expect(mediaControls.durationEl.textContent).toBe('20:10');
        });

        test('should set labels on the appropriate elements', () => {
            expect(mediaControls.playButtonEl.getAttribute('title')).toBe(__('media_play'));
            expect(mediaControls.playButtonEl.getAttribute('aria-label')).toBe(__('media_play'));

            expect(mediaControls.volButtonEl.getAttribute('title')).toBe(__('media_mute'));
            expect(mediaControls.volButtonEl.getAttribute('aria-label')).toBe(__('media_mute'));

            expect(mediaControls.fullscreenButtonEl.getAttribute('title')).toBe(__('enter_fullscreen'));
            expect(mediaControls.fullscreenButtonEl.getAttribute('aria-label')).toBe(__('enter_fullscreen'));

            expect(mediaControls.settingsButtonEl.getAttribute('title')).toBe(__('media_settings'));
            expect(mediaControls.settingsButtonEl.getAttribute('aria-label')).toBe(__('media_settings'));

            expect(mediaControls.subtitlesButtonEl.getAttribute('title')).toBe(__('media_subtitles_cc'));
            expect(mediaControls.subtitlesButtonEl.getAttribute('aria-label')).toBe(__('media_subtitles_cc'));

            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuenow')).toBe('0');
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuetext')).toBe('0:00 of 20:10');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuenow')).toBe('100');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuetext')).toBe('100% Volume');
        });
    });

    beforeEach(() => {
        mediaControls = new MediaControls(
            document.getElementById('test-controls-container'),
            { duration: 10 },
            {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {},
            },
        );
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.removeAllListeners = jest.spyOn(mediaControls, 'removeAllListeners');
            stubs.removeVolumeScrubberWrapperExpansionHandlers = jest.spyOn(
                mediaControls,
                'removeVolumeScrubberWrapperExpansionHandlers',
            );
            stubs.removeEventListener = jest.spyOn(document, 'removeEventListener');
            stubs.removeActivationListener = jest.spyOn(util, 'removeActivationListener');
            stubs.timeScrubberElShowHandler = jest.fn();

            stubs.genericEl = {
                getHandleEl: jest.fn().mockReturnValue({
                    removeEventListener: jest.fn(),
                }),
                getConvertedEl: jest.fn().mockReturnValue({
                    removeEventListener: jest.fn(),
                }),
                destroy: jest.fn(),
                removeListener: jest.fn(),
                removeEventListener: jest.fn(),
            };

            stubs.timeScrubberEl = {
                removeEventListener: jest.fn(),
            };
        });

        test('should remove all listeners', () => {
            mediaControls.destroy();

            expect(stubs.removeAllListeners).toBeCalled();
            expect(stubs.removeVolumeScrubberWrapperExpansionHandlers).toBeCalled();
            expect(stubs.removeEventListener).toBeCalledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).toBeCalledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        test('should remove time scrubber event listeners if it exists', () => {
            mediaControls.timeScrubber = false;
            mediaControls.timeScrubberEl = null;
            mediaControls.destroy();
            expect(mediaControls.timeScrubber).toBe(false);

            mediaControls.timeScrubber = stubs.genericEl;

            mediaControls.timeScrubberEl = stubs.timeScrubberEl;
            mediaControls.timeScrubberElShowHandler = stubs.timeScrubberElShowHandler;

            mediaControls.destroy();

            expect(stubs.genericEl.getHandleEl().removeEventListener).toBeCalledWith(
                'mousedown',
                mediaControls.timeScrubbingStartHandler,
            );
            expect(stubs.timeScrubberEl.removeEventListener).toBeCalledWith(
                'mousemove',
                stubs.timeScrubberElShowHandler,
            );
            expect(stubs.timeScrubberEl.removeEventListener).toBeCalledWith(
                'mouseleave',
                mediaControls.filmstripHideHandler,
            );
            expect(stubs.genericEl.destroy).toBeCalled();
            expect(mediaControls.timeScrubber).toBeUndefined();
        });

        test('should destroy the volume scrubber', () => {
            mediaControls.volScrubber = stubs.genericEl;

            mediaControls.destroy();
            expect(stubs.genericEl.destroy).toBeCalled();
            expect(mediaControls.volScrubber).toBeUndefined();
        });

        test('should remove listeners and destroy the settings object', () => {
            mediaControls.settings = stubs.genericEl;

            mediaControls.destroy();
            expect(stubs.genericEl.removeListener).toBeCalledWith('quality', mediaControls.handleQuality);
            expect(stubs.genericEl.removeListener).toBeCalledWith('speed', mediaControls.handleRate);
            expect(stubs.genericEl.removeListener).toBeCalledWith('autoplay', mediaControls.handleAutoplay);

            expect(stubs.genericEl.destroy);
            expect(mediaControls.settings).toBeUndefined();
        });

        test('should remove event listeners from the fullscreen, play, volume, scrubber, and settings button elements', () => {
            mediaControls.fullscreenButtonEl = stubs.genericEl;
            mediaControls.settingsButtonEl = stubs.genericEl;
            mediaControls.volButtonEl = stubs.genericEl;
            mediaControls.playButtonEl = stubs.genericEl;
            mediaControls.subtitlesButtonEl = stubs.genericEl;
            mediaControls.wrapperEl = stubs.genericEl;

            mediaControls.destroy();

            expect(stubs.removeActivationListener).toBeCalledWith(stubs.genericEl, mediaControls.togglePlayHandler);
            expect(stubs.removeActivationListener).toBeCalledWith(stubs.genericEl, mediaControls.toggleMuteHandler);
            expect(stubs.removeActivationListener).toBeCalledWith(
                stubs.genericEl,
                mediaControls.toggleFullscreenHandler,
            );
            expect(stubs.removeActivationListener).toBeCalledWith(stubs.genericEl, mediaControls.toggleSettingsHandler);
            expect(stubs.removeActivationListener).toBeCalledWith(
                stubs.genericEl,
                mediaControls.toggleSubtitlesHandler,
            );
        });
    });

    describe('handleRate()', () => {
        test('should emit the ratechange event', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.handleRate();
            expect(stubs.emit).toBeCalledWith('ratechange');
        });
    });

    describe('handleQuality()', () => {
        test('should emit the qualitychange event', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.handleQuality();
            expect(stubs.emit).toBeCalledWith('qualitychange');
        });
    });

    describe('handleAutoplay()', () => {
        test('should emit the autoplay event', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.handleAutoplay();
            expect(stubs.emit).toBeCalledWith('autoplaychange');
        });
    });

    describe('handleSubtitle()', () => {
        test('should emit the subtitlechange event', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.handleSubtitle();
            expect(stubs.emit).toBeCalledWith('subtitlechange');
        });
    });

    describe('setupSettings()', () => {
        test('should create a settings obect and bind listeners', () => {
            const settingsStub = jest.spyOn(Settings.prototype, 'addListener');

            mediaControls.setupSettings();
            expect(mediaControls.settings instanceof Settings);
            expect(settingsStub).toBeCalledWith('quality', mediaControls.handleQuality);
            expect(settingsStub).toBeCalledWith('speed', mediaControls.handleRate);
            expect(settingsStub).toBeCalledWith('autoplay', mediaControls.handleAutoplay);
        });
    });

    describe('setupScrubbers()', () => {
        beforeEach(() => {
            stubs.on = jest.spyOn(Scrubber.prototype, 'on');
        });

        test('should create a new scrubber and value change handler for time', () => {
            mediaControls.setupScrubbers();
            expect(mediaControls.timeScrubber instanceof Scrubber);
            expect(stubs.on).toBeCalledWith('valuechange', expect.any(Function));
        });

        test('should create a new scrubber and value change handler for volume', () => {
            mediaControls.setupScrubbers();
            expect(mediaControls.volumeScrubber instanceof Scrubber);
            expect(stubs.on).toBeCalledWith('valuechange', expect.any(Function));
        });
    });

    describe('getTimeFromScrubber()', () => {
        test('should compute the right time', () => {
            mediaControls.mediaEl = {
                duration: 100,
            };
            mediaControls.setupScrubbers();
            jest.spyOn(mediaControls.timeScrubber, 'getValue').mockReturnValue(0.3);

            const time = mediaControls.getTimeFromScrubber();

            expect(time).toBe(30);
        });
    });

    describe('formatTime()', () => {
        test('should correctly format 3 hours', () => {
            const result = mediaControls.formatTime(10800);
            expect(result).toBe('3:00:00');
        });

        test('should correctly format the time', () => {
            const result = mediaControls.formatTime(11211);
            expect(result).toBe('3:06:51');
        });

        test('should correctly format when double-digit minutes', () => {
            const result = mediaControls.formatTime(705);
            expect(result).toBe('11:45');
        });

        test('should correctly format when single-digit minutes', () => {
            const result = mediaControls.formatTime(105);
            expect(result).toBe('1:45');
        });

        test('should correctly format when 0 minutes', () => {
            const result = mediaControls.formatTime(9);
            expect(result).toBe('0:09');
        });

        test('should correctly format 0 seconds', () => {
            const result = mediaControls.formatTime(0);
            expect(result).toBe('0:00');
        });
    });

    describe('setDuration()', () => {
        beforeEach(() => {
            mediaControls.durationEl = {
                textContent: '',
            };
            stubs.formatTime = jest.spyOn(mediaControls, 'formatTime');
        });

        test('should set the text content of the duration element', () => {
            mediaControls.setDuration(10800);
            expect(stubs.formatTime).toBeCalledWith(10800);
        });

        test('should set the text content to 0 if there is no time', () => {
            mediaControls.setDuration(undefined);
            expect(stubs.formatTime).toBeCalledWith(0);
        });
    });

    describe('setTimeCode()', () => {
        beforeEach(() => {
            mediaControls.mediaEl = {
                textContent: '',
                duration: 500,
            };
            mediaControls.durationEl = {
                textContent: '8:20',
            };
            mediaControls.setupScrubbers();
            stubs.setValue = jest.spyOn(mediaControls.timeScrubber, 'setValue');
            stubs.formatTime = jest.spyOn(mediaControls, 'formatTime').mockReturnValue('4:10');
        });

        test('should set the value of the time scrubber and update the timecode El', () => {
            mediaControls.setTimeCode(250);
            expect(stubs.setValue).toBeCalledWith(0.5);
            expect(stubs.formatTime).toBeCalledWith(250);
        });

        test('should set correct aria values', () => {
            mediaControls.setTimeCode(250);
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuenow')).toBe('250');
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuetext')).toBe('4:10 of 8:20');
        });

        test('should set the value with 0 if no time is passed in', () => {
            mediaControls.setTimeCode(undefined);
            expect(stubs.setValue).toBeCalledWith(0);
            expect(stubs.formatTime).toBeCalledWith(0);
        });
    });

    describe('updateProgress()', () => {
        test('should correctly set the buffered value of the time scrubber', () => {
            mediaControls.mediaEl = {
                buffered: {
                    length: 5,
                    end: jest.fn().mockReturnValue(1),
                },
                duration: 1,
            };
            mediaControls.setupScrubbers();
            stubs.setBufferedValueStub = jest.spyOn(mediaControls.timeScrubber, 'setBufferedValue');

            mediaControls.updateProgress();
            expect(stubs.setBufferedValueStub).toBeCalledWith(1);
        });
    });

    describe('toggleMute()', () => {
        test('should emit a togglemute message', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.toggleMute();
            expect(stubs.emit).toBeCalledWith('togglemute');
        });
    });

    describe('togglePlay()', () => {
        test('should emit a toggleplayback message', () => {
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.togglePlay();
            expect(stubs.emit).toBeCalledWith('toggleplayback');
        });
    });

    describe('toggleSubtitles()', () => {
        test('should emit a togglesubtitles message', () => {
            jest.spyOn(mediaControls.settings, 'toggleSubtitles').mockImplementation();
            stubs.emit = jest.spyOn(mediaControls, 'emit');

            mediaControls.toggleSubtitles();

            expect(stubs.emit).toBeCalledWith('togglesubtitles');
            expect(mediaControls.settings.toggleSubtitles).toBeCalled();
        });
    });

    describe('toggleFullscreen()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(mediaControls, 'emit').mockImplementation();
        });

        test('should emit a togglefullscreen message', () => {
            mediaControls.toggleFullscreen();
            expect(stubs.emit).toBeCalledWith('togglefullscreen');
        });
    });

    describe('toggleFullscreenIcon()', () => {
        beforeEach(() => {
            stubs.isFullscreen = jest.spyOn(fullscreen, 'isFullscreen');
            stubs.setLabel = jest.spyOn(mediaControls, 'setLabel');
        });

        test('should set the label to exit fullscreen if in fullscreen', () => {
            stubs.isFullscreen.mockReturnValue(true);

            mediaControls.handleFullscreenEnter();
            expect(stubs.setLabel).toBeCalledWith(mediaControls.fullscreenButtonEl, __('exit_fullscreen'));
            expect(mediaControls.containerEl.classList.contains('bp-is-fullscreen')).toBe(true);
        });

        test("should set the label to enter fullscreen if it's not fullscreen", () => {
            stubs.isFullscreen.mockReturnValue(false);

            mediaControls.handleFullscreenExit();
            expect(stubs.setLabel).toBeCalledWith(mediaControls.fullscreenButtonEl, __('enter_fullscreen'));
            expect(mediaControls.containerEl.classList.contains('bp-is-fullscreen')).toBe(false);
        });
    });

    describe('toggleSettings()', () => {
        beforeEach(() => {
            stubs.show = jest.spyOn(mediaControls.settings, 'show');
            stubs.hide = jest.spyOn(mediaControls.settings, 'hide');
            stubs.isVisible = jest.spyOn(mediaControls, 'isSettingsVisible');
        });

        test('should hide the settings if they are visible', () => {
            stubs.isVisible.mockReturnValue(true);

            mediaControls.toggleSettings();
            expect(mediaControls.settings.hide).toBeCalled();
        });

        test('should show the settings if they are hidden', () => {
            stubs.isVisible.mockReturnValue(false);

            mediaControls.toggleSettings();
            expect(mediaControls.settings.show).toBeCalled();
        });
    });

    describe('setLabel()', () => {
        test('should set the aria label and the title of the given label', () => {
            const el = document.createElement('button');

            mediaControls.setLabel(el, 'test');
            expect(el.getAttribute('title')).toBe('test');
            expect(el.getAttribute('aria-label')).toBe('test');
        });
    });

    describe('isSettingsVisible()', () => {
        test('should return true if the settings exist and are visible', () => {
            stubs.isVisible = jest.spyOn(mediaControls.settings, 'isVisible').mockReturnValue(true);

            const result = mediaControls.isSettingsVisible();
            expect(stubs.isVisible).toBeCalled();
            expect(result).toBe(true);

            stubs.isVisible.mockReturnValue(false);
            const falseResult = mediaControls.isSettingsVisible();
            expect(falseResult).toBe(false);
        });
    });

    describe('showPauseIcon()', () => {
        test('should add the playing class to the wrapper el and update the label', () => {
            stubs.setLabel = jest.spyOn(mediaControls, 'setLabel');

            mediaControls.showPauseIcon();
            expect(mediaControls.wrapperEl.classList.contains(PLAYING_CLASS)).toBe(true);
            expect(stubs.setLabel).toBeCalledWith(mediaControls.playButtonEl, __('media_pause'));
        });
    });

    describe('showPlayIcon()', () => {
        test('should remove the playing class to the wrapper el and update the label', () => {
            stubs.setLabel = jest.spyOn(mediaControls, 'setLabel');

            mediaControls.showPlayIcon();
            expect(mediaControls.wrapperEl.classList.contains(PLAYING_CLASS)).toBe(false);
            expect(stubs.setLabel).toBeCalledWith(mediaControls.playButtonEl, __('media_play'));
        });
    });

    describe('updateVolumeIcon()', () => {
        beforeEach(() => {
            mediaControls.setupScrubbers();
            stubs.setValue = jest.spyOn(mediaControls.volScrubber, 'setValue');
            stubs.setLabel = jest.spyOn(mediaControls, 'setLabel');
        });

        test('should remove all volume level classes and add the correct one', () => {
            mediaControls.className = 'bp-media-volume-icon-is-low';

            mediaControls.updateVolumeIcon(1);
            expect(mediaControls.volButtonEl.classList.contains('bp-media-volume-icon-is-low')).toBe(false);
            expect(mediaControls.volButtonEl.classList.contains('bp-media-volume-icon-is-high')).toBe(true);
        });

        test('set the new value of the volume scrubber', () => {
            mediaControls.updateVolumeIcon(1);
            expect(stubs.setValue).toBeCalledWith(1);
        });

        test('should set the correct volume button level', () => {
            mediaControls.updateVolumeIcon(1);
            expect(stubs.setLabel).toBeCalledWith(mediaControls.volButtonEl, __('media_mute'));

            mediaControls.updateVolumeIcon(0);
            expect(stubs.setLabel).toBeCalledWith(mediaControls.volButtonEl, __('media_unmute'));
        });

        test('set the correct aria values', () => {
            mediaControls.updateVolumeIcon(0.31);
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuenow')).toBe('31');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuetext')).toBe('31% Volume');
        });
    });

    describe('attachEventHandlers()', () => {
        beforeEach(() => {
            stubs.wrapperAddEventListener = jest.spyOn(mediaControls.wrapperEl, 'addEventListener');
            stubs.addActivationListener = jest.spyOn(util, 'addActivationListener');
            stubs.addListener = jest.spyOn(fullscreen, 'addListener');
        });

        test('should add the correct event Liseners', () => {
            mediaControls.attachEventHandlers();
            expect(stubs.wrapperAddEventListener).toBeCalledWith('mouseenter', mediaControls.mouseenterHandler);
            expect(stubs.wrapperAddEventListener).toBeCalledWith('mouseleave', mediaControls.mouseleaveHandler);
            expect(stubs.addActivationListener).toBeCalledWith(
                mediaControls.playButtonEl,
                mediaControls.togglePlayHandler,
            );
            expect(stubs.addActivationListener).toBeCalledWith(
                mediaControls.volButtonEl,
                mediaControls.toggleMuteHandler,
            );
            expect(stubs.addActivationListener).toBeCalledWith(
                mediaControls.fullscreenButtonEl,
                mediaControls.toggleFullscreenHandler,
            );
            expect(stubs.addActivationListener).toBeCalledWith(
                mediaControls.settingsButtonEl,
                mediaControls.toggleSettingsHandler,
            );
            expect(stubs.addActivationListener).toBeCalledWith(
                mediaControls.subtitlesButtonEl,
                mediaControls.toggleSubtitlesHandler,
            );
            expect(stubs.addListener).toBeCalled();
        });
    });

    describe('mouseenterHandler()', () => {
        test('should set preventHiding to true and show the controls', () => {
            stubs.show = jest.spyOn(mediaControls, 'show');

            mediaControls.mouseenterHandler();
            expect(mediaControls.preventHiding).toBe(true);
            expect(stubs.show).toBeCalled();
        });
    });

    describe('mouseleaveHandler()', () => {
        test('should allow hiding via setHiding and show the controls', () => {
            stubs.show = jest.spyOn(mediaControls, 'show');

            mediaControls.mouseleaveHandler();
            expect(mediaControls.preventHiding).toBe(false);
            expect(stubs.show).toBeCalled();
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.showControlClass = 'bp-media-controls-is-visible';
            stubs.timeout = 2001;
            stubs.hide = jest.spyOn(mediaControls, 'hide');
        });

        test('should add the controls class to the wrapper element', () => {
            mediaControls.show();
            expect(mediaControls.wrapperEl.parentNode.classList.contains(stubs.showControlClass)).toBe(true);
        });

        test('should add the auto hide timeout', () => {
            mediaControls.show();
            expect(mediaControls.autoHideTimeout).toBeDefined();
        });

        test('should hide the controls after a timeout', () => {
            mediaControls.show();
            jest.advanceTimersByTime(stubs.timeout);
            expect(stubs.hide).toBeCalled();
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            stubs.isSettingsVisible = jest.spyOn(mediaControls, 'isSettingsVisible').mockImplementation();
            stubs.filmstripHideHandler = jest.spyOn(mediaControls, 'filmstripHideHandler').mockImplementation();
            stubs.show = jest.spyOn(mediaControls, 'show').mockImplementation();
        });

        test('should should call show and do nothing else if the prevent hiding is true', () => {
            mediaControls.preventHiding = true;

            mediaControls.hide();
            expect(stubs.show).toBeCalled();
        });

        test('should should call show and do nothing else if the settings are visible', () => {
            mediaControls.preventHiding = false;
            stubs.isSettingsVisible.mockReturnValue(true);

            mediaControls.hide();
            expect(stubs.show).toBeCalled();
        });

        test('should remove the show controls class if the wrapper element and parent exist', () => {
            mediaControls.preventHiding = false;
            stubs.isSettingsVisible.mockReturnValue(false);

            mediaControls.hide();
            expect(stubs.show).not.toBeCalled();
            expect(mediaControls.wrapperEl.parentNode.classList.contains('bp-media-controls-is-visible')).toBe(false);
        });

        test('should hide the filmstrip', () => {
            mediaControls.preventHiding = false;
            stubs.isSettingsVisible.mockReturnValue(false);
            mediaControls.filmstripEl = document.createElement('div');

            mediaControls.hide();
            expect(stubs.filmstripHideHandler).toBeCalled();
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.isVisible = jest.spyOn(mediaControls, 'isVisible');
            stubs.hide = jest.spyOn(mediaControls, 'hide');
            stubs.show = jest.spyOn(mediaControls, 'show');
        });

        test('should hide the settings and remove preventHiding if the controls are visible', () => {
            stubs.isVisible.mockReturnValue(true);

            mediaControls.toggle();
            expect(stubs.hide).toBeCalled();
            expect(mediaControls.preventHiding).toBe(false);
        });

        test('should show the controls if they are not visible', () => {
            stubs.isVisible.mockReturnValue(false);

            mediaControls.toggle();
            expect(stubs.show).toBeCalled();
        });
    });

    describe('isVisible()', () => {
        beforeEach(() => {
            stubs.wrapperParent = document.createElement('div');
            mediaControls.wrapperEl = stubs.wrapperParent.appendChild(document.createElement('div'));
        });

        test('should return false if the controls show class is missing', () => {
            const result = mediaControls.isVisible();
            expect(result).toBe(false);
        });

        test('should return true if the controls show class is present', () => {
            stubs.wrapperParent.classList.add('bp-media-controls-is-visible');
            const result = mediaControls.isVisible();
            expect(result).toBe(true);
        });
    });

    describe('resizeTimeScrubber()', () => {
        test('should resize the time scrubber', () => {
            mediaControls.setupScrubbers();
            stubs.resize = jest.spyOn(mediaControls.timeScrubber, 'resize');

            mediaControls.resizeTimeScrubber();
            expect(stubs.resize).toBeCalled();
        });
    });

    describe('setFilmstrip()', () => {
        test('should set the filmstrip source to the provided URL', () => {
            mediaControls.filmstripEl = {
                src: '',
            };

            mediaControls.filmstripUrl = 'testurl';

            mediaControls.setFilmstrip();
            expect(mediaControls.filmstripEl.src).toBe('testurl');
        });
    });

    describe('initFilmstrip()', () => {
        beforeEach(() => {
            stubs.status = {
                getPromise: jest.fn().mockResolvedValue(undefined),
            };
            mediaControls.setupScrubbers();
            stubs.handleElAddEventListener = jest.spyOn(mediaControls.timeScrubber.getHandleEl(), 'addEventListener');
            stubs.timeScrubberEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            };
            mediaControls.timeScrubberEl = stubs.timeScrubberEl;
            stubs.setFilmstrip = jest.spyOn(mediaControls, 'setFilmstrip');
        });

        test('should give the correct class and content to the filmstrip container', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripContainerEl.classList.contains('bp-media-filmstrip-container')).toBe(true);
            expect(mediaControls.filmstripContainerEl.innerHTML.includes(CRAWLER)).toBe(true);
        });

        test('should give the correct class to the filmstrip', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripEl.classList.contains('bp-media-filmstrip')).toBe(true);
        });

        test('should give the correct class to the filmstrip time element', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripTimeEl.classList.contains('bp-media-filmstrip-timecode')).toBe(true);
        });

        test('should add the correct eventListeners to the handle and converted time scrubber elements', () => {
            const spy = jest.spyOn(mediaControls, 'timeScrubberHandler').mockImplementation();
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(stubs.handleElAddEventListener).toBeCalledWith('mousedown', mediaControls.timeScrubbingStartHandler);
            expect(stubs.timeScrubberEl.addEventListener).toBeCalledWith(
                'mousemove',
                mediaControls.timeScrubberElShowHandler,
            );
            expect(stubs.timeScrubberEl.addEventListener).toBeCalledWith(
                'mouseleave',
                mediaControls.filmstripHideHandler,
            );
            expect(spy).toBeCalled();
        });

        test('should add the touchstart eventListener if touch is detected', () => {
            mediaControls.hasTouch = true;
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.timeScrubberEl.addEventListener).toBeCalledWith(
                'touchstart',
                mediaControls.timeScrubbingStartHandler,
            );
        });

        test('should add the onload function to the filmstrip', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(typeof mediaControls.filmstripEl.onload === 'function');
        });
    });

    describe('timeScrubbingStartHandler()', () => {
        test('should set isScrubbing to true, preventHiding to true, and add show and stop handlers', () => {
            stubs.addEventListener = jest.spyOn(document, 'addEventListener');

            mediaControls.timeScrubbingStartHandler();
            expect(mediaControls.isScrubbing).toBe(true);
            expect(mediaControls.preventHiding).toBe(true);
            expect(stubs.addEventListener).toBeCalledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.addEventListener).toBeCalledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        test('should add show and stop touch events if touch is present', () => {
            mediaControls.hasTouch = true;
            stubs.addEventListener = jest.spyOn(document, 'addEventListener');

            mediaControls.timeScrubbingStartHandler();
            expect(stubs.addEventListener).toBeCalledWith('touchend', mediaControls.timeScrubbingStopHandler);
            expect(stubs.addEventListener).toBeCalledWith('touchmove', mediaControls.show);
        });
    });

    describe('timeScrubbingStopHandler()', () => {
        beforeEach(() => {
            mediaControls.setupScrubbers();
            stubs.event = {
                target: mediaControls.timeScrubberEl.firstChild,
            };
            stubs.removeEventListener = jest.spyOn(document, 'removeEventListener');
            mediaControls.filmstripContainerEl = document.createElement('div');
        });

        test('should set isScrubbing to false, preventHiding to false, and remove show and stop handlers', () => {
            mediaControls.timeScrubbingStopHandler(stubs.event);
            expect(mediaControls.isScrubbing).toBe(false);
            expect(mediaControls.preventHiding).toBe(false);
            expect(stubs.removeEventListener).toBeCalledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).toBeCalledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        test('should remove touch show and stop handlers if touch is present', () => {
            mediaControls.hasTouch = true;
            mediaControls.timeScrubbingStopHandler(stubs.event);

            expect(stubs.removeEventListener).toBeCalledWith('touchend', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).toBeCalledWith('touchmove', mediaControls.show);
        });

        test('should hide the filmstrip if it is not being hovered over', () => {
            stubs.event.target = document.createElement('div');

            mediaControls.timeScrubbingStopHandler(stubs.event);
            expect(mediaControls.filmstripContainerEl.style.display).toBe('none');
        });
    });

    describe('filmstripShowHandler()', () => {
        beforeEach(() => {
            stubs.getBoundingClientRect = jest
                .spyOn(mediaControls.containerEl, 'getBoundingClientRect')
                .mockReturnValue({
                    left: 0,
                    width: 260,
                });
            stubs.event = {
                pageX: 100,
            };
            stubs.isSettingsVisible = jest.spyOn(mediaControls, 'isSettingsVisible');
            stubs.formatTime = jest.spyOn(mediaControls, 'formatTime');
            mediaControls.mediaEl = {
                duration: 3600,
            };
            stubs.status = {
                getPromise: jest.fn().mockResolvedValue(undefined),
            };

            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            jest.spyOn(mediaControls, 'computeFilmstripPositions').mockReturnValue({
                time: 10,
                left: -100,
                top: -180,
                containerLeft: 20,
            });
        });

        test('should do nothing if the settings are visible', () => {
            stubs.isSettingsVisible.mockReturnValue(true);

            mediaControls.filmstripShowHandler(stubs.event);
            expect(stubs.getBoundingClientRect).not.toBeCalled();
        });

        test('should correctly style the filmstrip and format the time element', () => {
            stubs.isSettingsVisible.mockReturnValue(false);

            mediaControls.filmstripShowHandler(stubs.event);
            expect(mediaControls.filmstripEl.style.left).toBe('-100px');
            expect(mediaControls.filmstripEl.style.top).toBe('-180px');
            expect(mediaControls.filmstripContainerEl.style.display).toBe('block');
            expect(mediaControls.filmstripContainerEl.style.left).toBe('20px');
            expect(stubs.formatTime).toBeCalledWith(10);
        });
    });

    describe('computeFilmstripPositions()', () => {
        test('should compute correct positions when filmstrip not ready', () => {
            mediaControls.mediaEl = {
                duration: 100,
            };
            mediaControls.filmstripInterval = 1;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.25);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, null);

            expect(positions.time).toBe(25);
            expect(positions.left).toBe(0);
            expect(positions.top === 0).toBe(true);
            expect(positions.containerLeft).toBe(120);
        });

        test('should compute correct horizontal offset into filmstrip', () => {
            mediaControls.mediaEl = {
                duration: 100,
            };
            mediaControls.filmstripInterval = 1;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.2);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, 16000);

            expect(positions.time).toBe(20);
            expect(positions.left).toBe(-3200);
            expect(positions.top === 0).toBe(true);
            expect(positions.containerLeft).toBe(120);
        });

        test('should compute correct vertical offset into filmstrip', () => {
            mediaControls.mediaEl = {
                duration: 1100,
            };
            mediaControls.filmstripInterval = 1;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.2);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, 16000);

            expect(positions.time).toBe(220);
            expect(positions.left).toBe(-3200);
            expect(positions.top).toBe(-180);
            expect(positions.containerLeft).toBe(120);
        });

        test('should compute correct offset into filmstrip with different interval', () => {
            mediaControls.mediaEl = {
                duration: 2000,
            };
            mediaControls.filmstripInterval = 5;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.6);

            const positions = mediaControls.computeFilmstripPositions(800, 200, 1000, 16000);

            expect(positions.time).toBe(1200);
            expect(positions.left).toBe(-6400);
            expect(positions.top).toBe(-180);
            expect(positions.containerLeft).toBe(520);
        });

        test('should compute correct container position when hovering near left boundary', () => {
            mediaControls.mediaEl = {
                duration: 100,
            };
            mediaControls.filmstripInterval = 1;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.01);

            const positions = mediaControls.computeFilmstripPositions(210, 200, 1000, 16000);

            expect(positions.time).toBe(1);
            expect(positions.left).toBe(-160);
            expect(positions.top === 0).toBe(true);
            expect(positions.containerLeft === 0).toBe(true);
        });

        test('should compute correct container position when hovering near right boundary', () => {
            mediaControls.mediaEl = {
                duration: 100,
            };
            mediaControls.filmstripInterval = 1;
            jest.spyOn(mediaControls.timeScrubber, 'computeScrubberPosition').mockReturnValue(0.99);

            const positions = mediaControls.computeFilmstripPositions(1190, 200, 1000, 16000);

            expect(positions.time).toBe(99);
            expect(positions.left).toBe(-15840);
            expect(positions.top === 0).toBe(true);
            expect(positions.containerLeft).toBe(840);
        });
    });

    describe('filmstripHideHandler()', () => {
        beforeEach(() => {
            stubs.status = {
                getPromise: jest.fn().mockResolvedValue(undefined),
            };

            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            mediaControls.isScrubbing = false;
        });

        test('should hide the filmstrip container if not scrubbing', () => {
            mediaControls.filmstripHideHandler();
            expect(mediaControls.filmstripContainerEl.style.display).toBe('none');
        });

        test('should do nothing if scrubbing', () => {
            mediaControls.isScrubbing = true;

            mediaControls.filmstripHideHandler();
            expect(mediaControls.filmstripContainerEl.style.display).toBe('');
        });

        test('should do nothing if there is no filmstrip', () => {
            mediaControls.isScrubbing = false;
            mediaControls.filmstripEl = null;

            mediaControls.filmstripHideHandler();
            expect(mediaControls.filmstripContainerEl.style.display).toBe('');
        });
    });

    describe('initSubtitles()', () => {
        test('should load subtitles', () => {
            jest.spyOn(mediaControls.settings, 'loadSubtitles');
            const language = 'English';
            const subs = ['English', 'Russian'];
            mediaControls.initSubtitles(subs, language);
            expect(mediaControls.settings.loadSubtitles).toBeCalledWith(subs, language);
        });
    });

    describe('initAlternateAudio()', () => {
        test('should load alternate audio', () => {
            jest.spyOn(mediaControls.settings, 'loadAlternateAudio');
            const audios = [
                { language: 'eng', role: 'audio0' },
                { language: 'rus', role: 'audio1' },
            ];
            mediaControls.initAlternateAudio(audios);
            expect(mediaControls.settings.loadAlternateAudio).toBeCalledWith(audios);
        });
    });

    describe('enableHDSettings()', () => {
        test('enable HD in the settings menu', () => {
            jest.spyOn(mediaControls.settings, 'enableHD');
            mediaControls.enableHDSettings();

            expect(mediaControls.settings.enableHD).toBeCalled();
        });
    });

    describe('timeScrubberHandler()', () => {
        let handler;
        beforeEach(() => {
            stubs.timeScrubberCallbackSpy = jest.fn();
            handler = mediaControls.timeScrubberHandler(stubs.timeScrubberCallbackSpy);

            stubs.playedEl = {
                removeEventListener: jest.fn(),
            };
            stubs.convertedEl = {
                removeEventListener: jest.fn(),
            };

            mediaControls.timeScrubber.playedEl = stubs.playedEl;
            mediaControls.timeScrubber.convertedEl = stubs.convertedEl;
        });

        test('should execute the callback when target is playedEl', () => {
            const eventStub = {
                target: stubs.playedEl,
            };
            handler(eventStub);
            expect(stubs.timeScrubberCallbackSpy).toBeCalled();
        });

        test('should execute the callback when target is convertedEl', () => {
            const eventStub = {
                target: stubs.convertedEl,
            };
            handler(eventStub);
            expect(stubs.timeScrubberCallbackSpy).toBeCalled();
        });

        test('should not execute the callback when target is not playedEl or convertedEl', () => {
            const eventStub = {
                target: jest.fn(),
            };
            handler(eventStub);
            expect(stubs.timeScrubberCallbackSpy).not.toBeCalled();
        });
    });
});
/* eslint-enable no-unused-expressions */
