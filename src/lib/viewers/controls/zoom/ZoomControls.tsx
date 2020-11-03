import React from 'react';
import isFinite from 'lodash/isFinite';
import IconZoomIn10 from '../icons/IconZoomIn10';
import IconZoomOut10 from '../icons/IconZoomOut10';
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
    const currentZoom = Math.round(scale * 100);
    const maxScaleValue = isFinite(maxScale) ? Math.min(maxScale, MAX_SCALE) : MAX_SCALE;
    const minScaleValue = isFinite(minScale) ? Math.max(minScale, MIN_SCALE) : MIN_SCALE;

    return (
        <div className="bp-ZoomControls">
            <button
                className="bp-ZoomControls-button"
                data-testid="bp-ZoomControls-out"
                disabled={scale <= minScaleValue}
                onClick={onZoomOut}
                title={__('zoom_out')}
                type="button"
            >
                <IconZoomOut10 />
            </button>
            <div
                className="bp-ZoomControls-current"
                data-testid="current-zoom"
                title={__('zoom_current_scale')}
            >{`${currentZoom}%`}</div>
            <button
                className="bp-ZoomControls-button"
                data-testid="bp-ZoomControls-in"
                disabled={scale >= maxScaleValue}
                onClick={onZoomIn}
                title={__('zoom_in')}
                type="button"
            >
                <IconZoomIn10 />
            </button>
        </div>
    );
}
