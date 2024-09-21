import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import SettingsDropdown from '../SettingsDropdown';

describe('SettingsDropdown', () => {
    const listItems = [
        { label: 'first', value: 'first' },
        { label: 'second', value: 'second' },
        { label: 'third', value: 'third' },
    ];

    describe('toggling', () => {
        test('should toggle open the flyout and render the list', async () => {
            const user = userEvent.setup();
            render(
                <SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={jest.fn()} value="first" />,
            );

            await user.click(screen.getByLabelText('Dropdown Label first'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(screen.getAllByRole('option')).toHaveLength(listItems.length);
            expect(screen.getAllByRole('option').at(0)?.textContent).toContain('first');
            expect(screen.getAllByRole('option').at(1)?.textContent).toContain('second');
            expect(screen.getAllByRole('option').at(2)?.textContent).toContain('third');
        });

        test('should select the specified value', async () => {
            const user = userEvent.setup();
            render(
                <SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={jest.fn()} value="second" />,
            );

            await user.click(screen.getByLabelText('Dropdown Label second'));

            expect(screen.getByRole('option', { name: 'first' })).toHaveAttribute('aria-selected', 'false');
            expect(screen.getByRole('option', { name: 'second' })).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByRole('option', { name: 'third' })).toHaveAttribute('aria-selected', 'false');
        });
    });

    describe('events', () => {
        test('should call onSelect with the list item value when clicked', async () => {
            const user = userEvent.setup();
            const onSelect = jest.fn();
            render(<SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={onSelect} value="first" />);

            await user.click(screen.getByLabelText('Dropdown Label first'));
            await user.click(screen.getByRole('option', { name: 'second' }));

            expect(onSelect).toHaveBeenCalledWith('second');
        });

        test.each(['Space', 'Enter'])('should call onSelect with the list item value when keydown %s', async key => {
            const user = userEvent.setup();
            const onSelect = jest.fn();
            render(<SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={onSelect} value="first" />);

            await user.click(screen.getByLabelText('Dropdown Label first'));
            fireEvent.keyDown(
                within(screen.getByRole('listbox'))
                    .getAllByRole('option')
                    .at(1)!,
                { key },
            );

            expect(onSelect).toHaveBeenCalledWith('second');
        });

        test.each(['Escape', 'ArrowLeft'])(
            'should not call onSelect with the list item value when keydown %s',
            async key => {
                const user = userEvent.setup();
                const onSelect = jest.fn();
                render(
                    <SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={onSelect} value="first" />,
                );

                await user.click(screen.getByLabelText('Dropdown Label first'));
                await user.keyboard(`{${key}}`);

                expect(onSelect).not.toHaveBeenCalled();
            },
        );

        test('should close dropdown after making selection', async () => {
            const user = userEvent.setup();
            const onSelect = jest.fn();
            render(<SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={onSelect} value="first" />);

            await user.click(screen.getByLabelText('Dropdown Label first'));
            await user.click(within(screen.getByRole('listbox')).getByText('second'));

            expect(screen.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
        });

        test('should close dropdown if Escape is pressed', async () => {
            const user = userEvent.setup();
            render(
                <SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={jest.fn()} value="first" />,
            );

            await user.click(screen.getByLabelText('Dropdown Label first'));
            await user.keyboard(`{Escape}`);

            expect(screen.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
        });

        test.each(['ArrowUp', 'ArrowDown', 'Escape'])(
            'should prevent propagation of keydown events for %s',
            async key => {
                const user = userEvent.setup();
                const mockGlobalOnPress = jest.fn();
                document.addEventListener('keydown', mockGlobalOnPress);
                render(
                    <SettingsDropdown
                        label="Dropdown Label"
                        listItems={listItems}
                        onSelect={jest.fn()}
                        value="first"
                    />,
                );

                await user.click(screen.getByLabelText('Dropdown Label first'));
                await user.keyboard(`{${key}}`);

                expect(mockGlobalOnPress).not.toHaveBeenCalled();
                document.removeEventListener('keydown', mockGlobalOnPress);
            },
        );
    });

    describe('focus', () => {
        test('should be able to focus on the dropdown button', () => {
            render(
                <SettingsDropdown label="Dropdown Label" listItems={listItems} onSelect={jest.fn()} value="first" />,
            );

            fireEvent.focus(screen.getByRole('button', { name: /first/i }));

            waitFor(() => {
                expect(document.activeElement).toBe(screen.getByRole('button', { name: /first/i }));
            });
        });
    });
});
