import * as React from 'react';

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export type ZoomMode = 'fit' | 'free';

export interface ImageZoomPanState {
    zoom: number;
    rotation: number;
    panX: number;
    panY: number;
    mode: ZoomMode;
}

export interface UseImageZoomPanResult extends ImageZoomPanState {
    zoomIn: () => void;
    zoomOut: () => void;
    fit: () => void;
    reset: () => void;
    rotateLeft: () => void;
    setZoom: (zoom: number) => void;
    bindContainer: (node: HTMLElement | null) => void;
    bindImage: (node: HTMLImageElement | null) => void;
    isPannable: boolean;
}

const INITIAL_STATE: ImageZoomPanState = {
    zoom: 1,
    rotation: 0,
    panX: 0,
    panY: 0,
    mode: 'fit',
};

function clampZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export default function useImageZoomPan(): UseImageZoomPanResult {
    const [state, setState] = React.useState<ImageZoomPanState>(INITIAL_STATE);
    const containerRef = React.useRef<HTMLElement | null>(null);
    const imageRef = React.useRef<HTMLImageElement | null>(null);
    const dragRef = React.useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
    const pinchRef = React.useRef<{ initialDist: number; initialZoom: number } | null>(null);

    const zoomIn = React.useCallback(() => {
        setState(prev => ({ ...prev, zoom: clampZoom(prev.zoom * ZOOM_STEP), mode: 'free' }));
    }, []);

    const zoomOut = React.useCallback(() => {
        setState(prev => ({ ...prev, zoom: clampZoom(prev.zoom / ZOOM_STEP), mode: 'free' }));
    }, []);

    const fit = React.useCallback(() => {
        setState({ ...INITIAL_STATE, rotation: 0 });
    }, []);

    const reset = React.useCallback(() => {
        setState(INITIAL_STATE);
    }, []);

    const rotateLeft = React.useCallback(() => {
        setState(prev => ({ ...prev, rotation: (prev.rotation - 90) % 360 }));
    }, []);

    const setZoom = React.useCallback((zoom: number) => {
        setState(prev => ({ ...prev, zoom: clampZoom(zoom), mode: 'free' }));
    }, []);

    const bindContainer = React.useCallback((node: HTMLElement | null) => {
        containerRef.current = node;
    }, []);

    const bindImage = React.useCallback((node: HTMLImageElement | null) => {
        imageRef.current = node;
    }, []);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const handleWheel = (event: WheelEvent): void => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            setState(prev => {
                const delta = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
                return { ...prev, zoom: clampZoom(prev.zoom * delta), mode: 'free' };
            });
        };

        const handlePointerDown = (event: PointerEvent): void => {
            if (event.button !== 0) return;
            dragRef.current = { startX: event.clientX, startY: event.clientY, panX: state.panX, panY: state.panY };
            const target = event.target as HTMLElement;
            if (typeof target.setPointerCapture === 'function') {
                target.setPointerCapture(event.pointerId);
            }
        };

        const handlePointerMove = (event: PointerEvent): void => {
            const drag = dragRef.current;
            if (!drag) return;
            setState(prev => ({
                ...prev,
                panX: drag.panX + (event.clientX - drag.startX),
                panY: drag.panY + (event.clientY - drag.startY),
            }));
        };

        const handlePointerUp = (event: PointerEvent): void => {
            dragRef.current = null;
            const target = event.target as HTMLElement;
            if (typeof target.releasePointerCapture !== 'function') return;
            try {
                target.releasePointerCapture(event.pointerId);
            } catch {
                // ignore — pointer may already be released
            }
        };

        const handleTouchStart = (event: TouchEvent): void => {
            if (event.touches.length !== 2) return;
            const [t1, t2] = [event.touches[0], event.touches[1]];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            pinchRef.current = { initialDist: dist, initialZoom: state.zoom };
        };

        const handleTouchMove = (event: TouchEvent): void => {
            const pinch = pinchRef.current;
            if (!pinch || event.touches.length !== 2) return;
            event.preventDefault();
            const [t1, t2] = [event.touches[0], event.touches[1]];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const ratio = dist / pinch.initialDist;
            setState(prev => ({ ...prev, zoom: clampZoom(pinch.initialZoom * ratio), mode: 'free' }));
        };

        const handleTouchEnd = (): void => {
            pinchRef.current = null;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('pointerdown', handlePointerDown);
        container.addEventListener('pointermove', handlePointerMove);
        container.addEventListener('pointerup', handlePointerUp);
        container.addEventListener('pointercancel', handlePointerUp);
        container.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('pointerdown', handlePointerDown);
            container.removeEventListener('pointermove', handlePointerMove);
            container.removeEventListener('pointerup', handlePointerUp);
            container.removeEventListener('pointercancel', handlePointerUp);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [state.panX, state.panY, state.zoom]);

    React.useEffect(() => {
        const handleOrientation = (): void => {
            setState(prev => ({ ...prev, panX: 0, panY: 0 }));
        };
        window.addEventListener('orientationchange', handleOrientation);
        return () => window.removeEventListener('orientationchange', handleOrientation);
    }, []);

    const isPannable = state.zoom > 1;

    return {
        ...state,
        zoomIn,
        zoomOut,
        fit,
        reset,
        rotateLeft,
        setZoom,
        bindContainer,
        bindImage,
        isPannable,
    };
}
