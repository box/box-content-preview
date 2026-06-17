import React from 'react';
import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import { bdlGray65, white } from 'box-ui-elements/es/styles/variables';
import FilmstripV2 from './FilmstripV2';
import SliderControl from '../slider';
import TimelineMarkers, { TimestampedComment } from './TimelineMarkers';
import './TimeControlsV2.scss';

export type Props = {
    aspectRatio?: number;
    currentTime?: number;
    durationTime?: number;
    filmstripInterval?: number;
    filmstripUrl?: string;
    fps?: number;
    mediaEl?: HTMLVideoElement | null;
    onTimeChange: (volume: number) => void;
    onTimestampedCommentClick?: (comment: TimestampedComment) => void;
    timestampedComments?: Array<TimestampedComment>;
};

export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};

export default function TimeControlsV2({
    aspectRatio,
    currentTime = 0,
    durationTime = 0,
    filmstripInterval,
    filmstripUrl,
    fps,
    mediaEl,
    onTimeChange,
    onTimestampedCommentClick,
    timestampedComments,
}: Props): JSX.Element {
    const [isSliderHovered, setIsSliderHovered] = React.useState(false);
    const [hoverPosition, setHoverPosition] = React.useState(0);
    const [hoverPositionMax, setHoverPositionMax] = React.useState(0);
    const [hoverTime, setHoverTime] = React.useState(0);
    const currentValue = isFinite(currentTime) ? currentTime : 0;
    const durationValue = isFinite(durationTime) ? durationTime : 0;
    const currentPercentage = percent(currentValue, durationValue);

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
            {timestampedComments && timestampedComments.length > 0 && (
                <TimelineMarkers
                    comments={timestampedComments}
                    durationTime={durationValue}
                    onMarkerClick={onTimestampedCommentClick}
                />
            )}
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
        </div>
    );
}
