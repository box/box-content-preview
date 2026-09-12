import { act, renderHook } from '@testing-library/react';
import useTapeWaveform, {
    isCoarsePrimaryPointer,
    isIPadNavigator,
    isTapeWaveformInput,
    TAPE_POINTER_MQ,
    TapeDetectionWindow,
    TapeNavigator,
} from '../useTapeWaveform';

describe('useTapeWaveform', () => {
    const coarseQuery = TAPE_POINTER_MQ;

    function nav(overrides: Partial<TapeNavigator> = {}): TapeNavigator {
        return {
            maxTouchPoints: 0,
            platform: 'MacIntel',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
            ...overrides,
        };
    }

    function win(matches: boolean, tapeNavigator = nav()): TapeDetectionWindow {
        return {
            matchMedia: (jest.fn((query: string) => ({
                matches: query === coarseQuery && matches,
            })) as unknown) as Window['matchMedia'],
            navigator: tapeNavigator,
        };
    }

    test('should treat coarse primary pointer as tape', () => {
        expect(isCoarsePrimaryPointer(win(true))).toBe(true);
        expect(isTapeWaveformInput(win(true, nav({ platform: 'Win32' })))).toBe(true);
    });

    test('should not treat a fine pointer laptop as tape', () => {
        expect(isCoarsePrimaryPointer(win(false))).toBe(false);
        expect(isTapeWaveformInput(win(false))).toBe(false);
    });

    test('should treat iPad UA and iPadOS-as-Mac as tape even when the pointer is fine', () => {
        expect(isIPadNavigator(nav({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' }))).toBe(true);
        expect(isIPadNavigator(nav({ maxTouchPoints: 5, platform: 'MacIntel' }))).toBe(true);
        expect(isTapeWaveformInput(win(false, nav({ maxTouchPoints: 5, platform: 'MacIntel' })))).toBe(true);
        expect(isIPadNavigator(nav({ maxTouchPoints: 10, platform: 'Win32' }))).toBe(false);
    });

    test('should subscribe to the pointer media query', () => {
        const listeners = new Set<(event: MediaQueryListEvent) => void>();
        const mediaQuery = {
            addEventListener: jest.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.add(listener);
            }),
            matches: false,
            media: coarseQuery,
            removeEventListener: jest.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.delete(listener);
            }),
        };
        const matchMedia = jest.fn((query: string) => {
            if (query === '(prefers-reduced-motion: reduce)') {
                return { addEventListener: jest.fn(), matches: false, removeEventListener: jest.fn() };
            }
            return { ...mediaQuery, matches: query === coarseQuery && mediaQuery.matches };
        });
        const originalMatchMedia = window.matchMedia;
        const originalNavigator = window.navigator;
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
        Object.defineProperty(window, 'navigator', {
            configurable: true,
            value: nav({ platform: 'Win32' }),
        });

        try {
            const { result, unmount } = renderHook(() => useTapeWaveform());
            expect(result.current).toBe(false);

            mediaQuery.matches = true;
            act(() => {
                listeners.forEach(listener => listener({ matches: true } as MediaQueryListEvent));
            });
            expect(result.current).toBe(true);

            unmount();
            expect(mediaQuery.removeEventListener).toHaveBeenCalled();
        } finally {
            Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
            Object.defineProperty(window, 'navigator', { configurable: true, value: originalNavigator });
        }
    });
});
