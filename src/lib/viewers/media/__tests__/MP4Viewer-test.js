import MP4Viewer from '../MP4Viewer';
import BaseViewer from '../../BaseViewer';
import { VIEWER_EVENT } from '../../../events';

const sandbox = sinon.createSandbox();
let mp4;

describe('lib/viewers/media/MP4Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP4Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp4 = new MP4Viewer({
            container: containerEl,
            file: {
                id: 1,
            },
            cache: {
                has: jest.fn(),
                get: jest.fn(),
                set: jest.fn(),
                unset: jest.fn(),
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        mp4.containerEl = containerEl;
        mp4.mediaControls = {
            addListener: () => {},
            enableHDSettings: () => {},
            destroy: () => {},
            initFilmstrip: () => {},
            initSubtitles: () => {},
            initAlternateAudio: () => {},
            removeAllListeners: () => {},
            removeListener: () => {},
            show: jest.fn(),
            setLabel: () => {},
        };

        mp4.mediaEl = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            paused: false,
            volume: 1,
            buffered: {},
            currentTime: 0,
            duration: 0,
        };
        mp4.mediaContainerEl = {
            clientWidth: 100,
            clientHeight: 100,
            focus: jest.fn(),
        };
        mp4.annotationControlsFSM = {
            subscribe: jest.fn(),
            getMode: jest.fn(() => 'none'),
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp4 && typeof mp4.destroy === 'function') {
            mp4.destroy();
        }

        mp4 = null;
    });

    describe('setup()', () => {
        test('should have proper class added to wrapper', () => {
            mp4.setup();
            expect(mp4.wrapperEl).toHaveClass('bp-media-mp4');
        });
    });

    describe('loadeddataHandler()', () => {
        beforeEach(() => {
            jest.spyOn(mp4, 'isDestroyed').mockReturnValue(false);
            jest.spyOn(mp4, 'showMedia').mockImplementation();
            jest.spyOn(mp4, 'isAutoplayEnabled').mockReturnValue(true);
            jest.spyOn(mp4, 'autoplay').mockImplementation();
            jest.spyOn(mp4, 'resize').mockImplementation();
            jest.spyOn(mp4, 'handleVolume').mockImplementation();
            jest.spyOn(mp4, 'showPlayButton').mockImplementation();
            jest.spyOn(mp4, 'calculateVideoDimensions').mockImplementation();
            jest.spyOn(mp4, 'addEventListenersForMediaElement').mockImplementation();
            jest.spyOn(mp4, 'loadUI').mockImplementation();
            jest.spyOn(mp4, 'loadUIReact').mockImplementation();
            jest.spyOn(mp4, 'emit').mockImplementation();
            jest.spyOn(mp4, 'showAndHideReactControls').mockImplementation();
            jest.spyOn(mp4, 'setMediaTime').mockImplementation();
        });

        test('should do nothing if the player is destroyed', () => {
            jest.spyOn(mp4, 'isDestroyed').mockReturnValue(true);
            jest.spyOn(mp4, 'showMedia');
            mp4.loadeddataHandler();
            expect(mp4.showMedia).not.toHaveBeenCalled();
        });

        test('should load the metadata for the media element, show the media/play button, load subs, check for autoplay, and set focus without react controls', () => {
            mp4.options.autoFocus = true;
            mp4.startTimeInSeconds = 10;
            mp4.loadeddataHandler();
            expect(mp4.autoplay).toHaveBeenCalled();
            expect(mp4.showMedia).toHaveBeenCalled();
            expect(mp4.showPlayButton).toHaveBeenCalled();
            expect(mp4.calculateVideoDimensions).toHaveBeenCalled();
            expect(mp4.emit).toHaveBeenCalledWith(VIEWER_EVENT.load);
            expect(mp4.loaded).toBe(true);
            expect(mp4.mediaContainerEl.focus).toHaveBeenCalled();
            expect(mp4.loadUI).toHaveBeenCalled();
            expect(mp4.showAndHideReactControls).not.toHaveBeenCalled();
            expect(mp4.mediaControls.show).toHaveBeenCalled();
            expect(mp4.setMediaTime).toHaveBeenCalledWith(10);
        });

        test('should load the metadata for the media element, show the media/play button, load subs, check for autoplay, and set focus with react controls', () => {
            jest.spyOn(mp4, 'getViewerOption').mockImplementation(option => option === 'useReactControls');
            mp4.options.autoFocus = true;
            mp4.startTimeInSeconds = 10;
            mp4.loadeddataHandler();
            expect(mp4.autoplay).toHaveBeenCalled();
            expect(mp4.showMedia).toHaveBeenCalled();
            expect(mp4.showPlayButton).toHaveBeenCalled();
            expect(mp4.calculateVideoDimensions).toHaveBeenCalled();
            expect(mp4.emit).toHaveBeenCalledWith(VIEWER_EVENT.load);
            expect(mp4.loaded).toBe(true);
            expect(mp4.mediaContainerEl.focus).toHaveBeenCalled();
            expect(mp4.showAndHideReactControls).not.toHaveBeenCalled();
            expect(mp4.mediaControls.show).toHaveBeenCalled();
            expect(mp4.loadUIReact).toHaveBeenCalled();
            expect(mp4.loadUI).not.toHaveBeenCalled();
            expect(mp4.showAndHideReactControls).not.toHaveBeenCalled();
            expect(mp4.setMediaTime).toHaveBeenCalledWith(10);
        });
    });

    describe('calculateVideoDimensions()', () => {
        test('should calculate video dimensions', () => {
            mp4.mediaContainerEl = {
                clientWidth: 100,
                clientHeight: 100,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(100);
            expect(mp4.videoHeight).toBe(100);
            expect(mp4.aspect).toBe(1);
        });

        test('should calculate video dimensions when video is stretched horizontally', () => {
            mp4.mediaContainerEl = {
                clientWidth: 200,
                clientHeight: 100,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(200);
            expect(mp4.videoHeight).toBe(100);
            expect(mp4.aspect).toBe(2);
        });

        test('should calculate video dimensions when video is stretched vertically', () => {
            mp4.mediaContainerEl = {
                clientWidth: 100,
                clientHeight: 200,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(100);
            expect(mp4.videoHeight).toBe(200);
            expect(mp4.aspect).toBe(0.5);
        });
    });
});
