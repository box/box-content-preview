import React from 'react';
import AnimationClipsToggle from './AnimationClipsToggle';
import Settings, { Menu } from '../settings';
import './AnimationClipsControl.scss';

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

export const padLeft = (x: number, width: number): string => {
    return x.length >= width ? x : new Array(width - x.length + 1).join('0') + x;
};

export const formatDurationStr = (duration: number): string => {
    let secondsLeft = Math.floor(duration);
    const hours = Math.floor(secondsLeft / 3600);
    const hoursStr = padLeft(hours.toString(), 2);

    secondsLeft -= hours * 3600;
    const minutes = Math.floor(secondsLeft / 60);
    const minutesStr = padLeft(minutes.toString(), 2);

    secondsLeft -= minutes * 60;
    const secondsStr = padLeft(secondsLeft.toString(), 2);

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
};

export default function AnimationClipsControl({
    animationClips,
    currentAnimationClipId,
    onAnimationClipSelect,
}: Props): JSX.Element {
    return (
        <Settings className="bp-AnimationClipsControl" disableTransitions={false} icon={AnimationClipsToggle}>
            <Settings.Menu name={Menu.MAIN}>
                {animationClips.map(({ duration, id, name }) => {
                    const isSelected = id === currentAnimationClipId;
                    return (
                        <Settings.RadioItem
                            key={id}
                            className="bp-AnimationClipsControl-radioItem"
                            isSelected={isSelected}
                            label={`${formatDurationStr(duration)} ${name}`}
                            onChange={onAnimationClipSelect}
                            value={id}
                        />
                    );
                })}
            </Settings.Menu>
        </Settings>
    );
}
