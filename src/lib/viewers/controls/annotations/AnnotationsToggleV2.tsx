import React from 'react';
import noop from 'lodash/noop';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import useAnnotationModes from './useAnnotationModes';
import { AnnotationMode } from '../../../types';
import { Props as AnnotationsControlsProps } from './AnnotationsControls';

export type Props = AnnotationsControlsProps;

const MODE_ICONS: Partial<Record<AnnotationMode, React.ComponentProps<typeof Toolbar.ToggleItem>['icon']>> = {
    [AnnotationMode.DRAWING]: PencilScribble,
    [AnnotationMode.HIGHLIGHT]: TextHighlight,
    [AnnotationMode.REGION]: DashedSquareBubble,
};

// The three modes now live behind one button, which rests on the icon of the mode that was used
// last so the bar still says what a click will resume. The button holds no open state of its own:
// it is pressed exactly while a mode is on, which is also exactly while the palette is up.
export default function AnnotationsToggleV2({
    annotationMode = AnnotationMode.NONE,
    hasDrawing,
    hasHighlight,
    hasRegion,
    isVideo = false,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape = noop,
}: Props): JSX.Element | null {
    const { defaultMode, hasAnyMode } = useAnnotationModes({ hasDrawing, hasHighlight, hasRegion });
    const [lastMode, setLastMode] = React.useState(AnnotationMode.NONE);
    const isOpen = annotationMode !== AnnotationMode.NONE;
    const resumeMode = lastMode === AnnotationMode.NONE ? defaultMode : lastMode;
    const icon = MODE_ICONS[isOpen ? annotationMode : resumeMode];

    React.useEffect(() => {
        if (annotationMode !== AnnotationMode.NONE) {
            setLastMode(annotationMode);
        }
    }, [annotationMode]);

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

    // Turning the button on resumes the mode its icon is showing, so the palette always comes up
    // with a mode selected rather than waiting for a second click.
    const handleToggle = (value: string[]): void => {
        onAnnotationModeClick({ mode: value.includes('annotations') ? resumeMode : AnnotationMode.NONE });
    };

    return (
        <>
            {/* The only separator on the bar, so it lives with the group it divides and disappears
                along with it. */}
            <Toolbar.Separator />
            {!isVideo && (
                <Tooltip content={__('exit_annotations')}>
                    <Toolbar.Button
                        aria-label={__('exit_annotations')}
                        className="bp-AnnotationsControls-exitBtn"
                        data-resin-target="exit"
                        data-testid="bp-annotations-controls-exit-btn"
                        onClick={(): void => onAnnotationModeClick({ mode: AnnotationMode.NONE })}
                    >
                        <Toolbar.Icon icon={XMark} />
                    </Toolbar.Button>
                </Tooltip>
            )}
            <Toolbar.ToggleGroup onValueChange={handleToggle} type="multiple" value={isOpen ? ['annotations'] : []}>
                <ToggleTooltipV2 content={__('annotation_tools')}>
                    <Toolbar.ToggleItem
                        aria-expanded={isOpen}
                        aria-label={__('annotation_tools')}
                        data-resin-target="annotations"
                        data-testid="bp-AnnotationsControls-toggleBtn"
                        icon={icon}
                        value="annotations"
                    />
                </ToggleTooltipV2>
            </Toolbar.ToggleGroup>
        </>
    );
}
