import React from 'react';
import { act, render, screen } from '@testing-library/react';
import BlueprintProviders from '../../../../BlueprintProviders';
import ResponsiveControlsBarV2 from '../ResponsiveControlsBarV2';
import { ALWAYS_OVERFLOW, ControlsBarItem } from '../useControlsOverflow';

describe('ResponsiveControlsBarV2', () => {
    let container: HTMLDivElement;
    let containerWidth: number;
    let resizeCallbacks: Map<Element, () => void>;

    class ResizeObserverMock {
        callback: () => void;

        constructor(callback: () => void) {
            this.callback = callback;
        }

        disconnect = jest.fn();

        observe = (element: Element): void => {
            resizeCallbacks.set(element, this.callback);
        };

        unobserve = jest.fn();
    }

    const item = (id: string, priority?: number): ControlsBarItem => ({
        control: <button type="button">{`${id} control`}</button>,
        id,
        menu: priority === undefined ? undefined : <div>{`${id} menu`}</div>,
        priority,
    });

    beforeEach(() => {
        containerWidth = 0;
        resizeCallbacks = new Map();
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

        container = document.createElement('div');
        container.className = 'bp-content';
        Object.defineProperty(container, 'clientWidth', { get: () => containerWidth });
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        jest.restoreAllMocks();
    });

    const getWrapper = (items: ControlsBarItem[]) =>
        render(<ResponsiveControlsBarV2 items={items} />, {
            wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
        });
    const getTrigger = () => screen.queryByRole('button', { name: __('controls_more') });
    const resize = (width: number): void => {
        containerWidth = width;
        act(() => resizeCallbacks.get(container)?.());
    };

    test('should render each control on the dark toolbar in order, without a menu if nothing collapses', () => {
        // An unmeasured container has no width yet, so nothing collapses
        getWrapper([item('a', 1), item('b')]);

        const toolbar = screen.getByRole('toolbar');
        const slots = Array.from(toolbar.querySelectorAll('[data-overflow-id]'));

        expect(toolbar).toHaveAttribute('data-color-scheme', 'dark');
        expect(slots.map(slot => slot.getAttribute('data-overflow-id'))).toEqual(['a', 'b']);
        expect(slots[0]).toHaveClass('bp-ResponsiveControlsBarV2-item');
        expect(slots[0]).toContainElement(screen.getByRole('button', { name: 'a control' }));
        expect(getTrigger()).not.toBeInTheDocument();
    });

    test('should render nothing without controls', () => {
        getWrapper([]);

        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    test('should move the controls that always overflow behind the menu trigger at the end of the bar', () => {
        getWrapper([item('a', ALWAYS_OVERFLOW), item('b', ALWAYS_OVERFLOW), item('c')]);

        const toolbar = screen.getByRole('toolbar');

        expect(screen.queryByRole('button', { name: 'a control' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'b control' })).not.toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'a b');
        expect(toolbar.lastElementChild).toBe(getTrigger());
    });

    test('should collapse controls as the viewer narrows and restore them as it widens', () => {
        resize(200);
        getWrapper([item('a', 1), item('b')]);

        expect(screen.getByRole('button', { name: 'a control' })).toBeInTheDocument();
        expect(getTrigger()).not.toBeInTheDocument();

        // Two unmeasured buttons and the edge margin
        resize(103);

        expect(screen.queryByRole('button', { name: 'a control' })).not.toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'a');

        resize(104);

        expect(screen.getByRole('button', { name: 'a control' })).toBeInTheDocument();
        expect(getTrigger()).not.toBeInTheDocument();
    });

    test('should collapse controls based on their measured widths', () => {
        jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(50);
        // Two unmeasured buttons would fit
        containerWidth = 139;
        getWrapper([item('a', 1), item('b')]);

        expect(screen.queryByRole('button', { name: 'a control' })).not.toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'a');
    });

    test('should measure the viewer content if there is no portal container', () => {
        containerWidth = 41;
        render(<ResponsiveControlsBarV2 items={[item('a', 1), item('b')]} />, {
            container: container.appendChild(document.createElement('div')),
            wrapper: BlueprintProviders,
        });

        expect(screen.queryByRole('button', { name: 'a control' })).not.toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'a');
    });

    test('should find the viewer content once controls arrive after rendering none', () => {
        containerWidth = 41;
        const { rerender } = render(<ResponsiveControlsBarV2 items={[]} />, {
            container: container.appendChild(document.createElement('div')),
            wrapper: BlueprintProviders,
        });

        rerender(<ResponsiveControlsBarV2 items={[item('a', 1), item('b')]} />);

        expect(screen.queryByRole('button', { name: 'a control' })).not.toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'a');
    });
});
