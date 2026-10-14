import React from 'react';
import { IconButton, IconButtonProps, Toolbar, ToolbarButtonProps, Tooltip } from '@box/blueprint-web';
import { Gear } from '@box/blueprint-web-assets/icons/Medium';
import './SettingsToggleV2.scss';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type BaseProps = {
    badge?: React.ReactElement;
    label: string;
};

// Toolbar.Button throws outside a Toolbar.Root, so toggles rendered elsewhere use IconButton.
export type ToolbarProps = BaseProps & Omit<ToolbarButtonProps, 'aria-label' | 'children'> & { buttonType?: 'toolbar' };
export type IconProps = BaseProps & DistributiveOmit<IconButtonProps, 'aria-label' | 'icon'> & { buttonType: 'icon' };
export type Props = ToolbarProps | IconProps;

export type Ref = HTMLButtonElement;

// The Tooltip wraps the button inside this component so that a Popover or DropdownMenu trigger
// rendered around it (asChild) keeps its own data-state; Radix gives the child's props precedence.
function SettingsToggleV2(props: Props, ref: React.Ref<Ref>): JSX.Element {
    if (props.buttonType === 'icon') {
        const { badge, buttonType, label, ...rest } = props;

        // IconButton renders only its icon, so the badge sits beside the button in a positioned wrapper.
        return (
            <span className="bp-SettingsToggleV2">
                <Tooltip content={label}>
                    <IconButton
                        ref={ref}
                        aria-label={label}
                        data-resin-target="settingsOpen"
                        icon={Gear}
                        {...(rest as DistributiveOmit<IconButtonProps, 'aria-label' | 'icon'>)}
                    />
                </Tooltip>
                {React.isValidElement(badge) && <span className="bp-SettingsToggleV2-badge">{badge}</span>}
            </span>
        );
    }

    const { badge, buttonType, label, ...rest } = props;

    return (
        <Tooltip content={label}>
            <Toolbar.Button ref={ref} aria-label={label} data-resin-target="settingsOpen" {...rest}>
                <span className="bp-SettingsToggleV2">
                    <Toolbar.Icon icon={Gear} />
                    {React.isValidElement(badge) && <span className="bp-SettingsToggleV2-badge">{badge}</span>}
                </span>
            </Toolbar.Button>
        </Tooltip>
    );
}

export default React.forwardRef(SettingsToggleV2);
