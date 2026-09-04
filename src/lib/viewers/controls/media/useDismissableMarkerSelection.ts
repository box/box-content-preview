import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

export type DismissableMarkerSelection = {
    containerRef: RefObject<HTMLDivElement>;
    selectMarker: (id: string) => void;
    selectedId: string | null;
};

function eventTargetElement(target: EventTarget | null): Element | null {
    if (target instanceof Element) {
        return target;
    }
    if (target instanceof Text) {
        return target.parentElement;
    }
    return null;
}

/**
 * Optimistic comment-badge selection that clears on pointerdown outside the
 * selected avatar or its cluster. Host `hostSelectedId` can restore a different
 * id; acking the dismissed id must not bring the ring back.
 */
export default function useDismissableMarkerSelection(
    hostSelectedId: string | null = null,
): DismissableMarkerSelection {
    const containerRef = useRef<HTMLDivElement>(null);
    const dismissedIdRef = useRef<string | null>(null);
    const [optimisticSelectedId, setOptimisticSelectedId] = useState<string | null>(null);
    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false);
    const selectedId = optimisticSelectedId ?? (isSelectionDismissed ? null : hostSelectedId);

    useEffect(() => {
        setOptimisticSelectedId(null);
        if (dismissedIdRef.current && hostSelectedId === dismissedIdRef.current) {
            return;
        }
        dismissedIdRef.current = null;
        setIsSelectionDismissed(false);
    }, [hostSelectedId]);

    const selectMarker = useCallback((id: string): void => {
        dismissedIdRef.current = null;
        setIsSelectionDismissed(false);
        setOptimisticSelectedId(id);
    }, []);

    useEffect(() => {
        if (!selectedId) {
            return undefined;
        }

        const isEventInsideSelectedBadge = (target: EventTarget | null): boolean => {
            const container = containerRef.current;
            if (!container) {
                return true;
            }
            const selected = container.querySelector('[data-bp-marker-selected]');
            if (!selected) {
                return true;
            }
            const el = eventTargetElement(target);
            if (!el) {
                return true;
            }
            if (selected.contains(el)) {
                return true;
            }
            const group = el.closest('[data-bp-marker-group]');
            return Boolean(group && group.contains(selected));
        };

        const onDocumentPointerDown = (event: Event): void => {
            if (isEventInsideSelectedBadge(event.target)) {
                return;
            }
            dismissedIdRef.current = selectedId;
            setOptimisticSelectedId(null);
            setIsSelectionDismissed(true);
            const active = document.activeElement;
            if (active instanceof HTMLElement && containerRef.current?.contains(active)) {
                active.blur();
            }
        };

        document.addEventListener('pointerdown', onDocumentPointerDown, true);
        return () => {
            document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        };
    }, [selectedId]);

    return { containerRef, selectMarker, selectedId };
}
