import React from 'react';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import ControlsMenuItemV2 from '../controls-bar/ControlsMenuItemV2';
import { Props as RotateControlProps } from './RotateControl';

export type Props = RotateControlProps & {
    // Names what rotates, like the document or the image, since the menu row has no tooltip
    label: string;
};

// Viewers using this menu row bind R to rotate while the Blueprint controls bar is on
export default function RotateMenuItemV2({ label, onRotateLeft }: Props): JSX.Element {
    return (
        <ControlsMenuItemV2
            bareKey="R"
            data-resin-target="rotate"
            icon={RotateLeft}
            label={label}
            onSelect={(): void => onRotateLeft()}
        />
    );
}
