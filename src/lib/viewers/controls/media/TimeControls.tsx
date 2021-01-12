import React from 'react';
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
    const currentValue = percent(currentTime, durationTime);
    const bufferedAmount = bufferedRange && bufferedRange.length ? bufferedRange.end(bufferedRange.length - 1) : 0;
    const bufferedValue = percent(bufferedAmount, durationTime);

    const handleChange = (newValue: number): void => {
        onTimeChange(round(durationTime * (newValue / 100)));
    };

    return (
        <SliderControl
            className="bp-TimeControls"
            onChange={handleChange}
            step={0.1}
            title={__('media_time_slider')}
            track={`linear-gradient(to right, ${bdlBoxBlue} ${currentValue}%, ${white} ${currentValue}%, ${white} ${bufferedValue}%, ${bdlGray62} ${bufferedValue}%, ${bdlGray62} 100%)`}
            value={currentValue}
        />
    );
}
