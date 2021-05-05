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

export function formatDuration(time: number): string {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor((time % 3600) % 60);
    const hour = hours < 10 ? `0${hours.toString()}` : hours.toString();
    const min = minutes < 10 ? `0${minutes.toString()}` : minutes.toString();
    const sec = seconds < 10 ? `0${seconds.toString()}` : seconds.toString();

    return `${hour}:${min}:${sec}`;
}

export default function AnimationClipsControl({
    animationClips,
    currentAnimationClipId,
    onAnimationClipSelect,
}: Props): JSX.Element {
    return (
        <Settings className="bp-AnimationClipsControl" toggle={AnimationClipsToggle}>
            <Settings.Menu name={Menu.MAIN}>
                {animationClips.map(({ duration, id, name }) => {
                    return (
                        <Settings.RadioItem
                            key={id}
                            className="bp-AnimationClipsControl-radioItem"
                            isSelected={id === currentAnimationClipId}
                            label={`${formatDuration(duration)} ${name}`}
                            onChange={onAnimationClipSelect}
                            value={id}
                        />
                    );
                })}
            </Settings.Menu>
        </Settings>
    );
}
