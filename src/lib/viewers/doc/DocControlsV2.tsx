import React from 'react';
import noop from 'lodash/noop';
import { DropdownMenu, Toolbar } from '@box/blueprint-web';
import ArrowsMaximize from '@box/blueprint-web-assets/icons/Medium/ArrowsMaximize';
import ArrowsMinimize from '@box/blueprint-web-assets/icons/Medium/ArrowsMinimize';
import GridView from '@box/blueprint-web-assets/icons/Medium/GridView';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import Search from '@box/blueprint-web-assets/icons/Medium/Search';
import AnnotationsExitButtonV2 from '../controls/annotations/AnnotationsExitButtonV2';
import AnnotationsPaletteV2 from '../controls/annotations/AnnotationsPaletteV2';
import AnnotationsToggleV2 from '../controls/annotations/AnnotationsToggleV2';
import ColorPickerControlV2 from '../controls/color-picker/ColorPickerControlV2';
import ExperiencesProvider from '../controls/experiences';
import { ActiveAnnotationMode } from '../controls/annotations/annotationModeIcons';
import {
    ALWAYS_OVERFLOW,
    ControlsBarItem,
    ControlsMenuItemV2,
    ResponsiveControlsBarV2,
} from '../controls/controls-bar';
import { FindBarToggleV2 } from '../controls/findbar';
import { FullscreenToggleV2 } from '../controls/fullscreen';
import { GalleryToggleV2 } from '../controls/gallery';
import { PageControlsV2 } from '../controls/page';
import { RotateControlV2 } from '../controls/rotate';
import { ThumbnailsToggleV2 } from '../controls/sidebar';
import { useFullscreen, useMediaQuery } from '../controls/hooks';
import { ZoomControlsV2, ZoomMenuItemsV2 } from '../controls/zoom';
import { ANNOTATION_COLORS } from '../../AnnotationModule';
import { AnnotationMode } from '../../types';
import { Props } from './DocControls';

// The thumbnails sidebar only opens at this width (box-ui-elements $size-large-min)
const THUMBNAILS_MEDIA_QUERY = '(min-width: 768px)';

// From the responsive mocks: find stays in the menu at every width, and gallery does too until the grid is
// open. Then the grid toggle is the button itself, and nothing else collapses into a more options menu.
// Rotate collapses next, then thumbnails and fullscreen together, then zoom. Page and the markup trigger
// have no menu form and never collapse.
const PRIORITY = {
    find: ALWAYS_OVERFLOW,
    fullscreen: 2,
    gallery: ALWAYS_OVERFLOW,
    rotate: 1,
    thumbnails: 2,
    zoom: 3,
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
    const canShowThumbnails = useMediaQuery(THUMBNAILS_MEDIA_QUERY);

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

    const zoomProps = {
        maxScale,
        minScale,
        onZoomIn,
        onZoomOut,
        resinTargetZoomIn: isGalleryOpen ? 'galleryZoomIn' : undefined,
        resinTargetZoomOut: isGalleryOpen ? 'galleryZoomOut' : undefined,
        scale,
    };

    // Each control is gated here rather than only inside it, so the bar never reserves width for a control
    // that would render nothing
    const items: Array<ControlsBarItem | false | undefined> = [
        !isGalleryOpen &&
            !isFullscreen &&
            canShowThumbnails &&
            onThumbnailsToggle && {
                control: (
                    <ThumbnailsToggleV2 isThumbnailsOpen={isThumbnailsOpen} onThumbnailsToggle={onThumbnailsToggle} />
                ),
                id: 'thumbnails',
                menu: (
                    <>
                        <ControlsMenuItemV2
                            data-resin-target="thumbnails"
                            icon={Nav}
                            label={isThumbnailsOpen ? __('controls_hide_thumbnails') : __('controls_show_thumbnails')}
                            onSelect={(): void => onThumbnailsToggle()}
                        />
                        <DropdownMenu.Separator />
                    </>
                ),
                priority: PRIORITY.thumbnails,
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
            },
        (!isGalleryOpen || hasGalleryZoom) && {
            control: <ZoomControlsV2 {...zoomProps} />,
            id: 'zoom',
            menu: !isGalleryOpen && <ZoomMenuItemsV2 {...zoomProps} />,
            priority: isGalleryOpen ? undefined : PRIORITY.zoom,
        },
        !isGalleryOpen &&
            onFindBarToggle && {
                control: <FindBarToggleV2 onFindBarToggle={onFindBarToggle} />,
                id: 'find',
                menu: (
                    <ControlsMenuItemV2
                        data-resin-target="findBar"
                        icon={Search}
                        label={__('controls_find')}
                        onSelect={onFindBarToggle}
                        shortcutKey="F"
                    />
                ),
                priority: PRIORITY.find,
            },
        !isGalleryOpen &&
            onRotateLeft && {
                control: <RotateControlV2 onRotateLeft={onRotateLeft} />,
                id: 'rotate',
                menu: (
                    <ControlsMenuItemV2
                        data-resin-target="rotate"
                        icon={RotateLeft}
                        bareKey="R"
                        label={__('controls_rotate_document')}
                        onSelect={(): void => onRotateLeft()}
                    />
                ),
                priority: PRIORITY.rotate,
            },
        onGalleryToggle && {
            control: <GalleryToggleV2 isGalleryOpen={isGalleryOpen} onGalleryToggle={onGalleryToggle} />,
            id: 'gallery',
            menu: !isGalleryOpen && (
                <ControlsMenuItemV2
                    data-resin-target="galleryView"
                    icon={GridView}
                    label={__('controls_view_as_grid')}
                    onSelect={(): void => onGalleryToggle()}
                />
            ),
            priority: isGalleryOpen ? undefined : PRIORITY.gallery,
        },
        {
            control: <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />,
            id: 'fullscreen',
            menu: !isGalleryOpen && (
                <ControlsMenuItemV2
                    data-resin-target="fullscreen"
                    icon={isFullscreen ? ArrowsMinimize : ArrowsMaximize}
                    bareKey="F"
                    label={isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen')}
                    onSelect={(trigger): void => onFullscreenToggle(!isFullscreen, trigger)}
                />
            ),
            priority: isGalleryOpen ? undefined : PRIORITY.fullscreen,
        },
        hasAnnotations && {
            control: (
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
            ),
            id: 'annotations',
        },
    ];

    return (
        <ExperiencesProvider experiences={experiences}>
            <ResponsiveControlsBarV2 items={items.filter((item): item is ControlsBarItem => !!item)} />
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
