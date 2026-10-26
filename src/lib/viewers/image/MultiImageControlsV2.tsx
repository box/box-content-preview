import React from 'react';
import getFullscreenItem from '../controls/fullscreen/getFullscreenItem';
import getPageItem from '../controls/page/getPageItem';
import getZoomItem from '../controls/zoom/getZoomItem';
import { ResponsiveControlsBarV2 } from '../controls/controls-bar';
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
    return (
        <ResponsiveControlsBarV2
            items={[
                getPageItem({ onPageChange, onPageSubmit, pageCount, pageNumber }),
                getZoomItem({ onZoomIn, onZoomOut, scale }, PRIORITY.zoom),
                getFullscreenItem({ onFullscreenToggle }, PRIORITY.fullscreen),
            ]}
        />
    );
}
