import React from 'react';
import noop from 'lodash/noop';
import IconPlay24 from '../icons/IconPlay24';
import IconPause24 from '../icons/IconPause24';
import IconForward24 from '../icons/IconArrowCurveForward24';
import IconBack24 from '../icons/IconArrowCurveBack24';
import MediaToggle from './MediaToggle';
import { MEDIA_PLAYBACK_SKIP_DURATION } from '../../../constants';
import './PlayPauseToggle.scss';

export type Props = {
    isPlaying?: boolean;
    onPlayPause: (isPlaying: boolean) => void;
    movePlayback?: (forward: boolean, duration: number) => void;
};

export default function PlayPauseToggle({ isPlaying, onPlayPause = noop, movePlayback = noop }: Props): JSX.Element {
    const PlayPauseIcon = isPlaying ? IconPause24 : IconPlay24;
    const title = isPlaying ? __('media_pause') : __('media_play');
    const skipForwardTitle = __('media_skip_forward');
    const skipBackwardTitle = __('media_skip_backward');

    const moveForward = (): void => {
        movePlayback(true, MEDIA_PLAYBACK_SKIP_DURATION);
    };

    const moveBackward = (): void => {
        movePlayback(false, MEDIA_PLAYBACK_SKIP_DURATION);
    };

    return (
        <>
            <MediaToggle className="bp-PlayPauseToggle" onClick={moveForward} title={skipForwardTitle}>
                <IconForward24 />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={() => onPlayPause(!isPlaying)} title={title}>
                <PlayPauseIcon />
            </MediaToggle>

            <MediaToggle className="bp-PlayPauseToggle" onClick={moveBackward} title={skipBackwardTitle}>
                <IconBack24 />
            </MediaToggle>
        </>
    );
}
