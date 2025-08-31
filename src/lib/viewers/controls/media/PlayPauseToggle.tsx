import React from 'react';
import noop from 'lodash/noop';
import IconPause24 from '../icons/IconPause24';
import IconPlay24 from '../icons/IconPlay24';
import IconForward24 from '../icons/IconArrowCurveForward24';
import IconBack24 from '../icons/IconArrowCurveBack24';
import MediaToggle from './MediaToggle';
import './PlayPauseToggle.scss';

export type Props = {
    isPlaying?: boolean;
    onPlayPause: (isPlaying: boolean) => void;
    moveVideoPlayback: (forward: boolean, duration: number) => void;
};

export default function PlayPauseToggle({ isPlaying, onPlayPause = noop, moveVideoPlayback }: Props): JSX.Element {
    const Icon = isPlaying ? IconPause24 : IconPlay24;
    const title = isPlaying ? __('media_pause') : __('media_play');

    const moveForward = (): void => {
        moveVideoPlayback(true, 5);
    };

    const moveBackward = (): void => {
        moveVideoPlayback(false, 5);
    };

    return (
        <>
            <MediaToggle className="bp-PlayPauseToggle" onClick={moveForward} title={title}>
                <IconForward24 />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={(): void => onPlayPause(!isPlaying)} title={title}>
                <Icon />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={moveBackward} title={title}>
                <IconBack24 />
            </MediaToggle>
        </>
    );
}
