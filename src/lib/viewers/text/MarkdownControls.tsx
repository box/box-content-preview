import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';

export type Props = FullscreenToggleProps;

export default function MarkdownControls({ onFullscreenToggle }: Props): JSX.Element {
    return (
        <ControlsBar>
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
