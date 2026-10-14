import React from 'react';
import noop from 'lodash/noop';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import useAnnotationModes from './useAnnotationModes';
import { AnnotationMode } from '../../../types';
import { Props } from './AnnotationsControls';
import './AnnotationsToggleV2.scss';

const MODE_ICONS: Partial<Record<AnnotationMode, React.ComponentProps<typeof Toolbar.ToggleItem>['icon']>> = {
    [AnnotationMode.DRAWING]: PencilScribble,
    [AnnotationMode.HIGHLIGHT]: TextHighlight,
    [AnnotationMode.REGION]: DashedSquareBubble,
};

const TOGGLE_VALUE = 'annotations';

export default function AnnotationsToggleV2({
    annotationMode = AnnotationMode.NONE,
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
    isVideo = false,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape = noop,
}: Props): JSX.Element | null {
    const toggleRef = React.useRef<HTMLButtonElement | null>(null);
    const { defaultMode, hasAnyMode, showDrawing, showHighlight, showRegion } = useAnnotationModes({
        hasDrawing,
        hasHighlight,
        hasRegion,
    });
    const [lastMode, setLastMode] = React.useState(AnnotationMode.NONE);
    const isActive = annotationMode !== AnnotationMode.NONE;
    const isLastModeShown = {
        [AnnotationMode.DRAWING]: showDrawing,
        [AnnotationMode.HIGHLIGHT]: showHighlight,
        [AnnotationMode.NONE]: false,
        [AnnotationMode.REGION]: showRegion,
    }[lastMode];
    const resumeMode = isLastModeShown ? lastMode : defaultMode;
    const icon = MODE_ICONS[isActive ? annotationMode : resumeMode];

    React.useEffect(() => {
        if (annotationMode !== AnnotationMode.NONE) {
            setLastMode(annotationMode);
        }
    }, [annotationMode]);

    // Global event handlers
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

    if (!hasAnyMode || !icon) {
        return null;
    }

    const handleExitClick = (): void => {
        if (toggleRef.current !== null) {
            toggleRef.current.focus();
        }

        onAnnotationModeClick({ mode: AnnotationMode.NONE });
    };

    const handleToggle = (value: string[]): void => {
        onAnnotationModeClick({ mode: value.includes(TOGGLE_VALUE) ? resumeMode : AnnotationMode.NONE });
    };

    return (
        <>
            <Toolbar.Separator />
            {!isVideo && (
                <span className="bp-AnnotationsControls-exitBtn">
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
                </span>
            )}
            <Toolbar.ToggleGroup onValueChange={handleToggle} type="multiple" value={isActive ? [TOGGLE_VALUE] : []}>
                <AnnotationsTargetedTooltip isEnabled={showRegion}>
                    <ToggleTooltipV2 content={__('annotation_tools')}>
                        <Toolbar.ToggleItem
                            ref={toggleRef}
                            aria-expanded={isActive}
                            aria-label={__('annotation_tools')}
                            data-resin-target="annotations"
                            data-testid="bp-AnnotationsControls-toggleBtn"
                            icon={icon}
                            value={TOGGLE_VALUE}
                        />
                    </ToggleTooltipV2>
                </AnnotationsTargetedTooltip>
            </Toolbar.ToggleGroup>
        </>
    );
}
