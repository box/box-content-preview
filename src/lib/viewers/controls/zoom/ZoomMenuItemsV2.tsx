import React from 'react';
import { DropdownMenu, Text } from '@box/blueprint-web';
import Minus from '@box/blueprint-web-assets/icons/Medium/Minus';
import Plus from '@box/blueprint-web-assets/icons/Medium/Plus';
import ControlsMenuItemV2 from '../controls-bar/ControlsMenuItemV2';
import { replacePlaceholders } from '../../../util';
import { getZoomState } from './ZoomControlsV2';
import { Props } from './ZoomControls';
import './ZoomMenuItemsV2.scss';

// The overflow menu form of the zoom controls: the current scale, then zoom in and zoom out
export default function ZoomMenuItemsV2({
    maxScale,
    minScale,
    onZoomIn,
    onZoomOut,
    resinTargetZoomIn = 'zoomIn',
    resinTargetZoomOut = 'zoomOut',
    scale,
}: Props): JSX.Element {
    const { canZoomIn, canZoomOut, currentScale } = getZoomState({ maxScale, minScale, scale });
    const scaleLabel = replacePlaceholders(__('controls_zoom_scale'), [`${Math.round(currentScale * 100)}%`]);

    return (
        <>
            <Text
                as="div"
                className="bp-ZoomMenuItemsV2-scale"
                color="textOnLightSecondary"
                data-testid="bp-ZoomMenuItems-scale"
                variant="caption"
            >
                {scaleLabel}
            </Text>
            <ControlsMenuItemV2
                data-resin-target={resinTargetZoomIn}
                data-testid="bp-ZoomControls-in-menuItem"
                disabled={!canZoomIn}
                icon={Plus}
                keepOpen
                label={__('zoom_in')}
                onSelect={(): void => onZoomIn()}
            />
            <ControlsMenuItemV2
                data-resin-target={resinTargetZoomOut}
                data-testid="bp-ZoomControls-out-menuItem"
                disabled={!canZoomOut}
                icon={Minus}
                keepOpen
                label={__('zoom_out')}
                onSelect={(): void => onZoomOut()}
            />
            <DropdownMenu.Separator />
        </>
    );
}
