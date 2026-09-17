import React from 'react';
import { DropdownMenu } from '@box/blueprint-web';

export type Props = {
    icon: React.ComponentProps<typeof DropdownMenu.Item.StartElement>['icon'];
    label: string;
    onSelect: () => void;
};

// The overflow form of a control: same action, same label as its tooltip, drawn as a menu row.
export default function ControlsMenuItemV2({ icon, label, onSelect, ...rest }: Props): JSX.Element {
    return (
        <DropdownMenu.Item onSelect={onSelect} {...rest}>
            <DropdownMenu.Item.StartElement icon={icon} />
            <DropdownMenu.Item.MainContent label={label} />
        </DropdownMenu.Item>
    );
}
