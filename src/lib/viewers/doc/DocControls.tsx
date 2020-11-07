import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar from '../controls/controls-bar';
import FindBarToggle, { Props as FindBarToggleProps } from '../controls/findbar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import ThumbnailsToggle, { Props as ThumbnailsToggleProps } from '../controls/sidebar';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = AnnotationsControlsProps &
    FindBarToggleProps &
    FullscreenToggleProps &
    ThumbnailsToggleProps &
    ZoomControlsProps;

export default function DocControls({
    annotationMode,
    hasHighlight,
    hasRegion,
    maxScale,
    minScale,
    onAnnotationModeClick,
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
            {/* TODO: PageControls */}
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            <AnnotationsControls
                annotationMode={annotationMode}
                hasHighlight={hasHighlight}
                hasRegion={hasRegion}
                onAnnotationModeClick={onAnnotationModeClick}
            />
        </ControlsBar>
    );
}
