import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaSettingsMenuGuides, { Guide, getLabel } from '../MediaSettingsMenuGuides';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsMenuGuides', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.GUIDES,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsMenuGuides
                    guide={Guide.OFF}
                    isMaskEnabled={false}
                    onGuideChange={jest.fn()}
                    onMaskToggle={jest.fn()}
                    {...props}
                />
            </Settings.Context.Provider>,
        );

    describe('event handlers', () => {
        test('should surface the selected guide on change', async () => {
            const onGuideChange = jest.fn();
            getWrapper({ onGuideChange });

            await userEvent.click(screen.getByRole('menuitemradio', { name: /16x9/ }));

            expect(onGuideChange).toHaveBeenCalledWith(Guide.R_16_9);
        });

        test('should reset the active menu after a guide change', async () => {
            const context = getContext();
            getWrapper({}, context);

            await userEvent.click(screen.getByRole('menuitemradio', { name: /16x9/ }));

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });

        test('should surface mask toggle changes', async () => {
            const onMaskToggle = jest.fn();
            getWrapper({ guide: Guide.R_16_9, onMaskToggle });

            await userEvent.click(screen.getByRole('checkbox'));

            expect(onMaskToggle).toHaveBeenCalledWith(true);
        });
    });

    describe('render', () => {
        test('should render all 10 ratios plus Off', async () => {
            getWrapper();
            const items = await screen.findAllByRole('menuitemradio');
            expect(items).toHaveLength(11);
        });

        test('should not render the mask toggle when guide is Off', () => {
            getWrapper({ guide: Guide.OFF });
            expect(screen.queryByRole('checkbox')).toBeNull();
        });

        test('should render the mask toggle when a guide is selected', () => {
            getWrapper({ guide: Guide.R_16_9 });
            expect(screen.getByRole('checkbox')).toBeInTheDocument();
        });
    });

    describe('getLabel', () => {
        test.each([
            [Guide.OFF, __('media_guides_off')],
            [Guide.R_16_9, '16x9'],
            [Guide.R_2_39_1, '2.39x1'],
        ])('returns %s label as %s', (guide, expected) => {
            expect(getLabel(guide)).toBe(expected);
        });
    });
});
