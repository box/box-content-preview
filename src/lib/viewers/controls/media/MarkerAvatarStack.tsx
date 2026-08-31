import React from 'react';
import MarkerAvatar from './MarkerAvatar';
import { CommentMarker } from './types';
import './MarkerAvatarStack.scss';

const MAX_VISIBLE_AVATARS = 4;

export type Props = {
    markers: CommentMarker[];
    onMarkerClick?: (marker: CommentMarker) => void;
    /** Collapsed overlap in CSS pixels. Video ticks default to 6. */
    overlapPx?: number;
    selectedId?: string | null;
    /** Diameter in CSS pixels, forwarded to each avatar. */
    size?: number;
};

export default function MarkerAvatarStack({ markers, onMarkerClick, overlapPx, selectedId, size }: Props): JSX.Element {
    const hasOverflow = markers.length > MAX_VISIBLE_AVATARS;
    const visibleMarkers = hasOverflow ? markers.slice(0, MAX_VISIBLE_AVATARS - 1) : markers;
    const style =
        overlapPx != null ? ({ '--bp-marker-stack-overlap': `-${overlapPx}px` } as React.CSSProperties) : undefined;

    return (
        <span className="bp-MarkerAvatarStack" style={style}>
            {visibleMarkers.map(marker => (
                <button
                    key={marker.id}
                    className={`bp-MarkerAvatarStack-item${
                        marker.id === selectedId ? ' bp-MarkerAvatarStack-item--selected' : ''
                    }`}
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
                        size={size}
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
                    <span
                        className="bp-MarkerAvatar bp-MarkerAvatarStack-overflowBadge"
                        style={size ? { width: size, height: size } : undefined}
                    >
                        <span className="bp-MarkerAvatar-initial">+{markers.length - (MAX_VISIBLE_AVATARS - 1)}</span>
                    </span>
                </button>
            )}
        </span>
    );
}
