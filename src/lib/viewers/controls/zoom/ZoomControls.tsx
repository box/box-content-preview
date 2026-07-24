import React from 'react';
import isFinite from 'lodash/isFinite';
import { IconButton } from '@box/blueprint-web';
import Minus from '@box/blueprint-web-assets/icons/Fill/Minus';
import Plus from '@box/blueprint-web-assets/icons/Fill/Plus';
import './ZoomControls.scss';

export type Props = {
    maxScale?: number;
    minScale?: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    scale?: number;
};

export const MAX_SCALE = 100;
export const MIN_SCALE = 0.1;

export default function ZoomControls({
    maxScale = MAX_SCALE,
    minScale = MIN_SCALE,
    onZoomIn,
    onZoomOut,
    scale = 1,
}: Props): JSX.Element {
    const currentScale = Math.round((scale + Number.EPSILON) * 100) / 100;
    const maxScaleValue = isFinite(maxScale) ? Math.min(maxScale, MAX_SCALE) : MAX_SCALE;
    const minScaleValue = isFinite(minScale) ? Math.max(minScale, MIN_SCALE) : MIN_SCALE;

    return (
        <div className="bp-ZoomControls">
            <IconButton
                aria-label={__('zoom_out')}
                className="bp-ZoomControls-button"
                data-resin-target="zoomOut"
                data-testid="bp-ZoomControls-out"
                disabled={currentScale <= minScaleValue}
                icon={Minus}
                onClick={onZoomOut}
            />
            <div
                className="bp-ZoomControls-current"
                data-testid="bp-ZoomControls-current"
                title={__('zoom_current_scale')}
            >{`${Math.round(currentScale * 100)}%`}</div>
            <IconButton
                aria-label={__('zoom_in')}
                className="bp-ZoomControls-button"
                data-resin-target="zoomIn"
                data-testid="bp-ZoomControls-in"
                disabled={currentScale >= maxScaleValue}
                icon={Plus}
                onClick={onZoomIn}
            />
        </div>
    );
}
