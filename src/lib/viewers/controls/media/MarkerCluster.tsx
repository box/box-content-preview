import React from 'react';
import MarkerAvatarStack from './MarkerAvatarStack';
import { ClusterData, CommentMarker } from './types';
import './MarkerCluster.scss';

export type Props = {
    cluster: ClusterData;
    onMarkerClick?: (marker: CommentMarker) => void;
};

export default function MarkerCluster({ cluster, onMarkerClick }: Props): JSX.Element {
    const { markers, leftPercent, rightPercent } = cluster;

    const style: React.CSSProperties = {
        left: `${leftPercent}%`,
        width: `calc(${rightPercent - leftPercent}% + 4px)`,
    };

    return (
        <div className="bp-MarkerCluster" data-testid="bp-marker-cluster" style={style}>
            <button
                aria-label={__('media_comment_marker')}
                className="bp-MarkerCluster-tick"
                onClick={(e): void => {
                    e.stopPropagation();
                    onMarkerClick?.(markers[0]);
                }}
                type="button"
            />
            <MarkerAvatarStack markers={markers} onMarkerClick={onMarkerClick} />
        </div>
    );
}
