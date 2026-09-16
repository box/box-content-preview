import { RefObject, useCallback, useRef } from 'react';
import { recordScrubResin } from '../../../resin';

export default function useScrubGestureResin(
    elementRef: RefObject<Element | null>,
    fallbackTarget?: string,
): { logScrubStart: () => void; resetScrubGesture: () => void } {
    const loggedRef = useRef(false);

    const logScrubStart = useCallback((): void => {
        if (loggedRef.current) {
            return;
        }

        loggedRef.current = true;
        recordScrubResin(elementRef.current, fallbackTarget);
    }, [elementRef, fallbackTarget]);

    const resetScrubGesture = useCallback((): void => {
        loggedRef.current = false;
    }, []);

    return { logScrubStart, resetScrubGesture };
}
