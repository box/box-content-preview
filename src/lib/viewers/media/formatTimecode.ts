import isFinite from 'lodash/isFinite';

/**
 * Formats seconds into professional timecode: HH:MM:SS:FF
 */
export default function formatTimecode(seconds: number, fps: number): string {
    const val = isFinite(seconds) ? Math.max(0, seconds) : 0;
    const totalFrames = Math.floor(val * fps);

    const hours = Math.floor(totalFrames / (fps * 3600));
    const minutes = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
    const secs = Math.floor((totalFrames % (fps * 60)) / fps);
    const frames = totalFrames % Math.round(fps);

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const ff = frames.toString().padStart(2, '0');

    return `${hh}:${mm}:${ss}:${ff}`;
}
