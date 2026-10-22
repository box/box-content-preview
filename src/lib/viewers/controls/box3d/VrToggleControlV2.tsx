import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import VrGoggles from '@box/blueprint-web-assets/icons/Medium/VrGoggles';
import { Props } from './VrToggleControl';

export default function VrToggleControlV2({ isVrShown, onVrToggle }: Props): JSX.Element | null {
    if (!isVrShown) {
        return null;
    }

    return (
        <Tooltip content={__('box3d_toggle_vr')}>
            <Toolbar.Button aria-label={__('box3d_toggle_vr')} data-resin-target="vrToggle" onClick={onVrToggle}>
                <Toolbar.Icon icon={VrGoggles} />
            </Toolbar.Button>
        </Tooltip>
    );
}
