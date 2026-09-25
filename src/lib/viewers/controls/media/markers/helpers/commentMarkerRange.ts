import { CommentRangeDraft } from '../../types';
import { CommentMarker } from '../types';

/**
 * Open span for a ranged timestamp comment.
 * `time` and `endTime` are seconds, matching the host `comment_markers` payload.
 * A point comment (no end, or an end that does not fall after the start) is not a range.
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
