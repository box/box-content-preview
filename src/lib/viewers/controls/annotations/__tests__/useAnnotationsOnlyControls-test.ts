import { renderHook } from '@testing-library/react';
import useAnnotationsOnlyControls, { ANNOTATIONS_ONLY_MEDIA_QUERY } from '../useAnnotationsOnlyControls';

describe('useAnnotationsOnlyControls', () => {
    const originalMatchMedia = window.matchMedia;

    const mockViewport = (isNarrow: boolean): void => {
        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
            addEventListener: jest.fn(),
            matches: query === ANNOTATIONS_ONLY_MEDIA_QUERY && isNarrow,
            media: query,
            removeEventListener: jest.fn(),
        }));
    };

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    test.each`
        hasAnnotationsOnlyControls | isNarrow | expected
        ${true}                    | ${true}  | ${true}
        ${true}                    | ${false} | ${false}
        ${false}                   | ${true}  | ${false}
        ${undefined}               | ${true}  | ${false}
    `(
        'should return $expected with hasAnnotationsOnlyControls $hasAnnotationsOnlyControls and a narrow viewport $isNarrow',
        ({ expected, hasAnnotationsOnlyControls, isNarrow }) => {
            mockViewport(isNarrow);

            const { result } = renderHook(() => useAnnotationsOnlyControls(hasAnnotationsOnlyControls));

            expect(result.current).toBe(expected);
        },
    );
});
