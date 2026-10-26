import React from 'react';
import ControlsBarV2 from './ControlsBarV2';
import ControlsOverflowMenuV2 from './ControlsOverflowMenuV2';
import useControlsOverflow, { ControlsBarItem } from './useControlsOverflow';
import './ResponsiveControlsBarV2.scss';

export type Props = {
    // Falsy entries are skipped, so bars can gate a control inline
    items: Array<ControlsBarItem | false | null | undefined>;
};

const isItem = (item: ControlsBarItem | false | null | undefined): item is ControlsBarItem => !!item;

// Moves controls into an overflow menu as the viewer narrows. Bars that always show everything, like the
// annotations palette, use ControlsBarV2 directly.
export default function ResponsiveControlsBarV2({ items: allItems }: Props): JSX.Element | null {
    const items = allItems.filter(isItem);
    const { barRef, overflowItems, visibleItems } = useControlsOverflow(items);

    if (!items.length) {
        return null;
    }

    return (
        <ControlsBarV2 ref={barRef}>
            {visibleItems.map(({ control, id }) => (
                <div key={id} className="bp-ResponsiveControlsBarV2-item" data-overflow-id={id}>
                    {control}
                </div>
            ))}
            {overflowItems.length > 0 && <ControlsOverflowMenuV2 items={overflowItems} />}
        </ControlsBarV2>
    );
}
