import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import DocControlsV2 from '../DocControlsV2';
import { AnnotationMode } from '../../../types';
import { Props } from '../DocControls';

describe('DocControlsV2', () => {
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
            { wrapper: BlueprintProviders },
        );

    describe('render', () => {
        test('should render the controls inside the Blueprint toolbar', () => {
            getWrapper();

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByTitle(__('zoom_in')));
            expect(toolbar).toContainElement(screen.getByTitle(__('enter_fullscreen')));
            expect(toolbar).toContainElement(screen.getByTitle(__('previous_page')));
        });

        test('should pass down props to the controls', async () => {
            const onFullscreenToggle = jest.fn();
            const onZoomIn = jest.fn();
            getWrapper({ onFullscreenToggle, onZoomIn });

            await userEvent.click(screen.getByTitle(__('zoom_in')));
            await userEvent.click(screen.getByTitle(__('enter_fullscreen')));

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

            expect(screen.queryByTitle(__('toggle_thumbnails'))).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('toggle_findbar'))).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('previous_page'))).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('rotate_left'))).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('zoom_in'))).not.toBeInTheDocument();
        });

        test('should keep zoom while the gallery is open if gallery zoom is enabled', () => {
            getWrapper({ hasGalleryZoom: true, isGalleryOpen: true });

            expect(screen.getByTitle(__('zoom_in'))).toBeInTheDocument();
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

        test('should hide the markup toggle and the palette while the gallery is open', () => {
            getWrapper({ ...annotationProps, annotationMode: AnnotationMode.REGION, isGalleryOpen: true });

            expect(screen.queryByRole('button', { name: __('annotation_tools') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });
    });
});
