import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import Search from '@box/blueprint-web-assets/icons/Medium/Search';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsMenuItemV2, { Props } from '../ControlsMenuItemV2';
import ControlsOverflowMenuV2 from '../ControlsOverflowMenuV2';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('ControlsMenuItemV2', () => {
    beforeAll(() => {
        mockResizeObserver();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <ControlsOverflowMenuV2
                    items={[
                        {
                            control: null,
                            id: 'find',
                            menu: <ControlsMenuItemV2 icon={Search} label="Find" onSelect={jest.fn()} {...props} />,
                        },
                    ]}
                />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );
    const getTrigger = () => screen.getByRole('button', { name: __('controls_more') });
    const openMenu = async (user: ReturnType<typeof userEvent.setup>) => user.click(getTrigger());

    test('should render a row with the label and its resin target', async () => {
        const user = userEvent.setup();
        getWrapper({ 'data-resin-target': 'findBar', 'data-testid': 'find-row' });

        await openMenu(user);

        const row = screen.getByRole('menuitem', { name: 'Find' });

        expect(row).toHaveAttribute('data-resin-target', 'findBar');
        expect(row).toHaveAttribute('data-testid', 'find-row');
    });

    test('should hand the menu trigger to the handler and close the menu', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        getWrapper({ onSelect });

        await openMenu(user);
        await user.click(screen.getByRole('menuitem', { name: 'Find' }));

        expect(onSelect).toHaveBeenCalledWith(getTrigger());
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('should keep the menu open if the action is often repeated', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        getWrapper({ keepOpen: true, onSelect });

        await openMenu(user);
        await user.click(screen.getByRole('menuitem', { name: 'Find' }));
        await user.click(screen.getByRole('menuitem', { name: 'Find' }));

        expect(onSelect).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    test('should show an unmodified shortcut as the key alone', async () => {
        const user = userEvent.setup();
        getWrapper({ bareKey: 'R' });

        await openMenu(user);

        const row = screen.getByRole('menuitem', { name: 'Find' });

        expect(row).toHaveAttribute('aria-keyshortcuts', 'R');
        expect(row).toHaveTextContent('FindR');
    });

    test('should not show a shortcut by default', async () => {
        const user = userEvent.setup();
        getWrapper();

        await openMenu(user);

        expect(screen.getByRole('menuitem', { name: 'Find' })).not.toHaveAttribute('aria-keyshortcuts');
        expect(screen.getByRole('menuitem', { name: 'Find' })).toHaveTextContent(/^Find$/);
    });

    test.each`
        platform     | userAgent                                            | keys           | label
        ${'macOS'}   | ${'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'} | ${'Meta+F'}    | ${'⌘ + F'}
        ${'iPadOS'}  | ${'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'}   | ${'Meta+F'}    | ${'⌘ + F'}
        ${'Windows'} | ${'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}       | ${'Control+F'} | ${'Ctrl + F'}
        ${'Linux'}   | ${'Mozilla/5.0 (X11; Linux x86_64)'}                 | ${'Control+F'} | ${'Ctrl + F'}
    `('should show the shortcut with the $platform modifier', async ({ keys, label, userAgent }) => {
        jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
        const user = userEvent.setup();
        getWrapper({ shortcutKey: 'F' });

        await openMenu(user);

        const row = screen.getByRole('menuitem', { name: 'Find' });

        expect(row).toHaveAttribute('aria-keyshortcuts', keys);
        expect(row).toHaveTextContent(`Find${label}`);
    });

    test('should not call the handler if disabled', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        getWrapper({ disabled: true, onSelect });

        await openMenu(user);
        await user.click(screen.getByRole('menuitem', { name: 'Find' }));

        expect(screen.getByRole('menuitem', { name: 'Find' })).toHaveAttribute('aria-disabled', 'true');
        expect(onSelect).not.toHaveBeenCalled();
    });
});
