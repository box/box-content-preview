import React from 'react';
import { Tooltip } from '@box/blueprint-web';
import './ToggleTooltipV2.scss';

export type Props = {
    children: React.ReactNode;
    content: string;
};

// Blueprint's Tooltip writes its own data-state onto the element it wraps, which overwrites the
// data-state Toolbar.ToggleItem uses for its selected styling, so the tooltip gets its own element.
export default function ToggleTooltipV2({ children, content }: Props): JSX.Element {
    return (
        <Tooltip content={content}>
            <span className="bp-ToggleTooltipV2">{children}</span>
        </Tooltip>
    );
}
