import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FindBarToggle, { Props as FindBarToggleProps } from '../controls/findbar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import ThumbnailsToggle, { Props as ThumbnailsToggleProps } from '../controls/sidebar';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FindBarToggleProps & FullscreenToggleProps & ThumbnailsToggleProps & ZoomControlsProps;

export default function DocControls({
    maxScale,
    minScale,
    onFindBarToggle,
    onFullscreenToggle,
    onThumbnailsToggle,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ThumbnailsToggle onThumbnailsToggle={onThumbnailsToggle} />
            <FindBarToggle onFindBarToggle={onFindBarToggle} />
            <ZoomControls
                maxScale={maxScale}
                minScale={minScale}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                scale={scale}
            />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
