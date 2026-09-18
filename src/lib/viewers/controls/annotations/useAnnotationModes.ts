import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode } from '../../../types';

export type AnnotationModes = {
    defaultMode: AnnotationMode;
    hasAnyMode: boolean;
    showDrawing: boolean;
    showHighlight: boolean;
    showRegion: boolean;
};

export type Options = {
    hasDrawing?: boolean;
    hasHighlight?: boolean;
    hasRegion?: boolean;
};

// The trigger on the bar and the palette it opens have to agree on which modes exist, so they read
// availability from here rather than each working it out.
export default function useAnnotationModes({
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
}: Options): AnnotationModes {
    const isFullscreen = useFullscreen();
    const showDrawing = !isFullscreen && hasDrawing;
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    // The mode the trigger turns on before one has been used, in the order the palette lays them
    // out, so the trigger can never enter a mode the palette has no button for.
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
