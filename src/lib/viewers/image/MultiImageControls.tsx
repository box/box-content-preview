import React from 'react';
import ControlsBar, { ControlsBarGroup } from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import PageControls, { Props as PageControlsProps } from '../controls/page';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & PageControlsProps & ZoomControlsProps;

export default function MultiImageControls({
    onFullscreenToggle,
    onPageChange,
    onPageSubmit,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ControlsBarGroup isDistinct>
                <PageControls
                    onPageChange={onPageChange}
                    onPageSubmit={onPageSubmit}
                    pageCount={pageCount}
                    pageNumber={pageNumber}
                />
            </ControlsBarGroup>
            <ControlsBarGroup isDistinct>
                <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            </ControlsBarGroup>
            <ControlsBarGroup>
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            </ControlsBarGroup>
        </ControlsBar>
    );
}
