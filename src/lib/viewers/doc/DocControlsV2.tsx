import React from 'react';
import { BlueprintProvider, TooltipProvider, useNoopTreatment } from '@box/blueprint-web';
import Expand from '@box/blueprint-web-assets/icons/Medium/Expand';
import FileSearch from '@box/blueprint-web-assets/icons/Medium/FileSearch';
import GridView from '@box/blueprint-web-assets/icons/Medium/GridView';
import Minus from '@box/blueprint-web-assets/icons/Medium/Minus';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import Plus from '@box/blueprint-web-assets/icons/Medium/Plus';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import AnnotationsPaletteV2 from '../controls/annotations/AnnotationsPaletteV2';
import AnnotationsToggleV2 from '../controls/annotations/AnnotationsToggleV2';
import ControlsBarV2, { ControlsBarV2Stack } from '../controls/controls-bar/ControlsBarV2';
import ControlsMenuItemV2 from '../controls/controls-bar/ControlsMenuItemV2';
import ExperiencesProvider from '../controls/experiences';
import FindBarToggleV2 from '../controls/findbar/FindBarToggleV2';
import FullscreenToggleV2 from '../controls/fullscreen/FullscreenToggleV2';
import GalleryToggleV2 from '../controls/gallery/GalleryToggleV2';
import PageControlsV2 from '../controls/page/PageControlsV2';
import ResponsiveControlsBarV2 from '../controls/controls-bar/ResponsiveControlsBarV2';
import RotateControlV2 from '../controls/rotate/RotateControlV2';
import ThumbnailsToggleV2 from '../controls/sidebar/ThumbnailsToggleV2';
import ZoomControlsV2 from '../controls/zoom/ZoomControlsV2';
import useFullscreen from '../controls/hooks/useFullscreen';
import { ALWAYS_OVERFLOW, ALWAYS_VISIBLE, ControlsBarItem } from '../controls/controls-bar/useControlsOverflow';
import { AnnotationMode } from '../../types';
import { Props } from './DocControls';

// The order controls collapse in as the viewer narrows, taken from the responsive mocks: find and
// gallery start in the menu, then rotate, then the thumbnails and fullscreen pair, then zoom. Page
// and the markup button stay on the bar at every width.
const PRIORITY = {
    find: ALWAYS_OVERFLOW,
    gallery: ALWAYS_OVERFLOW,
    rotate: 1,
    thumbnails: 2,
    fullscreen: 3,
    zoom: 4,
};

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
    const isFullscreen = useFullscreen();

    // The palette is the mode made visible rather than a panel with a life of its own: it is up
    // for exactly as long as a mode is on. That keeps the bar, the palette, and the viewer from
    // ever disagreeing, and means a mode the viewer turns on by itself — the region the user drags
    // or the text they select with no mode picked — brings the palette up already on that mode.
    const isPaletteOpen = annotationMode !== AnnotationMode.NONE;

    const items: (ControlsBarItem | false | undefined)[] = [
        !isGalleryOpen &&
            onThumbnailsToggle && {
                control: (
                    <ThumbnailsToggleV2 isThumbnailsOpen={isThumbnailsOpen} onThumbnailsToggle={onThumbnailsToggle} />
                ),
                id: 'thumbnails',
                menu: <ControlsMenuItemV2 icon={Nav} label={__('toggle_thumbnails')} onSelect={onThumbnailsToggle} />,
                priority: PRIORITY.thumbnails,
            },
        !isGalleryOpen &&
            onFindBarToggle && {
                control: <FindBarToggleV2 onFindBarToggle={onFindBarToggle} />,
                id: 'find',
                menu: (
                    <ControlsMenuItemV2
                        icon={FileSearch}
                        label={__('toggle_findbar')}
                        onSelect={(): void => onFindBarToggle(null)}
                    />
                ),
                priority: PRIORITY.find,
            },
        !isGalleryOpen &&
            pageCount > 1 && {
                control: (
                    <PageControlsV2
                        onPageChange={onPageChange}
                        onPageSubmit={onPageSubmit}
                        pageCount={pageCount}
                        pageNumber={pageNumber}
                    />
                ),
                id: 'page',
                priority: ALWAYS_VISIBLE,
            },
        (!isGalleryOpen || hasGalleryZoom) && {
            control: (
                <ZoomControlsV2
                    maxScale={maxScale}
                    minScale={minScale}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    resinTargetZoomIn={isGalleryOpen ? 'galleryZoomIn' : undefined}
                    resinTargetZoomOut={isGalleryOpen ? 'galleryZoomOut' : undefined}
                    scale={scale}
                />
            ),
            id: 'zoom',
            menu: (
                <>
                    <ControlsMenuItemV2 icon={Plus} label={__('zoom_in')} onSelect={onZoomIn} />
                    <ControlsMenuItemV2 icon={Minus} label={__('zoom_out')} onSelect={onZoomOut} />
                </>
            ),
            priority: PRIORITY.zoom,
        },
        !isGalleryOpen &&
            onRotateLeft && {
                control: <RotateControlV2 onRotateLeft={onRotateLeft} />,
                id: 'rotate',
                menu: <ControlsMenuItemV2 icon={RotateLeft} label={__('rotate_left')} onSelect={onRotateLeft} />,
                priority: PRIORITY.rotate,
            },
        onGalleryToggle && {
            control: <GalleryToggleV2 isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />,
            id: 'gallery',
            menu: <ControlsMenuItemV2 icon={GridView} label={__('gallery_view')} onSelect={onGalleryToggle} />,
            priority: PRIORITY.gallery,
        },
        {
            control: <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />,
            id: 'fullscreen',
            menu: (
                <ControlsMenuItemV2
                    icon={Expand}
                    label={__('enter_fullscreen')}
                    onSelect={(): void => onFullscreenToggle(!isFullscreen, document.activeElement)}
                />
            ),
            priority: PRIORITY.fullscreen,
        },
        // Gated here as well as inside the toggle so the bar does not reserve width for a control
        // this file already knows will render nothing.
        !isGalleryOpen &&
            !isFullscreen &&
            (hasDrawing || hasHighlight || hasRegion) && {
                control: (
                    <AnnotationsToggleV2
                        annotationMode={annotationMode}
                        hasDrawing={hasDrawing}
                        hasHighlight={hasHighlight}
                        hasRegion={hasRegion}
                        onAnnotationModeClick={onAnnotationModeClick}
                        onAnnotationModeEscape={onAnnotationModeEscape}
                    />
                ),
                id: 'annotations',
                priority: ALWAYS_VISIBLE,
            },
    ];

    return (
        <BlueprintProvider useTreatment={useNoopTreatment}>
            <TooltipProvider>
                <ExperiencesProvider experiences={experiences}>
                    <ControlsBarV2Stack>
                        {!isGalleryOpen && isPaletteOpen && (
                            <ControlsBarV2>
                                <AnnotationsPaletteV2
                                    annotationColor={annotationColor}
                                    annotationMode={annotationMode}
                                    hasDrawing={hasDrawing}
                                    hasHighlight={hasHighlight}
                                    hasRegion={hasRegion}
                                    onAnnotationColorChange={onAnnotationColorChange}
                                    onAnnotationModeClick={onAnnotationModeClick}
                                />
                            </ControlsBarV2>
                        )}
                        <ResponsiveControlsBarV2 items={items.filter(Boolean) as ControlsBarItem[]} />
                    </ControlsBarV2Stack>
                </ExperiencesProvider>
            </TooltipProvider>
        </BlueprintProvider>
    );
}
