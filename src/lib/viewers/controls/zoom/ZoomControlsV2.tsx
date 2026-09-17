import React from 'react';
import isFinite from 'lodash/isFinite';
import { Text, Toolbar, Tooltip } from '@box/blueprint-web';
import Minus from '@box/blueprint-web-assets/icons/Medium/Minus';
import Plus from '@box/blueprint-web-assets/icons/Medium/Plus';
import { MAX_SCALE, MIN_SCALE, Props } from './ZoomControls';

export default function ZoomControlsV2({
    maxScale = MAX_SCALE,
    minScale = MIN_SCALE,
    onZoomIn,
    onZoomOut,
    resinTargetZoomIn = 'zoomIn',
    resinTargetZoomOut = 'zoomOut',
    scale = 1,
}: Props): JSX.Element {
    const currentScale = Math.round((scale + Number.EPSILON) * 100) / 100;
    const maxScaleValue = isFinite(maxScale) ? Math.min(maxScale, MAX_SCALE) : MAX_SCALE;
    const minScaleValue = isFinite(minScale) ? Math.max(minScale, MIN_SCALE) : MIN_SCALE;

    return (
        <>
            <Tooltip content={__('zoom_out')}>
                <Toolbar.Button
                    aria-label={__('zoom_out')}
                    data-resin-target={resinTargetZoomOut}
                    data-testid="bp-ZoomControls-out"
                    disabled={currentScale <= minScaleValue}
                    onClick={onZoomOut}
                >
                    <Toolbar.Icon icon={Minus} />
                </Toolbar.Button>
            </Tooltip>
            <Text
                as="span"
                color="textOnLightSecondary"
                data-testid="bp-ZoomControls-current"
                variant="bodyDefaultSemibold"
            >
                {`${Math.round(currentScale * 100)}%`}
            </Text>
            <Tooltip content={__('zoom_in')}>
                <Toolbar.Button
                    aria-label={__('zoom_in')}
                    data-resin-target={resinTargetZoomIn}
                    data-testid="bp-ZoomControls-in"
                    disabled={currentScale >= maxScaleValue}
                    onClick={onZoomIn}
                >
                    <Toolbar.Icon icon={Plus} />
                </Toolbar.Button>
            </Tooltip>
        </>
    );
}
