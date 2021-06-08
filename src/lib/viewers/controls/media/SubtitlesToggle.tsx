import React from 'react';
import noop from 'lodash/noop';
import MediaToggle from './MediaToggle';
import './SubtitlesToggle.scss';

export type Props = {
    isShowingSubtitles?: boolean;
    onSubtitlesToggle: (isShowingSubtitles: boolean) => void;
};

export default function SubtitlesToggle({ isShowingSubtitles, onSubtitlesToggle = noop }: Props): JSX.Element {
    return (
        <MediaToggle
            aria-pressed={isShowingSubtitles}
            className="bp-SubtitlesToggle"
            data-testid="bp-media-controls-cc-button"
            onClick={(): void => onSubtitlesToggle(!isShowingSubtitles)}
            title={__('media_subtitles_cc')}
        >
            <div className="bp-SubtitlesToggle-text">CC</div>
        </MediaToggle>
    );
}
