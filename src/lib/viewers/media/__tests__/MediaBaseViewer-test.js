/* eslint-disable no-unused-expressions */
import Browser from '../../../Browser';
import MediaBaseViewer from '../MediaBaseViewer';
import BaseViewer from '../../BaseViewer';
import cache from '../../../Cache';
import { CLASS_ELEM_KEYBOARD_FOCUS } from '../../../constants';

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
            file: {
                id: 1
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'www.netflix.com'
                }
            }
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
            isTimeScrubberFocused: sandbox.stub()
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

            media.destroy();

            expect(media.mediaEl.removeEventListener.callCount).to.equal(9);
            expect(media.mediaEl.removeAttribute).to.be.calledWith('src');
            expect(media.mediaEl.load).to.be.called;
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
                expect(media.mediaEl.addEventListener).to.be.calledWith('loadeddata', media.loadeddataHandler);
                expect(media.mediaEl.addEventListener).to.be.calledWith('error', media.errorHandler);
                expect(media.mediaEl.src).to.equal('www.netflix.com');
            });
        });

        it('should set autoplay if loaded in iOS', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);

            sandbox.stub(media, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            return media.load().then(() => {
                expect(media.mediaEl.autoplay).to.equal(true);
            });
        });
    });

    describe('loadeddataHandler()', () => {
        it('should finish loading, resize the media viewer, and focus on mediaContainerEl', () => {
            sandbox.stub(media, 'handleVolume');
            sandbox.stub(media, 'emit');
            sandbox.stub(media, 'loadUI');
            sandbox.stub(media, 'resize');
            sandbox.stub(media, 'showMedia');

            media.loadeddataHandler();

            expect(media.handleVolume).to.be.called;
            expect(media.loaded).to.be.true;
            expect(media.emit).to.be.calledWith('load');
            expect(media.loadUI).to.be.called;
            expect(media.resize).to.be.called;
            expect(media.showMedia).to.be.called;
            expect(document.activeElement).to.equal(media.mediaContainerEl);
        });
    });

    describe('showMedia()', () => {
        it('should add the bp-is-visible class to make wrapper visible', () => {
            media.showMedia();
            expect(media.wrapperEl.classList.contains('bp-is-visible')).to.be.true;
        });
    });

    describe('errorHandler', () => {
        it('should emit the error and set a display message', () => {
            sandbox.stub(media, 'emit');

            const err = new Error('blah');
            media.errorHandler(err);

            err.displayMessage = 'We\'re sorry, the preview didn\'t load. Please refresh the page.';
            expect(media.emit).to.be.calledWith('error', err);
        });
    });

    describe('handleRate()', () => {
        it('should emit speed change if speed has changed', () => {
            const speed = 2;
            sandbox.stub(media, 'emit');
            sandbox.stub(cache, 'get').withArgs('media-speed').returns(speed);
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
            stubs.has = sandbox.stub(cache, 'has').withArgs('media-volume').returns(true);
            stubs.get = sandbox.stub(cache, 'get').withArgs('media-volume').returns(stubs.volume);
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

    describe('loadUI()', () => {
        it('should set up media controls and element', () => {
            const duration = 10;
            media.mediaEl = { duration };
            sandbox.stub(media, 'addEventListenersForMediaControls');
            sandbox.stub(media, 'addEventListenersForMediaElement');

            media.loadUI();

            expect(media.addEventListenersForMediaControls).to.be.called;
            expect(media.addEventListenersForMediaElement).to.be.called;
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
            const newTime = 3.14;

            media.setMediaTime(newTime);

            expect(media.mediaEl.currentTime).to.equal(newTime);
        });
    });

    describe('setVolume()', () => {
        it('should set volume', () => {
            sandbox.stub(media, 'handleVolume');
            cache.set('media-volume', 0.314);
            const newVol = 0.159;

            media.setVolume(newVol);

            expect(cache.get('media-volume')).to.equal(newVol);
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

            media.playingHandler();

            expect(media.mediaControls.showPauseIcon).to.be.called;
            expect(media.hideLoadingIcon).to.be.called;
            expect(media.handleRate).to.be.called;
            expect(media.handleVolume).to.be.called;
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


            media.seekHandler();

            expect(media.hideLoadingIcon).to.be.called;
            expect(media.debouncedEmit).to.be.calledWith('seeked', currentTime);
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

    describe('togglePlay()', () => {
        it('should pause and emit if media element was playing', () => {
            media.mediaEl = {
                paused: false,
                ended: false,
                pause: sandbox.stub(),
                play: sandbox.stub()
            };
            sandbox.stub(media, 'emit');

            media.togglePlay();

            expect(media.mediaEl.pause.callCount).to.equal(1);
            expect(media.mediaEl.play.callCount).to.equal(0);
            expect(media.emit).to.be.calledWith('pause');
        });

        it('should play, emit, and honor speed/volume settings if media element was paused', () => {
            media.mediaEl = {
                paused: true,
                ended: false,
                pause: sandbox.stub(),
                play: sandbox.stub()
            };
            sandbox.stub(media, 'emit');
            sandbox.stub(media, 'handleRate');
            sandbox.stub(media, 'handleVolume');

            media.togglePlay();

            expect(media.mediaEl.pause.callCount).to.equal(0);
            expect(media.mediaEl.play.callCount).to.equal(1);
            expect(media.handleRate).to.be.called;
            expect(media.handleVolume).to.be.called;
            expect(media.emit).to.be.calledWith('play');
        });
    });

    describe('toggleMute()', () => {
        it('should mute if volume was on', () => {
            media.mediaEl = {
                volume: 0.3
            };

            media.toggleMute();

            expect(media.mediaEl.volume).to.equal(0);
        });

        it('should restore old volume if volume was muted', () => {
            const oldVol = 0.3;
            media.mediaEl = {
                volume: 0
            };
            media.oldVolume = oldVol;

            media.toggleMute();

            expect(media.mediaEl.volume).to.equal(oldVol);
        });

        it('should leave no change if called twice', () => {
            const vol = 0.3;
            media.mediaEl = {
                volume: vol
            };

            media.toggleMute();
            media.toggleMute();

            expect(media.mediaEl.volume).to.equal(vol);
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
                ended: false
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
                addEventListener: sandbox.stub()
            };

            media.addEventListenersForMediaElement();

            expect(media.mediaEl.addEventListener.callCount).to.equal(7);
        });
    });

    describe('quickSeek()', () => {
        it('should seek with positive increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60
            };
            sandbox.stub(media, 'setMediaTime');

            media.quickSeek(5);

            expect(media.setMediaTime).calledWith(35);
        });

        it('should seek with negative increments', () => {
            media.mediaEl = {
                currentTime: 30,
                duration: 60
            };
            sandbox.stub(media, 'setMediaTime');

            media.quickSeek(-5);

            expect(media.setMediaTime).calledWith(25);
        });

        it('should not go beyond beginning of video', () => {
            media.mediaEl = {
                currentTime: 3,
                duration: 60
            };
            sandbox.stub(media, 'setMediaTime');

            media.quickSeek(-5);

            expect(media.setMediaTime).calledWith(0);
        });

        it('should not go beyond end of video', () => {
            media.mediaEl = {
                currentTime: 57,
                duration: 60
            };
            sandbox.stub(media, 'setMediaTime');

            media.quickSeek(5);

            expect(media.setMediaTime).calledWith(60);
        });
    });

    describe('increaseVolume', () => {
        it('should not exceed maximum volume', () => {
            media.mediaEl = {
                volume: 0.99
            };
            sandbox.stub(media, 'setVolume');

            media.increaseVolume();

            expect(media.setVolume).calledWith(1);
        });
    });

    describe('decreaseVolume', () => {
        it('should not fall below minimum volume', () => {
            media.mediaEl = {
                volume: 0.01
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
});
