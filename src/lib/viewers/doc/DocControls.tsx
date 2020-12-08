import React from 'react';
import AnnotationsControls, { AnnotationMode, Props as AnnotationsControlsProps } from '../controls/annotations';
import ColorPickerControl, { Props as ColorPickerControlProps } from '../controls/color-picker';
import ControlsBar from '../controls/controls-bar';
import FindBarToggle, { Props as FindBarToggleProps } from '../controls/findbar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import PageControls, { Props as PageControlsProps } from '../controls/page';
import ThumbnailsToggle, { Props as ThumbnailsToggleProps } from '../controls/sidebar';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';
import { AnnotationColor } from '../../AnnotationModule';

export type Props = AnnotationsControlsProps &
    ColorPickerControlProps &
    FindBarToggleProps &
    FullscreenToggleProps &
    PageControlsProps &
    ThumbnailsToggleProps &
    ZoomControlsProps;

export default function DocControls({
    annotationColor,
    annotationMode,
    hasDrawing,
    hasHighlight,
    hasRegion,
    maxScale,
    minScale,
    onColorSelect,
    onAnnotationModeClick,
    onAnnotationModeEscape,
    onFindBarToggle,
    onFullscreenToggle,
    onPageChange,
    onPageSubmit,
    onThumbnailsToggle,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
}: Props): JSX.Element {
    const colors = Object.values(AnnotationColor);

    return (
        <>
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
                    onPageChange={onPageChange}
                    onPageSubmit={onPageSubmit}
                    pageCount={pageCount}
                    pageNumber={pageNumber}
                />
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                <AnnotationsControls
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    hasDrawing={hasDrawing}
                    hasHighlight={hasHighlight}
                    hasRegion={hasRegion}
                    onAnnotationModeClick={onAnnotationModeClick}
                    onAnnotationModeEscape={onAnnotationModeEscape}
                />
            </ControlsBar>
            {annotationMode === AnnotationMode.DRAWING && (
                <ControlsBar>
                    <ColorPickerControl activeColor={annotationColor} colors={colors} onColorSelect={onColorSelect} />
                </ControlsBar>
            )}
        </>
    );
}
