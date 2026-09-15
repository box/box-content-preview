import React from 'react';
import noop from 'lodash/noop';
import { IconIconOnDark, SurfaceFilterSurfaceSelected } from '@box/blueprint-web-assets/tokens/tokens';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import useFullscreen from '../hooks/useFullscreen';
import { AnnotationColor } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';
import { Props } from './AnnotationsControls';

export default function AnnotationsControlsV2({
    annotationColor = AnnotationColor.BOX_BLUE,
    annotationMode = AnnotationMode.NONE,
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
    isVideo = false,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape = noop,
}: Props): JSX.Element | null {
    const isFullscreen = useFullscreen();
    const showDrawing = !isFullscreen && hasDrawing;
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    const handleModeClick = (mode: AnnotationMode): void => {
        onAnnotationModeClick({ mode: annotationMode === mode ? AnnotationMode.NONE : mode });
    };

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            onAnnotationModeEscape();
        };

        if (annotationMode !== AnnotationMode.NONE) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return (): void => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [annotationMode, onAnnotationModeEscape]);

    if (!showDrawing && !showHighlight && !showRegion) {
        return null;
    }

    const isDrawingActive = annotationMode === AnnotationMode.DRAWING;
    const isHighlightActive = annotationMode === AnnotationMode.HIGHLIGHT;
    const isRegionActive = annotationMode === AnnotationMode.REGION;

    return (
        <>
            {!isVideo && (
                <Tooltip content={__('exit_annotations')}>
                    <Toolbar.Button
                        aria-label={__('exit_annotations')}
                        data-resin-target="exit"
                        data-testid="bp-annotations-controls-exit-btn"
                        onClick={(): void => handleModeClick(AnnotationMode.NONE)}
                    >
                        <Toolbar.Icon icon={XMark} />
                    </Toolbar.Button>
                </Tooltip>
            )}
            {showDrawing && (
                <Tooltip content={__('drawing_comment')}>
                    <Toolbar.DropdownTriggerButton
                        aria-label={__('drawing_comment')}
                        // The mock fills the active mode with the current annotation color, so the
                        // icon has to flip to white to stay legible on it.
                        backgroundColor={isDrawingActive ? annotationColor : undefined}
                        data-resin-target="draw"
                        data-testid="bp-AnnotationsControls-drawBtn"
                        onClick={(): void => handleModeClick(AnnotationMode.DRAWING)}
                        selected={isDrawingActive}
                    >
                        <Toolbar.Icon color={isDrawingActive ? IconIconOnDark : undefined} icon={PencilScribble} />
                    </Toolbar.DropdownTriggerButton>
                </Tooltip>
            )}
            {showRegion && (
                <AnnotationsTargetedTooltip isEnabled={showRegion}>
                    <Toolbar.DropdownTriggerButton
                        aria-label={__('region_comment')}
                        backgroundColor={isRegionActive ? SurfaceFilterSurfaceSelected : undefined}
                        data-resin-target="highlightRegion"
                        data-testid="bp-AnnotationsControls-regionBtn"
                        onClick={(): void => handleModeClick(AnnotationMode.REGION)}
                        selected={isRegionActive}
                    >
                        <Toolbar.Icon color={isRegionActive ? IconIconOnDark : undefined} icon={DashedSquareBubble} />
                    </Toolbar.DropdownTriggerButton>
                </AnnotationsTargetedTooltip>
            )}
            {showHighlight && (
                <Tooltip content={__('highlight_text')}>
                    <Toolbar.DropdownTriggerButton
                        aria-label={__('highlight_text')}
                        backgroundColor={isHighlightActive ? SurfaceFilterSurfaceSelected : undefined}
                        data-resin-target="highlightText"
                        data-testid="bp-AnnotationsControls-highlightBtn"
                        onClick={(): void => handleModeClick(AnnotationMode.HIGHLIGHT)}
                        selected={isHighlightActive}
                    >
                        <Toolbar.Icon color={isHighlightActive ? IconIconOnDark : undefined} icon={TextHighlight} />
                    </Toolbar.DropdownTriggerButton>
                </Tooltip>
            )}
        </>
    );
}
