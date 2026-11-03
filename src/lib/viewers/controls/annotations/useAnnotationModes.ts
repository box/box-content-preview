import useFullscreen from '../hooks/useFullscreen';
import { ActiveAnnotationMode } from './annotationModeIcons';
import { AnnotationMode } from '../../../types';

export type Options = {
    hasDrawing?: boolean;
    hasHighlight?: boolean;
    hasRegion?: boolean;
};

// Listed in the palette's button order, which is also the order the toggle falls back to. Annotating is
// unavailable in fullscreen, so no modes are offered there.
export default function useAnnotationModes({ hasDrawing, hasHighlight, hasRegion }: Options): ActiveAnnotationMode[] {
    const isFullscreen = useFullscreen();
    const modes: ActiveAnnotationMode[] = [];

    if (isFullscreen) {
        return modes;
    }

    if (hasRegion) {
        modes.push(AnnotationMode.REGION);
    }
    if (hasHighlight) {
        modes.push(AnnotationMode.HIGHLIGHT);
    }
    if (hasDrawing) {
        modes.push(AnnotationMode.DRAWING);
    }

    return modes;
}
