/* eslint-disable no-unused-expressions */
import BaseViewer from '../../BaseViewer';
import MP3Controls from '../MP3Controls';
import MP3ControlsV2 from '../MP3ControlsV2';
import MP3ControlsRoot from '../MP3ControlsRoot';
import MP3Viewer from '../MP3Viewer';
import MediaBaseViewer from '../MediaBaseViewer';
import { MEDIA_METRIC_EVENTS, VIEWER_EVENT } from '../../../events';
import { loadPeaks } from '../waveform/decode';
import { WaveformLoadError } from '../waveform/createWaveformLoader';

jest.mock('../waveform/decode', () => ({
    loadPeaks: jest.fn(() => Promise.resolve({ status: 'capped', error: { code: 'CAP_EXCEEDED', message: 'skip' } })),
}));

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
        jest.spyOn(MP3Viewer.prototype, 'importV2Controls').mockResolvedValue({ default: MP3ControlsV2 });
        jest.spyOn(MP3Viewer.prototype, 'importWaveformDecode').mockResolvedValue({ loadPeaks });
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
            expect(mp3.wrapperEl).not.toHaveClass('bp-media--v2');
            expect(mp3.mediaContainerEl).not.toHaveClass('bp-media-container--v2');
            expect(mp3.mediaEl).toBeInstanceOf(HTMLElement);
            expect(mp3.mediaEl).toHaveAttribute('preload', 'auto');
            expect(mp3.isAudioPlayerV2).toBe(false);
            expect(mp3.waveformPeaks).toEqual([]);
        });

        test('should apply v2 classes when audioPlayerV2 is enabled', () => {
            mp3.options.features = { audioPlayerV2: { enabled: true } };
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(true);
            mp3.setup();

            expect(mp3.wrapperEl).toHaveClass('bp-media--v2');
            expect(mp3.mediaContainerEl).toHaveClass('bp-media-container--v2');
            expect(mp3.isAudioPlayerV2).toBe(true);
            expect(mp3.importWaveformDecode).toBeCalled();
        });

        test('should not apply v2 classes when React controls are off', () => {
            mp3.options.features = { audioPlayerV2: { enabled: true } };
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(false);
            mp3.setup();

            expect(mp3.wrapperEl).not.toHaveClass('bp-media--v2');
            expect(mp3.mediaContainerEl).not.toHaveClass('bp-media-container--v2');
            expect(mp3.isAudioPlayerV2).toBe(false);
        });

        test('should not apply v2 classes when audioPlayerV2 is explicitly disabled', () => {
            mp3.options.features = { audioPlayerV2: { enabled: false } };
            mp3.setup();

            expect(mp3.wrapperEl).not.toHaveClass('bp-media--v2');
            expect(mp3.mediaContainerEl).not.toHaveClass('bp-media-container--v2');
            expect(mp3.isAudioPlayerV2).toBe(false);
            expect(mp3.waveformPeaks).toEqual([]);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            mp3.setup();
            jest.spyOn(MediaBaseViewer.prototype, 'load').mockReturnValue(Promise.resolve());
        });

        afterEach(() => {
            MediaBaseViewer.prototype.load.mockRestore();
        });

        test('should show the v2 loading shell before audio metadata arrives', async () => {
            mp3.isAudioPlayerV2 = true;
            mp3.MP3ControlsV2 = MP3ControlsV2;
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(true);
            jest.spyOn(mp3, 'showMedia').mockImplementation();
            jest.spyOn(mp3, 'renderUI').mockImplementation();
            jest.spyOn(mp3, 'emitFirstRenderMetric').mockImplementation();
            jest.spyOn(mp3, 'emit');

            mp3.load();
            await Promise.resolve();

            expect(mp3.showMedia).toBeCalled();
            expect(mp3.controls).toBeInstanceOf(MP3ControlsRoot);
            expect(mp3.renderUI).toBeCalled();
            expect(mp3.emitFirstRenderMetric).toBeCalled();
            expect(mp3.emit).toBeCalledWith(VIEWER_EVENT.default, { event: VIEWER_EVENT.preload, data: {} });
            expect(MediaBaseViewer.prototype.load).toBeCalled();
        });

        test('should not mount the v2 loading shell when audio player v2 is off', () => {
            mp3.isAudioPlayerV2 = false;
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(true);
            jest.spyOn(mp3, 'showMedia').mockImplementation();
            jest.spyOn(mp3, 'renderUI').mockImplementation();
            jest.spyOn(mp3, 'emit');

            mp3.load();

            expect(mp3.showMedia).not.toBeCalled();
            expect(mp3.controls).toBeUndefined();
            expect(mp3.renderUI).not.toBeCalled();
            expect(mp3.emit).not.toBeCalledWith(VIEWER_EVENT.default, { event: VIEWER_EVENT.preload, data: {} });
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

        test('should create the controls root and render', () => {
            mp3.mediaContainerEl = document.createElement('div');
            mp3.loadUIReact();

            expect(mp3.controls).toBeInstanceOf(MP3ControlsRoot);
            expect(mp3.renderUI).toBeCalled();
        });

        test('should reuse an existing controls root from the loading shell', () => {
            mp3.mediaContainerEl = document.createElement('div');
            mp3.controls = new MP3ControlsRoot({ containerEl: mp3.mediaContainerEl });

            mp3.loadUIReact();

            expect(mp3.controls).toBeInstanceOf(MP3ControlsRoot);
            expect(mp3.renderUI).toBeCalled();
        });
    });

    describe('ensureV2Controls()', () => {
        test('should fall back to v1 when the v2 chunk fails to load', async () => {
            mp3.options.features = { audioPlayerV2: { enabled: true } };
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(true);
            mp3.importV2Controls.mockRejectedValue(new Error('chunk failed'));
            mp3.setup();
            mp3.controls = {
                destroy: jest.fn(),
                render: jest.fn(),
            };
            mp3.mediaEl = document.createElement('audio');
            mp3.cache = { get: jest.fn(key => key) };

            const result = await mp3.ensureV2Controls();
            mp3.renderUI();

            expect(result).toBeNull();
            expect(mp3.isAudioPlayerV2).toBe(false);
            expect(mp3.wrapperEl).not.toHaveClass('bp-media--v2');
            expect(mp3.mediaContainerEl).not.toHaveClass('bp-media-container--v2');
            expect(mp3.mp3ControlsV2Promise).toBeNull();
            expect(mp3.controls.render).toHaveBeenCalledWith(expect.objectContaining({ type: MP3Controls }));
        });
    });

    describe('handlePlayRequest()', () => {
        test('should remember the play request and toggle playback', () => {
            jest.spyOn(mp3, 'togglePlay').mockImplementation();
            jest.spyOn(mp3, 'startClientWaveformDecode').mockImplementation();

            mp3.handlePlayRequest();

            expect(mp3.userRequestedPlay).toBe(true);
            expect(mp3.togglePlay).toBeCalled();
            expect(mp3.startClientWaveformDecode).not.toBeCalled();
        });

        test('should retry decode once after a retryable failure', () => {
            jest.spyOn(mp3, 'togglePlay').mockImplementation();
            jest.spyOn(mp3, 'startClientWaveformDecode').mockImplementation();
            mp3.isWaveformDecodeRetryPending = true;

            mp3.handlePlayRequest();
            mp3.handlePlayRequest();

            expect(mp3.startClientWaveformDecode).toBeCalledTimes(1);
            expect(mp3.hasUsedWaveformDecodePlayRetry).toBe(true);
            expect(mp3.isWaveformDecodeRetryPending).toBe(false);
        });
    });

    describe('loadeddataHandler()', () => {
        test('should start playback when play was requested before metadata', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: jest.fn() });
            mp3.isAudioPlayerV2 = true;
            mp3.userRequestedPlay = true;
            const order = [];
            jest.spyOn(mp3, 'play').mockImplementation(() => order.push('play'));
            jest.spyOn(mp3, 'startClientWaveformDecode').mockImplementation(() => order.push('decode'));

            mp3.loadeddataHandler();

            expect(MediaBaseViewer.prototype.loadeddataHandler).toBeCalled();
            expect(order).toEqual(['play', 'decode']);
        });

        test('should not auto-start playback when play was not requested', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: jest.fn() });
            mp3.isAudioPlayerV2 = true;
            jest.spyOn(mp3, 'play').mockImplementation();

            mp3.loadeddataHandler();

            expect(mp3.play).not.toBeCalled();
        });

        test('should start client decode for v2 after metadata', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: jest.fn() });
            mp3.isAudioPlayerV2 = true;
            jest.spyOn(mp3, 'startClientWaveformDecode').mockImplementation();
            jest.spyOn(mp3, 'play').mockImplementation();

            mp3.loadeddataHandler();

            expect(mp3.startClientWaveformDecode).toBeCalled();
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
            mp3.isAudioPlayerV2 = true;
            mp3.MP3ControlsV2 = MP3ControlsV2;
            mp3.waveformPeaks = [0.2, 0.8];
            mp3.renderUI();

            expect(mp3.controls.render).toHaveBeenCalledWith(expect.objectContaining({ type: MP3ControlsV2 }));
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
                onPlayPause: mp3.handlePlayRequest,
                onRateChange: mp3.setRate,
                onTimeChange: mp3.handleTimeupdateFromMediaControls,
                onVolumeChange: mp3.setVolume,
                peaks: [0.2, 0.8],
                rate: 'media-speed',
                volume: 1,
            });
        });

        test('should wait for the v2 controls chunk before rendering', () => {
            mp3.isAudioPlayerV2 = true;
            mp3.ensureV2Controls = jest.fn().mockReturnValue(new Promise(() => {}));
            mp3.renderUI();

            expect(mp3.ensureV2Controls).toBeCalled();
            expect(mp3.controls.render).not.toBeCalled();
        });

        test('should render MP3ControlsV2 when audio player v2 is on', () => {
            mp3.isAudioPlayerV2 = true;
            mp3.MP3ControlsV2 = MP3ControlsV2;
            mp3.renderUI();

            expect(mp3.controls.render).toHaveBeenCalledWith(expect.objectContaining({ type: MP3ControlsV2 }));
        });

        test('should render MP3Controls when audio player v2 is off', () => {
            mp3.isAudioPlayerV2 = false;
            mp3.renderUI();

            expect(mp3.controls.render).toHaveBeenCalledWith(expect.objectContaining({ type: MP3Controls }));
        });

        test('should omit waveform peaks when v2 is off', () => {
            mp3.isAudioPlayerV2 = false;
            mp3.waveformPeaks = [];
            mp3.renderUI();

            expect(getProps(mp3)).toMatchObject({
                rate: 'media-speed',
                volume: 1,
            });
            expect(getProps(mp3).peaks).toBeUndefined();
        });
    });

    describe('getIsAudioPlayerV2()', () => {
        test('should default off when the host has not passed a gate', () => {
            expect(mp3.getIsAudioPlayerV2()).toBe(false);
        });

        test('should honor an explicit enabled flag', () => {
            mp3.options.features = { audioPlayerV2: { enabled: true } };
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(true);
            expect(mp3.getIsAudioPlayerV2()).toBe(true);
        });

        test('should stay off when React controls are disabled', () => {
            mp3.options.features = { audioPlayerV2: { enabled: true } };
            jest.spyOn(mp3, 'useReactControls').mockReturnValue(false);
            expect(mp3.getIsAudioPlayerV2()).toBe(false);
        });

        test('should honor an explicit disabled flag', () => {
            mp3.options.features = { audioPlayerV2: { enabled: false } };
            expect(mp3.getIsAudioPlayerV2()).toBe(false);
        });
    });

    describe('handleAutoplayFail()', () => {
        test('should call pause', () => {
            jest.spyOn(mp3, 'pause').mockImplementation();
            mp3.handleAutoplayFail();
            expect(mp3.pause).toBeCalled();
        });
    });

    describe('startClientWaveformDecode()', () => {
        beforeEach(() => {
            loadPeaks.mockReset();
            loadPeaks.mockResolvedValue({ status: 'capped', error: { code: 'CAP_EXCEEDED', message: 'skip' } });
            mp3.isAudioPlayerV2 = true;
            mp3.waveformPeaks = [];
            mp3.mediaEl = { duration: 30 };
            mp3.options.file = { id: 1, size: 1024 };
            jest.spyOn(mp3, 'renderUI').mockImplementation();
            jest.spyOn(mp3, 'emitMetric').mockImplementation();
        });

        test('should apply decoded peaks when loadPeaks is ready', async () => {
            loadPeaks.mockResolvedValue({
                status: 'ready',
                payload: { peaks: [0.2, 0.8] },
            });

            await mp3.startClientWaveformDecode();

            expect(mp3.waveformPeaks).toEqual([0.2, 0.8]);
            expect(mp3.renderUI).toBeCalled();
            expect(mp3.emitMetric).not.toBeCalled();
        });

        test('should keep empty peaks when decode is skipped as capped', async () => {
            await mp3.startClientWaveformDecode();

            expect(mp3.waveformPeaks).toEqual([]);
            expect(mp3.renderUI).not.toBeCalled();
            expect(mp3.emitMetric).toBeCalledWith(MEDIA_METRIC_EVENTS.waveformDecode, {
                status: 'capped',
                code: 'CAP_EXCEEDED',
            });
        });

        test('should include skip reason on the metric when metadata is missing', async () => {
            loadPeaks.mockResolvedValue({
                status: 'unavailable',
                error: { code: 'UNAVAILABLE', message: 'missing' },
                reason: 'missing_metadata',
            });

            await mp3.startClientWaveformDecode();

            expect(mp3.waveformPeaks).toEqual([]);
            expect(mp3.isWaveformDecodeRetryPending).toBeUndefined();
            expect(mp3.emitMetric).toBeCalledWith(MEDIA_METRIC_EVENTS.waveformDecode, {
                status: 'unavailable',
                code: 'UNAVAILABLE',
                reason: 'missing_metadata',
            });
        });

        test('should keep empty peaks when decode fails', async () => {
            loadPeaks.mockResolvedValue({
                status: 'failed',
                error: { code: 'LOAD_FAILED', message: 'network' },
                retryable: true,
            });

            await mp3.startClientWaveformDecode();

            expect(mp3.waveformPeaks).toEqual([]);
            expect(mp3.renderUI).not.toBeCalled();
            expect(mp3.isWaveformDecodeRetryPending).toBe(true);
            expect(mp3.emitMetric).toBeCalledWith(MEDIA_METRIC_EVENTS.waveformDecode, {
                status: 'failed',
                code: 'LOAD_FAILED',
            });
        });

        test('should not decode when v2 is off', async () => {
            mp3.isAudioPlayerV2 = false;

            await mp3.startClientWaveformDecode();

            expect(loadPeaks).not.toBeCalled();
        });

        test('should map a decode-chunk load failure to LOAD_FAILED', async () => {
            mp3.importWaveformDecode.mockRejectedValue(new Error('chunk failed'));

            await mp3.startClientWaveformDecode();

            expect(mp3.waveformPeaks).toEqual([]);
            expect(mp3.isWaveformDecodeRetryPending).toBe(true);
            expect(mp3.emitMetric).toBeCalledWith(MEDIA_METRIC_EVENTS.waveformDecode, {
                status: 'failed',
                code: 'LOAD_FAILED',
            });
        });

        test('should not retry overlay play when the thrown error is not retryable', async () => {
            mp3.importWaveformDecode.mockRejectedValue(new WaveformLoadError('INVALID_PAYLOAD', 'bad payload'));

            await mp3.startClientWaveformDecode();

            expect(mp3.isWaveformDecodeRetryPending).toBeUndefined();
            expect(mp3.emitMetric).toBeCalledWith(MEDIA_METRIC_EVENTS.waveformDecode, {
                status: 'failed',
                code: 'INVALID_PAYLOAD',
            });
        });

        test('should abort an in-flight decode on destroy', () => {
            loadPeaks.mockReturnValue(new Promise(() => undefined));
            const superDestroy = jest.spyOn(MediaBaseViewer.prototype, 'destroy').mockImplementation();

            mp3.startClientWaveformDecode();
            const { signal } = mp3.waveformDecodeController;
            mp3.destroy();

            expect(signal.aborted).toBe(true);
            expect(mp3.waveformDecodeController).toBeNull();
            superDestroy.mockRestore();
        });
    });

    describe('fetchAudioArrayBuffer()', () => {
        const originalFetch = global.fetch;

        afterEach(() => {
            global.fetch = originalFetch;
        });

        test('should prefer an existing blob URL over a second API GET', async () => {
            mp3.mediaBlobUrl = 'blob:audio';
            mp3.api = { get: jest.fn() };
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            });

            const buffer = await mp3.fetchAudioArrayBuffer(new AbortController().signal);

            expect(buffer).toBeInstanceOf(ArrayBuffer);
            expect(global.fetch).toHaveBeenCalledWith(
                'blob:audio',
                expect.objectContaining({ signal: expect.any(AbortSignal) }),
            );
            expect(mp3.api.get).not.toHaveBeenCalled();
        });

        test('should reject when neither a blob URL nor a representation URL is available', async () => {
            mp3.mediaBlobUrl = null;
            mp3.options.representation = {};

            await expect(mp3.fetchAudioArrayBuffer(new AbortController().signal)).rejects.toBeInstanceOf(
                WaveformLoadError,
            );
        });
    });
});
