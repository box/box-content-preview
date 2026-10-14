import React from 'react';
import AnnotationsPaletteV2 from '../controls/annotations/AnnotationsPaletteV2';
import AnnotationsToggleV2 from '../controls/annotations/AnnotationsToggleV2';
import { ControlsBarV2 } from '../controls/controls-bar';
import ExperiencesProvider from '../controls/experiences';
import FindBarToggle from '../controls/findbar';
import FullscreenToggle from '../controls/fullscreen';
import GalleryToggle from '../controls/gallery';
import PageControls from '../controls/page';
import RotateControl from '../controls/rotate/RotateControl';
import ThumbnailsToggle from '../controls/sidebar';
import ZoomControls from '../controls/zoom';
import { Props } from './DocControls';

export default function DocControlsV2({
    annotationColor,
    annotationMode,
    experiences,
    hasDrawing,
    hasGalleryZoom = false,
    hasHighlight,
    hasRegion,
    isGalleryOpen,
    isThumbnailsOpen,
    maxScale,
    minScale,
    onAnnotationColorChange,
    onAnnotationModeClick,
    onAnnotationModeEscape,
    onFindBarToggle,
    onFullscreenToggle,
    onGalleryToggle,
    onPageChange,
    onPageSubmit,
    onRotateLeft,
    onThumbnailsToggle,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
}: Props): JSX.Element {
    return (
        <ExperiencesProvider experiences={experiences}>
            <ControlsBarV2>
                {!isGalleryOpen && (
                    <>
                        <ThumbnailsToggle isThumbnailsOpen={isThumbnailsOpen} onThumbnailsToggle={onThumbnailsToggle} />
                        <FindBarToggle onFindBarToggle={onFindBarToggle} />
                        <PageControls
                            onPageChange={onPageChange}
                            onPageSubmit={onPageSubmit}
                            pageCount={pageCount}
                            pageNumber={pageNumber}
                        />
                    </>
                )}
                {(!isGalleryOpen || hasGalleryZoom) && (
                    <ZoomControls
                        maxScale={maxScale}
                        minScale={minScale}
                        onZoomIn={onZoomIn}
                        onZoomOut={onZoomOut}
                        resinTargetZoomIn={isGalleryOpen ? 'galleryZoomIn' : undefined}
                        resinTargetZoomOut={isGalleryOpen ? 'galleryZoomOut' : undefined}
                        scale={scale}
                    />
                )}
                {!isGalleryOpen && onRotateLeft && <RotateControl onRotateLeft={onRotateLeft} />}
                <GalleryToggle isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                {!isGalleryOpen && (
                    <AnnotationsToggleV2
                        annotationMode={annotationMode}
                        hasDrawing={hasDrawing}
                        hasHighlight={hasHighlight}
                        hasRegion={hasRegion}
                        onAnnotationModeClick={onAnnotationModeClick}
                        onAnnotationModeEscape={onAnnotationModeEscape}
                    />
                )}
            </ControlsBarV2>
            {!isGalleryOpen && (
                <AnnotationsPaletteV2
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    hasDrawing={hasDrawing}
                    hasHighlight={hasHighlight}
                    hasRegion={hasRegion}
                    onAnnotationColorChange={onAnnotationColorChange}
                    onAnnotationModeClick={onAnnotationModeClick}
                />
            )}
        </ExperiencesProvider>
    );
}
