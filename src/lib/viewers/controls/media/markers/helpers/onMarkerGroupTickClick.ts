import { MouseEvent } from 'react';
import { CommentMarker } from '../types';

/** Click the range/group tick: first member, unless one is already selected. */
export default function onMarkerGroupTickClick(
    event: MouseEvent,
    markers: CommentMarker[],
    selectedId: string | null | undefined,
    onMarkerClick?: (marker: CommentMarker) => void,
): void {
    event.stopPropagation();
    if (selectedId && markers.some(marker => marker.id === selectedId)) {
        return;
    }
    onMarkerClick?.(markers[0]);
}
