import React from 'react';
import { ControlsBarV2 } from '../controls/controls-bar';
import { FullscreenToggleV2 } from '../controls/fullscreen';
import { Props } from './MarkdownControls';

export default function MarkdownControlsV2({ onFullscreenToggle }: Props): JSX.Element {
    return (
        <ControlsBarV2>
            <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
        </ControlsBarV2>
    );
}
