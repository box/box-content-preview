import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaSettingsMenu from '../MediaSettingsMenuAutoplay';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsMenuAutoplay', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsMenu autoplay onAutoplayChange={jest.fn()} {...props} />
            </Settings.Context.Provider>,
        );

    const getMenuBack = async () => screen.findByRole('menuitem', { name: __('media_autoplay') });
    const getEnabledRadioItem = async () => screen.findByRole('menuitemradio', { name: __('media_autoplay_enabled') });
    const getDisabledRadioItem = async () =>
        screen.findByRole('menuitemradio', { name: __('media_autoplay_disabled') });

    describe('event handlers', () => {
        test('should surface the selected item on change', async () => {
            const onAutoplayChange = jest.fn();
            getWrapper({ onAutoplayChange });
            const enabledRadioItem = await getEnabledRadioItem();

            await userEvent.click(enabledRadioItem);

            expect(onAutoplayChange).toHaveBeenCalledWith(true);
        });

        test('should reset the active menu on change', async () => {
            const context = getContext();
            getWrapper({}, context);
            const enabledRadioItem = screen.getByRole('menuitemradio', { name: __('media_autoplay_enabled') });

            await userEvent.click(enabledRadioItem);

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const menuBack = await getMenuBack();
            const enabledRadioItem = await getEnabledRadioItem();
            const disabledRadioItem = await getDisabledRadioItem();

            expect(menuBack).toBeInTheDocument();
            expect(enabledRadioItem).toBeInTheDocument();
            expect(disabledRadioItem).toBeInTheDocument();
        });
    });
});
