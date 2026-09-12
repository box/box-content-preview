import { useEffect, useState } from 'react';

/** Primary pointer is a finger, not a mouse/trackpad. */
export const TAPE_POINTER_MQ = '(hover: none) and (pointer: coarse)';

/** Navigator fields used to detect iPad, including iPadOS reporting itself as Mac. */
export type TapeNavigator = Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>;

/** Window bits needed to choose tape vs desktop (coarse pointer + iPad). */
export type TapeDetectionWindow = Pick<Window, 'matchMedia'> & { navigator: TapeNavigator };

export function isIPadNavigator(nav: TapeNavigator): boolean {
    return /iPad/i.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
}

export function isCoarsePrimaryPointer(win: Pick<Window, 'matchMedia'>): boolean {
    return typeof win.matchMedia === 'function' && win.matchMedia(TAPE_POINTER_MQ).matches;
}

/**
 * Tape vs desktop camera: coarse primary pointer (finger) or iPad
 * (including iPadOS reporting itself as Mac). Not width, not hasTouch,
 * not Browser.isMobile().
 */
export function isTapeWaveformInput(win: TapeDetectionWindow = window): boolean {
    return isCoarsePrimaryPointer(win) || isIPadNavigator(win.navigator);
}

/** Subscribe to the pointer media query; re-read the iPad heuristic on change. */
export default function useTapeWaveform(): boolean {
    const [isTape, setIsTape] = useState(() => typeof window !== 'undefined' && isTapeWaveformInput(window));

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            setIsTape(isTapeWaveformInput(window));
            return undefined;
        }

        const mediaQuery = window.matchMedia(TAPE_POINTER_MQ);
        const sync = (): void => {
            setIsTape(isTapeWaveformInput(window));
        };
        sync();
        mediaQuery.addEventListener('change', sync);
        return () => mediaQuery.removeEventListener('change', sync);
    }, []);

    return isTape;
}
