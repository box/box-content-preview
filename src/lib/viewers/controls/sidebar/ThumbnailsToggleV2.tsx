import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import NavFilled from '@box/blueprint-web-assets/icons/MediumFilled/Nav';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import { Props } from './ThumbnailsToggle';
import './ThumbnailsToggleV2.scss';

export default function ThumbnailsToggleV2({ isThumbnailsOpen, onThumbnailsToggle }: Props): JSX.Element | null {
    if (!onThumbnailsToggle) {
        return null;
    }

    const label = isThumbnailsOpen ? __('thumbnails_toggle_hide') : __('thumbnails_toggle_show');

    return (
        <div className="bp-ThumbnailsToggleV2">
            <Toolbar.ToggleGroup
                onValueChange={(): void => onThumbnailsToggle()}
                type="multiple"
                value={isThumbnailsOpen ? ['thumbnails'] : []}
            >
                <ToggleTooltipV2 content={label}>
                    <Toolbar.ToggleItem
                        aria-expanded={isThumbnailsOpen}
                        aria-label={label}
                        data-resin-target="thumbnails"
                        icon={isThumbnailsOpen ? NavFilled : Nav}
                        value="thumbnails"
                    />
                </ToggleTooltipV2>
            </Toolbar.ToggleGroup>
        </div>
    );
}
