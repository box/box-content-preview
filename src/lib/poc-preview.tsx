import React from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationControlsFSM, { AnnotationInput, AnnotationState } from './AnnotationControlsFSM';
import DocControlsV2 from './viewers/doc/DocControlsV2';
import { AnnotationMode } from './types';

const noop = (): void => undefined;

const params = new URLSearchParams(window.location.search);

function Harness(): JSX.Element {
    const [pageNumber, setPageNumber] = React.useState(3);
    const [scale, setScale] = React.useState(1);
    const [annotationColor, setAnnotationColor] = React.useState('#0061d5');
    const [isThumbnailsOpen, setIsThumbnailsOpen] = React.useState(false);

    // The viewer runs every mode change through this machine, the temporary modes included: a
    // region dragged or text selected with no mode picked counts as that mode until the annotation
    // is saved or dropped. The harness uses the real one so the bar behaves as it does in a
    // preview, and ?discover lets a demo stand in for the drag Preview itself would report.
    const fsmRef = React.useRef(
        new AnnotationControlsFSM(params.has('drawing') ? AnnotationState.DRAWING : AnnotationState.NONE),
    );
    const [annotationMode, setAnnotationMode] = React.useState(fsmRef.current.getMode());

    const transition = (input: AnnotationInput, mode?: AnnotationMode): void => {
        setAnnotationMode(fsmRef.current.transition(input, mode));
    };

    return (
        <>
            <DocControlsV2
                annotationColor={annotationColor}
                annotationMode={annotationMode}
                hasDrawing
                hasHighlight
                hasRegion
                isThumbnailsOpen={isThumbnailsOpen}
                onAnnotationColorChange={setAnnotationColor}
                onAnnotationModeClick={({ mode }): void => transition(AnnotationInput.CLICK, mode)}
                onAnnotationModeEscape={(): void => transition(AnnotationInput.RESET)}
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
            {params.has('discover') && (
                <div className="poc-simulate">
                    <button
                        onClick={(): void => transition(AnnotationInput.STARTED, AnnotationMode.REGION)}
                        type="button"
                    >
                        Drag a region
                    </button>
                    <button
                        onClick={(): void => transition(AnnotationInput.STARTED, AnnotationMode.HIGHLIGHT)}
                        type="button"
                    >
                        Select text
                    </button>
                    <button onClick={(): void => transition(AnnotationInput.CANCEL)} type="button">
                        Dismiss it
                    </button>
                </div>
            )}
        </>
    );
}

createRoot(document.getElementById('poc') as HTMLElement).render(<Harness />);
