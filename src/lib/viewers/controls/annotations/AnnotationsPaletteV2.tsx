import React from 'react';
import noop from 'lodash/noop';
import { Toolbar } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import ColorPickerControlV2 from '../color-picker/ColorPickerControlV2';
import ControlsBarV2 from '../controls-bar/ControlsBarV2';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import useAnnotationModes from './useAnnotationModes';
import { ANNOTATION_COLORS } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';
import { Props as AnnotationsControlsProps } from './AnnotationsControls';
import { Props as DrawingControlsProps } from './DrawingControls';
import './AnnotationsPaletteV2.scss';

export type Props = Pick<
    AnnotationsControlsProps,
    'hasDrawing' | 'hasHighlight' | 'hasRegion' | 'onAnnotationModeClick'
> &
    DrawingControlsProps;

export default function AnnotationsPaletteV2({
    annotationColor,
    annotationMode = AnnotationMode.NONE,
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
    onAnnotationColorChange,
    onAnnotationModeClick = noop,
}: Props): JSX.Element | null {
    const { hasAnyMode, showDrawing, showHighlight, showRegion } = useAnnotationModes({
        hasDrawing,
        hasHighlight,
        hasRegion,
    });

    // The single-select group reports an empty value when the active mode is clicked again. Exiting
    // is left to the trigger on the main bar, so the palette never closes under the cursor.
    const handleModeChange = (mode: string): void => {
        if (!mode || mode === annotationMode) {
            return;
        }

        onAnnotationModeClick({ mode: mode as AnnotationMode });
    };

    if (!hasAnyMode || annotationMode === AnnotationMode.NONE) {
        return null;
    }

    return (
        <div className="bp-AnnotationsPaletteV2" data-testid="bp-AnnotationsPaletteV2">
            <ControlsBarV2>
                <Toolbar.ToggleGroup
                    data-testid="bp-annotations-controls"
                    onValueChange={handleModeChange}
                    type="single"
                    value={annotationMode}
                >
                    {showRegion && (
                        <ToggleTooltipV2 content={__('region_comment')}>
                            <Toolbar.ToggleItem
                                aria-label={__('region_comment')}
                                data-resin-target="highlightRegion"
                                data-testid="bp-AnnotationsControls-regionBtn"
                                icon={DashedSquareBubble}
                                value={AnnotationMode.REGION}
                            />
                        </ToggleTooltipV2>
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
            </ControlsBarV2>
        </div>
    );
}
