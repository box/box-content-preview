import {
    DEFAULT_BAR_COUNT,
    attachScrubber,
    computePeaks,
    decodeSourceFromArrayBuffer,
    drawWaveform,
    sourceFromAudioBuffer,
} from './waveform.js';
import { audioBufferToWavBlob, synthesizeMockAudio } from './mockAudio.js';

const audioEl = document.getElementById('audio');
const canvas = document.getElementById('waveform');
const waveformWrap = document.getElementById('waveformWrap');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const windowRangeEl = document.getElementById('windowRange');
const playPauseBtn = document.getElementById('playPause');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const muteBtn = document.getElementById('mute');
const iconVolume = document.getElementById('iconVolume');
const iconMuted = document.getElementById('iconMuted');
const volumeSlider = document.getElementById('volume');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomLevelBtn = document.getElementById('zoomLevel');
const fileInput = document.getElementById('fileInput');
const resetMockBtn = document.getElementById('resetMock');
const statusEl = document.getElementById('status');

const ZOOM_LEVELS = [1, 2, 4, 8, 16, 32, 64];
const WHEEL_ZOOM_THRESHOLD = 40;

let source = null;
let peaks = [];
let zoomIndex = 0;
let windowStart = 0; // ratio of the whole track
let objectUrl = null;
let detachScrubber = null;
let wheelDelta = 0;

function setStatus(message, tone = '') {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function zoom() {
    return ZOOM_LEVELS[zoomIndex];
}

function span() {
    return 1 / zoom();
}

function clampStart(start) {
    return Math.min(Math.max(0, start), 1 - span());
}

function visibleWindow() {
    return { start: windowStart, end: windowStart + span() };
}

function playRatio() {
    const { currentTime, duration } = audioEl;
    if (!Number.isFinite(duration) || duration <= 0) {
        return 0;
    }
    return currentTime / duration;
}

/** Playhead position relative to the visible window. */
function windowProgress() {
    return (playRatio() - windowStart) / span();
}

function refreshPeaks() {
    if (!source) {
        peaks = [];
        return;
    }

    const total = source.magnitudes.length;
    const { start, end } = visibleWindow();

    peaks = computePeaks(source.magnitudes, DEFAULT_BAR_COUNT, {
        startSample: start * total,
        endSample: end * total,
        referenceMax: source.referenceMax,
    });
}

function paint() {
    drawWaveform(canvas, peaks, windowProgress(), { showPlayhead: zoom() > 1 });
}

function updateLabels() {
    currentTimeEl.textContent = formatTime(audioEl.currentTime);
    durationTimeEl.textContent = formatTime(audioEl.duration);
    canvas.setAttribute('aria-valuemax', String(Math.floor(audioEl.duration || 0)));
    canvas.setAttribute('aria-valuenow', String(Math.floor(audioEl.currentTime || 0)));
}

function updateZoomUI() {
    const level = zoom();
    const duration = audioEl.duration || source?.duration || 0;
    const { start, end } = visibleWindow();

    zoomLevelBtn.textContent = `${level}x`;
    zoomOutBtn.disabled = zoomIndex === 0;
    zoomInBtn.disabled = zoomIndex === ZOOM_LEVELS.length - 1;
    zoomLevelBtn.disabled = zoomIndex === 0;
    waveformWrap.classList.toggle('is-zoomed', level > 1);

    if (level > 1 && duration > 0) {
        windowRangeEl.textContent = `${formatTime(start * duration)}–${formatTime(end * duration)}`;
    } else {
        windowRangeEl.textContent = '';
    }
}

function updatePlayButton() {
    const playing = !audioEl.paused;
    iconPlay.hidden = playing;
    iconPause.hidden = !playing;
    playPauseBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playPauseBtn.title = playing ? 'Pause' : 'Play';
}

function updateMuteIcons() {
    const muted = audioEl.muted || audioEl.volume === 0;
    iconVolume.hidden = muted;
    iconMuted.hidden = !muted;
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    muteBtn.title = muted ? 'Unmute' : 'Mute';
}

/**
 * @param {number} nextIndex
 * @param {number} [anchorRatio] track position to hold steady on screen
 */
function setZoom(nextIndex, anchorRatio) {
    const clamped = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, nextIndex));

    if (clamped === zoomIndex) {
        return;
    }

    const anchor = Number.isFinite(anchorRatio) ? anchorRatio : playRatio();
    const relative = (anchor - windowStart) / span();

    zoomIndex = clamped;
    windowStart = clampStart(anchor - relative * span());

    refreshPeaks();
    updateZoomUI();
    paint();
}

function panBy(deltaRatio) {
    if (zoom() === 1) {
        return;
    }

    const next = clampStart(windowStart + deltaRatio);

    if (next === windowStart) {
        return;
    }

    windowStart = next;
    refreshPeaks();
    updateZoomUI();
    paint();
}

/** Keep the playhead inside the zoomed window during playback. */
function followPlayhead() {
    if (zoom() === 1) {
        return;
    }

    const ratio = playRatio();
    const { start, end } = visibleWindow();
    const margin = span() * 0.1;

    if (ratio < start + margin || ratio > end - margin) {
        windowStart = clampStart(ratio - span() / 2);
        refreshPeaks();
        updateZoomUI();
    }
}

function resetZoom() {
    if (zoomIndex === 0) {
        return;
    }
    zoomIndex = 0;
    windowStart = 0;
    refreshPeaks();
    updateZoomUI();
    paint();
}

function revokeObjectUrl() {
    if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
    }
}

