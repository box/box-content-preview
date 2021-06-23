import React from 'react';
import noop from 'lodash/noop';
import MediaToggle from './MediaToggle';
import { Subtitle } from './MediaSettingsMenuSubtitles';
import './SubtitlesToggle.scss';

export type Props = {
    isShowingSubtitles?: boolean;
    onSubtitlesToggle?: (isShowingSubtitles: boolean) => void;
    subtitles?: Array<Subtitle>;
};

export default function SubtitlesToggle({
    isShowingSubtitles,
    onSubtitlesToggle = noop,
    subtitles = [],
}: Props): JSX.Element | null {
    if (!subtitles.length) {
        return null;
    }

    return (
        <MediaToggle
            aria-pressed={isShowingSubtitles}
            className="bp-SubtitlesToggle"
            data-testid="bp-media-cc-button"
            onClick={(): void => onSubtitlesToggle(!isShowingSubtitles)}
            title={__('media_subtitles_cc')}
        >
            <div className="bp-SubtitlesToggle-text">CC</div>
        </MediaToggle>
    );
}
