import React from 'react';
import MarkerAvatar from './MarkerAvatar';
import { CommentMarker } from './types';
import './MarkerAvatarStack.scss';

const MAX_VISIBLE_AVATARS = 4;

export type Props = {
    markers: CommentMarker[];
    onMarkerClick?: (marker: CommentMarker) => void;
    /** Collapsed overlap in CSS pixels. Defaults to 10 (half of the 20px badge). */
    overlapPx?: number;
    selectedId?: string | null;
    /** Diameter in CSS pixels, forwarded to each avatar. */
    size?: number;
};

export default function MarkerAvatarStack({ markers, onMarkerClick, overlapPx, selectedId, size }: Props): JSX.Element {
    const hasOverflow = markers.length > MAX_VISIBLE_AVATARS;
    const visibleMarkers = hasOverflow ? markers.slice(0, MAX_VISIBLE_AVATARS - 1) : markers;
    const overflowMarkers = hasOverflow ? markers.slice(MAX_VISIBLE_AVATARS - 1) : [];
    const isOverflowSelected = overflowMarkers.some(marker => marker.id === selectedId);
    const style =
        overlapPx != null ? ({ '--bp-marker-stack-overlap': `-${overlapPx}px` } as React.CSSProperties) : undefined;

    return (
        <span className="bp-MarkerAvatarStack" style={style}>
            {visibleMarkers.map(marker => (
                <button
                    key={marker.id}
                    aria-label={__('media_comment_marker')}
                    aria-pressed={marker.id === selectedId}
                    className={`bp-MarkerAvatarStack-item${
                        marker.id === selectedId ? ' bp-MarkerAvatarStack-item--selected' : ''
                    }`}
                    data-bp-marker-selected={marker.id === selectedId ? '' : undefined}
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
                    aria-label={__('media_comment_marker')}
                    aria-pressed={isOverflowSelected}
                    className={`bp-MarkerAvatarStack-item bp-MarkerAvatarStack-overflow${
                        isOverflowSelected ? ' bp-MarkerAvatarStack-item--selected' : ''
                    }`}
                    data-bp-marker-selected={isOverflowSelected ? '' : undefined}
                    data-resin-target="commentMarkerStackAvatarOverflow"
                    onClick={(e): void => {
                        e.stopPropagation();
                        const overflowTarget =
                            overflowMarkers.find(marker => marker.id === selectedId) ?? overflowMarkers[0];
                        onMarkerClick?.(overflowTarget);
                    }}
                    type="button"
                >
                    <span
                        className="bp-MarkerAvatar bp-MarkerAvatarStack-overflowBadge"
                        style={size ? ({ '--bp-marker-avatar-size': `${size}px` } as React.CSSProperties) : undefined}
                    >
                        <span className="bp-MarkerAvatar-initial">+{markers.length - (MAX_VISIBLE_AVATARS - 1)}</span>
                    </span>
                </button>
            )}
        </span>
    );
}
