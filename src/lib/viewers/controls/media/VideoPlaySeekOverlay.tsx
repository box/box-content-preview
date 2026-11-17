import React from 'react';
import { IconButton, Tooltip } from '@box/blueprint-web';
import PlayOverlayIcon from './PlayOverlayIcon';
import SkipButton from './SkipButton';
import { stopActivationKeyPropagation } from './utils';
import './VideoPlaySeekOverlay.scss';

export type Props = {
    movePlayback: (isForward: boolean, duration: number) => void;
    onPlay: () => void;
};

export default function VideoPlaySeekOverlay({ movePlayback, onPlay }: Props): JSX.Element {
    return (
        <>
            <SkipButton direction="backward" isBlueprintEnabled movePlayback={movePlayback} />
            <Tooltip content={__('media_play')}>
                <IconButton
                    aria-label={__('media_play')}
                    className="bp-VideoPlaySeekOverlay-play"
                    data-resin-target="playOverlay"
                    data-target-id="VideoPlaySeekOverlay-play"
                    icon={PlayOverlayIcon}
                    onClick={onPlay}
                    onKeyDown={stopActivationKeyPropagation}
                    size="large"
                    variant="on-dark"
                />
            </Tooltip>
            <SkipButton direction="forward" isBlueprintEnabled movePlayback={movePlayback} />
        </>
    );
}
