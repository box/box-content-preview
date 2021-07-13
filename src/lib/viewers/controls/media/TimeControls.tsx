import React from 'react';
import isFinite from 'lodash/isFinite';
import { bdlBoxBlue, bdlGray62, white } from 'box-ui-elements/es/styles/variables';
import SliderControl from '../slider';
import './TimeControls.scss';

export type Props = {
    bufferedRange?: TimeRanges;
    currentTime?: number;
    durationTime?: number;
    onTimeChange: (volume: number) => void;
};

export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};

export default function TimeControls({
    bufferedRange,
    currentTime = 0,
    durationTime = 0,
    onTimeChange,
}: Props): JSX.Element {
    const currentValue = isFinite(currentTime) ? currentTime : 0;
    const durationValue = isFinite(durationTime) ? durationTime : 0;
    const currentPercentage = percent(currentValue, durationValue);
    const bufferedAmount = bufferedRange && bufferedRange.length ? bufferedRange.end(bufferedRange.length - 1) : 0;
    const bufferedPercentage = percent(bufferedAmount, durationValue);

    return (
        <div className="bp-TimeControls">
            <SliderControl
                className="bp-TimeControls-slider"
                max={durationValue}
                min={0}
                onUpdate={onTimeChange}
                step={5}
                title={__('media_time_slider')}
                track={`linear-gradient(to right, ${bdlBoxBlue} ${currentPercentage}%, ${white} ${currentPercentage}%, ${white} ${bufferedPercentage}%, ${bdlGray62} ${bufferedPercentage}%, ${bdlGray62} 100%)`}
                value={currentValue}
            />
        </div>
    );
}
