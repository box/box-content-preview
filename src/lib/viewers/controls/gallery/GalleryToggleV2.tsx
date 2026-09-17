import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import GridView from '@box/blueprint-web-assets/icons/Medium/GridView';
import ToggleTooltipV2 from '../tooltip/ToggleTooltipV2';
import { Props } from './GalleryToggle';

export default function GalleryToggleV2({ isGalleryOpen, onGalleryToggle }: Props): JSX.Element | null {
    if (!onGalleryToggle) {
        return null;
    }

    return (
        <Toolbar.ToggleGroup onValueChange={onGalleryToggle} type="multiple" value={isGalleryOpen ? ['gallery'] : []}>
            <ToggleTooltipV2 content={__('gallery_view')}>
                <Toolbar.ToggleItem
                    aria-label={__('gallery_view')}
                    data-resin-target="galleryView"
                    icon={GridView}
                    value="gallery"
                />
            </ToggleTooltipV2>
        </Toolbar.ToggleGroup>
    );
}
