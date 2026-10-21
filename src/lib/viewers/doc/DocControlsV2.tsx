import React from 'react';
import noop from 'lodash/noop';
import { DropdownMenu } from '@box/blueprint-web';
import GridView from '@box/blueprint-web-assets/icons/Medium/GridView';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import Search from '@box/blueprint-web-assets/icons/Medium/Search';
import AnnotationsControlsV2 from '../controls/annotations/AnnotationsControlsV2';
import AnnotationsPaletteControlsV2 from '../controls/annotations/AnnotationsPaletteControlsV2';
import ExperiencesProvider from '../controls/experiences';
import getFullscreenItem from '../controls/fullscreen/getFullscreenItem';
import getRotateItem from '../controls/rotate/getRotateItem';
import getZoomItem from '../controls/zoom/getZoomItem';
import useAnnotationModes from '../controls/annotations/useAnnotationModes';
import {
    ALWAYS_OVERFLOW,
    ControlsBarItem,
    ControlsMenuItemV2,
    ResponsiveControlsBarV2,
} from '../controls/controls-bar';
import { FindBarToggleV2 } from '../controls/findbar';
import { GalleryToggleV2 } from '../controls/gallery';
import { PageControlsV2 } from '../controls/page';
import { ThumbnailsToggleV2 } from '../controls/sidebar';
import { useFullscreen, useMediaQuery } from '../controls/hooks';
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
    const isFullscreen = useFullscreen();
    const canShowThumbnails = useMediaQuery(THUMBNAILS_MEDIA_QUERY);
    const annotationModes = useAnnotationModes({ hasDrawing, hasHighlight, hasRegion });
    const hasAnnotations = !isGalleryOpen && annotationModes.length > 0;

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
        (!isGalleryOpen || hasGalleryZoom) && getZoomItem(zoomProps, isGalleryOpen ? undefined : PRIORITY.zoom),
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
            onRotateLeft &&
            getRotateItem({ menuLabel: __('controls_rotate_document'), onRotateLeft }, PRIORITY.rotate),
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
        getFullscreenItem({ onFullscreenToggle }, isGalleryOpen ? undefined : PRIORITY.fullscreen),
        hasAnnotations && {
            control: (
                <AnnotationsControlsV2
                    annotationMode={annotationMode}
                    modes={annotationModes}
                    onAnnotationModeClick={onAnnotationModeClick}
                    onAnnotationModeEscape={onAnnotationModeEscape}
                />
            ),
            id: 'annotations',
        },
    ];

    return (
        <ExperiencesProvider experiences={experiences}>
            <ResponsiveControlsBarV2 items={items.filter((item): item is ControlsBarItem => !!item)} />
            {hasAnnotations && (
                <AnnotationsPaletteControlsV2
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    modes={annotationModes}
                    onAnnotationColorChange={onAnnotationColorChange}
                    onAnnotationModeClick={onAnnotationModeClick}
                />
            )}
        </ExperiencesProvider>
    );
}
