import ExternalAudioSync from '../ExternalAudioSync';
import { getGeneratedAudioUrl } from '../GeneratedMediaUrls';

describe('ExternalAudioSync', () => {
    let containerEl;
    let mediaEl;
    let sync;

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);

        mediaEl = document.createElement('video');
        mediaEl.muted = false;
        mediaEl.volume = 0.8;
        mediaEl.playbackRate = 1;
        mediaEl.currentTime = 10;
        mediaEl.paused = false;
        mediaEl.play = jest.fn().mockResolvedValue(undefined);
        mediaEl.pause = jest.fn();

        sync = new ExternalAudioSync({
            mediaEl,
            containerEl,
            audioUrl: getGeneratedAudioUrl('generated-fr'),
        });
    });

    afterEach(() => {
        sync.destroy();
        document.body.removeChild(containerEl);
    });

    const mockAudioPlayback = audioEl => {
        audioEl.play = jest.fn().mockResolvedValue(undefined);
        audioEl.pause = jest.fn();
        audioEl.load = jest.fn();
        Object.defineProperty(audioEl, 'paused', { configurable: true, value: true, writable: true });
        Object.defineProperty(audioEl, 'seeking', { configurable: true, value: false, writable: true });
    };

    test('should wait for metadata before seeking to the current video time', () => {
        sync.enable();
        mockAudioPlayback(sync.audioEl);

        expect(mediaEl.muted).toBe(true);
        expect(sync.audioEl.currentTime).toBe(0);

        Object.defineProperty(sync.audioEl, 'readyState', {
            configurable: true,
            value: HTMLMediaElement.HAVE_METADATA,
        });
        Object.defineProperty(sync.audioEl, 'duration', { configurable: true, value: 120 });
        Object.defineProperty(sync.audioEl, 'seekable', {
            configurable: true,
            value: {
                length: 1,
                start: () => 0,
                end: () => 120,
            },
        });

        sync.audioEl.dispatchEvent(new Event('loadedmetadata'));

        expect(sync.audioEl.currentTime).toBe(10);
        expect(sync.audioEl.play).toHaveBeenCalled();
    });

    test('should seek external audio when the video is seeked', () => {
        sync.enable();
        mockAudioPlayback(sync.audioEl);

        Object.defineProperty(sync.audioEl, 'readyState', {
            configurable: true,
            value: HTMLMediaElement.HAVE_METADATA,
        });
        Object.defineProperty(sync.audioEl, 'duration', { configurable: true, value: 120 });
        Object.defineProperty(sync.audioEl, 'seekable', {
            configurable: true,
            value: {
                length: 1,
                start: () => 0,
                end: () => 120,
            },
        });
        sync.audioEl.dispatchEvent(new Event('loadedmetadata'));

        mediaEl.currentTime = 42;
        mediaEl.dispatchEvent(new Event('seeked'));

        expect(sync.audioEl.currentTime).toBe(42);
    });

    test('should restore original audio when disabled', () => {
        sync.enable();
        mockAudioPlayback(sync.audioEl);
        sync.disable();

        expect(mediaEl.muted).toBe(false);
        expect(sync.audioEl.pause).toHaveBeenCalled();
    });

    test('should switch audio source when setAudioUrl is called', () => {
        sync.enable();
        mockAudioPlayback(sync.audioEl);

        const japaneseUrl = getGeneratedAudioUrl('generated-ja');
        sync.setAudioUrl(japaneseUrl);

        expect(sync.audioUrl).toBe(japaneseUrl);
        expect(sync.audioEl.src).toBe(japaneseUrl);
        expect(mediaEl.muted).toBe(true);
    });
});