/**
 * @param {{ source: object, url: string, label: string }} next
 */
async function loadSource({ source: nextSource, url, label }) {
    waveformWrap.classList.add('is-loading');
    revokeObjectUrl();
    objectUrl = url;
    source = nextSource;
    zoomIndex = 0;
    windowStart = 0;
    refreshPeaks();
    audioEl.pause();
    audioEl.src = url;
    audioEl.load();

    await new Promise((resolve, reject) => {
        const onReady = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error('Audio element failed to load'));
        };
        const cleanup = () => {
            audioEl.removeEventListener('loadedmetadata', onReady);
            audioEl.removeEventListener('error', onError);
        };
        audioEl.addEventListener('loadedmetadata', onReady);
        audioEl.addEventListener('error', onError);
    });

    waveformWrap.classList.remove('is-loading');
    updateLabels();
    updatePlayButton();
    updateZoomUI();
    paint();
    setStatus(label, 'ok');
}

async function loadMock() {
    setStatus('Synthesizing mock audio…');
    waveformWrap.classList.add('is-loading');

    const buffer = await synthesizeMockAudio(20);
    const blob = audioBufferToWavBlob(buffer);

    await loadSource({
        source: sourceFromAudioBuffer(buffer),
        url: URL.createObjectURL(blob),
        label: 'Mock 20s synthesized track (WAV blob)',
    });
}

async function loadFile(file) {
    setStatus(`Decoding ${file.name}…`);
    waveformWrap.classList.add('is-loading');

    const arrayBuffer = await file.arrayBuffer();

    await loadSource({
        source: await decodeSourceFromArrayBuffer(arrayBuffer),
        url: URL.createObjectURL(file),
        label: `Loaded ${file.name}`,
    });
}

function onCanvasKeyDown(event) {
    const duration = audioEl.duration || 0;

    if (event.key === '+' || event.key === '=') {
        setZoom(zoomIndex + 1);
        event.preventDefault();
        return;
    }

    if (event.key === '-' || event.key === '_') {
        setZoom(zoomIndex - 1);
        event.preventDefault();
        return;
    }

    if (event.key === '0') {
        resetZoom();
        event.preventDefault();
        return;
    }

    if (!duration) {
        return;
    }

    // Shift + arrows pan the zoomed window instead of seeking.
    if (event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        panBy((event.key === 'ArrowRight' ? 0.25 : -0.25) * span());
        event.preventDefault();
        return;
    }

    // Step in window-relative units so zoomed seeking stays precise.
    const step = Math.max(0.05, duration * span() * 0.05);

    if (event.key === 'ArrowRight') {
        audioEl.currentTime = Math.min(duration, audioEl.currentTime + step);
        event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
        audioEl.currentTime = Math.max(0, audioEl.currentTime - step);
        event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Enter') {
        playPauseBtn.click();
        event.preventDefault();
    }
}

function onWheel(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        panBy((event.deltaX / rect.width) * span());
        return;
    }

    wheelDelta += event.deltaY;

    if (Math.abs(wheelDelta) < WHEEL_ZOOM_THRESHOLD) {
        return;
    }

    const direction = wheelDelta < 0 ? 1 : -1;
    wheelDelta = 0;

    const anchor = windowStart + ((event.clientX - rect.left) / rect.width) * span();
    setZoom(zoomIndex + direction, anchor);
}

playPauseBtn.addEventListener('click', async () => {
    if (audioEl.paused) {
        try {
            await audioEl.play();
        } catch (err) {
            setStatus(`Playback blocked: ${err.message}`, 'error');
        }
    } else {
        audioEl.pause();
    }
    updatePlayButton();
});

muteBtn.addEventListener('click', () => {
    audioEl.muted = !audioEl.muted;
    updateMuteIcons();
});

volumeSlider.addEventListener('input', () => {
    audioEl.volume = Number(volumeSlider.value);
    if (audioEl.volume > 0) {
        audioEl.muted = false;
    }
    updateMuteIcons();
});

zoomInBtn.addEventListener('click', () => setZoom(zoomIndex + 1));
zoomOutBtn.addEventListener('click', () => setZoom(zoomIndex - 1));
zoomLevelBtn.addEventListener('click', resetZoom);

fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        return;
    }
    try {
        await loadFile(file);
    } catch (err) {
        waveformWrap.classList.remove('is-loading');
        setStatus(`Could not decode file: ${err.message}`, 'error');
    }
});

resetMockBtn.addEventListener('click', async () => {
    fileInput.value = '';
    try {
        await loadMock();
    } catch (err) {
        setStatus(`Mock load failed: ${err.message}`, 'error');
    }
});

audioEl.addEventListener('timeupdate', () => {
    updateLabels();
    followPlayhead();
    paint();
});
audioEl.addEventListener('play', updatePlayButton);
audioEl.addEventListener('pause', updatePlayButton);
audioEl.addEventListener('ended', updatePlayButton);
audioEl.volume = Number(volumeSlider.value);

canvas.addEventListener('keydown', onCanvasKeyDown);
canvas.addEventListener('wheel', onWheel, { passive: false });
detachScrubber = attachScrubber(canvas, audioEl, {
    getWindow: visibleWindow,
    onScrub: () => {
        updateLabels();
        paint();
    },
});

window.addEventListener('resize', paint);
window.addEventListener('beforeunload', () => {
    detachScrubber?.();
    revokeObjectUrl();
});

updateZoomUI();

loadMock().catch(err => {
    waveformWrap.classList.remove('is-loading');
    setStatus(`Failed to start POC: ${err.message}`, 'error');
});
