import React from 'react';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import ControlsMenuItemV2 from '../controls-bar/ControlsMenuItemV2';
import RotateControlV2 from './RotateControlV2';
import { ControlsBarItem } from '../controls-bar/useControlsOverflow';
import { Props as RotateControlProps } from './RotateControl';

export type Props = RotateControlProps & {
    // Names what rotates, like the document or the image, since the menu row has no tooltip
    menuLabel: string;
};

// Viewers that offer rotate also bind R to it while the Blueprint controls bar is on
export default function getRotateItem({ menuLabel, onRotateLeft }: Props, priority: number): ControlsBarItem {
    return {
        control: <RotateControlV2 onRotateLeft={onRotateLeft} />,
        id: 'rotate',
        menu: (
            <ControlsMenuItemV2
                bareKey="R"
                data-resin-target="rotate"
                icon={RotateLeft}
                label={menuLabel}
                onSelect={(): void => onRotateLeft()}
            />
        ),
        priority,
    };
}
