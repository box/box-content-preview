/* eslint-disable no-unused-expressions */
import Browser from '../../../browser';
import MediaBase from '../media-base';
import MediaControls from '../media-controls';
import cache from '../../../cache';

let media;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/media-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/media-base-test.html');
        media = new MediaBase({
            file: {
                id: 1
            },
            container: '.container',
            representation: {
                content: {
                    url_template: 'www.netflix.com'
                }
            }
        });
        media.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        media.destroy();
        media = null;
    });

    describe('MediaBase()', () => {
        it('should setup wrapper and container and load timeout', () => {
            expect(media.wrapperEl.className).to.equal('bp-media');
            expect(media.mediaContainerEl.className).to.equal('bp-media-container');
            expect(media.loadTimeout).to.equal(100000);
        });
    });

    describe('destroy()', () => {
        it('should clean up media controls', () => {
            media.mediaControls = {
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };

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
        it('should finish loading and resize the media viewer', () => {
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

    describe('handleSpeed()', () => {
        it('should emit speed change if speed has changed', () => {
            const speed = 2;
            sandbox.stub(media, 'emit');
            sandbox.stub(cache, 'get').withArgs('media-speed').returns(speed);
            media.mediaEl = document.createElement('video');
            media.mediaEl.playbackRate = 1;

            media.handleSpeed();

            expect(media.emit).to.be.calledWith('speedchange', speed);
            expect(media.mediaEl.playbackRate).to.equal(speed);
        });
    });

    describe('handleVolume()', () => {
        it('should set volume from cache', () => {
            const volume = 50;
            sandbox.stub(cache, 'has').withArgs('media-volume').returns(true);
            sandbox.stub(cache, 'get').withArgs('media-volume').returns(volume);
            media.mediaEl = document.createElement('video');

            media.handleVolume();

            expect(media.mediaEl.volume).to.equal(volume);
        });
    });

    describe('loadUI()', () => {
        it('should set up media controls and element', () => {
            const setDuration = MediaControls.prototype.setDuration;
            Object.defineProperty(MediaControls.prototype, 'setDuration', {
                value: sandbox.stub()
            });

            const duration = 10;
            media.mediaEl = { duration };
            sandbox.stub(media, 'addEventListenersForMediaControls');
            sandbox.stub(media, 'addEventListenersForMediaElement');

            media.loadUI();

            expect(MediaControls.prototype.setDuration).to.be.calledWith(duration);
            expect(media.addEventListenersForMediaControls).to.be.called;
            expect(media.addEventListenersForMediaElement).to.be.called;

            Object.defineProperty(MediaControls.prototype, 'setDuration', {
                value: setDuration
            });
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        it('should add event listeners for time and volume updates, play and mute toggles, and speed change', () => {
            media.mediaControls = {
                addListener: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };

            media.addEventListenersForMediaControls();

            expect(media.mediaControls.addListener).to.be.calledWith('timeupdate', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('volumeupdate', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('toggleplayback', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('togglemute', sinon.match.func);
            expect(media.mediaControls.addListener).to.be.calledWith('speedchange', sinon.match.func);
        });
    });

    describe('setTimeCode()', () => {
        it('should set the current time in controls', () => {
            media.mediaControls = {
                setTimeCode: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };
            const currentTime = 1337;
            media.mediaEl = { currentTime };

            media.setTimeCode();

            expect(media.mediaControls.setTimeCode).to.be.calledWith(currentTime);
        });
    });

    describe('updateVolumeIcon()', () => {
        it('should update the controls volume icon', () => {
            media.mediaControls = {
                updateVolumeIcon: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };
            const volume = 1337;
            media.mediaEl = { volume };

            media.updateVolumeIcon();

            expect(media.mediaControls.updateVolumeIcon).to.be.calledWith(volume);
        });
    });

    describe('playingHandler()', () => {
        it('should show pause icon, hide loading icon, and handle speed and volume', () => {
            media.mediaControls = {
                showPauseIcon: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };
            sandbox.stub(media, 'hideLoadingIcon');
            sandbox.stub(media, 'handleSpeed');
            sandbox.stub(media, 'handleVolume');

            media.playingHandler();

            expect(media.mediaControls.showPauseIcon).to.be.called;
            expect(media.hideLoadingIcon).to.be.called;
            expect(media.handleSpeed).to.be.called;
            expect(media.handleVolume).to.be.called;
        });
    });

    describe('progressHandler()', () => {
        it('should update controls progress', () => {
            media.mediaControls = {
                updateProgress: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };

            media.progressHandler();

            expect(media.mediaControls.updateProgress).to.be.called;
        });
    });

    describe('pauseHandler()', () => {
        it('should show the controls play icon', () => {
            media.mediaControls = {
                showPlayIcon: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };

            media.pauseHandler();

            expect(media.mediaControls.showPlayIcon).to.be.called;
        });
    });

    describe('seekHandler()', () => {
        it('should hide loading icon and emit current time', () => {
            sandbox.stub(media, 'hideLoadingIcon');
            const currentTime = 20;
            media.mediaEl = { currentTime };
            sandbox.stub(media, 'emit');

            media.seekHandler();

            expect(media.hideLoadingIcon).to.be.called;
            expect(media.emit).to.be.calledWith('seek', currentTime);
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
            media.mediaControls = {
                setTimeCode: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };
            sandbox.stub(media, 'hideLoadingIcon');
            sandbox.stub(media, 'pauseHandler');

            media.resetPlayIcon();

            expect(media.mediaControls.setTimeCode).to.be.calledWith(0);
            expect(media.hideLoadingIcon).to.be.called;
            expect(media.pauseHandler).to.be.called;
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

    describe('onKeydown()', () => {
        it('should return false if media controls are not initialized or if media controls are focused', () => {
            media.mediaControls = null;
            expect(media.onKeydown()).to.be.false;

            media.mediaControls = {
                isFocused: () => { return true; },
                destroy: () => {},
                removeAllListeners: () => {}
            };
            expect(media.onKeydown()).to.be.false;
        });

        it('should return toggle play and return true if space is pressed', () => {
            media.mediaControls = {
                isFocused: () => { return false; },
                destroy: () => {},
                removeAllListeners: () => {}
            };
            sandbox.stub(media, 'togglePlay');

            expect(media.onKeydown('Space')).to.be.true;
            expect(media.togglePlay).to.be.called;
        });

        it('should return false if another key is pressed', () => {
            media.mediaControls = {
                isFocused: () => { return false; },
                destroy: () => {},
                removeAllListeners: () => {}
            };
            expect(media.onKeydown('Esc')).to.be.false;
        });
    });
});
