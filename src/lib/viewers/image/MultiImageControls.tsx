import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import PageControls, { Props as PageControlsProps } from '../controls/page';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & PageControlsProps & ZoomControlsProps;

export default function MultiImageControls({
    getViewer,
    onFullscreenToggle,
    onPageChange,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            <PageControls
                getViewer={getViewer}
                onPageChange={onPageChange}
                pageCount={pageCount}
                pageNumber={pageNumber}
            />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
