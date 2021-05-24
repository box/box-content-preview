import React from 'react';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import VrToggleControl, { Props as VrToggleConrolProps } from '../../controls/box3d/VrToggleControl';

export type Props = FullscreenToggleProps & VrToggleConrolProps;

export default function Image360Controls({ isVrShown, onFullscreenToggle, onVrToggle }: Props): JSX.Element {
    return (
        <ControlsBar>
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            <VrToggleControl isVrShown={isVrShown} onVrToggle={onVrToggle} />
        </ControlsBar>
    );
}
