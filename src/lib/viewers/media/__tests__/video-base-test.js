/* eslint-disable no-unused-expressions */
import VideoBase from '../video-base';

let videoBase;
const sandbox = sinon.sandbox.create();

describe('video-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/video-base-test.html');
        const options = {
            file: {
                id: 1
            }
        };

        const containerEl = document.querySelector('.container');
        videoBase = new VideoBase(containerEl, options);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (videoBase && typeof videoBase.destroy === 'function') {
            videoBase.destroy();
        }

        videoBase = null;
    });

    describe('VideoBase()', () => {
        it('should set up media element, play button, and lower lights', () => {
            const lowerLights = VideoBase.prototype.lowerLights;

            Object.defineProperty(VideoBase.prototype, 'lowerLights', {
                value: sandbox.stub()
            });

            const containerEl = document.querySelector('.container');
            videoBase = new VideoBase(containerEl, { file: { id: 1 } });

            expect(videoBase.mediaEl.getAttribute('preload')).to.equal('auto');
            expect(videoBase.playButtonEl.className).to.equal('bp-media-play-button bp-is-hidden');
            expect(videoBase.playButtonEl.innerHTML).contains('<path d="M0 0h24v24H0z" fill="none"');
            expect(VideoBase.prototype.lowerLights).to.be.called;

            Object.defineProperty(VideoBase.prototype, 'lowerLights', {
                value: lowerLights
            });
        });
    });

    describe('destroy()', () => {
        it('should remove event listeners on the media and play button', () => {
            sandbox.stub(videoBase.mediaEl, 'removeEventListener');
            sandbox.stub(videoBase.playButtonEl, 'removeEventListener');

            videoBase.destroy();

            expect(videoBase.mediaEl.removeEventListener).to.be.calledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.removeEventListener).to.be.calledWith('click', videoBase.togglePlay);
            expect(videoBase.mediaEl.removeEventListener).to.be.calledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.removeEventListener).to.be.calledWith('click', videoBase.togglePlay);
        });
    });

    describe('loadeddataHandler()', () => {
        it('should show the play button', () => {
            sandbox.stub(videoBase, 'showPlayButton');
            videoBase.loadeddataHandler();
            expect(videoBase.showPlayButton).to.be.called;
        });
    });

    describe('playingHandler()', () => {
        it('should hide the play button', () => {
            sandbox.stub(videoBase, 'hidePlayButton');
            videoBase.playingHandler();
            expect(videoBase.hidePlayButton).to.be.called;
        });
    });

    describe('pauseHandler()', () => {
        it('should show the play button', () => {
            sandbox.stub(videoBase, 'showPlayButton');
            videoBase.pauseHandler();
            expect(videoBase.showPlayButton).to.be.called;
        });
    });

    describe('waitingHandler()', () => {
        it('should add the buffering class', () => {
            videoBase.waitingHandler();
            expect(videoBase.containerEl.classList.contains('bp-is-buffering'));
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        it('should add a handler for toggling fullscreen', () => {
            videoBase.mediaControls = {
                on: sandbox.stub(),
                addListener: sandbox.stub(),
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };
            videoBase.addEventListenersForMediaControls();
            expect(videoBase.mediaControls.on).to.be.calledWith('togglefullscreen', sinon.match.func);
        });
    });

    describe('addEventListenersForMediaElement()', () => {
        it('should add a handler for toggling fullscreen', () => {
            sandbox.stub(videoBase.mediaEl, 'addEventListener');
            sandbox.stub(videoBase.playButtonEl, 'addEventListener');

            videoBase.addEventListenersForMediaElement();

            expect(videoBase.mediaEl.addEventListener).to.be.calledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.addEventListener).to.be.calledWith('click', videoBase.togglePlay);
            expect(videoBase.mediaEl.addEventListener).to.be.calledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.addEventListener).to.be.calledWith('click', videoBase.togglePlay);
        });
    });

    describe('resize()', () => {
        it('should resize the time scrubber', () => {
            videoBase.mediaControls = {
                resizeTimeScrubber: sandbox.stub(),
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };
            videoBase.resize();
            expect(videoBase.mediaControls.resizeTimeScrubber).to.be.called;
        });
    });

    describe('allowNavigationArrows', () => {
        it('should return true if media controls are undefined or media controls do not have settings visible', () => {
            videoBase.mediaControls = undefined;
            expect(videoBase.allowNavigationArrows()).to.be.true;

            videoBase.mediaControls = {
                isSettingsVisible: sandbox.stub().returns(false),
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };
            expect(videoBase.allowNavigationArrows()).to.be.true;

            videoBase.mediaControls.isSettingsVisible = sandbox.stub().returns(true);
            expect(videoBase.allowNavigationArrows()).to.be.false;
        });
    });

    describe('lowerLights', () => {
        it('should add dark class to container', () => {
            videoBase.lowerLights();
            expect(videoBase.containerEl.classList.contains('bp-dark')).to.be.true;
        });
    });
});
