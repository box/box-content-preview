import React from 'react';
import AnimationControls, { Props as AnimationControlsProps } from '../../controls/model3d/AnimationControls';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import ResetControl, { Props as ResetControlProps } from '../../controls/model3d/ResetControl';

export type Props = AnimationControlsProps & FullscreenToggleProps & ResetControlProps;

export default function Model3DControls({
    animationClips,
    currentAnimationClipId,
    isPlaying,
    onAnimationClipSelect,
    onFullscreenToggle,
    onPlayPause,
    onReset,
}: Props): JSX.Element {
    const handleReset = (): void => {
        // TODO: will need to reset the state to defaults
        onReset();
    };

    return (
        <ControlsBar>
            <ResetControl onReset={handleReset} />
            <AnimationControls
                animationClips={animationClips}
                currentAnimationClipId={currentAnimationClipId}
                isPlaying={isPlaying}
                onAnimationClipSelect={onAnimationClipSelect}
                onPlayPause={onPlayPause}
            />
            {/* TODO: VR button */}
            {/* TODO: Settings button */}
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
