import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import buildClusters from '../../controls/media/buildClusters';
import MarkerAvatar from '../../controls/media/MarkerAvatar';
import MarkerAvatarStack from '../../controls/media/MarkerAvatarStack';
import { ClusterData, CommentMarker } from '../../controls/media/types';
import { percent } from '../../controls/media/utils';
import { WAVEFORM_ZOOM_MIN } from './constants';
import { WaveformViewport } from './types';
import './WaveformCommentMarkers.scss';

const WAVEFORM_MARKER_SIZE_PX = 20;

export type WaveformCommentMarkersProps = {
    commentMarkers: CommentMarker[];
    durationSec: number;
    onCommentMarkerClick?: (marker: CommentMarker) => void;
    /** Host-selected marker (activity feed / BUE). */
    selectedId?: string | null;
    /** Live waveform window. Parent keeps this while the overlay is unmounted. */
    viewport?: WaveformViewport | null;
};

function hasMappedWindow(viewport?: WaveformViewport | null): viewport is WaveformViewport {
    return !!viewport && Number.isFinite(viewport.startSec) && viewport.endSec > viewport.startSec;
}

function markerLeftPercent(time: number, durationSec: number, viewport?: WaveformViewport | null): number {
    const mapped = hasMappedWindow(viewport);
    const origin = mapped ? viewport.startSec : 0;
    const span = mapped ? viewport.endSec - viewport.startSec : durationSec;
    return percent(time - origin, span);
}

/** Width is unknown until layout. Still place badges, and stack exact same timestamps. */
function clustersByExactTime(markers: CommentMarker[], durationSec: number): ClusterData[] {
    const sorted = [...markers].sort((a, b) => a.time - b.time);
    const groups: CommentMarker[][] = [];
    sorted.forEach(marker => {
        const last = groups[groups.length - 1];
        if (last && last[last.length - 1].time === marker.time) {
            last.push(marker);
        } else {
            groups.push([marker]);
        }
    });
    return groups.map(group => {
        const leftPercent = percent(group[0].time, durationSec);
        const rightPercent = percent(group[group.length - 1].time, durationSec);
        return {
            id: group.map(m => m.id).join('|'),
            isSinglePoint: leftPercent === rightPercent,
            leftPercent,
            markers: group,
            rightPercent,
        };
    });
}

export default function WaveformCommentMarkers({
    commentMarkers,
    durationSec,
    onCommentMarkerClick,
    selectedId: hostSelectedId = null,
    viewport = null,
}: WaveformCommentMarkersProps): JSX.Element | null {
    const overlayRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const [optimisticSelectedId, setOptimisticSelectedId] = useState<string | null>(null);
    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false);
    const selectedId = optimisticSelectedId ?? (isSelectionDismissed ? null : hostSelectedId);
    const canShowTrack = durationSec > 0 && commentMarkers.length > 0;
    const zoomLevel = viewport?.zoomLevel ?? WAVEFORM_ZOOM_MIN;
    const isZoomed = hasMappedWindow(viewport) && viewport.zoomLevel > WAVEFORM_ZOOM_MIN;

    useEffect(() => {
        setIsSelectionDismissed(false);
        setOptimisticSelectedId(null);
    }, [hostSelectedId]);

    useLayoutEffect(() => {
        if (!canShowTrack) {
            setTrackWidth(0);
            return undefined;
        }

        const el = trackRef.current;
        if (!el) {
            return undefined;
        }

        setTrackWidth(el.clientWidth);

        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                setTrackWidth(entry.contentRect.width);
            });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [canShowTrack]);

    const clusters = useMemo(() => {
        const clusterWidth = trackWidth * Math.max(WAVEFORM_ZOOM_MIN, zoomLevel);
        if (clusterWidth <= 0) {
            return clustersByExactTime(commentMarkers, durationSec);
        }
        return buildClusters(commentMarkers, durationSec, clusterWidth, WAVEFORM_MARKER_SIZE_PX);
    }, [commentMarkers, durationSec, trackWidth, zoomLevel]);

    const handleMarkerClick = useCallback(
        (marker: CommentMarker, event?: React.MouseEvent) => {
            event?.stopPropagation();
            setIsSelectionDismissed(false);
            setOptimisticSelectedId(marker.id);
            onCommentMarkerClick?.(marker);
        },
        [onCommentMarkerClick],
    );

    useEffect(() => {
        if (!selectedId) {
            return undefined;
        }

        const isEventInsideSelectedBadge = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element) || !overlayRef.current) {
                return false;
            }
            const selected = overlayRef.current.querySelector(
                '.bp-WaveformCommentMarkers-marker--selected, .bp-MarkerAvatarStack-item--selected',
            );
            return Boolean(selected && selected.contains(target));
        };

        const onDocumentPointerDown = (event: Event): void => {
            if (isEventInsideSelectedBadge(event.target)) {
                return;
            }
            setOptimisticSelectedId(null);
            setIsSelectionDismissed(true);
            const active = document.activeElement;
            if (active instanceof HTMLElement && overlayRef.current?.contains(active)) {
                active.blur();
            }
        };

        document.addEventListener('pointerdown', onDocumentPointerDown, true);
        return () => {
            document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        };
    }, [selectedId]);

    if (!(durationSec > 0) || commentMarkers.length === 0) {
        return null;
    }

    return (
        <div
            ref={overlayRef}
            className={`bp-WaveformCommentMarkers${isZoomed ? ' bp-WaveformCommentMarkers--zoomed' : ''}`}
            data-testid="bp-waveform-comment-markers"
        >
            <div ref={trackRef} className="bp-WaveformCommentMarkers-track">
                {clusters.map(cluster => {
                    const marker = cluster.markers[0];
                    const isGroup = cluster.markers.length > 1;
                    const isSelected = cluster.markers.some(entry => entry.id === selectedId);
                    const className = `bp-WaveformCommentMarkers-marker${
                        isSelected ? ' bp-WaveformCommentMarkers-marker--selected' : ''
                    }${isGroup ? ' bp-WaveformCommentMarkers-marker--group' : ''}`;
                    const left = `${markerLeftPercent(marker.time, durationSec, viewport)}%`;

                    if (isGroup) {
                        return (
                            <div
                                key={cluster.id}
                                className={className}
                                data-testid="bp-waveform-comment-marker"
                                style={{ left }}
                            >
                                <MarkerAvatarStack
                                    markers={cluster.markers}
                                    onMarkerClick={handleMarkerClick}
                                    overlapPx={WAVEFORM_MARKER_SIZE_PX / 2}
                                    selectedId={selectedId}
                                    size={WAVEFORM_MARKER_SIZE_PX}
                                />
                            </div>
                        );
                    }

                    return (
                        <button
                            key={cluster.id}
                            aria-label={__('media_comment_marker')}
                            aria-pressed={isSelected}
                            className={className}
                            data-resin-target="commentMarker"
                            data-testid="bp-waveform-comment-marker"
                            onClick={event => handleMarkerClick(marker, event)}
                            style={{ left }}
                            type="button"
                        >
                            <MarkerAvatar
                                avatarUrl={marker.avatarUrl}
                                colorIndex={marker.colorIndex}
                                initial={marker.initial}
                                size={WAVEFORM_MARKER_SIZE_PX}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
