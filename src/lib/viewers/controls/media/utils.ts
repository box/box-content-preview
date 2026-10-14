import type React from 'react';
import { decodeKeydown } from '../../../util';

export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};

// Activation keys must not reach the viewer's keydown handler, which toggles playback on Space.
export const stopActivationKeyPropagation = (event: React.KeyboardEvent): void => {
    const key = decodeKeydown(event);

    if (key === 'Enter' || key === 'Space') {
        event.stopPropagation();
    }
};
