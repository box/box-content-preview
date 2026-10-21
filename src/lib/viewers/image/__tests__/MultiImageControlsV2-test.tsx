import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import MultiImageControlsV2 from '../MultiImageControlsV2';
import { Props } from '../MultiImageControls';

describe('MultiImageControlsV2', () => {
    let container: HTMLDivElement;
    let containerWidth: number;

    class ResizeObserverMock {
        disconnect = jest.fn();

        observe = jest.fn();

        unobserve = jest.fn();
    }

    beforeEach(() => {
        containerWidth = 0;
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

        container = document.createElement('div');
        Object.defineProperty(container, 'clientWidth', { get: () => containerWidth });
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <MultiImageControlsV2
                onFullscreenToggle={jest.fn()}
                onPageChange={jest.fn()}
                onPageSubmit={jest.fn()}
                onZoomIn={jest.fn()}
                onZoomOut={jest.fn()}
                pageCount={3}
                pageNumber={1}
                {...props}
            />,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getMoreOptions = () => screen.queryByRole('button', { name: __('controls_more') });

    test('should render page, zoom and fullscreen in the Blueprint toolbar', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('previous_page') }));
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_in') }));
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
        expect(getMoreOptions()).not.toBeInTheDocument();
    });

    test('should pass down props to the controls', async () => {
        const onFullscreenToggle = jest.fn();
        const onPageChange = jest.fn();
        const onZoomIn = jest.fn();
        getWrapper({ onFullscreenToggle, onPageChange, onZoomIn });

        await userEvent.click(screen.getByRole('button', { name: __('next_page') }));
        await userEvent.click(screen.getByRole('button', { name: __('zoom_in') }));
        await userEvent.click(screen.getByRole('button', { name: __('enter_fullscreen') }));

        expect(onPageChange).toHaveBeenCalledWith(2);
        expect(onZoomIn).toHaveBeenCalled();
        expect(onFullscreenToggle).toHaveBeenCalled();
    });

    test('should not render page controls for a single page', () => {
        getWrapper({ pageCount: 1 });

        expect(screen.queryByRole('button', { name: __('previous_page') })).not.toBeInTheDocument();
    });

    test('should keep page on the bar and list zoom and fullscreen in the menu when narrow', async () => {
        const user = userEvent.setup();
        containerWidth = 41;
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('previous_page') }));
        expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'zoom fullscreen');

        await user.click(getMoreOptions() as HTMLElement);

        expect(screen.getByRole('menuitem', { name: __('zoom_in') })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: __('enter_fullscreen') })).toHaveAttribute(
            'aria-keyshortcuts',
            'F',
        );
    });
});
