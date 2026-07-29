const SYNC_THRESHOLD_SEC = 0.25;
const SYNC_EPSILON_SEC = 0.05;

export const GENERATED_AUDIO_LOCAL_URL = 'http://localhost:1024/audio.m4a';

/**
 * Plays an external audio track in sync with a muted video element.
 */
export default class ExternalAudioSync {
    /**
     * @param {Object} options
     * @param {HTMLVideoElement} options.mediaEl
     * @param {HTMLElement} options.containerEl
     * @param {string} options.audioUrl
     */
    constructor({ mediaEl, containerEl, audioUrl }) {
        this.mediaEl = mediaEl;
        this.containerEl = containerEl;
        this.audioUrl = audioUrl;
        this.isActive = false;
        this.isSyncing = false;
        this.audioEl = null;
        this.pendingSyncHandler = null;

        this.onVideoPlay = this.onVideoPlay.bind(this);
        this.onVideoPause = this.onVideoPause.bind(this);
        this.onVideoSeeked = this.onVideoSeeked.bind(this);
        this.onVideoRateChange = this.onVideoRateChange.bind(this);
        this.onVideoVolumeChange = this.onVideoVolumeChange.bind(this);
        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
        this.onAudioSeeked = this.onAudioSeeked.bind(this);
    }

    /**
     * @return {void}
     */
    enable() {
        if (this.isActive) {
            return;
        }

        if (!this.audioEl) {
            this.audioEl = this.containerEl.appendChild(document.createElement('audio'));
            this.audioEl.preload = 'auto';
            this.audioEl.src = this.audioUrl;
            this.audioEl.addEventListener('seeked', this.onAudioSeeked);
            this.attachVideoListeners();
        }

        this.isActive = true;
        this.mediaEl.muted = true;
        this.syncVolume();
        this.syncPlaybackToVideo();
    }

    /**
     * @return {void}
     */
    disable() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.clearPendingSync();

        if (this.audioEl) {
            this.audioEl.pause();
        }

