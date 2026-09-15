import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import NavFilled from '@box/blueprint-web-assets/icons/MediumFilled/Nav';
import { Props } from './ThumbnailsToggle';

export default function ThumbnailsToggleV2({ isThumbnailsOpen, onThumbnailsToggle }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    return (
        <Toolbar.ToggleGroup
            onValueChange={onThumbnailsToggle}
            type="multiple"
            value={isThumbnailsOpen ? ['thumbnails'] : []}
        >
            <Tooltip content={__('toggle_thumbnails')}>
                <Toolbar.ToggleItem
                    aria-expanded={isThumbnailsOpen}
                    aria-label={__('toggle_thumbnails')}
                    data-resin-target="thumbnails"
                    icon={isThumbnailsOpen ? NavFilled : Nav}
                    value="thumbnails"
                />
            </Tooltip>
        </Toolbar.ToggleGroup>
    );
}
