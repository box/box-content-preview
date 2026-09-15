import React from 'react';
import { BlueprintProvider, Toolbar, TooltipProvider, useNoopTreatment } from '@box/blueprint-web';
import AnnotationsControlsV2 from '../controls/annotations/AnnotationsControlsV2';
import ControlsBarV2 from '../controls/controls-bar/ControlsBarV2';
import DrawingControlsV2 from '../controls/annotations/DrawingControlsV2';
import ExperiencesProvider from '../controls/experiences';
import FindBarToggleV2 from '../controls/findbar/FindBarToggleV2';
import FullscreenToggleV2 from '../controls/fullscreen/FullscreenToggleV2';
import GalleryToggleV2 from '../controls/gallery/GalleryToggleV2';
import PageControlsV2 from '../controls/page/PageControlsV2';
import RotateControlV2 from '../controls/rotate/RotateControlV2';
import ThumbnailsToggleV2 from '../controls/sidebar/ThumbnailsToggleV2';
import ZoomControlsV2 from '../controls/zoom/ZoomControlsV2';
import { AnnotationMode } from '../../types';
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
        <BlueprintProvider useTreatment={useNoopTreatment}>
            <TooltipProvider>
                <ExperiencesProvider experiences={experiences}>
                    <ControlsBarV2>
                        {!isGalleryOpen && (
                            <>
                                <ThumbnailsToggleV2
                                    isThumbnailsOpen={isThumbnailsOpen}
                                    onThumbnailsToggle={onThumbnailsToggle}
                                />
                                <FindBarToggleV2 onFindBarToggle={onFindBarToggle} />
                                <Toolbar.Separator />
                                <PageControlsV2
                                    onPageChange={onPageChange}
                                    onPageSubmit={onPageSubmit}
                                    pageCount={pageCount}
                                    pageNumber={pageNumber}
                                />
                                <Toolbar.Separator />
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
                        {!isGalleryOpen && onRotateLeft && (
                            <>
                                <Toolbar.Separator />
                                <RotateControlV2 onRotateLeft={onRotateLeft} />
                            </>
                        )}
                        <Toolbar.Separator />
                        <GalleryToggleV2 isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />
                        <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
                        {!isGalleryOpen && (
                            <AnnotationsControlsV2
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
                    {!isGalleryOpen && annotationMode === AnnotationMode.DRAWING && (
                        <ControlsBarV2>
                            <DrawingControlsV2
                                annotationColor={annotationColor}
                                annotationMode={annotationMode}
                                onAnnotationColorChange={onAnnotationColorChange}
                            />
                        </ControlsBarV2>
                    )}
                </ExperiencesProvider>
            </TooltipProvider>
        </BlueprintProvider>
    );
}
