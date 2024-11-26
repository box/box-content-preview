import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaSettingsMenuRate from '../MediaSettingsMenuRate';
import Settings, { Context, Menu } from '../../settings';

describe('SettingsRate', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsMenuRate onRateChange={jest.fn()} rate="1.0" {...props} />
            </Settings.Context.Provider>,
        );

    const getRadioItemByName = async (name: string) => screen.getByRole('menuitemradio', { name });

    describe('event handlers', () => {
        test('should surface the selected item on change', async () => {
            const onRateChange = jest.fn();
            getWrapper({ onRateChange });

            const radioItem = await getRadioItemByName('2.0');
            await userEvent.click(radioItem);

            expect(onRateChange).toHaveBeenCalledWith('2.0');
        });

        test('should reset the active menu on change', async () => {
            const context = getContext();
            getWrapper({}, context);

            const radioItem = await getRadioItemByName('2.0');
            await userEvent.click(radioItem);

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const menu = await screen.findByRole('menu');
            const menuBack = await screen.findByRole('menuitem', { name: __('media_speed') });

            expect(menu).toBeInTheDocument();
            expect(menuBack).toBeInTheDocument();
            expect(await getRadioItemByName('0.5')).toBeInTheDocument();
            expect(await getRadioItemByName(__('media_speed_normal'))).toBeInTheDocument();
            expect(await getRadioItemByName('1.25')).toBeInTheDocument();
            expect(await getRadioItemByName('1.5')).toBeInTheDocument();
            expect(await getRadioItemByName('2.0')).toBeInTheDocument();
        });
    });
});
