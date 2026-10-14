import React from 'react';
import { Toolbar, ToolbarButtonProps, Tooltip } from '@box/blueprint-web';
import { Gear } from '@box/blueprint-web-assets/icons/Medium';
import './SettingsToggleV2.scss';

export type Props = Omit<ToolbarButtonProps, 'aria-label' | 'children'> & {
    badge?: React.ReactElement;
    label: string;
};

export type Ref = HTMLButtonElement;

// The Tooltip wraps the button inside this component so that a Popover or DropdownMenu trigger
// rendered around it (asChild) keeps its own data-state; Radix gives the child's props precedence.
function SettingsToggleV2({ badge, label, ...rest }: Props, ref: React.Ref<Ref>): JSX.Element {
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
