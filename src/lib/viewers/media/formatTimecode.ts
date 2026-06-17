import isFinite from 'lodash/isFinite';
import { DEFAULT_FPS } from './videoFps';

/**
 * Formats seconds into professional timecode: HH:MM:SS:FF
 */
export default function formatTimecode(seconds: number, fps: number): string {
    const validSeconds = isFinite(seconds) && seconds > 0 ? seconds : 0;
    const validFps = isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS;
    const totalFrames = Math.floor(validSeconds * validFps);
    const frameBase = Math.round(validFps);

    const hours = Math.floor(totalFrames / (frameBase * 3600));
    const minutes = Math.floor((totalFrames % (frameBase * 3600)) / (frameBase * 60));
    const secs = Math.floor((totalFrames % (frameBase * 60)) / frameBase);
    const frames = totalFrames % frameBase;

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const ff = frames.toString().padStart(2, '0');

    return `${hh}:${mm}:${ss}:${ff}`;
}
