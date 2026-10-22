import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import DocControlsV2 from '../DocControlsV2';
import fullscreen from '../../../Fullscreen';
import { AnnotationColor } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';
import { replacePlaceholders } from '../../../util';
import { Props } from '../DocControls';

describe('DocControlsV2', () => {
    const originalMatchMedia = window.matchMedia;
    let container: HTMLDivElement;
    let containerWidth: number;
    let isLargeViewport: boolean;
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
        isLargeViewport = true;
        resizeCallbacks = new Map();
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
            addEventListener: jest.fn(),
            matches: isLargeViewport,
            media: query,
            removeEventListener: jest.fn(),
        }));

        container = document.createElement('div');
        Object.defineProperty(container, 'clientWidth', { get: () => containerWidth });
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        window.matchMedia = originalMatchMedia;
        jest.restoreAllMocks();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <DocControlsV2
                onAnnotationColorChange={jest.fn()}
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
    const resize = (width: number): void => {
        containerWidth = width;
        act(() => resizeCallbacks.get(container)?.());
    };

    describe('render', () => {
        test('should render the controls inside the Blueprint toolbar', () => {
            getWrapper();

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_in') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('previous_page') }));
        });

        test('should pass down props to the controls', async () => {
            const onFullscreenToggle = jest.fn();
            const onZoomIn = jest.fn();
            getWrapper({ onFullscreenToggle, onZoomIn });

            await userEvent.click(screen.getByRole('button', { name: __('zoom_in') }));
            await userEvent.click(screen.getByRole('button', { name: __('enter_fullscreen') }));

            expect(onZoomIn).toHaveBeenCalled();
            expect(onFullscreenToggle).toHaveBeenCalled();
        });

        test('should hide the document-only controls while the gallery is open', () => {
            getWrapper({
                isGalleryOpen: true,
                onFindBarToggle: jest.fn(),
                onRotateLeft: jest.fn(),
                onThumbnailsToggle: jest.fn(),
            });

            expect(screen.queryByRole('button', { name: __('toggle_thumbnails') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('toggle_findbar') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('previous_page') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('rotate_left') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('zoom_in') })).not.toBeInTheDocument();
        });

        test('should keep zoom while the gallery is open if gallery zoom is enabled', () => {
            getWrapper({ hasGalleryZoom: true, isGalleryOpen: true });

            expect(screen.getByRole('button', { name: __('zoom_in') })).toBeInTheDocument();
        });

        test('should render the thumbnails toggle if the thumbnails sidebar can open', () => {
            getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(screen.getByRole('toolbar')).toContainElement(
                screen.getByRole('button', { name: __('toggle_thumbnails') }),
            );
        });

        test('should not render the thumbnails toggle on viewports too narrow for the thumbnails sidebar', () => {
            isLargeViewport = false;
            getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(screen.queryByRole('button', { name: __('toggle_thumbnails') })).not.toBeInTheDocument();
        });

        test('should not render the thumbnails toggle in fullscreen', () => {
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
            getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(screen.queryByRole('button', { name: __('toggle_thumbnails') })).not.toBeInTheDocument();
        });
    });

    describe('overflow', () => {
        const allControls = {
            onFindBarToggle: jest.fn(),
            onGalleryToggle: jest.fn(),
            onRotateLeft: jest.fn(),
            onThumbnailsToggle: jest.fn(),
        };
        // The visible labels, without the shortcuts that are hidden from the accessible name
        const getMenuRows = () =>
            screen.getAllByRole('menuitem').map(row => {
                const label = row.cloneNode(true) as HTMLElement;
                label.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
                return label.textContent;
            });

        test('should keep find and gallery in the more options menu at every width', async () => {
            const user = userEvent.setup();
            getWrapper(allControls);

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('rotate_left') }));
            expect(screen.queryByRole('button', { name: __('toggle_findbar') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('gallery_view') })).not.toBeInTheDocument();
            expect(toolbar.lastElementChild).toBe(getMoreOptions());

            await user.click(getMoreOptions() as HTMLElement);

            expect(getMenuRows()).toEqual([__('controls_find'), __('controls_view_as_grid')]);
            expect(screen.getByRole('menuitem', { name: __('controls_find') })).toHaveAttribute(
                'data-resin-target',
                'findBar',
            );
            expect(screen.getByRole('menuitem', { name: __('controls_find') })).toHaveAttribute('aria-keyshortcuts');
            expect(screen.getByRole('menuitem', { name: __('controls_view_as_grid') })).toHaveAttribute(
                'data-resin-target',
                'galleryView',
            );
        });

        test('should collapse rotate, then thumbnails and fullscreen, then zoom as the viewer narrows', () => {
            getWrapper(allControls);

            // Thumbnails, page, zoom, rotate, fullscreen, and the trigger as unmeasured buttons, plus the edge margin
            resize(232);
            expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'find gallery');

            resize(231);
            expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'find rotate gallery');

            resize(199);
            expect(getMoreOptions()).toHaveAttribute('data-overflow-ids', 'thumbnails find rotate gallery fullscreen');

            resize(135);
            expect(getMoreOptions()).toHaveAttribute(
                'data-overflow-ids',
                'thumbnails zoom find rotate gallery fullscreen',
            );
            expect(screen.queryByRole('button', { name: __('zoom_in') })).not.toBeInTheDocument();
        });

        test('should list the collapsed controls with thumbnails above a separator and the zoom scale', async () => {
            const user = userEvent.setup();
            containerWidth = 41;
            getWrapper({ ...allControls, scale: 0.45 });

            await user.click(getMoreOptions() as HTMLElement);

            const menu = screen.getByRole('menu');
            const thumbnails = screen.getByRole('menuitem', { name: __('controls_show_thumbnails') });
            const [thumbnailsSeparator, zoomSeparator] = screen.getAllByRole('separator');

            expect(thumbnails.nextElementSibling).toBe(thumbnailsSeparator);
            expect(screen.getByRole('menuitem', { name: __('zoom_out') }).nextElementSibling).toBe(zoomSeparator);
            expect(menu).toHaveTextContent(replacePlaceholders(__('controls_zoom_scale'), ['45%']));
            expect(getMenuRows()).toEqual([
                __('controls_show_thumbnails'),
                __('zoom_in'),
                __('zoom_out'),
                __('controls_find'),
                __('controls_rotate_document'),
                __('controls_view_as_grid'),
                __('enter_fullscreen'),
            ]);
            expect(screen.getByRole('menuitem', { name: __('controls_rotate_document') })).toHaveAttribute(
                'aria-keyshortcuts',
                'R',
            );
            expect(screen.getByRole('menuitem', { name: __('enter_fullscreen') })).toHaveAttribute(
                'aria-keyshortcuts',
                'F',
            );
        });

        test('should keep page and the markup toggle on the bar at any width', () => {
            containerWidth = 41;
            getWrapper({ ...allControls, hasRegion: true });

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('previous_page') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('annotation_tools') }));
            expect(toolbar.lastElementChild).toBe(getMoreOptions());
        });

        test('should hand the menu trigger to the find bar so it can return focus there', async () => {
            const user = userEvent.setup();
            getWrapper(allControls);

            await user.click(getMoreOptions() as HTMLElement);
            await user.click(screen.getByRole('menuitem', { name: __('controls_find') }));

            expect(allControls.onFindBarToggle).toHaveBeenCalledWith(getMoreOptions());
        });

        test('should enter fullscreen from the menu with the menu trigger', async () => {
            const user = userEvent.setup();
            const onFullscreenToggle = jest.fn();
            containerWidth = 41;
            getWrapper({ onFullscreenToggle });

            await user.click(getMoreOptions() as HTMLElement);
            await user.click(screen.getByRole('menuitem', { name: __('enter_fullscreen') }));

            expect(onFullscreenToggle).toHaveBeenCalledWith(true, getMoreOptions());
        });

        test('should zoom from the menu without passing the menu trigger along', async () => {
            const user = userEvent.setup();
            const onZoomIn = jest.fn();
            containerWidth = 41;
            getWrapper({ onZoomIn });

            await user.click(getMoreOptions() as HTMLElement);
            await user.click(screen.getByRole('menuitem', { name: __('zoom_in') }));

            expect(onZoomIn).toHaveBeenCalledWith();
        });

        test('should show the grid button and no more options menu while the gallery is open', async () => {
            const user = userEvent.setup();
            const onGalleryToggle = jest.fn();
            containerWidth = 41;
            getWrapper({ hasGalleryZoom: true, isGalleryOpen: true, onFullscreenToggle: jest.fn(), onGalleryToggle });

            const toolbar = screen.getByRole('toolbar');
            const grid = screen.getByRole('button', { name: __('gallery_view') });

            expect(getMoreOptions()).not.toBeInTheDocument();
            expect(toolbar).toContainElement(grid);
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_in') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));

            await user.click(grid);

            expect(onGalleryToggle).toHaveBeenCalledWith();
        });

        test('should offer to hide the thumbnails while they are open', async () => {
            const user = userEvent.setup();
            containerWidth = 41;
            getWrapper({ isThumbnailsOpen: true, onThumbnailsToggle: jest.fn() });

            await user.click(getMoreOptions() as HTMLElement);

            expect(screen.getByRole('menuitem', { name: __('controls_hide_thumbnails') })).toBeInTheDocument();
        });
    });

    describe('annotations', () => {
        const annotationProps = { hasDrawing: true, hasHighlight: true, hasRegion: true };

        test('should render the markup toggle on the main bar and keep the palette closed', async () => {
            const onAnnotationModeClick = jest.fn();
            getWrapper({ ...annotationProps, onAnnotationModeClick });

            const toggle = screen.getByRole('button', { name: __('annotation_tools') });

            expect(screen.getByRole('toolbar')).toContainElement(toggle);
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();

            await userEvent.click(toggle);

            expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
        });

        test('should open the palette outside the main bar while a mode is active', () => {
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION });

            const [mainBar, paletteBar] = screen.getAllByRole('toolbar');

            expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toContainElement(paletteBar);
            expect(paletteBar).toContainElement(screen.getByTestId('bp-AnnotationsControls-regionBtn'));
            expect(mainBar).not.toContainElement(screen.getByTestId('bp-AnnotationsControls-regionBtn'));
        });

        test('should show the drawing colors in the palette rather than in a bar of their own', () => {
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.DRAWING });

            const [, paletteBar] = screen.getAllByRole('toolbar');

            expect(paletteBar).toContainElement(screen.getByTestId('bp-color-picker-control'));
            expect(screen.getAllByTestId('bp-ControlsBar')).toHaveLength(2);
        });

        test('should change the annotation color when a drawing color is selected', async () => {
            const onAnnotationColorChange = jest.fn();
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.DRAWING, onAnnotationColorChange });

            await userEvent.click(screen.getByRole('button', { name: __('drawing_color_red') }));

            expect(onAnnotationColorChange).toHaveBeenCalledWith(AnnotationColor.WATERMELON_RED);
        });

        test.each([AnnotationMode.HIGHLIGHT, AnnotationMode.REGION])(
            'should not show the drawing colors in %s mode',
            annotationMode => {
                getWrapper({ ...annotationProps, annotationMode });

                expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();
            },
        );

        test.each`
            options                                     | defaultMode                 | testIds
            ${annotationProps}                          | ${AnnotationMode.REGION}    | ${['bp-AnnotationsControls-regionBtn', 'bp-AnnotationsControls-highlightBtn', 'bp-AnnotationsControls-drawBtn']}
            ${{ hasDrawing: true, hasHighlight: true }} | ${AnnotationMode.HIGHLIGHT} | ${['bp-AnnotationsControls-highlightBtn', 'bp-AnnotationsControls-drawBtn']}
            ${{ hasDrawing: true }}                     | ${AnnotationMode.DRAWING}   | ${['bp-AnnotationsControls-drawBtn']}
        `(
            'should offer the same modes on the toggle and the palette with $options',
            async ({ defaultMode, options, testIds }) => {
                const onAnnotationModeClick = jest.fn();
                const { rerender } = getWrapper({ ...options, onAnnotationModeClick });

                await userEvent.click(screen.getByRole('button', { name: __('annotation_tools') }));

                expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: defaultMode });

                rerender(
                    <DocControlsV2
                        {...options}
                        annotationMode={defaultMode}
                        onAnnotationColorChange={jest.fn()}
                        onFullscreenToggle={jest.fn()}
                        onPageChange={jest.fn()}
                        onPageSubmit={jest.fn()}
                        onZoomIn={jest.fn()}
                        onZoomOut={jest.fn()}
                        pageCount={3}
                        pageNumber={1}
                    />,
                );

                expect(screen.getAllByRole('radio').map(button => button.dataset.testid)).toEqual(testIds);
            },
        );

        test('should exit annotations and focus the markup toggle when the exit button is clicked', async () => {
            const onAnnotationModeClick = jest.fn();
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION, onAnnotationModeClick });

            const exitButton = screen.getByRole('button', { name: __('exit_annotations') });

            expect(exitButton.parentElement).toHaveClass('bp-AnnotationsControls-exitBtn');

            await userEvent.click(exitButton);

            expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
            expect(screen.getByRole('button', { name: __('annotation_tools') })).toHaveFocus();
        });

        test('should render no annotation controls or separator if no mode is enabled', () => {
            getWrapper({ annotationMode: AnnotationMode.REGION });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('exit_annotations') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
            expect(screen.queryByRole('separator')).not.toBeInTheDocument();
        });

        test('should hide the annotation controls while in fullscreen', () => {
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });

        test('should hide the markup toggle and the palette while the gallery is open', () => {
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION, isGalleryOpen: true });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });
    });
});
