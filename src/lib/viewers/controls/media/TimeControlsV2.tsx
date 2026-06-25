import React from 'react';
import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import { bdlGray65, white } from 'box-ui-elements/es/styles/variables';
import FilmstripV2 from './FilmstripV2';
import MarkerAvatar from './MarkerAvatar';
import SliderControl from '../slider';
import './TimeControlsV2.scss';

export type CommentMarker = {
    avatarUrl?: string;
    colorIndex?: number;
    id: string;
    initial?: string;
    time: number;
    type?: 'annotation' | 'comment';
};

export type Props = {
    aspectRatio?: number;
    commentMarkers?: CommentMarker[];
    currentTime?: number;
    durationTime?: number;
    filmstripInterval?: number;
    filmstripUrl?: string;
    fps?: number;
    mediaEl?: HTMLVideoElement | null;
    onCommentMarkerClick?: (marker: CommentMarker) => void;
    onTimeChange: (volume: number) => void;
};

export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};

export default function TimeControlsV2({
    aspectRatio,
    commentMarkers = [],
    currentTime = 0,
    durationTime = 0,
    filmstripInterval,
    filmstripUrl,
    fps,
    mediaEl,
    onCommentMarkerClick,
    onTimeChange,
}: Props): JSX.Element {
    const [isSliderHovered, setIsSliderHovered] = React.useState(false);
    const [hoverPosition, setHoverPosition] = React.useState(0);
    const [hoverPositionMax, setHoverPositionMax] = React.useState(0);
    const [hoverTime, setHoverTime] = React.useState(0);
    const currentValue = isFinite(currentTime) ? currentTime : 0;
    const durationValue = isFinite(durationTime) ? durationTime : 0;
    const currentPercentage = percent(currentValue, durationValue);

    const markerTimesKey = commentMarkers.map(m => m.time).join('|');
    const trackMask = React.useMemo(() => {
        if (durationValue <= 0 || commentMarkers.length === 0) return undefined;

        const HALF_GAP = 2;
        const stops: string[] = [];
        const sorted = commentMarkers.map(m => percent(m.time, durationValue)).sort((a, b) => a - b);

        stops.push('black 0%');
        sorted.forEach(pos => {
            stops.push(`black calc(${pos}% - ${HALF_GAP}px)`);
            stops.push(`transparent calc(${pos}% - ${HALF_GAP}px)`);
            stops.push(`transparent calc(${pos}% + ${HALF_GAP}px)`);
            stops.push(`black calc(${pos}% + ${HALF_GAP}px)`);
        });
        stops.push('black 100%');

        return `linear-gradient(to right, ${stops.join(', ')})`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markerTimesKey, durationValue]);

    const handleMouseMove = (newTime: number, newPosition: number, width: number): void => {
        setHoverPosition(newPosition);
        setHoverPositionMax(width);
        setHoverTime(newTime);
    };

    return (
        <div className="bp-TimeControlsV2" data-testid="bp-time-controls-v2">
            {!!filmstripInterval && (
                <FilmstripV2
                    aspectRatio={aspectRatio}
                    fps={fps}
                    imageUrl={filmstripUrl}
                    interval={filmstripInterval}
                    isShown={isSliderHovered}
                    position={hoverPosition}
                    positionMax={hoverPositionMax}
                    time={hoverTime}
                />
            )}
            <div
                className="bp-TimeControlsV2-scrubber"
                style={trackMask ? ({ '--bp-track-mask': trackMask } as React.CSSProperties) : undefined}
            >
                <SliderControl
                    className="bp-TimeControlsV2-slider"
                    data-resin-target="timeScrubber"
                    max={durationValue}
                    min={0}
                    onBlur={noop}
                    onFocus={noop}
                    onMouseOut={(): void => setIsSliderHovered(false)}
                    onMouseOver={(): void => setIsSliderHovered(true)}
                    onMove={handleMouseMove}
                    onUpdate={onTimeChange}
                    step={fps ? 1 / fps : 5}
                    title={__('media_time_slider')}
                    track={`linear-gradient(to right, ${white} calc(${currentPercentage}% - 2.5px), transparent calc(${currentPercentage}% - 2.5px), transparent calc(${currentPercentage}% + 2.5px), ${bdlGray65} calc(${currentPercentage}% + 2.5px), ${bdlGray65} 100%)`}
                    value={currentValue}
                />
                {durationValue > 0 &&
                    commentMarkers.map(marker => (
                        <button
                            key={marker.id}
                            aria-label={__('media_comment_marker')}
                            className="bp-TimeControlsV2-marker"
                            data-testid="bp-time-controls-marker"
                            onClick={(e): void => {
                                e.stopPropagation();
                                onCommentMarkerClick?.(marker);
                            }}
                            style={{ left: `${percent(marker.time, durationValue)}%` }}
                            type="button"
                        >
                            <MarkerAvatar
                                avatarUrl={marker.avatarUrl}
                                colorIndex={marker.colorIndex}
                                initial={marker.initial}
                            />
                        </button>
                    ))}
            </div>
        </div>
    );
}
