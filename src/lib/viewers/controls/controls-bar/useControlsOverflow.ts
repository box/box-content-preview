import React from 'react';
import { CLASS_BOX_PREVIEW_CONTENT } from '../../../constants';
import { PortalContainerContext } from '../../../BlueprintProviders';

export const ALWAYS_OVERFLOW = 0;

export type ControlsBarItem = {
    control: React.ReactNode;
    id: string;
    // Without a menu form the control stays on the bar at every width
    menu?: React.ReactNode;
    // Controls collapse in ascending priority, and controls that share a priority collapse together
    priority?: number;
};

export type Metrics = {
    chrome: number;
    gap: number;
    triggerWidth?: number;
    widths: Map<string, number>;
};

export type ControlsOverflow = {
    barRef: React.RefObject<HTMLDivElement>;
    overflowItems: ControlsBarItem[];
    visibleItems: ControlsBarItem[];
};

// The space the mocks leave between the bar and the edges of the viewer
const EDGE_MARGIN = 40;
// One toolbar button, the estimate for a control or the overflow trigger before it has been measured
const DEFAULT_WIDTH = 32;

const isCollapsible = ({ menu, priority }: ControlsBarItem): boolean => !!menu && priority !== undefined;

export function getOverflowIds(items: ControlsBarItem[], availableWidth: number, metrics: Metrics): Set<string> {
    const { chrome, gap, triggerWidth = DEFAULT_WIDTH, widths } = metrics;
    const overflowIds = new Set(
        items.filter(item => isCollapsible(item) && item.priority === ALWAYS_OVERFLOW).map(({ id }) => id),
    );

    const getBarWidth = (): number => {
        const slots = items.filter(({ id }) => !overflowIds.has(id)).map(({ id }) => widths.get(id) ?? DEFAULT_WIDTH);

        if (overflowIds.size) {
            slots.push(triggerWidth);
        }

        return chrome + slots.reduce((total, width) => total + width, 0) + gap * Math.max(slots.length - 1, 0);
    };

    const priorities = items
        .filter(item => isCollapsible(item) && item.priority !== ALWAYS_OVERFLOW)
        .map(({ priority }) => priority as number)
        .sort((a, b) => a - b);

    Array.from(new Set(priorities)).every(priority => {
        if (getBarWidth() <= availableWidth) {
            return false;
        }

        items
            .filter(item => isCollapsible(item) && item.priority === priority)
            .forEach(({ id }) => overflowIds.add(id));

        return true;
    });

    return overflowIds;
}

const getStyleWidth = (style: CSSStyleDeclaration, properties: string[]): number =>
    properties.reduce((total, property) => total + (parseFloat(style.getPropertyValue(property)) || 0), 0);

export default function useControlsOverflow(items: ControlsBarItem[]): ControlsOverflow {
    const barRef = React.useRef<HTMLDivElement>(null);
    const metricsRef = React.useRef<Metrics>({ chrome: 0, gap: 0, widths: new Map() });
    const portalContainer = React.useContext(PortalContainerContext);
    const [availableWidth, setAvailableWidth] = React.useState(Number.POSITIVE_INFINITY);
    const [, forceUpdate] = React.useReducer((count: number): number => count + 1, 0);

    // A control can only be measured while it is on the bar, so each width is cached as it renders and
    // reused to decide whether that control would fit again
    React.useLayoutEffect(() => {
        const bar = barRef.current;

        if (!bar) {
            return;
        }

        const metrics = metricsRef.current;
        const style = window.getComputedStyle(bar);
        const chrome = getStyleWidth(style, [
            'padding-left',
            'padding-right',
            'border-left-width',
            'border-right-width',
        ]);
        const gap = getStyleWidth(style, ['column-gap']);
        let hasChanged = chrome !== metrics.chrome || gap !== metrics.gap;

        metrics.chrome = chrome;
        metrics.gap = gap;

        Array.from(bar.children).forEach(child => {
            const { offsetWidth } = child as HTMLElement;
            const { overflowId, overflowTrigger } = (child as HTMLElement).dataset;

            if (!offsetWidth) {
                return;
            }

            if (overflowId && metrics.widths.get(overflowId) !== offsetWidth) {
                metrics.widths.set(overflowId, offsetWidth);
                hasChanged = true;
            }

            if (overflowTrigger !== undefined && metrics.triggerWidth !== offsetWidth) {
                metrics.triggerWidth = offsetWidth;
                hasChanged = true;
            }
        });

        if (hasChanged) {
            forceUpdate();
        }
    });

    // The bar renders nothing without items, so the viewer lookup reruns once it mounts
    const hasItems = items.length > 0;

    // The controls root is centered and shrinks to fit the bar, so the space the bar can grow into is the
    // viewer's. Fullscreen resizes the viewer too, which the observer picks up.
    React.useLayoutEffect(() => {
        const container =
            portalContainer ?? barRef.current?.closest<HTMLElement>(`.${CLASS_BOX_PREVIEW_CONTENT}`) ?? null;

        if (!container) {
            return undefined;
        }

        const updateAvailableWidth = (): void => {
            const { clientWidth } = container;

            // A container that has not been laid out yet measures zero, which would collapse everything
            setAvailableWidth(clientWidth > 0 ? clientWidth - EDGE_MARGIN : Number.POSITIVE_INFINITY);
        };

        updateAvailableWidth();

        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(updateAvailableWidth);

        observer.observe(container);

        return (): void => observer.disconnect();
    }, [hasItems, portalContainer]);

    const overflowIds = getOverflowIds(items, availableWidth, metricsRef.current);

    return {
        barRef,
        overflowItems: items.filter(({ id }) => overflowIds.has(id)),
        visibleItems: items.filter(({ id }) => !overflowIds.has(id)),
    };
}
