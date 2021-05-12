/* eslint-disable no-unused-expressions */
import BaseViewer from '../../BaseViewer';
import MP3ControlsRoot from '../MP3ControlsRoot';
import MP3Viewer from '../MP3Viewer';
import MediaBaseViewer from '../MediaBaseViewer';

let mp3;

describe('lib/viewers/media/MP3Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP3Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp3 = new MP3Viewer({
            container: containerEl,
            file: {
                id: 1,
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        mp3.cache = {
            has: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
        };
        mp3.containerEl = containerEl;
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp3 && typeof mp3.destroy === 'function') {
            mp3.destroy();
        }

        mp3 = null;
    });

    describe('setup()', () => {
        test('should create mp3 viewer and initialize audio element', () => {
            mp3.setup();

            expect(mp3.wrapperEl).toHaveClass('bp-media-mp3');
            expect(mp3.mediaEl).toBeInstanceOf(HTMLElement);
            expect(mp3.mediaEl).toHaveAttribute('preload', 'auto');
        });
    });

    describe('loadUI()', () => {
        const loadUIFunc = MediaBaseViewer.prototype.loadUI;

        afterEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: loadUIFunc });
        });

        test('should load UI and controls', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: jest.fn() });

            mp3.mediaControls = {
                show: jest.fn(),
                destroy: jest.fn(),
                resizeTimeScrubber: jest.fn(),
                removeAllListeners: jest.fn(),
            };

            mp3.loadUI();

            expect(mp3.mediaControls.resizeTimeScrubber).toBeCalled();
            expect(mp3.mediaControls.show).toBeCalled();
        });
    });

    describe('loadUIReact()', () => {
        beforeEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUIReact', { value: jest.fn() });
            jest.spyOn(mp3, 'renderUI').mockImplementation();
        });

        test('should create the controls root and render the controls', () => {
            mp3.mediaContainerEl = document.createElement('div');
            mp3.loadUIReact();

            expect(mp3.controls).toBeInstanceOf(MP3ControlsRoot);
            expect(mp3.renderUI).toBeCalled();
        });
    });

    describe('renderUI()', () => {
        const getProps = instance => instance.controls.render.mock.calls[0][0].props;

        beforeEach(() => {
            mp3.controls = {
                destroy: jest.fn(),
                render: jest.fn(),
            };
            mp3.cache = {
                get: jest.fn(key => key),
            };

            mp3.mediaEl = document.createElement('audio');
            mp3.mediaEl.duration = 1000;
        });

        test('should render the react controls with the correct props', () => {
            mp3.renderUI();

            expect(getProps(mp3)).toMatchObject({
                autoplay: false,
                bufferedRange: {
                    end: expect.any(Function),
                    length: 0,
                    start: expect.any(Function),
                },
                currentTime: 0,
                durationTime: 1000,
                isPlaying: true,
                onAutoplayChange: mp3.setAutoplay,
                onMuteChange: mp3.toggleMute,
                onPlayPause: mp3.togglePlay,
                onRateChange: mp3.setRate,
                onTimeChange: mp3.handleTimeupdateFromMediaControls,
                onVolumeChange: mp3.setVolume,
                rate: 'media-speed',
                volume: 1,
            });
        });
    });

    describe('handleAutoplayFail()', () => {
        test('should call pause', () => {
            jest.spyOn(mp3, 'pause').mockImplementation();
            mp3.handleAutoplayFail();
            expect(mp3.pause).toBeCalled();
        });
    });
});
