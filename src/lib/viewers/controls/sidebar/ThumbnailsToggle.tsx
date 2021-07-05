import React from 'react';
import IconThumbnailsToggle24 from '../icons/IconThumbnailsToggle24';
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
            <IconThumbnailsToggle24 />
        </button>
    );
}
