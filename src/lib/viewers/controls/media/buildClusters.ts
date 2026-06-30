import { ClusterData } from './MarkerCluster';
import { CommentMarker, percent } from './TimeControlsV2';

/** Max pixel distance between adjacent markers (sorted by time) for them to be grouped into a single cluster. */
const CLUSTER_THRESHOLD_PX = 2;

/** Converts a group of markers into a ClusterData object with computed positions and metadata. */
function finalizeCluster(group: CommentMarker[], durationValue: number): ClusterData {
    const leftPercent = percent(group[0].time, durationValue);
    const rightPercent = percent(group[group.length - 1].time, durationValue);
    const isSinglePoint = leftPercent === rightPercent;

    return {
        id: group.map(m => m.id).join('|'),
        isSinglePoint,
        leftPercent,
        markers: group,
        rightPercent,
    };
}

/**
 * Groups comment markers into clusters based on their pixel proximity on the scrubber track.
 * Markers are sorted by time, then chained: each marker that is within CLUSTER_THRESHOLD_PX
 * of its neighbor joins the same cluster. This means distant markers can end up in one cluster
 * if intermediate markers bridge the gap.
 */
export default function buildClusters(
    markers: CommentMarker[],
    durationValue: number,
    trackWidth: number,
): ClusterData[] {
    if (durationValue <= 0 || markers.length === 0 || trackWidth <= 0) return [];

    const sorted = [...markers].sort((a, b) => a.time - b.time);
    const clusters: ClusterData[] = [];
    let currentGroup: CommentMarker[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i += 1) {
        const prevPx = (sorted[i - 1].time / durationValue) * trackWidth;
        const currPx = (sorted[i].time / durationValue) * trackWidth;

        if (currPx - prevPx <= CLUSTER_THRESHOLD_PX) {
            currentGroup.push(sorted[i]);
        } else {
            clusters.push(finalizeCluster(currentGroup, durationValue));
            currentGroup = [sorted[i]];
        }
    }
    clusters.push(finalizeCluster(currentGroup, durationValue));

    return clusters;
}
