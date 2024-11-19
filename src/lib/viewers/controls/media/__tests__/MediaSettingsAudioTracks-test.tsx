import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import audioTracks from '../__mocks__/audioTracks';
import MediaSettingsAudioTracks from '../MediaSettingsAudioTracks';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsAudioTracks', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsAudioTracks
                    audioTrack={1}
                    audioTracks={audioTracks}
                    onAudioTrackChange={jest.fn()}
                    {...props}
                />
            </Settings.Context.Provider>,
        );

    const getRadioItems = async () => screen.findAllByRole('menuitemradio');

    describe('event handlers', () => {
        test('should surface the selected item on change', async () => {
            const onAudioTrackChange = jest.fn();
            getWrapper({ onAudioTrackChange });
            const [radio0] = await getRadioItems();

            await userEvent.click(radio0);

            expect(onAudioTrackChange).toHaveBeenCalledWith(0);
        });

        test('should reset the active menu on change', async () => {
            const context = getContext();
            getWrapper({}, context);
            const [radio0] = await getRadioItems();

            await userEvent.click(radio0);

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should not render if audiotracks is <= 1', () => {
            getWrapper({ audioTracks: [] });
            const menu = screen.queryByRole('menu');

            expect(menu).toBeNull();
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const menu = await screen.findByRole('menu');
            const menuBack = await screen.findByRole('menuitem');
            const [radio0, radio1] = await getRadioItems();

            expect(menu).toBeInTheDocument();
            expect(menuBack).toBeInTheDocument();
            expect(radio0).toBeInTheDocument();
            expect(radio1).toBeInTheDocument();
        });
    });
});
