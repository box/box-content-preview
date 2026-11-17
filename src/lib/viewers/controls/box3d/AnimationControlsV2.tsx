import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import Pause from '@box/blueprint-web-assets/icons/MediumFilled/Pause';
import Play from '@box/blueprint-web-assets/icons/MediumFilled/Play';
import AnimationClipsControlV2 from './AnimationClipsControlV2';
import { Props } from './AnimationControls';

export default function AnimationControlsV2({
    animationClips,
    currentAnimationClipId,
    isPlaying,
    onAnimationClipSelect,
    onPlayPause,
}: Props): JSX.Element | null {
    if (!animationClips.length) {
        return null;
    }

    const label = isPlaying ? __('media_pause') : __('media_play');

    return (
        <>
            <Tooltip content={label}>
                <Toolbar.Button
                    aria-label={label}
                    data-resin-target="playPause"
                    onClick={(): void => onPlayPause(!isPlaying)}
                >
                    <Toolbar.Icon icon={isPlaying ? Pause : Play} />
                </Toolbar.Button>
            </Tooltip>
            <AnimationClipsControlV2
                animationClips={animationClips}
                currentAnimationClipId={currentAnimationClipId}
                onAnimationClipSelect={onAnimationClipSelect}
            />
        </>
    );
}
