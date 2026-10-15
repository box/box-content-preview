import React from 'react';
import AnnotationsControls from '../controls/annotations';
import ControlsBar, { ControlsBarV2 } from '../controls/controls-bar';
import DrawingControls from '../controls/annotations/DrawingControls';
import ExperiencesProvider from '../controls/experiences';
import { FindBarToggleV2 } from '../controls/findbar';
import { FullscreenToggleV2 } from '../controls/fullscreen';
import { GalleryToggleV2 } from '../controls/gallery';
import { PageControlsV2 } from '../controls/page';
import { RotateControlV2 } from '../controls/rotate';
import { ThumbnailsToggleV2 } from '../controls/sidebar';
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
                        <ThumbnailsToggleV2
                            isThumbnailsOpen={isThumbnailsOpen}
                            onThumbnailsToggle={onThumbnailsToggle}
                        />
                        <FindBarToggleV2 onFindBarToggle={onFindBarToggle} />
                        <PageControlsV2
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
                {!isGalleryOpen && onRotateLeft && <RotateControlV2 onRotateLeft={onRotateLeft} />}
                <GalleryToggleV2 isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />
                <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
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
