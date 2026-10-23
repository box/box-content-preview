import React from 'react';
import getFullscreenItem from '../controls/fullscreen/getFullscreenItem';
import getZoomItem from '../controls/zoom/getZoomItem';
import { ControlsBarItem, ResponsiveControlsBarV2 } from '../controls/controls-bar';
import { PageControlsV2 } from '../controls/page';
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
        getZoomItem({ onZoomIn, onZoomOut, scale }, PRIORITY.zoom),
        getFullscreenItem({ onFullscreenToggle }, PRIORITY.fullscreen),
    ];

    return <ResponsiveControlsBarV2 items={items.filter((item): item is ControlsBarItem => !!item)} />;
}
