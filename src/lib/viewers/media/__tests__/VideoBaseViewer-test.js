/* eslint-disable no-unused-expressions */
import VideoBaseViewer from '../VideoBaseViewer';
import MediaBaseViewer from '../MediaBaseViewer';
import BaseViewer from '../../BaseViewer';

let containerEl;
let rootEl;
let videoBase;

describe('lib/viewers/media/VideoBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/VideoBaseViewer-test.html');
        containerEl = document.querySelector('.container');
        rootEl = document.querySelector('.bp');
        videoBase = new VideoBaseViewer({
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
            content: {
                url_template: 'www.netflix.com',
            },
        });
        videoBase.mediaControls = {
            on: jest.fn(),
            addListener: jest.fn(),
            removeAllListeners: jest.fn(),
            destroy: jest.fn(),
            show: jest.fn(),
            toggle: jest.fn(),
            resizeTimeScrubber: jest.fn(),
        };

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        videoBase.containerEl = containerEl;
        videoBase.rootEl = rootEl;
        videoBase.setup();
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (videoBase && typeof videoBase.destroy === 'function') {
            videoBase.destroy();
        }
        videoBase = null;
    });

    describe('setup()', () => {
        test('should set up media element, play button, and lower lights', () => {
            const { lowerLights } = VideoBaseViewer.prototype;

            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: jest.fn(),
            });

            videoBase = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
            videoBase.containerEl = containerEl;
            videoBase.setup();

            expect(videoBase.mediaEl.getAttribute('preload')).toBe('auto');
            expect(videoBase.mediaEl.getAttribute('playsinline')).toBe('');
            expect(videoBase.playButtonEl.className).toBe('bp-media-play-button bp-is-hidden');
            expect(videoBase.playButtonEl).toContainHTML('<path d="M0 0h24v24H0z" fill="none"');
            expect(VideoBaseViewer.prototype.lowerLights).toBeCalled();

            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: lowerLights,
            });
        });
    });

    describe('destroy()', () => {
        test('should remove event listeners on the media and play button', () => {
            jest.spyOn(videoBase.mediaEl, 'removeEventListener');
            jest.spyOn(videoBase.playButtonEl, 'removeEventListener');

            videoBase.destroy();

            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('click', videoBase.pointerHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('touchstart', videoBase.pointerHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.removeEventListener).toBeCalledWith('click', videoBase.togglePlay);
        });
    });

    describe('loadeddataHandler()', () => {
        const loadeddataHandlerFunc = MediaBaseViewer.prototype.loadeddataHandler;

        afterEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: loadeddataHandlerFunc });
        });

        test('should show the play button', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: jest.fn() });
            jest.spyOn(videoBase, 'showPlayButton');
            videoBase.loadeddataHandler();
            expect(videoBase.showPlayButton).toBeCalled();
        });
    });

    describe('pointerHandler()', () => {
        test('should prevent default, stop propagation, and toggle the controls on touchstart', () => {
            const event = {
                type: 'touchstart',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            videoBase.pointerHandler(event);
            expect(event.stopPropagation).toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(videoBase.mediaControls.toggle).toBeCalled();
        });

        test('should toggle play on click', () => {
            jest.spyOn(videoBase, 'togglePlay').mockImplementation();

            videoBase.pointerHandler({ type: 'click' });
            expect(videoBase.togglePlay).toBeCalled();
        });
    });

    describe('playingHandler()', () => {
        test('should hide the play button', () => {
            jest.spyOn(videoBase, 'handleRate').mockImplementation();
            jest.spyOn(videoBase, 'hidePlayButton').mockImplementation();

            videoBase.loadUI(); // load media controls UI
            videoBase.playingHandler();

            expect(videoBase.hidePlayButton).toBeCalled();
        });
    });

    describe('pauseHandler()', () => {
        test('should show the play button', () => {
            jest.spyOn(videoBase, 'showPlayButton');
            videoBase.loadUI(); // load media controls UI

            videoBase.pauseHandler();

            expect(videoBase.showPlayButton).toBeCalled();
        });

        test('should hide the loading icon', () => {
            jest.spyOn(videoBase, 'hideLoadingIcon');
            videoBase.loadUI(); // load media controls UI

            videoBase.pauseHandler();

            expect(videoBase.hideLoadingIcon).toBeCalled();
        });
    });

    describe('waitingHandler()', () => {
        test('should add the buffering class', () => {
            videoBase.waitingHandler();
            expect(videoBase.containerEl).toHaveClass('bp-is-buffering');
        });

        test('should hide the play button', () => {
            jest.spyOn(videoBase, 'hidePlayButton');

            videoBase.waitingHandler();
            expect(videoBase.hidePlayButton).toBeCalled();
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        test('should add a handler for toggling fullscreen', () => {
            videoBase.addEventListenersForMediaControls();
            expect(videoBase.mediaControls.on).toBeCalledWith('togglefullscreen', expect.any(Function));
        });
    });

    describe('addEventListenersForMediaElement()', () => {
        test('should add a handler for toggling fullscreen', () => {
            jest.spyOn(videoBase.mediaEl, 'addEventListener');
            jest.spyOn(videoBase.playButtonEl, 'addEventListener');

            videoBase.hasTouch = true;
            videoBase.addEventListenersForMediaElement();

            expect(videoBase.mousemoveHandler).toBeInstanceOf(Function);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('click', videoBase.pointerHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('touchstart', videoBase.pointerHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.addEventListener).toBeCalledWith('click', videoBase.togglePlay);
        });
    });

    describe('resize()', () => {
        test('should resize the time scrubber', () => {
            videoBase.resize();
            expect(videoBase.mediaControls.resizeTimeScrubber).toBeCalled();
        });
    });

    describe('allowNavigationArrows', () => {
        test('should return true if media controls are undefined or media controls do not have settings visible', () => {
            videoBase.mediaControls = undefined;
            expect(videoBase.allowNavigationArrows()).toBe(true);

            videoBase.mediaControls = {
                isSettingsVisible: jest.fn().mockReturnValue(false),
                removeAllListeners: jest.fn(),
                destroy: jest.fn(),
            };
            expect(videoBase.allowNavigationArrows()).toBe(true);

            videoBase.mediaControls.isSettingsVisible = jest.fn().mockReturnValue(true);
            expect(videoBase.allowNavigationArrows()).toBe(false);
        });
    });

    describe('lowerLights', () => {
        test('should add dark class to container', () => {
            videoBase.lowerLights();
            expect(videoBase.rootEl).toHaveClass('bp-dark');
        });
    });

    describe('handleAutoplayFail()', () => {
        test('should mute and play again', () => {
            jest.spyOn(videoBase, 'setVolume').mockImplementation();
            jest.spyOn(videoBase, 'play').mockResolvedValue('');

            videoBase.handleAutoplayFail();

            expect(videoBase.setVolume).toBeCalledWith(0);
            expect(videoBase.play).toBeCalled();
        });
    });
});
