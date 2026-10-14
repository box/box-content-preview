import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode } from '../../../types';
import { Props as AnnotationsControlsProps } from './AnnotationsControls';

export type Options = Pick<AnnotationsControlsProps, 'hasDrawing' | 'hasHighlight' | 'hasRegion'>;

export type AnnotationModes = {
    defaultMode: AnnotationMode;
    hasAnyMode: boolean;
    showDrawing: boolean;
    showHighlight: boolean;
    showRegion: boolean;
};

export default function useAnnotationModes({
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
}: Options): AnnotationModes {
    const isFullscreen = useFullscreen();
    const showDrawing = !isFullscreen && hasDrawing;
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    // Follows the palette's button order, so the trigger never enters a mode the palette can't show
    let defaultMode = AnnotationMode.NONE;

    if (showRegion) {
        defaultMode = AnnotationMode.REGION;
    } else if (showHighlight) {
        defaultMode = AnnotationMode.HIGHLIGHT;
    } else if (showDrawing) {
        defaultMode = AnnotationMode.DRAWING;
    }

    return {
        defaultMode,
        hasAnyMode: showDrawing || showHighlight || showRegion,
        showDrawing,
        showHighlight,
        showRegion,
    };
}
