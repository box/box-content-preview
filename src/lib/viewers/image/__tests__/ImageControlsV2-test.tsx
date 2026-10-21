import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import fullscreen from '../../../Fullscreen';
import ImageControlsV2 from '../ImageControlsV2';
import { AnnotationMode } from '../../../types';
import { Props } from '../ImageControls';

describe('ImageControlsV2', () => {
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

    beforeEach(() => {
        containerWidth = 0;
        resizeCallbacks = new Map();
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

        container = document.createElement('div');
        Object.defineProperty(container, 'clientWidth', { get: () => containerWidth });
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        jest.restoreAllMocks();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <ImageControlsV2
                onAnnotationColorChange={jest.fn()}
                onFullscreenToggle={jest.fn()}
                onRotateLeft={jest.fn()}
                onZoomIn={jest.fn()}
                onZoomOut={jest.fn()}
                {...props}
            />,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getMoreOptions = () => screen.queryByRole('button', { name: __('controls_more') });
    const resize = (width: number): void => {
        containerWidth = width;
        act(() => resizeCallbacks.get(container)?.());
    };

    describe('render', () => {
        test('should render zoom, rotate and fullscreen in the Blueprint toolbar', () => {
            getWrapper();

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_in') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('rotate_left') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
            expect(getMoreOptions()).not.toBeInTheDocument();
        });

        test('should pass down props to the controls', async () => {
            const onFullscreenToggle = jest.fn();
            const onRotateLeft = jest.fn();
            const onZoomIn = jest.fn();
            getWrapper({ onFullscreenToggle, onRotateLeft, onZoomIn });

            await userEvent.click(screen.getByRole('button', { name: __('zoom_in') }));
            await userEvent.click(screen.getByRole('button', { name: __('rotate_left') }));
            await userEvent.click(screen.getByRole('button', { name: __('enter_fullscreen') }));

            expect(onZoomIn).toHaveBeenCalled();
            expect(onRotateLeft).toHaveBeenCalled();
            expect(onFullscreenToggle).toHaveBeenCalled();
        });
    });

    describe('overflow', () => {
        test('should collapse rotate and fullscreen, then zoom as the viewer narrows', () => {
            getWrapper();

            // Zoom, rotate and fullscreen as unmeasured buttons, plus the edge margin
            resize(136);
            expect(getMoreOptions()).not.toBeInTheDocument();

            // The trigger takes the space rotate frees up, so fullscreen collapses along with it
            resize(135);
            expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'rotate fullscreen');

            resize(103);
            expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'zoom rotate fullscreen');
        });

        test('should list the collapsed controls with the image rotate label and the shortcuts', async () => {
            const user = userEvent.setup();
            containerWidth = 41;
            getWrapper();

            await user.click(getMoreOptions() as HTMLElement);

            expect(screen.getAllByRole('menuitem').map(row => row.getAttribute('aria-keyshortcuts'))).toEqual([
                null,
                null,
                'R',
                'F',
            ]);
            expect(screen.getByRole('menuitem', { name: __('zoom_in') })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: __('zoom_out') })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: __('controls_rotate_image') })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: __('enter_fullscreen') })).toBeInTheDocument();
        });

        test('should rotate from the menu', async () => {
            const user = userEvent.setup();
            const onRotateLeft = jest.fn();
            containerWidth = 41;
            getWrapper({ onRotateLeft });

            await user.click(getMoreOptions() as HTMLElement);
            await user.click(screen.getByRole('menuitem', { name: __('controls_rotate_image') }));

            expect(onRotateLeft).toHaveBeenCalledWith();
        });

        test('should keep the markup toggle on the bar at any width', () => {
            containerWidth = 41;
            getWrapper({ hasRegion: true });

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('annotation_tools') }));
            expect(toolbar.lastElementChild).toBe(getMoreOptions());
        });
    });

    describe('annotations', () => {
        const annotationProps = { hasDrawing: true, hasRegion: true };

        test('should render the markup toggle on the main bar and start region mode first', async () => {
            const onAnnotationModeClick = jest.fn();
            getWrapper({ ...annotationProps, onAnnotationModeClick });

            const toggle = screen.getByRole('button', { name: __('annotation_tools') });

            expect(screen.getByRole('toolbar')).toContainElement(toggle);
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();

            await userEvent.click(toggle);

            expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
        });

        test('should open the palette with the drawing colors while drawing', () => {
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.DRAWING });

            const [mainBar, paletteBar] = screen.getAllByRole('toolbar');

            expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toContainElement(paletteBar);
            expect(mainBar).not.toContainElement(screen.getByTestId('bp-AnnotationsControls-drawBtn'));
            expect(paletteBar).toContainElement(screen.getByTestId('bp-color-picker-control'));
            expect(screen.getAllByRole('radio').map(button => button.dataset.testid)).toEqual([
                'bp-AnnotationsControls-regionBtn',
                'bp-AnnotationsControls-drawBtn',
            ]);
        });

        test('should render no annotation controls or separator if no mode is enabled', () => {
            getWrapper({ annotationMode: AnnotationMode.REGION });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
            expect(screen.queryByRole('separator')).not.toBeInTheDocument();
        });

        test('should hide the annotation controls while in fullscreen', () => {
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });
    });
});
