import { renderHook } from '@testing-library/react';
import fullscreen from '../../../../Fullscreen';
import useAnnotationModes, { Options } from '../useAnnotationModes';
import { AnnotationMode } from '../../../../types';

describe('useAnnotationModes', () => {
    const getHook = (options: Options = {}) => renderHook(() => useAnnotationModes(options));

    test('should show nothing if no mode is enabled', () => {
        const { result } = getHook();

        expect(result.current).toEqual({
            defaultMode: AnnotationMode.NONE,
            hasAnyMode: false,
            showDrawing: false,
            showHighlight: false,
            showRegion: false,
        });
    });

    test('should show each enabled mode', () => {
        const { result } = getHook({ hasDrawing: true, hasHighlight: true, hasRegion: true });

        expect(result.current).toMatchObject({
            hasAnyMode: true,
            showDrawing: true,
            showHighlight: true,
            showRegion: true,
        });
    });

    test.each`
        options                                                      | defaultMode
        ${{ hasDrawing: true, hasHighlight: true, hasRegion: true }} | ${AnnotationMode.REGION}
        ${{ hasDrawing: true, hasHighlight: true }}                  | ${AnnotationMode.HIGHLIGHT}
        ${{ hasDrawing: true }}                                      | ${AnnotationMode.DRAWING}
    `('should default to $defaultMode when $options are enabled', ({ defaultMode, options }) => {
        const { result } = getHook(options);

        expect(result.current.defaultMode).toBe(defaultMode);
    });

    test('should show nothing while in fullscreen', () => {
        jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

        const { result } = getHook({ hasDrawing: true, hasHighlight: true, hasRegion: true });

        expect(result.current).toEqual({
            defaultMode: AnnotationMode.NONE,
            hasAnyMode: false,
            showDrawing: false,
            showHighlight: false,
            showRegion: false,
        });
    });
});
