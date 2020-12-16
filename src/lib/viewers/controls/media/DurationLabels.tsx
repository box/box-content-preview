import React from 'react';
import './DurationLabels.scss';

export type Props = {
    currentTime?: number;
    durationTime?: number;
};

export function formatTime(time: number): string {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor((time % 3600) % 60);
    const hour = hours > 0 ? `${hours.toString()}:` : '';
    const min = hours > 0 && minutes < 10 ? `0${minutes.toString()}` : minutes.toString();
    const sec = seconds < 10 ? `0${seconds.toString()}` : seconds.toString();

    return `${hour}${min}:${sec}`;
}

export default function DurationLabels({ currentTime = 0, durationTime = 0 }: Props): JSX.Element {
    return (
        <div className="bp-DurationLabels">
            <span className="bp-DurationLabels-label">{formatTime(currentTime)}</span>
            <span className="bp-DurationLabels-label">/</span>
            <span className="bp-DurationLabels-label">{formatTime(durationTime)}</span>
        </div>
    );
}
