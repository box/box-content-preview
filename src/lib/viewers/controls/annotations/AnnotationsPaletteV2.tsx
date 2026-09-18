import React from 'react';
import noop from 'lodash/noop';
import { Toolbar } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import ColorPickerControlV2 from '../color-picker/ColorPickerControlV2';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import useAnnotationModes from './useAnnotationModes';
import { ANNOTATION_COLORS } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';
import { Props as DrawingControlsProps } from './DrawingControls';

export type Props = DrawingControlsProps & {
    hasDrawing?: boolean;
    hasHighlight?: boolean;
    hasRegion?: boolean;
    onAnnotationModeClick?: (options: { mode: AnnotationMode }) => void;
};

// The bar that opens above the main one, holding the three modes and, once drawing is picked, the
// colors that used to need a bar of their own.
export default function AnnotationsPaletteV2({
    annotationColor,
    annotationMode = AnnotationMode.NONE,
    hasDrawing,
    hasHighlight,
    hasRegion,
    onAnnotationColorChange,
    onAnnotationModeClick = noop,
}: Props): JSX.Element | null {
    const { hasAnyMode, showDrawing, showHighlight, showRegion } = useAnnotationModes({
        hasDrawing,
        hasHighlight,
        hasRegion,
    });

    // Blueprint's single-select group clears its value when the mode already on is clicked again,
    // which turns the mode off and takes this palette down with it.
    const handleModeChange = (mode: string): void => {
        onAnnotationModeClick({ mode: (mode as AnnotationMode) || AnnotationMode.NONE });
    };

    if (!hasAnyMode) {
        return null;
    }

    return (
        <>
            <Toolbar.ToggleGroup
                data-testid="bp-annotations-controls"
                onValueChange={handleModeChange}
                type="single"
                value={annotationMode}
            >
                {showRegion && (
                    <AnnotationsTargetedTooltip isEnabled={showRegion}>
                        <ToggleTooltipV2 content={__('region_comment')}>
                            <Toolbar.ToggleItem
                                aria-label={__('region_comment')}
                                data-resin-target="highlightRegion"
                                data-testid="bp-AnnotationsControls-regionBtn"
                                icon={DashedSquareBubble}
                                value={AnnotationMode.REGION}
                            />
                        </ToggleTooltipV2>
                    </AnnotationsTargetedTooltip>
                )}
                {showHighlight && (
                    <ToggleTooltipV2 content={__('highlight_text')}>
                        <Toolbar.ToggleItem
                            aria-label={__('highlight_text')}
                            data-resin-target="highlightText"
                            data-testid="bp-AnnotationsControls-highlightBtn"
                            icon={TextHighlight}
                            value={AnnotationMode.HIGHLIGHT}
                        />
                    </ToggleTooltipV2>
                )}
                {showDrawing && (
                    <ToggleTooltipV2 content={__('drawing_comment')}>
                        <Toolbar.ToggleItem
                            aria-label={__('drawing_comment')}
                            data-resin-target="draw"
                            data-testid="bp-AnnotationsControls-drawBtn"
                            icon={PencilScribble}
                            value={AnnotationMode.DRAWING}
                        />
                    </ToggleTooltipV2>
                )}
            </Toolbar.ToggleGroup>
            {annotationMode === AnnotationMode.DRAWING && (
                <>
                    <Toolbar.Separator />
                    <ColorPickerControlV2
                        activeColor={annotationColor}
                        colors={ANNOTATION_COLORS}
                        onColorSelect={onAnnotationColorChange}
                    />
                </>
            )}
        </>
    );
}
