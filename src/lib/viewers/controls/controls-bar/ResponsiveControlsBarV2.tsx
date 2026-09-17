import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import ControlsOverflowMenuV2 from './ControlsOverflowMenuV2';
import useControlsOverflow, { ControlsBarItem } from './useControlsOverflow';
import './ControlsBarV2.scss';

export type Props = {
    items: ControlsBarItem[];
};

// The main bar, which drops controls into an overflow menu as the viewer narrows. Bars that always
// show everything, like the markup palette, use ControlsBarV2 instead.
export default function ResponsiveControlsBarV2({ items }: Props): JSX.Element | null {
    const { barRef, overflowItems, visibleItems } = useControlsOverflow(items);

    if (!items.length) {
        return null;
    }

    return (
        <Toolbar.Root ref={barRef} className="bp-ControlsBarV2" data-testid="bp-ControlsBar">
            {visibleItems.map(({ control, id }) => (
                <div key={id} className="bp-ControlsBarV2-item" data-overflow-id={id}>
                    {control}
                </div>
            ))}
            {overflowItems.length > 0 && <ControlsOverflowMenuV2 items={overflowItems} />}
        </Toolbar.Root>
    );
}
