import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import PageControls, { Props as PageControlsProps } from '../controls/page';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & PageControlsProps & ZoomControlsProps;

export default function MultiImageControls({
    onFullscreenToggle,
    onPageChange,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
    viewer,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            <PageControls onPageChange={onPageChange} pageCount={pageCount} pageNumber={pageNumber} viewer={viewer} />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
