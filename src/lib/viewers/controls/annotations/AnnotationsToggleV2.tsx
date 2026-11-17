import React from 'react';
import noop from 'lodash/noop';
import { IconToggleButton, IconToggleButtonProps, Toolbar } from '@box/blueprint-web';
import Comment from '@box/blueprint-web-assets/icons/Medium/Comment';
import { ActiveAnnotationMode } from './annotationModeIcons';
import ToggleTooltipV2, { Props as TooltipProps } from '../tooltip/ToggleTooltipV2';
import { AnnotationMode } from '../../../types';

type BaseProps = {
    annotationMode?: AnnotationMode;
    // Whether the surface's palette is showing, for surfaces that can hide it while a mode stays on
    isExpanded?: boolean;
    // The modes the surface offers, in the order the toggle falls back to when it has no mode to resume
    modes: ActiveAnnotationMode[];
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
    onAnnotationModeEscape?: () => void;
    tooltipSide?: TooltipProps['side'];
};

// The toolbar parts throw outside a Toolbar.Root, so surfaces without one (the media bar) use a standalone button.
export type ToolbarProps = BaseProps & { buttonType?: 'toolbar' };
export type IconProps = BaseProps &
    Pick<IconToggleButtonProps, 'className' | 'size' | 'variant'> & {
        buttonType: 'icon';
    };
export type Props = ToolbarProps | IconProps;

const TOGGLE_VALUE = 'annotations';

function AnnotationsToggleV2(props: Props, ref: React.ForwardedRef<HTMLButtonElement>): JSX.Element | null {
    const {
        annotationMode = AnnotationMode.NONE,
        isExpanded,
        modes,
        onAnnotationModeClick = noop,
        onAnnotationModeEscape = noop,
        tooltipSide,
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
        'aria-expanded': isExpanded ?? isActive,
        'aria-label': __('annotation_tools'),
        'data-resin-target': 'annotations',
        'data-testid': 'bp-AnnotationsControls-toggleBtn',
        icon: Comment,
    };

    const renderToggle = (toggle: JSX.Element): JSX.Element => (
        <ToggleTooltipV2 content={__('annotation_tools')} side={tooltipSide}>
            {toggle}
        </ToggleTooltipV2>
    );

    if (props.buttonType === 'icon') {
        const { className, size, variant } = props;

        return renderToggle(
            <IconToggleButton
                {...toggleProps}
                className={className}
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
