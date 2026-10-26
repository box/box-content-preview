import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsOverflowMenuV2 from '../../controls-bar/ControlsOverflowMenuV2';
import ZoomMenuItemsV2 from '../ZoomMenuItemsV2';
import { replacePlaceholders } from '../../../../util';
import { Props } from '../ZoomControls';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('ZoomMenuItemsV2', () => {
    beforeAll(() => {
        mockResizeObserver();
    });

    const renderMenu = async (props: Partial<Props> = {}) => {
        const user = userEvent.setup();

        render(
            <Toolbar.Root aria-label="Controls">
                <ControlsOverflowMenuV2
                    items={[
                        {
                            control: null,
                            id: 'zoom',
                            menu: <ZoomMenuItemsV2 onZoomIn={jest.fn()} onZoomOut={jest.fn()} {...props} />,
                        },
                    ]}
                />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

        await user.click(screen.getByRole('button', { name: __('controls_more') }));

        return user;
    };
    const getZoomIn = () => screen.getByRole('menuitem', { name: __('zoom_in') });
    const getZoomOut = () => screen.getByRole('menuitem', { name: __('zoom_out') });

    test('should render the current scale above zoom in and zoom out with the default resin targets', async () => {
        await renderMenu({ scale: 0.45 });

        expect(screen.getByTestId('bp-ZoomMenuItems-scale')).toHaveTextContent(
            replacePlaceholders(__('controls_zoom_scale'), ['45%']),
        );
        expect(screen.getByRole('menuitem', { name: __('zoom_out') }).nextElementSibling).toBe(
            screen.getByRole('separator'),
        );
        expect(screen.getAllByRole('menuitem').map(row => row.textContent)).toEqual([__('zoom_in'), __('zoom_out')]);
        expect(getZoomIn()).toHaveAttribute('data-resin-target', 'zoomIn');
        expect(getZoomOut()).toHaveAttribute('data-resin-target', 'zoomOut');
    });

    test('should allow hosts to override the resin targets', async () => {
        await renderMenu({ resinTargetZoomIn: 'galleryZoomIn', resinTargetZoomOut: 'galleryZoomOut' });

        expect(getZoomIn()).toHaveAttribute('data-resin-target', 'galleryZoomIn');
        expect(getZoomOut()).toHaveAttribute('data-resin-target', 'galleryZoomOut');
    });

    test('should zoom without passing the menu trigger along and keep the menu open', async () => {
        const onZoomIn = jest.fn();
        const onZoomOut = jest.fn();
        const user = await renderMenu({ onZoomIn, onZoomOut });

        await user.click(getZoomIn());
        await user.click(getZoomOut());

        expect(onZoomIn).toHaveBeenCalledWith();
        expect(onZoomOut).toHaveBeenCalledWith();
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    test.each`
        scale  | zoomIn   | zoomOut
        ${0.1} | ${false} | ${true}
        ${1}   | ${false} | ${false}
        ${100} | ${true}  | ${false}
    `('should disable the rows at the zoom limits for $scale', async ({ scale, zoomIn, zoomOut }) => {
        await renderMenu({ scale });

        expect(getZoomIn().getAttribute('aria-disabled') === 'true').toBe(zoomIn);
        expect(getZoomOut().getAttribute('aria-disabled') === 'true').toBe(zoomOut);
    });
});
