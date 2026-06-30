import React from 'react';
import MarkerAvatar from './MarkerAvatar';
import MarkerAvatarStack from './MarkerAvatarStack';
import { CommentMarker } from './TimeControlsV2';

export type Props = {
    markers: CommentMarker[];
    onMarkerClick?: (marker: CommentMarker) => void;
    position: number;
};

export default function MarkerTick({ markers, onMarkerClick, position }: Props): JSX.Element {
    const isGroup = markers.length > 1;

    return (
        <button
            aria-label={__('media_comment_marker')}
            className={`bp-TimeControlsV2-marker${isGroup ? ' bp-TimeControlsV2-marker--group' : ''}`}
            data-testid="bp-time-controls-marker"
            onClick={(e): void => {
                e.stopPropagation();
                onMarkerClick?.(markers[0]);
            }}
            style={{ left: `${position}%` }}
            type="button"
        >
            {isGroup ? (
                <MarkerAvatarStack markers={markers} onMarkerClick={onMarkerClick} />
            ) : (
                <MarkerAvatar
                    avatarUrl={markers[0].avatarUrl}
                    colorIndex={markers[0].colorIndex}
                    initial={markers[0].initial}
                />
            )}
        </button>
    );
}
