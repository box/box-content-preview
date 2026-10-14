import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import DocControlsV2 from '../DocControlsV2';
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
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
            expect(toolbar).toContainElement(screen.getByTitle(__('previous_page')));
        });

        test('should pass down props to the controls', async () => {
            const onFullscreenToggle = jest.fn();
            const onZoomIn = jest.fn();
            getWrapper({ onFullscreenToggle, onZoomIn });

            await userEvent.click(screen.getByTitle(__('zoom_in')));
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
            expect(screen.queryByTitle(__('previous_page'))).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('rotate_left') })).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('zoom_in'))).not.toBeInTheDocument();
        });

        test('should keep zoom while the gallery is open if gallery zoom is enabled', () => {
            getWrapper({ hasGalleryZoom: true, isGalleryOpen: true });

            expect(screen.getByTitle(__('zoom_in'))).toBeInTheDocument();
        });
    });
});