        this.mediaEl.muted = false;
    }

    /**
     * @return {void}
     */
    destroy() {
        this.disable();

        if (this.audioEl) {
            this.detachVideoListeners();
            this.audioEl.removeEventListener('seeked', this.onAudioSeeked);

            if (this.audioEl.parentNode) {
                this.audioEl.parentNode.removeChild(this.audioEl);
            }

            this.audioEl = null;
        }
    }

    /**
     * @private
     * @return {void}
     */
    attachVideoListeners() {
        this.mediaEl.addEventListener('play', this.onVideoPlay);
        this.mediaEl.addEventListener('pause', this.onVideoPause);
        this.mediaEl.addEventListener('seeked', this.onVideoSeeked);
        this.mediaEl.addEventListener('ratechange', this.onVideoRateChange);
        this.mediaEl.addEventListener('volumechange', this.onVideoVolumeChange);
        this.mediaEl.addEventListener('timeupdate', this.onVideoTimeUpdate);
    }

    /**
     * @private
     * @return {void}
     */
    detachVideoListeners() {
        this.mediaEl.removeEventListener('play', this.onVideoPlay);
        this.mediaEl.removeEventListener('pause', this.onVideoPause);
        this.mediaEl.removeEventListener('seeked', this.onVideoSeeked);
        this.mediaEl.removeEventListener('ratechange', this.onVideoRateChange);
        this.mediaEl.removeEventListener('volumechange', this.onVideoVolumeChange);
        this.mediaEl.removeEventListener('timeupdate', this.onVideoTimeUpdate);
    }

    /**
     * @private
     * @param {number} time
     * @return {boolean}
     */
    canSeekTo(time) {
        if (!this.audioEl || this.audioEl.readyState < HTMLMediaElement.HAVE_METADATA) {
            return false;
        }

        const { seekable } = this.audioEl;

        if (!seekable || seekable.length === 0) {
            return Number.isFinite(this.audioEl.duration) && time <= this.audioEl.duration;
        }

        for (let index = 0; index < seekable.length; index += 1) {
            if (time >= seekable.start(index) && time <= seekable.end(index)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @private
     * @return {void}
     */
    clearPendingSync() {
        if (!this.pendingSyncHandler || !this.audioEl) {
            this.pendingSyncHandler = null;
            return;
        }

        this.audioEl.removeEventListener('loadedmetadata', this.pendingSyncHandler);
        this.audioEl.removeEventListener('progress', this.pendingSyncHandler);
        this.audioEl.removeEventListener('canplay', this.pendingSyncHandler);
        this.pendingSyncHandler = null;
    }

    /**
     * Waits until the external audio can seek to the current video time, then syncs playback.
     *
     * @private
     * @return {void}
     */
    syncPlaybackToVideo() {
        if (!this.isActive || !this.audioEl) {
            return;
        }

        this.clearPendingSync();

        const trySync = () => {
            if (!this.isActive || !this.audioEl) {
                return;
            }

            const targetTime = this.mediaEl.currentTime;

            if (!this.canSeekTo(targetTime)) {
                this.pendingSyncHandler = trySync;
                this.audioEl.addEventListener('progress', trySync, { once: true });
                this.audioEl.addEventListener('canplay', trySync, { once: true });
                return;
            }

            this.pendingSyncHandler = null;
            this.syncRate();
            this.syncTime();

            if (!this.mediaEl.paused) {
                this.audioEl.play().catch(() => {});
            }
        };

        if (this.audioEl.readyState >= HTMLMediaElement.HAVE_METADATA) {
            trySync();
            return;
        }

        this.pendingSyncHandler = trySync;
        this.audioEl.addEventListener('loadedmetadata', trySync, { once: true });
    }

    /**
     * @private
     * @return {void}
     */
    syncTime() {
        if (!this.isActive || !this.audioEl || this.isSyncing || this.audioEl.seeking) {
            return;
        }

        const targetTime = this.mediaEl.currentTime;

        if (!this.canSeekTo(targetTime)) {
            return;
        }

        if (Math.abs(this.audioEl.currentTime - targetTime) < SYNC_EPSILON_SEC) {
            return;
        }

        this.isSyncing = true;
        this.audioEl.currentTime = targetTime;

        if (Math.abs(this.audioEl.currentTime - targetTime) < SYNC_EPSILON_SEC) {
            this.isSyncing = false;
        }
    }

    /**
     * @private
     * @return {void}
     */
    syncRate() {
        if (!this.isActive || !this.audioEl) {
            return;
        }

        this.audioEl.playbackRate = this.mediaEl.playbackRate;
    }

    /**
     * @private
     * @return {void}
     */
    syncVolume() {
        if (!this.isActive || !this.audioEl) {
            return;
        }

        this.audioEl.volume = this.mediaEl.volume;
        this.audioEl.muted = this.mediaEl.volume === 0;
    }

    /**
     * @private
     * @return {void}
     */
    onVideoPlay() {
        if (!this.isActive || !this.audioEl) {
            return;
        }

        this.syncPlaybackToVideo();
    }

    /**
     * @private
     * @return {void}
     */
    onVideoPause() {
        if (!this.isActive || !this.audioEl) {
            return;
        }

        this.audioEl.pause();
    }

    /**
     * @private
     * @return {void}
     */
    onVideoSeeked() {
        this.syncPlaybackToVideo();
    }

    /**
     * @private
     * @return {void}
     */
    onVideoRateChange() {
        this.syncRate();
    }

    /**
     * @private
     * @return {void}
     */
    onVideoVolumeChange() {
        this.syncVolume();
    }

    /**
     * @private
     * @return {void}
     */
    onAudioSeeked() {
        this.isSyncing = false;
    }

    /**
     * @private
     * @return {void}
     */
    onVideoTimeUpdate() {
        if (
            !this.isActive ||
            !this.audioEl ||
            this.mediaEl.paused ||
            this.isSyncing ||
            this.audioEl.seeking ||
            this.pendingSyncHandler
        ) {
            return;
        }

        if (Math.abs(this.audioEl.currentTime - this.mediaEl.currentTime) > SYNC_THRESHOLD_SEC) {
            this.syncTime();
        }
    }
}
