import React from 'react';
import noop from 'lodash/noop';
import { IconToggleButton, IconToggleButtonProps, Toolbar } from '@box/blueprint-web';
import ANNOTATION_MODE_ICONS, { ActiveAnnotationMode } from './annotationModeIcons';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import { AnnotationMode } from '../../../types';

type BaseProps = {
    annotationMode?: AnnotationMode;
    // The modes the surface offers, in the order the toggle falls back to when it has no mode to resume
    modes: ActiveAnnotationMode[];
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
    onAnnotationModeEscape?: () => void;
};

// The toolbar parts throw outside a Toolbar.Root, so surfaces without one (the media bar) use a standalone button.
export type ToolbarProps = BaseProps & { buttonType?: 'toolbar' };
export type IconProps = BaseProps &
    Pick<IconToggleButtonProps, 'size' | 'variant'> & {
        buttonType: 'icon';
    };
export type Props = ToolbarProps | IconProps;

const TOGGLE_VALUE = 'annotations';

function AnnotationsToggleV2(props: Props, ref: React.ForwardedRef<HTMLButtonElement>): JSX.Element | null {
    const {
        annotationMode = AnnotationMode.NONE,
        modes,
        onAnnotationModeClick = noop,
        onAnnotationModeEscape = noop,
    } = props;
    const [lastMode, setLastMode] = React.useState<ActiveAnnotationMode | null>(null);
    const isActive = annotationMode !== AnnotationMode.NONE;
    const resumeMode = lastMode && modes.includes(lastMode) ? lastMode : modes[0];

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

    if (!resumeMode) {
        return null;
    }

    const handleToggle = (isPressed: boolean): void => {
        onAnnotationModeClick({ mode: isPressed ? resumeMode : AnnotationMode.NONE });
    };

    const toggleProps = {
        ref,
        'aria-expanded': isActive,
        'aria-label': __('annotation_tools'),
        'data-resin-target': 'annotations',
        'data-testid': 'bp-AnnotationsControls-toggleBtn',
        icon: ANNOTATION_MODE_ICONS[isActive ? (annotationMode as ActiveAnnotationMode) : resumeMode],
    };

    const renderToggle = (toggle: JSX.Element): JSX.Element => (
        <ToggleTooltipV2 content={__('annotation_tools')}>{toggle}</ToggleTooltipV2>
    );

    if (props.buttonType === 'icon') {
        const { size, variant } = props;

        return renderToggle(
            <IconToggleButton
                {...toggleProps}
                onPressedChange={handleToggle}
                pressed={isActive}
                size={size}
                variant={variant}
            />,
        );
    }

    return (
        <Toolbar.ToggleGroup
            onValueChange={(value: string[]): void => handleToggle(value.includes(TOGGLE_VALUE))}
            type="multiple"
            value={isActive ? [TOGGLE_VALUE] : []}
        >
            {renderToggle(<Toolbar.ToggleItem {...toggleProps} value={TOGGLE_VALUE} />)}
        </Toolbar.ToggleGroup>
    );
}

export default React.forwardRef(AnnotationsToggleV2);
