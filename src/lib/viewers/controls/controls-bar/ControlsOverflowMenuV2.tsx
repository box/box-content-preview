import React from 'react';
import { DropdownMenu, Toolbar } from '@box/blueprint-web';
import EllipsisVertical from '@box/blueprint-web-assets/icons/Medium/EllipsisVertical';
import { ControlsBarItem } from './useControlsOverflow';

export type Props = {
    items: ControlsBarItem[];
};

export default function ControlsOverflowMenuV2({ items }: Props): JSX.Element {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Toolbar.Button
                    aria-label={__('more_options')}
                    data-resin-target="moreOptions"
                    data-testid="bp-ControlsBar-overflowBtn"
                >
                    <Toolbar.Icon icon={EllipsisVertical} />
                </Toolbar.Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" data-testid="bp-ControlsBar-overflowMenu" side="top">
                {items.map(({ id, menu }) => (
                    <React.Fragment key={id}>{menu}</React.Fragment>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
