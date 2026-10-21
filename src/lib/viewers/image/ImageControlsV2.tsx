import React from 'react';
import noop from 'lodash/noop';
import AnnotationsControlsV2 from '../controls/annotations/AnnotationsControlsV2';
import AnnotationsPaletteControlsV2 from '../controls/annotations/AnnotationsPaletteControlsV2';
import ExperiencesProvider from '../controls/experiences';
import getFullscreenItem from '../controls/fullscreen/getFullscreenItem';
import getRotateItem from '../controls/rotate/getRotateItem';
import getZoomItem from '../controls/zoom/getZoomItem';
import useAnnotationModes from '../controls/annotations/useAnnotationModes';
import { ControlsBarItem, ResponsiveControlsBarV2 } from '../controls/controls-bar';
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
    const hasAnnotations = annotationModes.length > 0;

    const items: Array<ControlsBarItem | false> = [
        getZoomItem({ onZoomIn, onZoomOut, scale }, PRIORITY.zoom),
        getRotateItem({ menuLabel: __('controls_rotate_image'), onRotateLeft }, PRIORITY.rotate),
        getFullscreenItem({ onFullscreenToggle }, PRIORITY.fullscreen),
        hasAnnotations && {
            control: (
                <AnnotationsControlsV2
                    annotationMode={annotationMode}
                    modes={annotationModes}
                    onAnnotationModeClick={onAnnotationModeClick}
                    onAnnotationModeEscape={onAnnotationModeEscape}
                />
            ),
            id: 'annotations',
        },
    ];

    return (
        <ExperiencesProvider experiences={experiences}>
            <ResponsiveControlsBarV2 items={items.filter((item): item is ControlsBarItem => !!item)} />
            {hasAnnotations && (
                <AnnotationsPaletteControlsV2
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    modes={annotationModes}
                    onAnnotationColorChange={onAnnotationColorChange}
                    onAnnotationModeClick={onAnnotationModeClick}
                />
            )}
        </ExperiencesProvider>
    );
}
