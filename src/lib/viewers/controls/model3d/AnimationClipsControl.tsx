import React from 'react';
import AnimationClipsToggle from './AnimationClipsToggle';

type AnimationClip = {
    duration: number;
    id: string;
    name: string;
};

export type Props = {
    animationClips: Array<AnimationClip>;
    currentAnimationClipId?: string;
    onAnimationClipSelect: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AnimationClipsControl(props: Props): JSX.Element {
    return (
        <>
            <AnimationClipsToggle />
            {/* TODO: AnimationClipsFlyout */}
        </>
    );
}
