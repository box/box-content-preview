import type React from 'react';
import { decodeKeydown } from '../../../util';

export const roundToFourDecimals = (value: number): number => {
    return +value.toFixed(4);
};

export const getPercent = (value1: number, value2: number): number => {
    return roundToFourDecimals((value1 / value2) * 100);
};

type BufferedTrackStopsOptions = {
    bufferedColor: string;
    bufferedRange?: TimeRanges;
    durationTime: number;
    fromPercentage: number;
    unplayedColor: string;
};

/**
 * Gradient color stops that paint every buffered range from fromPercentage to the end of the track.
 * After a far seek or buffer eviction the buffer has gaps, which must show as unbuffered.
 */
export const getBufferedTrackStops = ({
    bufferedColor,
    bufferedRange,
    durationTime,
    fromPercentage,
    unplayedColor,
}: BufferedTrackStopsOptions): string => {
    const stops: string[] = [];

    for (let i = 0; bufferedRange && durationTime > 0 && i < bufferedRange.length; i += 1) {
        const start = Math.max(getPercent(bufferedRange.start(i), durationTime), fromPercentage);
        const end = Math.min(getPercent(bufferedRange.end(i), durationTime), 100);

        if (end > start) {
            stops.push(
                `${unplayedColor} ${start}%`,
                `${bufferedColor} ${start}%`,
                `${bufferedColor} ${end}%`,
                `${unplayedColor} ${end}%`,
            );
        }
    }

    return [...stops, `${unplayedColor} 100%`].join(', ');
};

export const isTimeBuffered = (bufferedRange: TimeRanges, time: number): boolean => {
    for (let i = 0; i < bufferedRange.length; i += 1) {
        if (time >= bufferedRange.start(i) && time < bufferedRange.end(i)) {
            return true;
        }
    }

    return false;
};

// Activation keys must not reach the viewer's keydown handler, which toggles playback on Space.
export const stopActivationKeyPropagation = (event: React.KeyboardEvent): void => {
    const key = decodeKeydown(event);

    if (key === 'Enter' || key === 'Space') {
        event.stopPropagation();
    }
};

const MENU_TRIGGER_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Space']);

// Menu triggers also open on the vertical arrows, which the viewer maps to volume and comment seeking.
export const stopMenuTriggerKeyPropagation = (event: React.KeyboardEvent): void => {
    if (MENU_TRIGGER_KEYS.has(decodeKeydown(event))) {
        event.stopPropagation();
    }
};

const TOOLBAR_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'End', 'Enter', 'Home', 'Space']);

// Toolbars move focus with the arrow, Home and End keys, which the viewer maps to seeking.
export const stopToolbarKeyPropagation = (event: React.KeyboardEvent): void => {
    if (TOOLBAR_KEYS.has(decodeKeydown(event))) {
        event.stopPropagation();
    }
};
