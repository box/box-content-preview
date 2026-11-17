import React from 'react';
import { ControlsBarItem, ResponsiveControlsBarV2 } from '../controls/controls-bar';
import { FullscreenMenuItemV2, FullscreenToggleV2 } from '../controls/fullscreen';
import { PageControlsV2 } from '../controls/page';
import { ZoomControlsV2, ZoomMenuItemsV2 } from '../controls/zoom';
import { Props } from './MultiImageControls';

// The same collapse order as documents: fullscreen, then zoom. Page has no menu form and never collapses.
const PRIORITY = {
    fullscreen: 2,
    zoom: 3,
};

export default function MultiImageControlsV2({
    onFullscreenToggle,
    onPageChange,
    onPageSubmit,
    onZoomIn,
    onZoomOut,
    pageCount,
    pageNumber,
    scale,
}: Props): JSX.Element {
    const zoomProps = { onZoomIn, onZoomOut, scale };

    // Page is gated here rather than only inside it, so the bar never reserves width for a control that
    // would render nothing
    const items: Array<ControlsBarItem | false> = [
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
        {
            control: <ZoomControlsV2 {...zoomProps} />,
            id: 'zoom',
            menu: <ZoomMenuItemsV2 {...zoomProps} />,
            priority: PRIORITY.zoom,
        },
        {
            control: <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />,
            id: 'fullscreen',
            menu: <FullscreenMenuItemV2 onFullscreenToggle={onFullscreenToggle} />,
            priority: PRIORITY.fullscreen,
        },
    ];

    return <ResponsiveControlsBarV2 items={items.filter((item): item is ControlsBarItem => !!item)} />;
}
