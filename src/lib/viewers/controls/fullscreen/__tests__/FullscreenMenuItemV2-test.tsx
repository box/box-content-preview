import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsOverflowMenuV2 from '../../controls-bar/ControlsOverflowMenuV2';
import fullscreen from '../../../../Fullscreen';
import FullscreenMenuItemV2 from '../FullscreenMenuItemV2';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('FullscreenMenuItemV2', () => {
    beforeAll(() => {
        mockResizeObserver();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const renderMenu = async (onFullscreenToggle = jest.fn()) => {
        const user = userEvent.setup();

        render(
            <Toolbar.Root aria-label="Controls">
                <ControlsOverflowMenuV2
                    items={[
                        {
                            control: <span />,
                            id: 'fullscreen',
                            menu: <FullscreenMenuItemV2 onFullscreenToggle={onFullscreenToggle} />,
                            priority: 2,
                        },
                    ]}
                />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

        await user.click(screen.getByRole('button', { name: __('controls_more') }));

        return user;
    };

    test('should enter fullscreen from the menu with the menu trigger and show the F shortcut', async () => {
        const onFullscreenToggle = jest.fn();
        const user = await renderMenu(onFullscreenToggle);
        const row = screen.getByRole('menuitem', { name: __('enter_fullscreen') });

        expect(row).toHaveAttribute('aria-keyshortcuts', 'F');
        expect(row).toHaveAttribute('data-resin-target', 'fullscreen');

        await user.click(row);

        expect(onFullscreenToggle).toHaveBeenCalledWith(
            true,
            screen.getByRole('button', { name: __('controls_more') }),
        );
    });

    test('should offer to exit fullscreen while in fullscreen', async () => {
        jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

        await renderMenu();

        expect(screen.getByRole('menuitem', { name: __('exit_fullscreen') })).toBeInTheDocument();
    });
});
