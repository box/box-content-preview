import React from 'react';
import MarkerAvatarStack from './MarkerAvatarStack';
import onMarkerGroupTickClick from './helpers/onMarkerGroupTickClick';
import { ClusterData, CommentMarker } from './types';
import './MarkerCluster.scss';

export type Props = {
    cluster: ClusterData;
    onMarkerClick?: (marker: CommentMarker) => void;
    selectedId?: string | null;
};

export default function MarkerCluster({ cluster, onMarkerClick, selectedId }: Props): JSX.Element {
    const { markers, leftPercent, rightPercent } = cluster;

    const style: React.CSSProperties = {
        left: `${leftPercent}%`,
        width: `calc(${rightPercent - leftPercent}% + 4px)`,
    };

    return (
        <div className="bp-MarkerCluster" data-bp-marker-group="" data-testid="bp-marker-cluster" style={style}>
            <button
                aria-label={__('media_comment_marker')}
                className="bp-MarkerCluster-tick"
                data-resin-target="commentMarkerCluster"
                onClick={(e): void => onMarkerGroupTickClick(e, markers, selectedId, onMarkerClick)}
                type="button"
            />
            <MarkerAvatarStack markers={markers} onMarkerClick={onMarkerClick} selectedId={selectedId} />
        </div>
    );
}
