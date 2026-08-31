import { ClusterData, CommentMarker } from './types';
import { percent } from './utils';

/** Max pixel distance between adjacent markers (sorted by time) for them to be grouped into a single cluster. */
export const CLUSTER_THRESHOLD_PX = 2;

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
    thresholdPx: number = CLUSTER_THRESHOLD_PX,
): ClusterData[] {
    if (durationValue <= 0 || markers.length === 0) return [];

    const sorted = [...markers].sort((a, b) => a.time - b.time);
    // Width is unknown until layout. Still place badges, and stack exact same timestamps.
    if (trackWidth <= 0) {
        const groups: CommentMarker[][] = [];
        sorted.forEach(marker => {
            const last = groups[groups.length - 1];
            if (last && last[last.length - 1].time === marker.time) {
                last.push(marker);
            } else {
                groups.push([marker]);
            }
        });
        return groups.map(group => finalizeCluster(group, durationValue));
    }
    const clusters: ClusterData[] = [];
    let currentGroup: CommentMarker[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i += 1) {
        const prevPx = (sorted[i - 1].time / durationValue) * trackWidth;
        const currPx = (sorted[i].time / durationValue) * trackWidth;

        if (currPx - prevPx <= thresholdPx) {
            currentGroup.push(sorted[i]);
        } else {
            clusters.push(finalizeCluster(currentGroup, durationValue));
            currentGroup = [sorted[i]];
        }
    }
    clusters.push(finalizeCluster(currentGroup, durationValue));

    return clusters;
}
