import useFullscreen from '../hooks/useFullscreen';

export type AnnotationModes = {
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

    return {
        hasAnyMode: showDrawing || showHighlight || showRegion,
        showDrawing,
        showHighlight,
        showRegion,
    };
}
