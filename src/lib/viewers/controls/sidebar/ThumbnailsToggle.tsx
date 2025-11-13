import React from 'react';
import IconNavMedium24 from '../icons/IconNavMedium24';
import IconNavMediumFilled24 from '../icons/IconNavMediumFilled24';
import './ThumbnailsToggle.scss';

export type Props = {
    isThumbnailsOpen?: boolean;
    onThumbnailsToggle?: () => void;
};

export default function ThumbnailsToggle({ onThumbnailsToggle, isThumbnailsOpen }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    return (
        <button
            aria-expanded={isThumbnailsOpen}
            className="bp-ThumbnailsToggle"
            onClick={onThumbnailsToggle}
            title={__('toggle_thumbnails')}
            type="button"
        >
            {isThumbnailsOpen ? <IconNavMediumFilled24 /> : <IconNavMedium24 />}
        </button>
    );
}
