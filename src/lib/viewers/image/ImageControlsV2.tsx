import React from 'react';
import noop from 'lodash/noop';
import AnnotationsPaletteControlsV2 from '../controls/annotations/AnnotationsPaletteControlsV2';
import ExperiencesProvider from '../controls/experiences';
import getAnnotationsItem from '../controls/annotations/getAnnotationsItem';
import getFullscreenItem from '../controls/fullscreen/getFullscreenItem';
import getRotateItem from '../controls/rotate/getRotateItem';
import getZoomItem from '../controls/zoom/getZoomItem';
import useAnnotationModes from '../controls/annotations/useAnnotationModes';
import { ResponsiveControlsBarV2 } from '../controls/controls-bar';
import { AnnotationMode } from '../../types';
import { Props } from './ImageControls';

// The same collapse order as documents: rotate, then fullscreen, then zoom. The markup trigger has no menu
// form and never collapses.
const PRIORITY = {
    fullscreen: 2,
    rotate: 1,
    zoom: 3,
};

export default function ImageControlsV2({
    annotationColor,
    annotationMode = AnnotationMode.NONE,
    experiences,
    hasDrawing,
    hasHighlight,
    hasRegion,
    onAnnotationColorChange,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape,
    onFullscreenToggle,
    onRotateLeft,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    const annotationModes = useAnnotationModes({ hasDrawing, hasHighlight, hasRegion });

    return (
        <ExperiencesProvider experiences={experiences}>
            <ResponsiveControlsBarV2
                items={[
                    getZoomItem({ onZoomIn, onZoomOut, scale }, PRIORITY.zoom),
                    getRotateItem({ menuLabel: __('controls_rotate_image'), onRotateLeft }, PRIORITY.rotate),
                    getFullscreenItem({ onFullscreenToggle }, PRIORITY.fullscreen),
                    getAnnotationsItem({
                        annotationMode,
                        modes: annotationModes,
                        onAnnotationModeClick,
                        onAnnotationModeEscape,
                    }),
                ]}
            />
            <AnnotationsPaletteControlsV2
                annotationColor={annotationColor}
                annotationMode={annotationMode}
                modes={annotationModes}
                onAnnotationColorChange={onAnnotationColorChange}
                onAnnotationModeClick={onAnnotationModeClick}
            />
        </ExperiencesProvider>
    );
}
