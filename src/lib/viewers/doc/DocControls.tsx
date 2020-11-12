import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar from '../controls/controls-bar';
import FindBarToggle, { Props as FindBarToggleProps } from '../controls/findbar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import PageControls, { Props as PageControlsProps } from '../controls/page';
import ThumbnailsToggle, { Props as ThumbnailsToggleProps } from '../controls/sidebar';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = AnnotationsControlsProps &
    FindBarToggleProps &
    FullscreenToggleProps &
    PageControlsProps &
    ThumbnailsToggleProps &
    ZoomControlsProps;

export default function DocControls({
    annotationMode,
    getViewer,
    hasHighlight,
    hasRegion,
    maxScale,
    minScale,
    onAnnotationModeClick,
    onAnnotationModeEscape,
    onFindBarToggle,
    onFullscreenToggle,
    onPageChange,
    onThumbnailsToggle,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
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
            <PageControls
                getViewer={getViewer}
                onPageChange={onPageChange}
                pageCount={pageCount}
                pageNumber={pageNumber}
            />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            <AnnotationsControls
                annotationMode={annotationMode}
                hasHighlight={hasHighlight}
                hasRegion={hasRegion}
                onAnnotationModeClick={onAnnotationModeClick}
                onAnnotationModeEscape={onAnnotationModeEscape}
            />
        </ControlsBar>
    );
}
