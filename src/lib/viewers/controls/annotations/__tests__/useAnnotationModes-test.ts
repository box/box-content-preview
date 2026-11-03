import { renderHook } from '@testing-library/react';
import fullscreen from '../../../../Fullscreen';
import useAnnotationModes from '../useAnnotationModes';
import { AnnotationMode } from '../../../../types';

describe('useAnnotationModes', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test.each`
        options                                                      | expected
        ${{ hasDrawing: true, hasHighlight: true, hasRegion: true }} | ${[AnnotationMode.REGION, AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING]}
        ${{ hasDrawing: true, hasRegion: true }}                     | ${[AnnotationMode.REGION, AnnotationMode.DRAWING]}
        ${{ hasHighlight: true }}                                    | ${[AnnotationMode.HIGHLIGHT]}
        ${{}}                                                        | ${[]}
    `('should return the enabled modes in palette order for $options', ({ expected, options }) => {
        const { result } = renderHook(() => useAnnotationModes(options));

        expect(result.current).toEqual(expected);
    });

    test('should return no modes in fullscreen', () => {
        jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

        const { result } = renderHook(() =>
            useAnnotationModes({ hasDrawing: true, hasHighlight: true, hasRegion: true }),
        );

        expect(result.current).toEqual([]);
    });
});
