import React from 'react';
import { Tooltip } from '@box/blueprint-web';

export type Props = {
    children: React.ReactNode;
    content: string;
};

// Blueprint's Tooltip renders a Radix trigger that writes its own data-state onto the child it
// wraps, which silently overwrites the data-state Toolbar.ToggleItem uses to paint its selected
// styling. Giving the tooltip its own element keeps the two states apart.
export default function ToggleTooltipV2({ children, content }: Props): JSX.Element {
    return (
        <Tooltip content={content}>
            <span className="bp-ToggleTooltipV2">{children}</span>
        </Tooltip>
    );
}
