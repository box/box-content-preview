import React from 'react';
import MarkerAvatar from './MarkerAvatar';
import MarkerAvatarStack from './MarkerAvatarStack';
import onMarkerGroupTickClick from './helpers/onMarkerGroupTickClick';
import { CommentMarker } from './types';

export type Props = {
    markers: CommentMarker[];
    onMarkerClick?: (marker: CommentMarker) => void;
    position: number;
    selectedId?: string | null;
};

export default function MarkerTick({ markers, onMarkerClick, position, selectedId }: Props): JSX.Element {
    const isGroup = markers.length > 1;
    const isSelected = !isGroup && markers[0].id === selectedId;
    const className = `bp-TimeControlsV2-marker${isGroup ? ' bp-TimeControlsV2-marker--group' : ''}${
        isSelected ? ' bp-TimeControlsV2-marker--selected' : ''
    }`;
    const style = { left: `${position}%` };

    if (isGroup) {
        return (
            <div className={className} data-bp-marker-group="" data-testid="bp-time-controls-marker" style={style}>
                <button
                    aria-label={__('media_comment_marker')}
                    className="bp-TimeControlsV2-marker-tick"
                    data-resin-target="commentMarkerGroup"
                    onClick={(e): void => onMarkerGroupTickClick(e, markers, selectedId, onMarkerClick)}
                    type="button"
                />
                <MarkerAvatarStack markers={markers} onMarkerClick={onMarkerClick} selectedId={selectedId} />
            </div>
        );
    }

    return (
        <button
            aria-label={__('media_comment_marker')}
            aria-pressed={isSelected}
            className={className}
            data-bp-marker-selected={isSelected ? '' : undefined}
            data-resin-target="commentMarker"
            data-testid="bp-time-controls-marker"
            onClick={(e): void => {
                e.stopPropagation();
                onMarkerClick?.(markers[0]);
            }}
            style={style}
            type="button"
        >
            <MarkerAvatar
                avatarUrl={markers[0].avatarUrl}
                colorIndex={markers[0].colorIndex}
                initial={markers[0].initial}
            />
        </button>
    );
}
