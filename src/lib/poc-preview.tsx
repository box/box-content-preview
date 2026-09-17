import React from 'react';
import { createRoot } from 'react-dom/client';
import DocControlsV2 from './viewers/doc/DocControlsV2';
import { AnnotationMode } from './types';

const noop = (): void => undefined;

function Harness(): JSX.Element {
    const [pageNumber, setPageNumber] = React.useState(3);
    const [scale, setScale] = React.useState(1);
    const [annotationMode, setAnnotationMode] = React.useState(
        window.location.search.indexOf('drawing') !== -1 ? AnnotationMode.DRAWING : AnnotationMode.NONE,
    );
    const [annotationColor, setAnnotationColor] = React.useState('#0061d5');
    const [isThumbnailsOpen, setIsThumbnailsOpen] = React.useState(false);

    return (
        <DocControlsV2
            annotationColor={annotationColor}
            annotationMode={annotationMode}
            hasDrawing
            hasHighlight
            hasRegion
            isThumbnailsOpen={isThumbnailsOpen}
            onAnnotationColorChange={setAnnotationColor}
            onAnnotationModeClick={({ mode }): void => setAnnotationMode(mode)}
            onAnnotationModeEscape={(): void => setAnnotationMode(AnnotationMode.NONE)}
            onFindBarToggle={noop}
            onFullscreenToggle={noop}
            onGalleryToggle={noop}
            onPageChange={setPageNumber}
            onPageSubmit={setPageNumber}
            onRotateLeft={noop}
            onThumbnailsToggle={(): void => setIsThumbnailsOpen(!isThumbnailsOpen)}
            onZoomIn={(): void => setScale(scale + 0.1)}
            onZoomOut={(): void => setScale(scale - 0.1)}
            pageCount={12}
            pageNumber={pageNumber}
            scale={scale}
        />
    );
}

createRoot(document.getElementById('poc') as HTMLElement).render(<Harness />);
