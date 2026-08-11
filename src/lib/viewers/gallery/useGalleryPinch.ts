import { MutableRefObject, RefObject, useEffect, useRef } from 'react';
import { getDistance, getMidpoint } from '../../util';

const WHEEL_ZOOM_SCALE_FACTOR = 0.01;
const WHEEL_SESSION_GAP_MS = 200;

export type PinchDirection = 'zoomIn' | 'zoomOut';

export interface PinchFocal {
    x: number;
    y: number;
}

interface Props {
    focalRef: MutableRefObject<PinchFocal | null>;
    gridRef: RefObject<HTMLDivElement>;
    isPinchZoomEnabled: boolean;
    isTouchZoomEnabled: boolean;
    onGestureStart: (direction: PinchDirection) => void;
    onZoom: (scale: number) => boolean | void;
    scaleRef: MutableRefObject<number>;
}

// Native non-passive listeners: React's synthetic wheel/touch handlers are passive and cannot preventDefault.
export default function useGalleryPinch({
    focalRef,
    gridRef,
    isPinchZoomEnabled,
    isTouchZoomEnabled,
    onGestureStart,
    onZoom,
    scaleRef,
}: Props): void {
    const frameRef = useRef<number | null>(null);
    const pendingRef = useRef<{ focal: PinchFocal; scale: number } | null>(null);
    const touchStartRef = useRef<{ distance: number; scale: number } | null>(null);
    const lastWheelAtRef = useRef(0);
    const onGestureStartRef = useRef(onGestureStart);
    const onZoomRef = useRef(onZoom);

    useEffect(() => {
        onGestureStartRef.current = onGestureStart;
        onZoomRef.current = onZoom;
    }, [onGestureStart, onZoom]);

    useEffect(() => {
        const grid = gridRef.current;
        if (!grid || (!isTouchZoomEnabled && !isPinchZoomEnabled)) {
            return undefined;
        }

        const scheduleZoom = (nextScale: number, clientX: number, clientY: number): void => {
            pendingRef.current = { focal: { x: clientX, y: clientY }, scale: nextScale };

            if (frameRef.current === null) {
                frameRef.current = requestAnimationFrame(() => {
                    frameRef.current = null;
                    const pending = pendingRef.current;
                    pendingRef.current = null;
                    if (pending) {
                        focalRef.current = pending.focal;
                        if (onZoomRef.current(pending.scale) === false) {
                            focalRef.current = null;
                        }
                    }
                });
            }
        };

        const handleWheel = (event: WheelEvent): void => {
            if (!event.ctrlKey) {
                return;
            }

            event.preventDefault();
            const now = Date.now();
            if (now - lastWheelAtRef.current > WHEEL_SESSION_GAP_MS) {
                onGestureStartRef.current(event.deltaY > 0 ? 'zoomOut' : 'zoomIn');
            }
            lastWheelAtRef.current = now;

            const baseScale = pendingRef.current?.scale ?? scaleRef.current;
            scheduleZoom(baseScale - event.deltaY * WHEEL_ZOOM_SCALE_FACTOR, event.clientX, event.clientY);
        };

        const getTouchDistance = (touches: TouchList): number =>
            getDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);

        const handleTouchStart = (event: TouchEvent): void => {
            if (event.touches.length < 2) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            touchStartRef.current = {
                distance: getTouchDistance(event.touches),
                scale: pendingRef.current?.scale ?? scaleRef.current,
            };
        };

        const handleTouchMove = (event: TouchEvent): void => {
            const start = touchStartRef.current;
            if (!start || start.distance <= 0 || event.touches.length < 2) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            const distance = getTouchDistance(event.touches);
            const [midpointX, midpointY] = getMidpoint(
                event.touches[0].clientX,
                event.touches[0].clientY,
                event.touches[1].clientX,
                event.touches[1].clientY,
            );
            scheduleZoom(start.scale * (distance / start.distance), midpointX, midpointY);
        };

        const handleTouchEnd = (): void => {
            touchStartRef.current = null;
        };

        if (isPinchZoomEnabled) {
            grid.addEventListener('wheel', handleWheel, { passive: false });
        }
        if (isTouchZoomEnabled) {
            grid.addEventListener('touchstart', handleTouchStart, { passive: false });
            grid.addEventListener('touchmove', handleTouchMove, { passive: false });
            grid.addEventListener('touchend', handleTouchEnd);
            grid.addEventListener('touchcancel', handleTouchEnd);
        }

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            grid.removeEventListener('wheel', handleWheel);
            grid.removeEventListener('touchstart', handleTouchStart);
            grid.removeEventListener('touchmove', handleTouchMove);
            grid.removeEventListener('touchend', handleTouchEnd);
            grid.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [focalRef, gridRef, isPinchZoomEnabled, isTouchZoomEnabled, scaleRef]);
}
