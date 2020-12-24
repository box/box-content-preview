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
    const currentScale = Math.round((scale + Number.EPSILON) * 100) / 100;
    const maxScaleValue = isFinite(maxScale) ? Math.min(maxScale, MAX_SCALE) : MAX_SCALE;
    const minScaleValue = isFinite(minScale) ? Math.max(minScale, MIN_SCALE) : MIN_SCALE;

    return (
        <div className="bp-ZoomControls">
            <button
                className="bp-ZoomControls-button"
                data-testid="bp-ZoomControls-out"
                disabled={currentScale <= minScaleValue}
                onClick={onZoomOut}
                title={__('zoom_out')}
                type="button"
            >
                <IconZoomOut10 />
            </button>
            <div
                className="bp-ZoomControls-current"
                data-testid="bp-ZoomControls-current"
                title={__('zoom_current_scale')}
            >{`${Math.round(currentScale * 100)}%`}</div>
            <button
                className="bp-ZoomControls-button"
                data-testid="bp-ZoomControls-in"
                disabled={currentScale >= maxScaleValue}
                onClick={onZoomIn}
                title={__('zoom_in')}
                type="button"
            >
                <IconZoomIn10 />
            </button>
        </div>
    );
}
