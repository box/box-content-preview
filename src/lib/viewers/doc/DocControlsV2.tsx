import React from 'react';
import noop from 'lodash/noop';
import { Toolbar } from '@box/blueprint-web';
import AnnotationsExitButtonV2 from '../controls/annotations/AnnotationsExitButtonV2';
import AnnotationsPaletteV2 from '../controls/annotations/AnnotationsPaletteV2';
import AnnotationsToggleV2 from '../controls/annotations/AnnotationsToggleV2';
import ColorPickerControlV2 from '../controls/color-picker/ColorPickerControlV2';
import useFullscreen from '../controls/hooks/useFullscreen';
import { ActiveAnnotationMode } from '../controls/annotations/annotationModeIcons';
import { ControlsBarV2 } from '../controls/controls-bar';
import ExperiencesProvider from '../controls/experiences';
import FindBarToggle from '../controls/findbar';
import FullscreenToggle from '../controls/fullscreen';
import GalleryToggle from '../controls/gallery';
import { PageControlsV2 } from '../controls/page';
import RotateControl from '../controls/rotate/RotateControl';
import ThumbnailsToggle from '../controls/sidebar';
import ZoomControls from '../controls/zoom';
import { ANNOTATION_COLORS } from '../../AnnotationModule';
import { AnnotationMode } from '../../types';
import { Props } from './DocControls';

export default function DocControlsV2({
    annotationColor,
    annotationMode = AnnotationMode.NONE,
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
    onAnnotationModeClick = noop,
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
    const annotationsToggleRef = React.useRef<HTMLButtonElement | null>(null);
    const isFullscreen = useFullscreen();

    // Listed in the palette's button order, which is also the order the toggle falls back to
    const annotationModes: ActiveAnnotationMode[] = [];

    if (!isFullscreen) {
        if (hasRegion) {
            annotationModes.push(AnnotationMode.REGION);
        }
        if (hasHighlight) {
            annotationModes.push(AnnotationMode.HIGHLIGHT);
        }
        if (hasDrawing) {
            annotationModes.push(AnnotationMode.DRAWING);
        }
    }

    const hasAnnotations = !isGalleryOpen && annotationModes.length > 0;

    const handleAnnotationsExit = (): void => {
        annotationsToggleRef.current?.focus();
        onAnnotationModeClick({ mode: AnnotationMode.NONE });
    };

    return (
        <ExperiencesProvider experiences={experiences}>
            <ControlsBarV2>
                {!isGalleryOpen && (
                    <>
                        <ThumbnailsToggle isThumbnailsOpen={isThumbnailsOpen} onThumbnailsToggle={onThumbnailsToggle} />
                        <FindBarToggle onFindBarToggle={onFindBarToggle} />
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
                {!isGalleryOpen && onRotateLeft && <RotateControl onRotateLeft={onRotateLeft} />}
                <GalleryToggle isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                {hasAnnotations && (
                    <>
                        <Toolbar.Separator />
                        <AnnotationsExitButtonV2 onClick={handleAnnotationsExit} />
                        <AnnotationsToggleV2
                            ref={annotationsToggleRef}
                            annotationMode={annotationMode}
                            modes={annotationModes}
                            onAnnotationModeClick={onAnnotationModeClick}
                            onAnnotationModeEscape={onAnnotationModeEscape}
                        />
                    </>
                )}
            </ControlsBarV2>
            {hasAnnotations && annotationMode !== AnnotationMode.NONE && (
                <AnnotationsPaletteV2>
                    <AnnotationsPaletteV2.Modes
                        annotationMode={annotationMode}
                        onAnnotationModeClick={onAnnotationModeClick}
                    >
                        {annotationModes.map(mode => (
                            <AnnotationsPaletteV2.Mode key={mode} value={mode} />
                        ))}
                    </AnnotationsPaletteV2.Modes>
                    {annotationMode === AnnotationMode.DRAWING && (
                        <>
                            <Toolbar.Separator />
                            <ColorPickerControlV2
                                activeColor={annotationColor}
                                colors={ANNOTATION_COLORS}
                                onColorSelect={onAnnotationColorChange}
                            />
                        </>
                    )}
                </AnnotationsPaletteV2>
            )}
        </ExperiencesProvider>
    );
}
