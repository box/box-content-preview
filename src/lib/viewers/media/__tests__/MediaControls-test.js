/* eslint-disable no-unused-expressions */
import MediaControls from '../MediaControls';
import fullscreen from '../../../Fullscreen';
import Settings from '../Settings';
import Scrubber from '../Scrubber';
import * as util from '../../../util';

let mediaControls;
let stubs;
let clock;

const PLAYING_CLASS = 'bp-media-is-playing';
const CRAWLER =
    '<div class="bp-media-crawler-wrapper"><div class="bp-crawler"><div></div><div></div><div></div></div></div>';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/MediaControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        stubs = {};
        fixture.load('viewers/media/__tests__/MediaControls-test.html');
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
        stubs = null;

        if (typeof mediaControls.destroy() === 'function') {
            mediaControls.destroy();
        }

        mediaControls = null;
    });

    describe('constructor()', () => {
        beforeEach(() => {
            stubs.insertTemplate = sandbox.stub(util, 'insertTemplate');
            mediaControls = new MediaControls(
                document.getElementById('test-controls-container'),
                { duration: 1210 },
                {
                    set: () => {},
                    has: () => {},
                    get: () => {},
                    unset: () => {}
                }
            );
        });

        it('should insert the DOM template', () => {
            expect(stubs.insertTemplate).to.be.called;
        });

        it('should set the duration', () => {
            expect(mediaControls.durationEl.textContent).to.equal('20:10');
        });

        it('should set labels on the appropriate elements', () => {
            expect(mediaControls.playButtonEl.getAttribute('title')).to.equal(__('media_play'));
            expect(mediaControls.playButtonEl.getAttribute('aria-label')).to.equal(__('media_play'));

            expect(mediaControls.volButtonEl.getAttribute('title')).to.equal(__('media_mute'));
            expect(mediaControls.volButtonEl.getAttribute('aria-label')).to.equal(__('media_mute'));

            expect(mediaControls.fullscreenButtonEl.getAttribute('title')).to.equal(__('enter_fullscreen'));
            expect(mediaControls.fullscreenButtonEl.getAttribute('aria-label')).to.equal(__('enter_fullscreen'));

            expect(mediaControls.settingsButtonEl.getAttribute('title')).to.equal(__('media_settings'));
            expect(mediaControls.settingsButtonEl.getAttribute('aria-label')).to.equal(__('media_settings'));

            expect(mediaControls.subtitlesButtonEl.getAttribute('title')).to.equal(__('media_subtitles_cc'));
            expect(mediaControls.subtitlesButtonEl.getAttribute('aria-label')).to.equal(__('media_subtitles_cc'));

            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuenow')).to.equal('0');
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuetext')).to.equal('0:00 of 20:10');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuenow')).to.equal('100');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuetext')).to.equal('100% Volume');
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
                unset: () => {}
            }
        );
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.removeAllListeners = sandbox.stub(mediaControls, 'removeAllListeners');
            stubs.removeVolumeScrubberWrapperExpansionHandlers = sandbox.stub(
                mediaControls,
                'removeVolumeScrubberWrapperExpansionHandlers'
            );
            stubs.removeEventListener = sandbox.stub(document, 'removeEventListener');
            stubs.removeActivationListener = sandbox.stub(util, 'removeActivationListener');
            stubs.genericEl = {
                getHandleEl: sandbox.stub().returns({
                    removeEventListener: sandbox.stub()
                }),
                getConvertedEl: sandbox.stub().returns({
                    removeEventListener: sandbox.stub()
                }),
                destroy: sandbox.stub(),
                removeListener: sandbox.stub(),
                removeEventListener: sandbox.stub()
            };
        });

        it('should remove all listeners', () => {
            mediaControls.destroy();

            expect(stubs.removeAllListeners).to.be.called;
            expect(stubs.removeVolumeScrubberWrapperExpansionHandlers).to.be.called;
            expect(stubs.removeEventListener).to.be.calledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).to.be.calledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        it('should remove time scrubber event listeners if it exists', () => {
            mediaControls.timeScrubber = false;

            mediaControls.destroy();
            expect(mediaControls.timeScrubber).to.be.false;

            mediaControls.timeScrubber = stubs.genericEl;

            mediaControls.destroy();

            expect(stubs.genericEl.getHandleEl().removeEventListener).to.be.calledWith(
                'mousedown',
                mediaControls.timeScrubbingStartHandler
            );
            expect(stubs.genericEl.getConvertedEl().removeEventListener).to.be.calledWith(
                'mousemove',
                mediaControls.filmstripShowHandler
            );
            expect(stubs.genericEl.getConvertedEl().removeEventListener).to.be.calledWith(
                'mouseleave',
                mediaControls.filmstripHideHandler
            );
            expect(stubs.genericEl.destroy).to.be.called;
            expect(mediaControls.timeScrubber).to.equal(undefined);
        });

        it('should destroy the volume scrubber', () => {
            mediaControls.volScrubber = stubs.genericEl;

            mediaControls.destroy();
            expect(stubs.genericEl.destroy).to.be.called;
            expect(mediaControls.volScrubber).to.equal(undefined);
        });

        it('should remove listeners and destroy the settings object', () => {
            mediaControls.settings = stubs.genericEl;

            mediaControls.destroy();
            expect(stubs.genericEl.removeListener).to.be.calledWith('quality', mediaControls.handleQuality);
            expect(stubs.genericEl.removeListener).to.be.calledWith('speed', mediaControls.handleRate);
            expect(stubs.genericEl.destroy);
            expect(mediaControls.settings).to.equal(undefined);
        });

        it('should remove event listeners from the fullscreen, play, volume, scrubber, and settings button elements', () => {
            mediaControls.fullscreenButtonEl = stubs.genericEl;
            mediaControls.settingsButtonEl = stubs.genericEl;
            mediaControls.volButtonEl = stubs.genericEl;
            mediaControls.playButtonEl = stubs.genericEl;
            mediaControls.subtitlesButtonEl = stubs.genericEl;
            mediaControls.wrapperEl = stubs.genericEl;

            mediaControls.destroy();

            expect(stubs.removeActivationListener).to.be.calledWith(stubs.genericEl, mediaControls.togglePlayHandler);
            expect(stubs.removeActivationListener).to.be.calledWith(stubs.genericEl, mediaControls.toggleMuteHandler);
            expect(stubs.removeActivationListener).to.be.calledWith(
                stubs.genericEl,
                mediaControls.toggleFullscreenHandler
            );
            expect(stubs.removeActivationListener).to.be.calledWith(
                stubs.genericEl,
                mediaControls.toggleSettingsHandler
            );
            expect(stubs.removeActivationListener).to.be.calledWith(
                stubs.genericEl,
                mediaControls.toggleSubtitlesHandler
            );
        });
    });

    describe('handleRate()', () => {
        it('should emit the ratechange event', () => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.handleRate();
            expect(stubs.emit).to.be.calledWith('ratechange');
        });
    });

    describe('handleQuality()', () => {
        it('should emit the qualitychange event', () => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.handleQuality();
            expect(stubs.emit).to.be.calledWith('qualitychange');
        });
    });

    describe('handleSubtitle()', () => {
        it('should emit the subtitlechange event', () => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.handleSubtitle();
            expect(stubs.emit).to.be.calledWith('subtitlechange');
        });
    });

    describe('setupSettings()', () => {
        it('should create a settings obect and bind listeners', () => {
            const settingsStub = sandbox.stub(Settings.prototype, 'addListener');

            mediaControls.setupSettings();
            expect(mediaControls.settings instanceof Settings);
            expect(settingsStub).to.be.calledWith('quality', mediaControls.handleQuality);
            expect(settingsStub).to.be.calledWith('speed', mediaControls.handleRate);
        });
    });

    describe('setupScrubbers()', () => {
        beforeEach(() => {
            stubs.on = sandbox.stub(Scrubber.prototype, 'on');
        });

        it('should create a new scrubber and value change handler for time', () => {
            mediaControls.setupScrubbers();
            expect(mediaControls.timeScrubber instanceof Scrubber);
            expect(stubs.on).to.be.calledWith('valuechange');
        });

        it('should create a new scrubber and value change handler for volume', () => {
            mediaControls.setupScrubbers();
            expect(mediaControls.volumeScrubber instanceof Scrubber);
            expect(stubs.on).to.be.calledWith('valuechange');
        });
    });

    describe('getTimeFromScrubber()', () => {
        it('should compute the right time', () => {
            mediaControls.mediaEl = {
                duration: 100
            };
            mediaControls.setupScrubbers();
            sandbox.stub(mediaControls.timeScrubber, 'getValue').returns(0.3);

            const time = mediaControls.getTimeFromScrubber();

            expect(time).to.equal(30);
        });
    });

    describe('formatTime()', () => {
        it('should correctly format 3 hours', () => {
            const result = mediaControls.formatTime(10800);
            expect(result).to.equal('3:00:00');
        });

        it('should correctly format the time', () => {
            const result = mediaControls.formatTime(11211);
            expect(result).to.equal('3:06:51');
        });

        it('should correctly format when double-digit minutes', () => {
            const result = mediaControls.formatTime(705);
            expect(result).to.equal('11:45');
        });

        it('should correctly format when single-digit minutes', () => {
            const result = mediaControls.formatTime(105);
            expect(result).to.equal('1:45');
        });

        it('should correctly format when 0 minutes', () => {
            const result = mediaControls.formatTime(9);
            expect(result).to.equal('0:09');
        });

        it('should correctly format 0 seconds', () => {
            const result = mediaControls.formatTime(0);
            expect(result).to.equal('0:00');
        });
    });

    describe('setDuration()', () => {
        beforeEach(() => {
            mediaControls.durationEl = {
                textContent: ''
            };
            stubs.formatTime = sandbox.stub(mediaControls, 'formatTime');
        });

        it('should set the text content of the duration element', () => {
            mediaControls.setDuration(10800);
            expect(stubs.formatTime).to.be.calledWith(10800);
        });

        it('should set the text content to 0 if there is no time', () => {
            mediaControls.setDuration(undefined);
            expect(stubs.formatTime).to.be.calledWith(0);
        });
    });

    describe('setTimeCode()', () => {
        beforeEach(() => {
            mediaControls.mediaEl = {
                textContent: '',
                duration: 500
            };
            mediaControls.durationEl = {
                textContent: '8:20'
            };
            mediaControls.setupScrubbers();
            stubs.setValue = sandbox.stub(mediaControls.timeScrubber, 'setValue');
            stubs.formatTime = sandbox.stub(mediaControls, 'formatTime').returns('4:10');
        });

        it('should set the value of the time scrubber and update the timecode El', () => {
            mediaControls.setTimeCode(250);
            expect(stubs.setValue).to.be.calledWith(0.5);
            expect(stubs.formatTime).to.be.calledWith(250);
        });

        it('should set correct aria values', () => {
            mediaControls.setTimeCode(250);
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuenow')).to.equal('250');
            expect(mediaControls.timeScrubberEl.getAttribute('aria-valuetext')).to.equal('4:10 of 8:20');
        });

        it('should set the value with 0 if no time is passed in', () => {
            mediaControls.setTimeCode(undefined);
            expect(stubs.setValue).to.be.calledWith(0);
            expect(stubs.formatTime).to.be.calledWith(0);
        });
    });

    describe('updateProgress()', () => {
        it('should correctly set the buffered value of the time scrubber', () => {
            mediaControls.mediaEl = {
                buffered: {
                    length: 5,
                    end: sandbox.stub().returns(1)
                },
                duration: 1
            };
            mediaControls.setupScrubbers();
            stubs.setBufferedValueStub = sandbox.stub(mediaControls.timeScrubber, 'setBufferedValue');

            mediaControls.updateProgress();
            expect(stubs.setBufferedValueStub).to.be.calledWith(1);
        });
    });

    describe('toggleMute()', () => {
        it('should emit a togglemute message', () => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.toggleMute();
            expect(stubs.emit).to.be.calledWith('togglemute');
        });
    });

    describe('togglePlay()', () => {
        it('should emit a toggleplayback message', () => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.togglePlay();
            expect(stubs.emit).to.be.calledWith('toggleplayback');
        });
    });

    describe('toggleSubtitles()', () => {
        it('should emit a togglesubtitles message', () => {
            sandbox.stub(mediaControls.settings, 'toggleSubtitles');
            stubs.emit = sandbox.stub(mediaControls, 'emit');

            mediaControls.toggleSubtitles();

            expect(stubs.emit).to.be.calledWith('togglesubtitles');
            expect(mediaControls.settings.toggleSubtitles).to.be.called;
        });
    });

    describe('toggleFullscreen()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(mediaControls, 'emit');
            stubs.setFullscreenLabel = sandbox.stub(mediaControls, 'setFullscreenLabel');
        });

        it('should emit a togglefullscreen message', () => {
            mediaControls.toggleFullscreen();
            expect(stubs.emit).to.be.calledWith('togglefullscreen');
        });

        it('should set the fullscreen label', () => {
            mediaControls.toggleFullscreen();
            expect(stubs.setFullscreenLabel).to.be.called;
        });
    });

    describe('setFullscreenLabel()', () => {
        beforeEach(() => {
            stubs.isFullscreen = sandbox.stub(fullscreen, 'isFullscreen');
            stubs.setLabel = sandbox.stub(mediaControls, 'setLabel');
        });

        it('should set the label to exit fullscreen if in fullscreen', () => {
            stubs.isFullscreen.returns(true);

            mediaControls.setFullscreenLabel();
            expect(stubs.setLabel).to.be.calledWith(mediaControls.fullscreenButtonEl, __('exit_fullscreen'));
        });

        it('should set the label to enter fullscreen if it\'s not fullscreen', () => {
            stubs.isFullscreen.returns(false);

            mediaControls.setFullscreenLabel();
            expect(stubs.setLabel).to.be.calledWith(mediaControls.fullscreenButtonEl, __('enter_fullscreen'));
        });
    });

    describe('toggleSettings()', () => {
        beforeEach(() => {
            stubs.show = sandbox.stub(mediaControls.settings, 'show');
            stubs.hide = sandbox.stub(mediaControls.settings, 'hide');
            stubs.isVisible = sandbox.stub(mediaControls, 'isSettingsVisible');
        });

        it('should hide the settings if they are visible', () => {
            stubs.isVisible.returns(true);

            mediaControls.toggleSettings();
            expect(mediaControls.settings.hide).to.be.called;
        });

        it('should show the settings if they are hidden', () => {
            stubs.isVisible.returns(false);

            mediaControls.toggleSettings();
            expect(mediaControls.settings.show).to.be.called;
        });
    });

    describe('setLabel()', () => {
        it('should set the aria label and the title of the given label', () => {
            const el = document.createElement('button');

            mediaControls.setLabel(el, 'test');
            expect(el.getAttribute('title')).to.equal('test');
            expect(el.getAttribute('aria-label')).to.equal('test');
        });
    });

    describe('isSettingsVisible()', () => {
        it('should return true if the settings exist and are visible', () => {
            stubs.isVisible = sandbox.stub(mediaControls.settings, 'isVisible').returns(true);

            const result = mediaControls.isSettingsVisible();
            expect(stubs.isVisible).to.be.called;
            expect(result).to.equal(true);

            stubs.isVisible.returns(false);
            const falseResult = mediaControls.isSettingsVisible();
            expect(falseResult).to.equal(false);
        });
    });

    describe('showPauseIcon()', () => {
        it('should add the playing class to the wrapper el and update the label', () => {
            stubs.setLabel = sandbox.stub(mediaControls, 'setLabel');

            mediaControls.showPauseIcon();
            expect(mediaControls.wrapperEl.classList.contains(PLAYING_CLASS)).to.be.true;
            expect(stubs.setLabel).to.be.calledWith(mediaControls.playButtonEl, __('media_pause'));
        });
    });

    describe('showPlayIcon()', () => {
        it('should remove the playing class to the wrapper el and update the label', () => {
            stubs.setLabel = sandbox.stub(mediaControls, 'setLabel');

            mediaControls.showPlayIcon();
            expect(mediaControls.wrapperEl.classList.contains(PLAYING_CLASS)).to.be.false;
            expect(stubs.setLabel).to.be.calledWith(mediaControls.playButtonEl, __('media_play'));
        });
    });

    describe('updateVolumeIcon()', () => {
        beforeEach(() => {
            mediaControls.setupScrubbers();
            stubs.setValue = sandbox.stub(mediaControls.volScrubber, 'setValue');
            stubs.setLabel = sandbox.stub(mediaControls, 'setLabel');
        });

        it('should remove all volume level classes and add the correct one', () => {
            mediaControls.className = 'bp-media-volume-icon-is-low';

            mediaControls.updateVolumeIcon(1);
            expect(mediaControls.volButtonEl.classList.contains('bp-media-volume-icon-is-low')).to.be.false;
            expect(mediaControls.volButtonEl.classList.contains('bp-media-volume-icon-is-high')).to.be.true;
        });

        it('set the new value of the volume scrubber', () => {
            mediaControls.updateVolumeIcon(1);
            expect(stubs.setValue).to.be.calledWith(1);
        });

        it('should set the correct volume button level', () => {
            mediaControls.updateVolumeIcon(1);
            expect(stubs.setLabel).to.be.calledWith(mediaControls.volButtonEl, __('media_mute'));

            mediaControls.updateVolumeIcon(0);
            expect(stubs.setLabel).to.be.calledWith(mediaControls.volButtonEl, __('media_unmute'));
        });

        it('set the correct aria values', () => {
            mediaControls.updateVolumeIcon(0.31);
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuenow')).to.equal('31');
            expect(mediaControls.volScrubberEl.getAttribute('aria-valuetext')).to.equal('31% Volume');
        });
    });

    describe('attachEventHandlers()', () => {
        beforeEach(() => {
            stubs.wrapperAddEventListener = sandbox.stub(mediaControls.wrapperEl, 'addEventListener');
            stubs.addActivationListener = sandbox.stub(util, 'addActivationListener');
            stubs.addListener = sandbox.stub(fullscreen, 'addListener');
        });

        it('should add the correct event Liseners', () => {
            mediaControls.attachEventHandlers();
            expect(stubs.wrapperAddEventListener).to.be.calledWith('mouseenter', mediaControls.mouseenterHandler);
            expect(stubs.wrapperAddEventListener).to.be.calledWith('mouseleave', mediaControls.mouseleaveHandler);
            expect(stubs.addActivationListener).to.be.calledWith(
                mediaControls.playButtonEl,
                mediaControls.togglePlayHandler
            );
            expect(stubs.addActivationListener).to.be.calledWith(
                mediaControls.volButtonEl,
                mediaControls.toggleMuteHandler
            );
            expect(stubs.addActivationListener).to.be.calledWith(
                mediaControls.fullscreenButtonEl,
                mediaControls.toggleFullscreenHandler
            );
            expect(stubs.addActivationListener).to.be.calledWith(
                mediaControls.settingsButtonEl,
                mediaControls.toggleSettingsHandler
            );
            expect(stubs.addActivationListener).to.be.calledWith(
                mediaControls.subtitlesButtonEl,
                mediaControls.toggleSubtitlesHandler
            );
            expect(stubs.addListener).to.be.called;
        });
    });

    describe('mouseenterHandler()', () => {
        it('should set preventHiding to true and show the controls', () => {
            stubs.show = sandbox.stub(mediaControls, 'show');

            mediaControls.mouseenterHandler();
            expect(mediaControls.preventHiding).to.equal(true);
            expect(stubs.show).to.be.called;
        });
    });

    describe('mouseleaveHandler()', () => {
        it('should allow hiding via setHiding and show the controls', () => {
            stubs.show = sandbox.stub(mediaControls, 'show');

            mediaControls.mouseleaveHandler();
            expect(mediaControls.preventHiding).to.equal(false);
            expect(stubs.show).to.be.called;
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.showControlClass = 'bp-media-controls-is-visible';
            stubs.timeout = 2001;
            stubs.hide = sandbox.stub(mediaControls, 'hide');
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should add the controls class to the wrapper element', () => {
            mediaControls.show();
            expect(mediaControls.wrapperEl.parentNode.classList.contains(stubs.showControlClass)).to.be.true;
        });

        it('should add the auto hide timeout', () => {
            mediaControls.show();
            expect(mediaControls.autoHideTimeout).to.not.equal(undefined);
        });

        it('should hide the controls after a timeout', () => {
            mediaControls.show();
            clock.tick(stubs.timeout);
            expect(stubs.hide).to.be.called;
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            stubs.isSettingsVisible = sandbox.stub(mediaControls, 'isSettingsVisible');
            stubs.show = sandbox.stub(mediaControls, 'show');
        });

        it('should should call show and do nothing else if the prevent hiding is true', () => {
            mediaControls.preventHiding = true;

            mediaControls.hide();
            expect(stubs.show).to.be.called;
        });

        it('should should call show and do nothing else if the settings are visible', () => {
            mediaControls.preventHiding = false;
            stubs.isSettingsVisible.returns(true);

            mediaControls.hide();
            expect(stubs.show).to.be.called;
        });

        it('should remove the show controls class if the wrapper element and parent exist', () => {
            mediaControls.preventHiding = false;
            stubs.isSettingsVisible.returns(false);

            mediaControls.hide();
            expect(stubs.show).to.not.be.called;
            expect(mediaControls.wrapperEl.parentNode.classList.contains('bp-media-controls-is-visible')).to.be.false;
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            stubs.isVisible = sandbox.stub(mediaControls, 'isVisible');
            stubs.hide = sandbox.stub(mediaControls, 'hide');
            stubs.show = sandbox.stub(mediaControls, 'show');
        });

        it('should hide the settings and remove preventHiding if the controls are visible', () => {
            stubs.isVisible.returns(true);

            mediaControls.toggle();
            expect(stubs.hide).to.be.called;
            expect(mediaControls.preventHiding).to.be.false;
        });

        it('should show the controls if they are not visible', () => {
            stubs.isVisible.returns(false);

            mediaControls.toggle();
            expect(stubs.show).to.be.called;
        });
    });

    describe('isVisible()', () => {
        beforeEach(() => {
            stubs.wrapperParent = document.createElement('div')
            mediaControls.wrapperEl = stubs.wrapperParent.appendChild(document.createElement('div'));
        });

        it('should return false if the controls show class is missing', () => {
            const result = mediaControls.isVisible();
            expect(result).to.be.false;
        });

        it('should return true if the controls show class is present', () => {
            stubs.wrapperParent.classList.add('bp-media-controls-is-visible');
            const result = mediaControls.isVisible();
            expect(result).to.be.true;
        });
    });

    describe('resizeTimeScrubber()', () => {
        it('should resize the time scrubber', () => {
            mediaControls.setupScrubbers();
            stubs.resize = sandbox.stub(mediaControls.timeScrubber, 'resize');

            mediaControls.resizeTimeScrubber();
            expect(stubs.resize).to.be.called;
        });
    });

    describe('setFilmstrip()', () => {
        it('should set the filmstrip source to the provided URL', () => {
            mediaControls.filmstripEl = {
                src: ''
            };

            mediaControls.filmstripUrl = 'testurl';

            mediaControls.setFilmstrip();
            expect(mediaControls.filmstripEl.src).to.equal('testurl');
        });
    });

    describe('initFilmstrip()', () => {
        beforeEach(() => {
            stubs.status = {
                getPromise: sandbox.stub().returns(Promise.resolve())
            };
            mediaControls.setupScrubbers();
            stubs.handleElAddEventListener = sandbox.stub(mediaControls.timeScrubber.getHandleEl(), 'addEventListener');
            stubs.getConvertedElAddEventListener = sandbox.stub(
                mediaControls.timeScrubber.getConvertedEl(),
                'addEventListener'
            );

            mediaControls.timeScrubberEl = {
                addEventListener: sandbox.stub()
            }
            stubs.setFilmstrip = sandbox.stub(mediaControls, 'setFilmstrip');
        });

        it('should give the correct class and content to the filmstrip container', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripContainerEl.classList.contains('bp-media-filmstrip-container')).to.be.true;
            expect(mediaControls.filmstripContainerEl.innerHTML.includes(CRAWLER)).to.be.true;
        });

        it('should give the correct class to the filmstrip', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripEl.classList.contains('bp-media-filmstrip')).to.be.true;
        });

        it('should give the correct class to the filmstrip time element', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.filmstripTimeEl.classList.contains('bp-media-filmstrip-timecode')).to.be.true;
        });

        it('should add the correct eventListeners to the handle and converted time scrubber elements', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(stubs.handleElAddEventListener).to.be.calledWith(
                'mousedown',
                mediaControls.timeScrubbingStartHandler
            );
            expect(stubs.getConvertedElAddEventListener).to.be.calledWith(
                'mousemove',
                mediaControls.filmstripShowHandler
            );
            expect(stubs.getConvertedElAddEventListener).to.be.calledWith(
                'mouseleave',
                mediaControls.filmstripHideHandler
            );
        });

        it('should add the touchstart eventListener if touch is detected', () => {
            mediaControls.hasTouch = true;
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(mediaControls.timeScrubberEl.addEventListener).to.be.calledWith('touchstart', mediaControls.timeScrubbingStartHandler)
        });

        it('should add the onload function to the filmstrip', () => {
            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            expect(typeof mediaControls.filmstripEl.onload === 'function');
        });
    });

    describe('timeScrubbingStartHandler()', () => {
        it('should set isScrubbing to true, preventHiding to true, and add show and stop handlers', () => {
            stubs.addEventListener = sandbox.stub(document, 'addEventListener');

            mediaControls.timeScrubbingStartHandler();
            expect(mediaControls.isScrubbing).to.equal(true);
            expect(mediaControls.preventHiding).to.equal(true);
            expect(stubs.addEventListener).to.be.calledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.addEventListener).to.be.calledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        it('should add show and stop touch events if touch is present', () => {
            mediaControls.hasTouch = true;
            stubs.addEventListener = sandbox.stub(document, 'addEventListener');

            mediaControls.timeScrubbingStartHandler();
            expect(stubs.addEventListener).to.be.calledWith('touchend', mediaControls.timeScrubbingStopHandler);
            expect(stubs.addEventListener).to.be.calledWith('touchmove', mediaControls.show);
        });
    });

    describe('timeScrubbingStopHandler()', () => {
        beforeEach(() => {
            mediaControls.setupScrubbers();
            stubs.event = {
                target: mediaControls.timeScrubberEl.firstChild
            };
            stubs.removeEventListener = sandbox.stub(document, 'removeEventListener');
            mediaControls.filmstripContainerEl = document.createElement('div');
        });

        it('should set isScrubbing to false, preventHiding to false, and remove show and stop handlers', () => {
            mediaControls.timeScrubbingStopHandler(stubs.event);
            expect(mediaControls.isScrubbing).to.equal(false);
            expect(mediaControls.preventHiding).to.equal(false);
            expect(stubs.removeEventListener).to.be.calledWith('mouseup', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).to.be.calledWith('mousemove', mediaControls.filmstripShowHandler);
        });

        it('should remove touch show and stop handlers if touch is present', () => {
            mediaControls.hasTouch = true;
            mediaControls.timeScrubbingStopHandler(stubs.event);

            expect(stubs.removeEventListener).to.be.calledWith('touchend', mediaControls.timeScrubbingStopHandler);
            expect(stubs.removeEventListener).to.be.calledWith('touchmove', mediaControls.show);
        });

        it('should hide the filmstrip if it is not being hovered over', () => {
            stubs.event.target = document.createElement('div');

            mediaControls.timeScrubbingStopHandler(stubs.event);
            expect(mediaControls.filmstripContainerEl.style.display).equal('none');
        });
    });

    describe('filmstripShowHandler()', () => {
        beforeEach(() => {
            stubs.getBoundingClientRect = sandbox.stub(mediaControls.containerEl, 'getBoundingClientRect').returns({
                left: 0,
                width: 260
            });
            stubs.event = {
                pageX: 100
            };
            stubs.isSettingsVisible = sandbox.stub(mediaControls, 'isSettingsVisible');
            stubs.formatTime = sandbox.stub(mediaControls, 'formatTime');
            mediaControls.mediaEl = {
                duration: 3600
            };
            stubs.status = {
                getPromise: sandbox.stub().returns(Promise.resolve())
            };

            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            sandbox.stub(mediaControls, 'computeFilmstripPositions').returns({
                time: 10,
                left: -100,
                top: -180,
                containerLeft: 20
            });
        });

        it('should do nothing if the settings are visible', () => {
            stubs.isSettingsVisible.returns(true);

            mediaControls.filmstripShowHandler(stubs.event);
            expect(stubs.getBoundingClientRect).to.not.be.called;
        });

        it('should correctly style the filmstrip and format the time element', () => {
            stubs.isSettingsVisible.returns(false);

            mediaControls.filmstripShowHandler(stubs.event);
            expect(mediaControls.filmstripEl.style.left).to.equal('-100px');
            expect(mediaControls.filmstripEl.style.top).to.equal('-180px');
            expect(mediaControls.filmstripContainerEl.style.display).to.equal('block');
            expect(mediaControls.filmstripContainerEl.style.left).to.equal('20px');
            expect(stubs.formatTime).to.be.calledWith(10);
        });
    });

    describe('computeFilmstripPositions()', () => {
        it('should compute correct positions when filmstrip not ready', () => {
            mediaControls.mediaEl = {
                duration: 100
            };
            mediaControls.filmstripInterval = 1;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.25);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, null);

            expect(positions.time).to.equal(25);
            expect(positions.left).to.equal(0);
            expect(positions.top).to.equal(0);
            expect(positions.containerLeft).to.equal(120);
        });

        it('should compute correct horizontal offset into filmstrip', () => {
            mediaControls.mediaEl = {
                duration: 100
            };
            mediaControls.filmstripInterval = 1;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.2);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, 16000);

            expect(positions.time).to.equal(20);
            expect(positions.left).to.equal(-3200);
            expect(positions.top).to.equal(0);
            expect(positions.containerLeft).to.equal(120);
        });

        it('should compute correct vertical offset into filmstrip', () => {
            mediaControls.mediaEl = {
                duration: 1100
            };
            mediaControls.filmstripInterval = 1;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.2);

            const positions = mediaControls.computeFilmstripPositions(400, 200, 1000, 16000);

            expect(positions.time).to.equal(220);
            expect(positions.left).to.equal(-3200);
            expect(positions.top).to.equal(-180);
            expect(positions.containerLeft).to.equal(120);
        });

        it('should compute correct offset into filmstrip with different interval', () => {
            mediaControls.mediaEl = {
                duration: 2000
            };
            mediaControls.filmstripInterval = 5;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.6);

            const positions = mediaControls.computeFilmstripPositions(800, 200, 1000, 16000);

            expect(positions.time).to.equal(1200);
            expect(positions.left).to.equal(-6400);
            expect(positions.top).to.equal(-180);
            expect(positions.containerLeft).to.equal(520);
        });

        it('should compute correct container position when hovering near left boundary', () => {
            mediaControls.mediaEl = {
                duration: 100
            };
            mediaControls.filmstripInterval = 1;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.01);

            const positions = mediaControls.computeFilmstripPositions(210, 200, 1000, 16000);

            expect(positions.time).to.equal(1);
            expect(positions.left).to.equal(-160);
            expect(positions.top).to.equal(0);
            expect(positions.containerLeft).to.equal(0);
        });

        it('should compute correct container position when hovering near right boundary', () => {
            mediaControls.mediaEl = {
                duration: 100
            };
            mediaControls.filmstripInterval = 1;
            sandbox.stub(mediaControls.timeScrubber, 'computeScrubberPosition').returns(0.99);

            const positions = mediaControls.computeFilmstripPositions(1190, 200, 1000, 16000);

            expect(positions.time).to.equal(99);
            expect(positions.left).to.equal(-15840);
            expect(positions.top).to.equal(0);
            expect(positions.containerLeft).to.equal(840);
        });
    });

    describe('filmstripHideHandler()', () => {
        beforeEach(() => {
            stubs.status = {
                getPromise: sandbox.stub().returns(Promise.resolve())
            };

            mediaControls.initFilmstrip('url', stubs.status, '380', 1);
            mediaControls.isScrubbing = false;
        });

        it('should hide the filmstrip container if not scrubbing', () => {
            mediaControls.filmstripHideHandler();
            expect(mediaControls.filmstripContainerEl.style.display).to.equal('none');
        });

        it('should do nothing if scrubbing', () => {
            mediaControls.isScrubbing = true;

            mediaControls.filmstripHideHandler();
            expect(mediaControls.filmstripContainerEl.style.display).to.equal('');
        });
    });

    describe('initSubtitles()', () => {
        it('should load subtitles', () => {
            sandbox.stub(mediaControls.settings, 'loadSubtitles');
            const subs = ['English', 'Russian'];
            mediaControls.initSubtitles(subs);
            expect(mediaControls.settings.loadSubtitles).to.be.calledWith(subs);
        });
    });
});
/* eslint-enable no-unused-expressions */
