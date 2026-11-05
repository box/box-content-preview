import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import SidebarChevronLeft from '@box/blueprint-web-assets/icons/Medium/SidebarChevronLeft';
import SidebarChevronRight from '@box/blueprint-web-assets/icons/Medium/SidebarChevronRight';
import { Props } from './ThumbnailsToggle';
import './ThumbnailsToggleV2.scss';

export default function ThumbnailsToggleV2({ isThumbnailsOpen, onThumbnailsToggle }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    const label = isThumbnailsOpen ? __('thumbnails_toggle_hide') : __('thumbnails_toggle_show');
    // The sidebar is on the left, so the chevron points left while it is open and right while it is closed.
    const icon = isThumbnailsOpen ? SidebarChevronLeft : SidebarChevronRight;

    return (
        <div className="bp-ThumbnailsToggleV2">
            <Tooltip content={label}>
                <Toolbar.Button
                    aria-expanded={isThumbnailsOpen}
                    aria-label={label}
                    data-resin-target="thumbnails"
                    onClick={(): void => onThumbnailsToggle()}
                >
                    <Toolbar.Icon icon={icon} />
                </Toolbar.Button>
            </Tooltip>
        </div>
    );
}
