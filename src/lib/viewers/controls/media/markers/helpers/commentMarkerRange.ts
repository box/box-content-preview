import { CommentRangeDraft } from '../../types';
import { CommentMarker } from '../types';

/**
 * Turn a host comment marker into the waveform range for a read-only span.
 * `comment_markers` uses seconds (`time` is the start, `endTime` the end); the
 * waveform draws `{ startMs, endMs }`. A point comment, or a span whose end is
 * not after the start, has no range, so the viewer only seeks.
 */
export default function commentMarkerRange(
    marker: Pick<CommentMarker, 'endTime' | 'time'> | null | undefined,
): CommentRangeDraft | null {
    if (!marker || !Number.isFinite(marker.time) || marker.endTime == null || !Number.isFinite(marker.endTime)) {
        return null;
    }
    const startMs = Math.round(marker.time * 1000);
    const endMs = Math.round(marker.endTime * 1000);
    if (!(endMs > startMs)) {
        return null;
    }
    return { endMs, startMs };
}
