import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsOverflowMenuV2 from '../../controls-bar/ControlsOverflowMenuV2';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggleV2 from '../FullscreenToggleV2';
import getFullscreenItem from '../getFullscreenItem';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('getFullscreenItem', () => {
    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const renderMenu = async (onFullscreenToggle = jest.fn()) => {
        const user = userEvent.setup();

        render(
            <Toolbar.Root aria-label="Controls">
                <ControlsOverflowMenuV2 items={[getFullscreenItem({ onFullscreenToggle }, 2)]} />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

        await user.click(screen.getByRole('button', { name: __('controls_more') }));

        return user;
    };

    test('should render the fullscreen toggle on the bar', () => {
        const onFullscreenToggle = jest.fn();

        expect(getFullscreenItem({ onFullscreenToggle }, 2)).toMatchObject({
            control: <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />,
            id: 'fullscreen',
            priority: 2,
        });
    });

    test('should leave out the menu form if fullscreen has no priority', () => {
        const item = getFullscreenItem({ onFullscreenToggle: jest.fn() });

        expect(item.menu).toBe(false);
        expect(item.priority).toBeUndefined();
    });

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
