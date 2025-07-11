import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaSettingsMenuSubtitles from '../MediaSettingsMenuSubtitles';
import Settings, { Context, Menu } from '../../settings';
import subtitles from '../__mocks__/subtitles';

describe('MediaSettingsSubtitles', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <Settings.Context.Provider value={context}>
                <MediaSettingsMenuSubtitles
                    onSubtitleChange={jest.fn()}
                    subtitle={1}
                    subtitles={subtitles}
                    {...props}
                />
            </Settings.Context.Provider>,
        );

    const getRadioItemByName = async (name: string) => screen.findByRole('menuitemradio', { name });

    describe('event handlers', () => {
        test('should surface the selected item on change', async () => {
            const onSubtitleChange = jest.fn();
            getWrapper({ onSubtitleChange });
            const radioItem = await getRadioItemByName(subtitles[0].displayLanguage);

            await userEvent.click(radioItem);

            expect(onSubtitleChange).toHaveBeenCalledWith(0);
        });

        test('should reset the active menu on change', async () => {
            const context = getContext();
            getWrapper({}, context);
            const radioItem = await getRadioItemByName(subtitles[0].displayLanguage);

            await userEvent.click(radioItem);

            expect(context.setActiveMenu).toHaveBeenCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const menuBack = await screen.findByRole('menuitem', { name: `${__('subtitles')}/CC` });
            const offRadioItem = await getRadioItemByName(__('off'));
            const englishRadioItem = await getRadioItemByName(subtitles[0].displayLanguage);
            const spanishRadioItem = await getRadioItemByName(subtitles[1].displayLanguage);

            expect(menuBack).toBeInTheDocument();
            expect(offRadioItem).toBeInTheDocument();
            expect(englishRadioItem).toBeInTheDocument();
            expect(spanishRadioItem).toBeInTheDocument();
        });
    });
});
