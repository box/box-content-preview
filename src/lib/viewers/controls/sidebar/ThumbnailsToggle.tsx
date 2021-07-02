import React from 'react';
import IconThumbnailsToggle24 from '../icons/IconThumbnailsToggle24';
import './ThumbnailsToggle.scss';

export type Props = {
    onThumbnailsToggle?: () => void;
    thumbnailsSidebarIsOpen?: boolean;
};

export default function ThumbnailsToggle({ onThumbnailsToggle, thumbnailsSidebarIsOpen }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    return (
        <button
            aria-expanded={thumbnailsSidebarIsOpen}
            className="bp-ThumbnailsToggle"
            onClick={onThumbnailsToggle}
            title={__('toggle_thumbnails')}
            type="button"
        >
            <IconThumbnailsToggle24 />
        </button>
    );
}
