import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaSettingsMenuQuality, { Quality } from '../MediaSettingsMenuQuality';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsMenuQuality', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsMenuQuality onQualityChange={jest.fn()} quality={Quality.AUTO} {...props} />
            </Settings.Context.Provider>,
        );

    const getSdRadioItem = async () => screen.getByRole('menuitemradio', { name: '480p' });
    const getHdRadioItem = async () => screen.getByRole('menuitemradio', { name: '1080p' });
    const getAutoRadioItem = async () => screen.getByRole('menuitemradio', { name: __('media_quality_auto') });

    describe('event handlers', () => {
        test('should surface the selected item on change', async () => {
            const onQualityChange = jest.fn();
            getWrapper({ onQualityChange });

            const sdRadioItem = await getSdRadioItem();
            await userEvent.click(sdRadioItem);

            expect(onQualityChange).toHaveBeenCalledWith('sd');
        });

        test('should reset the active menu on change', async () => {
            const context = getContext();
            getWrapper({}, context);

            const sdRadioItem = await getSdRadioItem();
            await userEvent.click(sdRadioItem);

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should not render if no quality is provided', () => {
            getWrapper({ quality: undefined });
            const menu = screen.queryByRole('menu');

            expect(menu).toBeNull();
        });

        test('should not render if no callback is provided', () => {
            getWrapper({ onQualityChange: undefined });
            const menu = screen.queryByRole('menu');

            expect(menu).toBeNull();
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const menu = await screen.findByRole('menu');
            const menuBack = await screen.findByRole('menuitem');
            const sdRadioItem = await getSdRadioItem();
            const hdRadioItem = await getHdRadioItem();
            const autoRadioItem = await getAutoRadioItem();

            expect(menu).toBeInTheDocument();
            expect(menuBack).toBeInTheDocument();
            expect(sdRadioItem).toBeInTheDocument();
            expect(hdRadioItem).toBeInTheDocument();
            expect(autoRadioItem).toBeInTheDocument();
        });
    });
});
