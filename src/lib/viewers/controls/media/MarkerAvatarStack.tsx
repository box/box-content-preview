import React from 'react';
import MarkerAvatar from './MarkerAvatar';
import { CommentMarker } from './types';
import './MarkerAvatarStack.scss';

const MAX_VISIBLE_AVATARS = 4;

export type Props = {
    markers: CommentMarker[];
    onMarkerClick?: (marker: CommentMarker) => void;
};

export default function MarkerAvatarStack({ markers, onMarkerClick }: Props): JSX.Element {
    const hasOverflow = markers.length > MAX_VISIBLE_AVATARS;
    const visibleMarkers = hasOverflow ? markers.slice(0, MAX_VISIBLE_AVATARS - 1) : markers;

    return (
        <span className="bp-MarkerAvatarStack">
            {visibleMarkers.map(marker => (
                <button
                    key={marker.id}
                    className="bp-MarkerAvatarStack-item"
                    data-resin-target="commentMarkerStackAvatar"
                    onClick={(e): void => {
                        e.stopPropagation();
                        onMarkerClick?.(marker);
                    }}
                    type="button"
                >
                    <MarkerAvatar
                        avatarUrl={marker.avatarUrl}
                        colorIndex={marker.colorIndex}
                        initial={marker.initial}
                    />
                </button>
            ))}
            {hasOverflow && (
                <button
                    className="bp-MarkerAvatarStack-item bp-MarkerAvatarStack-overflow"
                    data-resin-target="commentMarkerStackAvatarOverflow"
                    onClick={(e): void => {
                        e.stopPropagation();
                        onMarkerClick?.(markers[MAX_VISIBLE_AVATARS - 1]);
                    }}
                    type="button"
                >
                    <span className="bp-MarkerAvatar bp-MarkerAvatarStack-overflowBadge">
                        <span className="bp-MarkerAvatar-initial">+{markers.length - (MAX_VISIBLE_AVATARS - 1)}</span>
                    </span>
                </button>
            )}
        </span>
    );
}
