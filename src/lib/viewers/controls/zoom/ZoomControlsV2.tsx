import React from 'react';
import isFinite from 'lodash/isFinite';
import { Text, Toolbar, Tooltip } from '@box/blueprint-web';
import Minus from '@box/blueprint-web-assets/icons/Medium/Minus';
import Plus from '@box/blueprint-web-assets/icons/Medium/Plus';
import ControlsPillV2 from '../controls-bar/ControlsPillV2';
import { MAX_SCALE, MIN_SCALE, Props } from './ZoomControls';

export type ZoomState = {
    canZoomIn: boolean;
    canZoomOut: boolean;
    currentScale: number;
};

export function getZoomState({ maxScale = MAX_SCALE, minScale = MIN_SCALE, scale = 1 }: Partial<Props>): ZoomState {
    const currentScale = Math.round((scale + Number.EPSILON) * 100) / 100;
    const maxScaleValue = isFinite(maxScale) ? Math.min(maxScale, MAX_SCALE) : MAX_SCALE;
    const minScaleValue = isFinite(minScale) ? Math.max(minScale, MIN_SCALE) : MIN_SCALE;

    return {
        canZoomIn: currentScale < maxScaleValue,
        canZoomOut: currentScale > minScaleValue,
        currentScale,
    };
}

export default function ZoomControlsV2({
    maxScale,
    minScale,
    onZoomIn,
    onZoomOut,
    resinTargetZoomIn = 'zoomIn',
    resinTargetZoomOut = 'zoomOut',
    scale,
}: Props): JSX.Element {
    const { canZoomIn, canZoomOut, currentScale } = getZoomState({ maxScale, minScale, scale });

    return (
        <ControlsPillV2>
            <Tooltip content={__('zoom_out')}>
                <Toolbar.Button
                    className="bp-ControlsPillV2-button"
                    aria-label={__('zoom_out')}
                    data-resin-target={resinTargetZoomOut}
                    data-testid="bp-ZoomControls-out"
                    disabled={!canZoomOut}
                    onClick={onZoomOut}
                >
                    <Toolbar.Icon icon={Minus} />
                </Toolbar.Button>
            </Tooltip>
            <Text
                as="span"
                className="bp-ControlsPillV2-text bp-ZoomControlsV2-current"
                data-testid="bp-ZoomControls-current"
                title={__('zoom_current_scale')}
                variant="bodyDefault"
            >
                {`${Math.round(currentScale * 100)}%`}
            </Text>
            <Tooltip content={__('zoom_in')}>
                <Toolbar.Button
                    className="bp-ControlsPillV2-button"
                    aria-label={__('zoom_in')}
                    data-resin-target={resinTargetZoomIn}
                    data-testid="bp-ZoomControls-in"
                    disabled={!canZoomIn}
                    onClick={onZoomIn}
                >
                    <Toolbar.Icon icon={Plus} />
                </Toolbar.Button>
            </Tooltip>
        </ControlsPillV2>
    );
}
