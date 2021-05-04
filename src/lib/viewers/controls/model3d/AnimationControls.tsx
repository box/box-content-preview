import React from 'react';
import AnimationClipsControl, { Props as AnimationClipsControlProps } from './AnimationClipsControl';
import PlayPauseToggle, { Props as PlayPauseToggleProps } from '../media/PlayPauseToggle';
import './AnimationControls.scss';

export type Props = AnimationClipsControlProps & PlayPauseToggleProps;

export default function AnimationControls({
    animationClips,
    currentAnimationClipId,
    isPlaying,
    onAnimationClipSelect,
    onPlayPause,
}: Props): JSX.Element | null {
    if (!animationClips.length) {
        return null;
    }

    return (
        <div className="bp-AnimationControls">
            <PlayPauseToggle isPlaying={isPlaying} onPlayPause={onPlayPause} />
            <AnimationClipsControl
                animationClips={animationClips}
                currentAnimationClipId={currentAnimationClipId}
                onAnimationClipSelect={onAnimationClipSelect}
            />
        </div>
    );
}
