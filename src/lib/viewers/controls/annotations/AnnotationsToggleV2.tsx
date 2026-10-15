import React from 'react';
import noop from 'lodash/noop';
import { IconButton, IconToggleButton, IconToggleButtonProps, Toolbar, Tooltip } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import { ExperiencesContext } from '../experiences';
import useAnnotationModes from './useAnnotationModes';
import { AnnotationMode } from '../../../types';
import { Props as AnnotationsControlsProps } from './AnnotationsControls';
import './AnnotationsToggleV2.scss';

// The toolbar parts throw outside a Toolbar.Root, so surfaces without one (the media bar) use standalone buttons.
export type ToolbarProps = AnnotationsControlsProps & { buttonType?: 'toolbar' };
export type IconProps = AnnotationsControlsProps &
    Pick<IconToggleButtonProps, 'size' | 'variant'> & {
        buttonType: 'icon';
    };
export type Props = ToolbarProps | IconProps;

const MODE_ICONS: Partial<Record<AnnotationMode, React.ComponentProps<typeof Toolbar.ToggleItem>['icon']>> = {
    [AnnotationMode.DRAWING]: PencilScribble,
    [AnnotationMode.HIGHLIGHT]: TextHighlight,
    [AnnotationMode.REGION]: DashedSquareBubble,
};

const TOGGLE_VALUE = 'annotations';

export default function AnnotationsToggleV2(props: Props): JSX.Element | null {
    const {
        annotationMode = AnnotationMode.NONE,
        hasDrawing = false,
        hasHighlight = false,
        hasRegion = false,
        isVideo = false,
        onAnnotationModeClick = noop,
        onAnnotationModeEscape = noop,
    } = props;
    const toggleRef = React.useRef<HTMLButtonElement | null>(null);
    const { experiences } = React.useContext(ExperiencesContext);
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

    const handleToggle = (isPressed: boolean): void => {
        onAnnotationModeClick({ mode: isPressed ? resumeMode : AnnotationMode.NONE });
    };

    const toggleProps = {
        ref: toggleRef,
        'aria-expanded': isActive,
        'aria-label': __('annotation_tools'),
        'data-resin-target': 'annotations',
        'data-testid': 'bp-AnnotationsControls-toggleBtn',
        icon,
    };
    const exitProps = {
        'aria-label': __('exit_annotations'),
        'data-resin-target': 'exit',
        'data-testid': 'bp-annotations-controls-exit-btn',
        onClick: handleExitClick,
    };

    // With no experience from the host, the box-ui-elements tooltip falls back to opening on hover
    const renderToggle = (toggle: JSX.Element): JSX.Element => (
        <AnnotationsTargetedTooltip isEnabled={showRegion && !!experiences.tooltipFlowAnnotationsExperience}>
            <ToggleTooltipV2 content={__('annotation_tools')}>{toggle}</ToggleTooltipV2>
        </AnnotationsTargetedTooltip>
    );

    if (props.buttonType === 'icon') {
        const { size, variant } = props;

        return (
            <>
                {!isVideo && (
                    <span className="bp-AnnotationsControls-exitBtn">
                        <Tooltip content={__('exit_annotations')}>
                            <IconButton icon={XMark} {...exitProps} />
                        </Tooltip>
                    </span>
                )}
                {renderToggle(
                    <IconToggleButton
                        {...toggleProps}
                        onPressedChange={handleToggle}
                        pressed={isActive}
                        size={size}
                        variant={variant}
                    />,
                )}
            </>
        );
    }

    return (
        <>
            <Toolbar.Separator />
            {!isVideo && (
                <span className="bp-AnnotationsControls-exitBtn">
                    <Tooltip content={__('exit_annotations')}>
                        <Toolbar.Button {...exitProps}>
                            <Toolbar.Icon icon={XMark} />
                        </Toolbar.Button>
                    </Tooltip>
                </span>
            )}
            <Toolbar.ToggleGroup
                onValueChange={(value: string[]): void => handleToggle(value.includes(TOGGLE_VALUE))}
                type="multiple"
                value={isActive ? [TOGGLE_VALUE] : []}
            >
                {renderToggle(<Toolbar.ToggleItem {...toggleProps} value={TOGGLE_VALUE} />)}
            </Toolbar.ToggleGroup>
        </>
    );
}
