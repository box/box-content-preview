/**
 * Synthesize a short musical-ish buffer and encode it as a WAV blob for <audio>.
 */

const SAMPLE_RATE = 44100;
const DURATION_SEC = 20;

/**
 * Build layered tones + amplitude envelope so peaks look like real audio.
 * @param {number} [durationSec]
 * @returns {Promise<AudioBuffer>}
 */
export async function synthesizeMockAudio(durationSec = DURATION_SEC) {
    const length = Math.floor(SAMPLE_RATE * durationSec);
    const offline = new OfflineAudioContext(2, length, SAMPLE_RATE);

    const master = offline.createGain();
    master.gain.value = 0.55;
    master.connect(offline.destination);

    // Bass pulse
    const bass = offline.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 55;
    const bassGain = offline.createGain();
    bass.connect(bassGain);
    bassGain.connect(master);

    // Mid harmony
    const mid = offline.createOscillator();
    mid.type = 'triangle';
    mid.frequency.value = 220;
    const midGain = offline.createGain();
    mid.connect(midGain);
    midGain.connect(master);

    // Bright overtone
    const high = offline.createOscillator();
    high.type = 'sawtooth';
    high.frequency.value = 660;
    const highGain = offline.createGain();
    highFilter(offline, high, highGain, master);

    // Noise bed for texture
    const noiseBuffer = offline.createBuffer(1, length, SAMPLE_RATE);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
        noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = offline.createGain();
    noiseGain.gain.value = 0.04;
    noise.connect(noiseGain);
    noiseGain.connect(master);

    scheduleEnvelope(bassGain.gain, durationSec, [
        [0, 0],
        [0.05, 0.7],
        [2, 0.35],
        [4, 0.8],
        [7, 0.25],
        [10, 0.9],
        [14, 0.4],
        [17, 0.75],
        [durationSec - 0.3, 0.5],
        [durationSec, 0],
    ]);

    scheduleEnvelope(midGain.gain, durationSec, [
        [0, 0],
        [0.2, 0.45],
        [3, 0.2],
        [5.5, 0.7],
        [8, 0.15],
        [11, 0.65],
        [15, 0.3],
        [18, 0.55],
        [durationSec, 0],
    ]);

    scheduleEnvelope(highGain.gain, durationSec, [
        [0, 0],
        [1, 0.08],
        [2.5, 0.25],
        [4, 0.05],
        [6, 0.3],
        [9, 0.1],
        [12, 0.35],
        [16, 0.12],
        [durationSec, 0],
    ]);

    // Gentle pitch movement so the waveform isn't perfectly periodic
    mid.frequency.setValueAtTime(220, 0);
    mid.frequency.linearRampToValueAtTime(247, 5);
    mid.frequency.linearRampToValueAtTime(196, 12);
    mid.frequency.linearRampToValueAtTime(220, durationSec);

    bass.start(0);
    mid.start(0);
    high.start(0);
    noise.start(0);
    bass.stop(durationSec);
    mid.stop(durationSec);
    high.stop(durationSec);
    noise.stop(durationSec);

    return offline.startRendering();
}

function highFilter(offline, osc, gainNode, dest) {
    const filter = offline.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);
}

/**
 * @param {AudioParam} param
 * @param {number} durationSec
 * @param {Array<[number, number]>} points
 */
function scheduleEnvelope(param, durationSec, points) {
    param.setValueAtTime(0, 0);
    points.forEach(([t, v]) => {
        const time = Math.min(durationSec, Math.max(0, t));
        param.linearRampToValueAtTime(v, time);
    });
}

/**
 * Encode an AudioBuffer as a 16-bit PCM WAV Blob.
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}
 */
export function audioBufferToWavBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const samples = audioBuffer.length;
    const blockAlign = (numChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let ch = 0; ch < numChannels; ch += 1) {
        channels.push(audioBuffer.getChannelData(ch));
    }

    let offset = 44;
    for (let i = 0; i < samples; i += 1) {
        for (let ch = 0; ch < numChannels; ch += 1) {
            const sample = Math.max(-1, Math.min(1, channels[ch][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
