import React from 'react';
import { DropdownMenu, MenuItemStartElementProps, Text } from '@box/blueprint-web';
import { ControlsOverflowTriggerContext } from './ControlsOverflowMenuV2';
import { getShortcut } from './shortcuts';
import './ControlsMenuItemV2.scss';

export type Props = {
    'data-resin-target'?: string;
    'data-testid'?: string;
    disabled?: boolean;
    icon: MenuItemStartElementProps['icon'];
    // For actions that are often repeated, like zoom, so each one does not reopen the menu
    keepOpen?: boolean;
    label: string;
    onSelect: (triggerElement: HTMLButtonElement | null) => void;
    // A key preview binds on its own, shown without Cmd or Ctrl
    bareKey?: string;
    // The key preview binds with Cmd or Ctrl for this action, shown with the platform's modifier
    shortcutKey?: string;
};

// The menu form of a bar control. Toggles are plain rows whose label names the next action, since checkbox
// rows reserve space for a checkmark that the mocks do not have.
export default function ControlsMenuItemV2({
    bareKey,
    icon,
    keepOpen,
    label,
    onSelect,
    shortcutKey,
    ...rest
}: Props): JSX.Element {
    const triggerRef = React.useContext(ControlsOverflowTriggerContext);
    let shortcut = null;

    if (shortcutKey) {
        shortcut = getShortcut(shortcutKey);
    } else if (bareKey) {
        shortcut = { keys: bareKey, label: bareKey };
    }

    const handleSelect = (event: Event): void => {
        if (keepOpen) {
            event.preventDefault();
        }

        onSelect(triggerRef.current);
    };

    return (
        <DropdownMenu.Item
            aria-keyshortcuts={shortcut?.keys}
            onSelect={handleSelect}
            {...rest}
            className="bp-ControlsMenuItemV2"
        >
            <DropdownMenu.Item.StartElement icon={icon} />
            <DropdownMenu.Item.MainContent label={label} />
            {shortcut && (
                <DropdownMenu.Item.EndElement aria-hidden>
                    <Text as="span" color="textOnLightSecondary">
                        {shortcut.label}
                    </Text>
                </DropdownMenu.Item.EndElement>
            )}
        </DropdownMenu.Item>
    );
}
