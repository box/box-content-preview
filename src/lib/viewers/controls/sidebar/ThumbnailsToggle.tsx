import React from 'react';
import IconThumbnailsToggle18 from '../icons/IconThumbnailsToggle18';
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
            <IconThumbnailsToggle18 />
        </button>
    );
}
