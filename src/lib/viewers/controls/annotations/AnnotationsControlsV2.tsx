import React from 'react';
import noop from 'lodash/noop';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode } from '../../../types';
import { Props } from './AnnotationsControls';

export default function AnnotationsControlsV2({
    annotationColor = bdlBoxBlue,
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

    const handleModeChange = (mode: string): void => {
        onAnnotationModeClick({ mode: (mode as AnnotationMode) || AnnotationMode.NONE });
    };

    const handleExitClick = (): void => {
        onAnnotationModeClick({ mode: AnnotationMode.NONE });
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

    return (
        <>
            {!isVideo && (
                <Tooltip content={__('exit_annotations')}>
                    <Toolbar.Button
                        aria-label={__('exit_annotations')}
                        data-resin-target="exit"
                        data-testid="bp-annotations-controls-exit-btn"
                        onClick={handleExitClick}
                    >
                        <Toolbar.Icon icon={XMark} />
                    </Toolbar.Button>
                </Tooltip>
            )}
            <Toolbar.ToggleGroup
                data-testid="bp-annotations-controls"
                onValueChange={handleModeChange}
                type="single"
                value={annotationMode}
            >
                {showDrawing && (
                    <Tooltip content={__('drawing_comment')}>
                        <Toolbar.ToggleItem
                            aria-label={__('drawing_comment')}
                            color={annotationMode === AnnotationMode.DRAWING ? annotationColor : undefined}
                            data-resin-target="draw"
                            data-testid="bp-AnnotationsControls-drawBtn"
                            icon={PencilScribble}
                            value={AnnotationMode.DRAWING}
                        />
                    </Tooltip>
                )}
                {showRegion && (
                    <AnnotationsTargetedTooltip isEnabled={showRegion}>
                        <Toolbar.ToggleItem
                            aria-label={__('region_comment')}
                            data-resin-target="highlightRegion"
                            data-testid="bp-AnnotationsControls-regionBtn"
                            icon={DashedSquareBubble}
                            value={AnnotationMode.REGION}
                        />
                    </AnnotationsTargetedTooltip>
                )}
                {showHighlight && (
                    <Tooltip content={__('highlight_text')}>
                        <Toolbar.ToggleItem
                            aria-label={__('highlight_text')}
                            data-resin-target="highlightText"
                            data-testid="bp-AnnotationsControls-highlightBtn"
                            icon={TextHighlight}
                            value={AnnotationMode.HIGHLIGHT}
                        />
                    </Tooltip>
                )}
            </Toolbar.ToggleGroup>
        </>
    );
}
