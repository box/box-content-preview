import * as React from 'react';
import { BoxToken, ViewerLifecycleHandlers } from '../../../types/viewer';
import useRepresentation from '../_shared/hooks/useRepresentation';
import useViewerBase from '../_shared/hooks/useViewerBase';
import useKeyboardShortcuts from '../_shared/hooks/useKeyboardShortcuts';
import useImageZoomPan from './useImageZoomPan';
import ImageControls from './ImageControls';

const noop = (): void => undefined;

export interface ImageViewerProps extends ViewerLifecycleHandlers {
    fileId: string;
    token: BoxToken;
    apiHost?: string;
    representationType?: string;
}

const DEFAULT_REPRESENTATION = 'webp';
const REP_HINTS = '[jpg?dimensions=2048x2048][png?dimensions=2048x2048][webp?dimensions=2048x2048]';

export default function ImageViewer({
    fileId,
    token,
    apiHost,
    representationType = DEFAULT_REPRESENTATION,
    onLoad,
    onError,
}: ImageViewerProps): React.ReactElement {
    const onLoadRef = React.useRef(onLoad);
    React.useEffect(() => {
        onLoadRef.current = onLoad;
    }, [onLoad]);

    const viewer = useViewerBase({ onError });
    const { containerRef, isFullscreen, toggleFullscreen, setError } = viewer;

    const representation = useRepresentation({
        fileId,
        token,
        representationType,
        repHints: REP_HINTS,
        host: apiHost,
    });

    React.useEffect(() => {
        if (representation.status === 'error' && representation.error) {
            setError(representation.error);
        }
    }, [representation.status, representation.error, setError]);

    React.useEffect(() => {
        if (representation.status === 'ready') {
            onLoadRef.current?.();
        }
    }, [representation.status]);

    const zoomPan = useImageZoomPan();
    const {
        zoom,
        rotation,
        panX,
        panY,
        zoomIn,
        zoomOut,
        fit,
        rotateLeft,
        bindContainer,
        bindImage,
        isPannable,
    } = zoomPan;

    const setContainerRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            bindContainer(node);
        },
        [bindContainer, containerRef],
    );

    useKeyboardShortcuts(
        {
            '+': zoomIn,
            '=': zoomIn,
            '-': zoomOut,
            '0': fit,
            r: rotateLeft,
            f: () => {
                toggleFullscreen().catch(noop);
            },
        },
        { target: containerRef as React.RefObject<HTMLElement> },
    );

    const isReady = representation.status === 'ready' && representation.src;
    const transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;

    return (
        <div
            ref={setContainerRef}
            className="bp-ImageViewer"
            data-testid="bp-ImageViewer"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                cursor: isPannable ? 'grab' : 'default',
                userSelect: 'none',
                touchAction: 'none',
            }}
            tabIndex={-1}
        >
            {representation.status === 'loading' && (
                <div aria-live="polite" data-testid="bp-ImageViewer-loading" role="status">
                    Loading…
                </div>
            )}
            {representation.status === 'error' && representation.error && (
                <div data-testid="bp-ImageViewer-error" role="alert">
                    <p>Could not load image: {representation.error.message}</p>
                    <button onClick={representation.retry} type="button">
                        Retry
                    </button>
                </div>
            )}
            {isReady && (
                <img
                    ref={bindImage}
                    alt={representation.file?.name ?? ''}
                    data-testid="bp-ImageViewer-image"
                    draggable={false}
                    src={representation.src ?? undefined}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transformOrigin: 'center center',
                        transform: `translate(-50%, -50%) ${transform}`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                />
            )}
            <ImageControls
                canZoomIn
                canZoomOut
                isFullscreen={isFullscreen}
                onFit={fit}
                onRotateLeft={rotateLeft}
                onToggleFullscreen={() => {
                    toggleFullscreen().catch(noop);
                }}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
            />
        </div>
    );
}
