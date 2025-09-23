import React from 'react';
import noop from 'lodash/noop';
import IconPause24 from '../icons/IconPause24';
import IconPlayNew24 from '../icons/IconPlayNew24';
import IconPauseNew24 from '../icons/IconPauseNew24';
import IconForward24 from '../icons/IconArrowCurveForward24';
import IconBack24 from '../icons/IconArrowCurveBack24';
import MediaToggle from './MediaToggle';
import './PlayPauseToggle.scss';

export type Props = {
    isPlaying?: boolean;
    onPlayPause: (isPlaying: boolean) => void;
    movePlayback?: (forward: boolean, duration: number) => void;
};

export default function PlayPauseToggle({ isPlaying, onPlayPause = noop, movePlayback = noop }: Props): JSX.Element {
    const Icon = isPlaying ? IconPauseNew24 : IconPlayNew24;
    const title = isPlaying ? __('media_pause') : __('media_play');
    const skipForwardTitle = __('media_skip_forward');
    const skipBackwardTitle = __('media_skip_backward');

    const moveForward = (): void => {
        movePlayback(true, 5);
    };

    const moveBackward = (): void => {
        movePlayback(false, 5);
    };

    return (
        <>
            <MediaToggle className="bp-PlayPauseToggle" onClick={moveForward} title={skipForwardTitle}>
                <IconForward24 />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={(): void => onPlayPause(!isPlaying)} title={title}>
                <Icon />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={moveBackward} title={skipBackwardTitle}>
                <IconBack24 />
            </MediaToggle>
        </>
    );
}
