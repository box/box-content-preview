import React from 'react';
import { CLASS_BOX_PREVIEW_CONTENT } from '../../../constants';

// Blueprint's toolbar spaces its items by --bp-space-020, which the fit math has to include.
const GAP = 4;
// A toolbar icon button, used for the overflow trigger and as the estimate for any control that
// has not been measured yet.
const BUTTON_WIDTH = 32;
// Blueprint pads the bar itself, which counts against the space the controls have to fit in.
const BAR_PADDING = 16;
// Roughly the breathing room the mocks leave between the bar and the edges of the viewer.
const EDGE_MARGIN = 40;

// Controls collapse into the overflow menu in ascending priority.
export const ALWAYS_OVERFLOW = 0;
export const ALWAYS_VISIBLE = Number.MAX_SAFE_INTEGER;

export type ControlsBarItem = {
    control: React.ReactNode;
    id: string;
    // A control with no menu form cannot collapse, whatever its priority.
    menu?: React.ReactNode;
    priority: number;
};

export type ControlsOverflow = {
    barRef: React.RefObject<HTMLDivElement>;
    overflowItems: ControlsBarItem[];
    visibleItems: ControlsBarItem[];
};

export default function useControlsOverflow(items: ControlsBarItem[]): ControlsOverflow {
    const barRef = React.useRef<HTMLDivElement>(null);
    const widthsRef = React.useRef(new Map<string, number>());
    const [availableWidth, setAvailableWidth] = React.useState(Number.POSITIVE_INFINITY);
    const [, forceUpdate] = React.useReducer((count: number): number => count + 1, 0);

    // A control can only be measured while it is on the bar, so cache each width as it renders and
    // reuse it to decide whether that control would fit again.
    React.useLayoutEffect(() => {
        const bar = barRef.current;

        if (!bar) {
            return;
        }

        let hasChanged = false;

        bar.querySelectorAll<HTMLElement>('[data-overflow-id]').forEach(element => {
            const { overflowId } = element.dataset;
            const { offsetWidth } = element;

            if (overflowId && offsetWidth && widthsRef.current.get(overflowId) !== offsetWidth) {
                widthsRef.current.set(overflowId, offsetWidth);
                hasChanged = true;
            }
        });

        if (hasChanged) {
            forceUpdate();
        }
    });

    React.useEffect(() => {
        const bar = barRef.current;
        // An absolutely positioned wrapper centers the bar and shrinks to fit it, so the space the
        // bar can grow into is the viewer's rather than its parent's. Anything rendering the bar
        // outside a viewer, the POC harness included, measures against the page.
        const container = bar?.closest(`.${CLASS_BOX_PREVIEW_CONTENT}`) ?? bar?.ownerDocument.body;

        if (!container || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(([entry]) => {
            setAvailableWidth(entry.contentRect.width - EDGE_MARGIN);
        });

        observer.observe(container);

        return (): void => observer.disconnect();
    }, []);

    const widthOf = ({ id }: ControlsBarItem): number => (widthsRef.current.get(id) ?? BUTTON_WIDTH) + GAP;
    const overflowIds = new Set(items.filter(({ priority }) => priority === ALWAYS_OVERFLOW).map(({ id }) => id));

    let width = items.reduce((total, item) => (overflowIds.has(item.id) ? total : total + widthOf(item)), BAR_PADDING);

    if (overflowIds.size) {
        width += BUTTON_WIDTH + GAP;
    }

    items
        .filter(item => item.menu && item.priority !== ALWAYS_OVERFLOW && item.priority !== ALWAYS_VISIBLE)
        .sort((a, b) => a.priority - b.priority)
        .forEach(item => {
            if (width <= availableWidth) {
                return;
            }

            if (!overflowIds.size) {
                // Collapsing the first control is what brings the trigger onto the bar.
                width += BUTTON_WIDTH + GAP;
            }

            overflowIds.add(item.id);
            width -= widthOf(item);
        });

    return {
        barRef,
        overflowItems: items.filter(({ id }) => overflowIds.has(id)),
        visibleItems: items.filter(({ id }) => !overflowIds.has(id)),
    };
}
