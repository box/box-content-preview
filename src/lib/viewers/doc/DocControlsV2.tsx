import React from 'react';
import AnnotationsControls from '../controls/annotations';
import ControlsBar, { ControlsBarV2 } from '../controls/controls-bar';
import DrawingControls from '../controls/annotations/DrawingControls';
import ExperiencesProvider from '../controls/experiences';
import FindBarToggle from '../controls/findbar';
import FullscreenToggle from '../controls/fullscreen';
import GalleryToggle from '../controls/gallery';
import PageControls from '../controls/page';
import RotateControl from '../controls/rotate/RotateControl';
import ThumbnailsToggle from '../controls/sidebar';
import { ZoomControlsV2 } from '../controls/zoom';
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
                    <ZoomControlsV2
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
                    <AnnotationsControls
                        annotationColor={annotationColor}
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
                <ControlsBar>
                    <DrawingControls
                        annotationColor={annotationColor}
                        annotationMode={annotationMode}
                        onAnnotationColorChange={onAnnotationColorChange}
                    />
                </ControlsBar>
            )}
        </ExperiencesProvider>
    );
}
