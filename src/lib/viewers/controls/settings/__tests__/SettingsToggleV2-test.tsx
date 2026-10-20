import React from 'react';
import { DropdownMenu, Popover, Toolbar } from '@box/blueprint-web';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import SettingsToggleV2, { ToolbarProps } from '../SettingsToggleV2';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('SettingsToggleV2', () => {
    let container: HTMLDivElement;

    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock;
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    const renderInToolbar = (children: React.ReactNode) =>
        render(<Toolbar.Root aria-label="Controls">{children}</Toolbar.Root>, {
            wrapper: ({ children: wrapped }) => (
                <BlueprintProviders container={container}>{wrapped}</BlueprintProviders>
            ),
        });
    const getWrapper = (props: Partial<ToolbarProps> = {}) =>
        renderInToolbar(<SettingsToggleV2 label="Settings" {...props} />);
    const getToggle = () => screen.getByRole('button', { name: 'Settings' });

    describe('render', () => {
        test('should render a toolbar button labelled by the label prop', () => {
            getWrapper();

            expect(screen.getByRole('toolbar')).toContainElement(getToggle());
            expect(getToggle()).toHaveAttribute('data-resin-target', 'settingsOpen');
        });

        test('should show the label in a tooltip portaled into the container', async () => {
            const user = userEvent.setup();
            getWrapper({ label: 'Media settings' });

            await user.hover(screen.getByRole('button', { name: 'Media settings' }));

            expect(await within(container).findByRole('tooltip')).toHaveTextContent('Media settings');
        });

        test('should render the badge inside the button if provided', () => {
            getWrapper({ badge: <span data-testid="badge">HD</span> });

            expect(getToggle()).toContainElement(screen.getByTestId('badge'));
        });

        test('should not render a badge if none is provided', () => {
            getWrapper();

            expect(getToggle().querySelector('.bp-SettingsToggleV2-badge')).toBeNull();
        });

        test('should forward its ref and extra props to the button', async () => {
            const user = userEvent.setup();
            const onClick = jest.fn();
            const ref = React.createRef<HTMLButtonElement>();
            renderInToolbar(<SettingsToggleV2 ref={ref} data-testid="toggle" label="Settings" onClick={onClick} />);

            await user.click(getToggle());

            expect(ref.current).toBe(getToggle());
            expect(getToggle()).toHaveAttribute('data-testid', 'toggle');
            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe('as a menu or popover trigger', () => {
        const renderDropdownMenu = () =>
            renderInToolbar(
                <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger asChild>
                        <SettingsToggleV2 label="Settings" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content container={container}>
                        <DropdownMenu.Item>Item</DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>,
            );
        const renderPopover = () =>
            renderInToolbar(
                <Popover.Root modal={false}>
                    <Popover.Trigger asChild>
                        <SettingsToggleV2 label="Settings" />
                    </Popover.Trigger>
                    <Popover.ContentContainer aria-label="Settings panel" container={container}>
                        <button type="button">Item</button>
                    </Popover.ContentContainer>
                </Popover.Root>,
            );

        test.each([
            ['DropdownMenu', renderDropdownMenu],
            ['Popover', renderPopover],
        ])('should reflect the %s open state on the button', async (_name, renderTrigger) => {
            const user = userEvent.setup();
            renderTrigger();

            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveAttribute('data-state', 'closed');

            await user.click(getToggle());

            expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(getToggle()).toHaveAttribute('data-state', 'open');
            expect(within(container).getByText('Item')).toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveAttribute('data-state', 'closed');
            expect(getToggle()).toHaveFocus();
        });

        test.each([
            ['DropdownMenu', renderDropdownMenu],
            ['Popover', renderPopover],
        ])('should keep the tooltip closed over the open %s so Escape closes it', async (_name, renderTrigger) => {
            jest.useFakeTimers();
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            renderTrigger();

            await user.click(getToggle());
            act(() => {
                jest.advanceTimersByTime(2000);
            });

            expect(within(container).queryByRole('tooltip')).not.toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            jest.useRealTimers();
        });
    });

    describe('with buttonType="icon"', () => {
        const renderStandalone = (children: React.ReactNode) =>
            render(<>{children}</>, {
                wrapper: ({ children: wrapped }) => (
                    <BlueprintProviders container={container}>{wrapped}</BlueprintProviders>
                ),
            });

        test('should render an icon button without a toolbar', () => {
            renderStandalone(<SettingsToggleV2 buttonType="icon" label="Settings" />);

            expect(screen.queryByRole('toolbar')).toBeNull();
            expect(getToggle()).toHaveAttribute('data-resin-target', 'settingsOpen');
        });

        test('should pass size and variant through to the icon button', () => {
            renderStandalone(<SettingsToggleV2 buttonType="icon" label="Settings" size="large" variant="on-dark" />);

            expect(getToggle().className).toMatch(/large/);
            expect(getToggle().className).toMatch(/on-dark/);
        });

        test('should show the label in a tooltip portaled into the container', async () => {
            const user = userEvent.setup();
            renderStandalone(<SettingsToggleV2 buttonType="icon" label="Media settings" />);

            await user.hover(screen.getByRole('button', { name: 'Media settings' }));

            expect(await within(container).findByRole('tooltip')).toHaveTextContent('Media settings');
        });

        test('should render the badge beside the button if provided', () => {
            renderStandalone(
                <SettingsToggleV2 badge={<span data-testid="badge">HD</span>} buttonType="icon" label="Settings" />,
            );

            expect(getToggle()).not.toContainElement(screen.getByTestId('badge'));
            expect(getToggle().parentElement).toContainElement(screen.getByTestId('badge'));
        });

        test('should forward its ref and extra props to the button', async () => {
            const user = userEvent.setup();
            const onClick = jest.fn();
            const ref = React.createRef<HTMLButtonElement>();
            renderStandalone(
                <SettingsToggleV2
                    ref={ref}
                    buttonType="icon"
                    data-testid="toggle"
                    label="Settings"
                    onClick={onClick}
                />,
            );

            await user.click(getToggle());

            expect(ref.current).toBe(getToggle());
            expect(getToggle()).toHaveAttribute('data-testid', 'toggle');
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        const renderIconDropdownMenu = () =>
            renderStandalone(
                <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger asChild>
                        <SettingsToggleV2 buttonType="icon" label="Settings" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content container={container}>
                        <DropdownMenu.Item>Item</DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>,
            );

        test('should keep the tooltip closed over the open DropdownMenu so Escape closes it', async () => {
            jest.useFakeTimers();
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            renderIconDropdownMenu();

            await user.click(getToggle());
            act(() => {
                jest.advanceTimersByTime(2000);
            });

            expect(within(container).queryByRole('tooltip')).not.toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            jest.useRealTimers();
        });

        test('should reflect the DropdownMenu open state on the button', async () => {
            const user = userEvent.setup();
            renderIconDropdownMenu();

            await user.click(getToggle());

            expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(getToggle()).toHaveAttribute('data-state', 'open');
            expect(within(container).getByText('Item')).toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveAttribute('data-state', 'closed');
            expect(getToggle()).toHaveFocus();
        });
    });
});
