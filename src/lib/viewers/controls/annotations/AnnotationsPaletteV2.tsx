import React from 'react';
import noop from 'lodash/noop';
import { Toolbar } from '@box/blueprint-web';
import ANNOTATION_MODE_ICONS, { ActiveAnnotationMode } from './annotationModeIcons';
import ControlsBarV2 from '../controls-bar/ControlsBarV2';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import { AnnotationMode } from '../../../types';
import './AnnotationsPaletteV2.scss';

export type Props = {
    children: React.ReactNode;
};

export type ModesProps = {
    annotationMode: AnnotationMode;
    children: React.ReactNode;
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
};

export type ModeProps = {
    value: ActiveAnnotationMode;
};

function AnnotationsPaletteV2({ children }: Props): JSX.Element {
    return (
        <div className="bp-AnnotationsPaletteV2" data-testid="bp-AnnotationsPaletteV2">
            <ControlsBarV2 size="small">{children}</ControlsBarV2>
        </div>
    );
}

function Modes({ annotationMode, children, onAnnotationModeClick = noop }: ModesProps): JSX.Element {
    // The single-select group reports an empty value when the active mode is clicked again. Exiting
    // is left to the trigger on the main bar, so the palette never closes under the cursor.
    const handleModeChange = (mode: string): void => {
        if (!mode || mode === annotationMode) {
            return;
        }

        onAnnotationModeClick({ mode: mode as AnnotationMode });
    };

    return (
        <Toolbar.ToggleGroup
            data-testid="bp-annotations-controls"
            onValueChange={handleModeChange}
            type="single"
            value={annotationMode}
        >
            {children}
        </Toolbar.ToggleGroup>
    );
}

function Mode({ value }: ModeProps): JSX.Element {
    const { label, resinTarget, testId } = {
        [AnnotationMode.DRAWING]: {
            label: __('drawing_comment'),
            resinTarget: 'draw',
            testId: 'bp-AnnotationsControls-drawBtn',
        },
        [AnnotationMode.HIGHLIGHT]: {
            label: __('highlight_text'),
            resinTarget: 'highlightText',
            testId: 'bp-AnnotationsControls-highlightBtn',
        },
        [AnnotationMode.REGION]: {
            label: __('region_comment'),
            resinTarget: 'highlightRegion',
            testId: 'bp-AnnotationsControls-regionBtn',
        },
    }[value];

    return (
        <ToggleTooltipV2 content={label}>
            <Toolbar.ToggleItem
                aria-label={label}
                data-resin-target={resinTarget}
                data-testid={testId}
                icon={ANNOTATION_MODE_ICONS[value]}
                value={value}
            />
        </ToggleTooltipV2>
    );
}

export default Object.assign(AnnotationsPaletteV2, { Mode, Modes });
