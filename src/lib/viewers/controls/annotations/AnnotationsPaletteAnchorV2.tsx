import React from 'react';
import { createPortal } from 'react-dom';
import { ControlsLayerContext } from '../controls-layer';
import { PortalContainerContext } from '../../../BlueprintProviders';
import './AnnotationsPaletteAnchorV2.scss';

export type Props = {
    anchorRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
};

type Point = { left: number; top: number };

// Portals the palette out of the controls so it alone can stack above the annotator's layers, pinned to
// the anchor's top-right corner where an end-aligned menu would open
export default function AnnotationsPaletteAnchorV2({ anchorRef, children }: Props): JSX.Element | null {
    const container = React.useContext(PortalContainerContext) ?? document.body;
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [point, setPoint] = React.useState<Point | null>(null);

    React.useLayoutEffect(() => {
        const anchorEl = anchorRef.current;

        if (!anchorEl) {
            return undefined;
        }

        const updatePoint = (): void => {
            const anchorRect = anchorEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const left = anchorRect.right - containerRect.left;
            const top = anchorRect.top - containerRect.top;

            setPoint(prev => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
        };

        updatePoint();

        const observer = new ResizeObserver(updatePoint);
        observer.observe(container);

        return (): void => observer.disconnect();
    }, [anchorRef, container]);

    // The palette is outside the controls layer, so the layer is held open to keep the anchor in view
    React.useEffect(() => {
        setIsForced(true);

        return (): void => setIsForced(false);
    }, [setIsForced]);

    if (!point) {
        return null;
    }

    return createPortal(
        <div
            className="bp-AnnotationsPaletteAnchorV2"
            data-testid="bp-AnnotationsPaletteAnchorV2"
            style={{ left: point.left, top: point.top }}
        >
            {children}
        </div>,
        container,
    );
}
