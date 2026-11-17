import React from 'react';
import VrToggleControlV2 from '../../controls/box3d/VrToggleControlV2';
import { ControlsBarV2 } from '../../controls/controls-bar';
import { FullscreenToggleV2 } from '../../controls/fullscreen';
import { Props } from './Image360Controls';

export default function Image360ControlsV2({ isVrShown, onFullscreenToggle, onVrToggle }: Props): JSX.Element {
    return (
        <ControlsBarV2>
            <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
            <VrToggleControlV2 isVrShown={isVrShown} onVrToggle={onVrToggle} />
        </ControlsBarV2>
    );
}
