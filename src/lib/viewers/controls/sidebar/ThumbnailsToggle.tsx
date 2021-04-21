import React from 'react';
import IconThumbnailsToggle24 from '../icons/IconThumbnailsToggle24';
import './ThumbnailsToggle.scss';

export type Props = {
    onThumbnailsToggle?: () => void;
};

export default function ThumbnailsToggle({ onThumbnailsToggle }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    return (
        <button
            className="bp-ThumbnailsToggle"
            onClick={onThumbnailsToggle}
            title={__('toggle_thumbnails')}
            type="button"
        >
            <IconThumbnailsToggle24 />
        </button>
    );
}
