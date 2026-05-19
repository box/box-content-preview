import React, { useEffect, useRef } from 'react';
import isFinite from 'lodash/isFinite';
import formatTimecode from '../../media/formatTimecode';
import './DurationLabels.scss';

export type Props = {
    currentTime?: number;
    durationTime?: number;
    fps?: number;
    mediaEl?: HTMLVideoElement | null;
};

export function formatTime(time: number): string {
    const val = isFinite(time) ? time : 0;
    const hours = Math.floor(val / 3600);
    const minutes = Math.floor((val % 3600) / 60);
    const seconds = Math.floor((val % 3600) % 60);
    const hour = hours > 0 ? `${hours.toString()}:` : '';
    const min = hours > 0 && minutes < 10 ? `0${minutes.toString()}` : minutes.toString();
    const sec = seconds < 10 ? `0${seconds.toString()}` : seconds.toString();

    return `${hour}${min}:${sec}`;
}

function formatLabel(time: number, fps?: number): string {
    if (fps) {
        return formatTimecode(time, fps);
    }
    return formatTime(time);
}

export default function DurationLabels({ currentTime = 0, durationTime = 0, fps, mediaEl }: Props): JSX.Element {
    const currentRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number>(0);

    useEffect(() => {
        if (!fps || !mediaEl || !currentRef.current) {
            return undefined;
        }

        const tick = (): void => {
            if (currentRef.current && mediaEl) {
                currentRef.current.textContent = formatLabel(mediaEl.currentTime, fps);
            }
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId.current);
        };
    }, [fps, mediaEl]);

    return (
        <div className="bp-DurationLabels" data-testid="bp-DurationLabels">
            <div ref={currentRef} className="bp-DurationLabels-label">
                {formatLabel(currentTime, fps)}
            </div>

            <div className="bp-DurationLabels-label">{formatLabel(durationTime, fps)}</div>
        </div>
    );
}
