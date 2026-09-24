import { useEffect, useState } from 'react';
import { TAPE_POINTER_MEDIA_QUERY } from './constants';
import { TapeDetectionWindow, TapeNavigator } from './types';

export function isIPadNavigator(tapeNavigator: TapeNavigator): boolean {
    return (
        /iPad/i.test(tapeNavigator.userAgent || '') ||
        (tapeNavigator.platform === 'MacIntel' && (tapeNavigator.maxTouchPoints || 0) > 1)
    );
}

export function isCoarsePrimaryPointer(tapeWindow: Pick<Window, 'matchMedia'>): boolean {
    return typeof tapeWindow.matchMedia === 'function' && tapeWindow.matchMedia(TAPE_POINTER_MEDIA_QUERY).matches;
}

/**
 * Tape vs desktop camera: coarse primary pointer (finger) or iPad
 * (including iPadOS reporting itself as Mac). Not width, not hasTouch,
 * not Browser.isMobile().
 */
export function isTapeWaveformInput(tapeWindow: TapeDetectionWindow = window): boolean {
    return isCoarsePrimaryPointer(tapeWindow) || isIPadNavigator(tapeWindow.navigator);
}

/** Subscribe to the pointer media query; re-read the iPad heuristic on change. */
export default function useTapeWaveform(): boolean {
    const [isTape, setIsTape] = useState(() => typeof window !== 'undefined' && isTapeWaveformInput(window));

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            setIsTape(isTapeWaveformInput(window));
            return undefined;
        }

        const mediaQuery = window.matchMedia(TAPE_POINTER_MEDIA_QUERY);
        const sync = (): void => {
            setIsTape(isTapeWaveformInput(window));
        };
        sync();
        mediaQuery.addEventListener('change', sync);
        return () => mediaQuery.removeEventListener('change', sync);
    }, []);

    return isTape;
}
