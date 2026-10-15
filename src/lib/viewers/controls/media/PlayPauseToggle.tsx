import React from 'react';
import noop from 'lodash/noop';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import './PlayPauseToggle.scss';

export type Props = {
    isPlaying?: boolean;
    onPlayPause: (isPlaying: boolean) => void;
    movePlayback?: (forward: boolean, duration: number) => void;
    hasSkipButtons?: boolean;
    isBlueprintEnabled?: boolean;
};

export default function PlayPauseToggle({
    isPlaying,
    onPlayPause = noop,
    movePlayback = noop,
    hasSkipButtons = true,
    isBlueprintEnabled = false,
}: Props): JSX.Element {
    return (
        <>
            {hasSkipButtons && (
                <SkipButton
                    className="bp-PlayPauseToggle"
                    direction="backward"
                    movePlayback={movePlayback}
                    isBlueprintEnabled={isBlueprintEnabled}
                />
            )}

            <PlayPauseButton
                className="bp-PlayPauseToggle"
                isPlaying={isPlaying}
                onPlayPause={onPlayPause}
                isBlueprintEnabled={isBlueprintEnabled}
            />

            {hasSkipButtons && (
                <SkipButton
                    className="bp-PlayPauseToggle"
                    direction="forward"
                    movePlayback={movePlayback}
                    isBlueprintEnabled={isBlueprintEnabled}
                />
            )}
        </>
    );
}
