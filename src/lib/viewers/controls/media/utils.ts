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
