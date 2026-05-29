import * as React from 'react';
import { Button } from '@box/blueprint-web';

export interface ImageControlsProps {
    canZoomIn: boolean;
    canZoomOut: boolean;
    isFullscreen: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onRotateLeft: () => void;
    onToggleFullscreen: () => void;
}

export default function ImageControls({
    canZoomIn,
    canZoomOut,
    isFullscreen,
    onZoomIn,
    onZoomOut,
    onFit,
    onRotateLeft,
    onToggleFullscreen,
}: ImageControlsProps): React.ReactElement {
    return (
        <div aria-label="Image controls" className="bp-ImageControls" role="toolbar">
            <Button aria-label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
                −
            </Button>
            <Button aria-label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
                +
            </Button>
            <Button aria-label="Fit to screen" onClick={onFit}>
                Fit
            </Button>
            <Button aria-label="Rotate left" onClick={onRotateLeft}>
                ↺
            </Button>
            <Button aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={onToggleFullscreen}>
                {isFullscreen ? '⤢' : '⤡'}
            </Button>
        </div>
    );
}
