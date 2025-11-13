import React from 'react';
import classNames from 'classnames';
import IconThumbnailsToggle24 from '../icons/IconThumbnailsToggle24';
import IconNavMedium24 from '../icons/IconNavMedium24';
import IconNavMediumFilled24 from '../icons/IconNavMediumFilled24';
import './ThumbnailsToggle.scss';

export type Props = {
    isThumbnailsOpen?: boolean;
    modernizationEnabled?: boolean;
    onThumbnailsToggle?: () => void;
};

export default function ThumbnailsToggle({
    onThumbnailsToggle,
    isThumbnailsOpen,
    modernizationEnabled = false,
}: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    const renderModernizedIcon = isThumbnailsOpen ? <IconNavMediumFilled24 /> : <IconNavMedium24 />;

    return (
        <button
            aria-expanded={isThumbnailsOpen}
            className={classNames('bp-ThumbnailsToggle', {
                'bp-ThumbnailsToggle--modernized': modernizationEnabled,
            })}
            onClick={onThumbnailsToggle}
            title={__('toggle_thumbnails')}
            type="button"
        >
            {modernizationEnabled ? renderModernizedIcon : <IconThumbnailsToggle24 />}
        </button>
    );
}
