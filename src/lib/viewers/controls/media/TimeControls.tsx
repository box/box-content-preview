import React from 'react';
import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import { bdlBoxBlue, bdlGray65, white } from 'box-ui-elements/es/styles/variables';
import Filmstrip from './Filmstrip';
import SliderControl from '../slider';
import './TimeControls.scss';

export type Props = {
    aspectRatio?: number;
    bufferedRange?: TimeRanges;
    currentTime?: number;
    durationTime?: number;
    filmstripInterval?: number;
    filmstripUrl?: string;
    onTimeChange: (volume: number) => void;
};

export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};

export default function TimeControls({
    aspectRatio,
    bufferedRange,
    currentTime = 0,
    durationTime = 0,
    filmstripInterval,
    filmstripUrl,
    onTimeChange,
}: Props): JSX.Element {
    const [isSliderHovered, setIsSliderHovered] = React.useState(false);
    const [hoverPosition, setHoverPosition] = React.useState(0);
    const [hoverPositionMax, setHoverPositionMax] = React.useState(0);
    const [hoverTime, setHoverTime] = React.useState(0);
    const currentValue = isFinite(currentTime) ? currentTime : 0;
    const durationValue = isFinite(durationTime) ? durationTime : 0;
    const currentPercentage = percent(currentValue, durationValue);
    const bufferedAmount = bufferedRange && bufferedRange.length ? bufferedRange.end(bufferedRange.length - 1) : 0;
    const bufferedPercentage = percent(bufferedAmount, durationValue);

    const handleMouseMove = (newTime: number, newPosition: number, width: number): void => {
        setHoverPosition(newPosition);
        setHoverPositionMax(width);
        setHoverTime(newTime);
    };

    return (
        <div className="bp-TimeControls">
            {!!filmstripInterval && (
                <Filmstrip
                    aspectRatio={aspectRatio}
                    imageUrl={filmstripUrl}
                    interval={filmstripInterval}
                    isShown={isSliderHovered}
                    position={hoverPosition}
                    positionMax={hoverPositionMax}
                    time={hoverTime}
                />
            )}

            <SliderControl
                className="bp-TimeControls-slider"
                max={durationValue}
                min={0}
                onBlur={noop} // Filmstrip is not currently shown during keyboard navigation
                onFocus={noop} // Filmstrip is not currently shown during keyboard navigation
                onMouseOut={(): void => setIsSliderHovered(false)}
                onMouseOver={(): void => setIsSliderHovered(true)}
                onMove={handleMouseMove}
                onUpdate={onTimeChange}
                step={5}
                title={__('media_time_slider')}
                track={`linear-gradient(to right, ${bdlBoxBlue} ${currentPercentage}%, ${white} ${currentPercentage}%, ${white} ${bufferedPercentage}%, ${bdlGray65} ${bufferedPercentage}%, ${bdlGray65} 100%)`}
                value={currentValue}
            />
        </div>
    );
}
