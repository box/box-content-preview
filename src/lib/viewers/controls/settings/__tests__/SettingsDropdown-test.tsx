import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import SettingsDropdown, { Props } from '../SettingsDropdown';

describe('SettingsDropdown', () => {
    const listItems = [
        { label: 'first', value: 'first' },
        { label: 'second', value: 'second' },
        { label: 'third', value: 'third' },
    ];
    const getDefaults = (): Props => ({
        label: 'Dropdown Label',
        listItems,
        onSelect: jest.fn(),
        value: 'first',
    });
    const renderView = (props = {}) => render(<SettingsDropdown {...getDefaults()} {...props} />);

    describe('toggling', () => {
        test('should toggle open the flyout and render the list', async () => {
            renderView();

            await userEvent.click(screen.getByLabelText('Dropdown Label first'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(screen.getAllByRole('option')).toHaveLength(listItems.length);
            expect(screen.getAllByRole('option').at(0)?.textContent).toContain('first');
            expect(screen.getAllByRole('option').at(1)?.textContent).toContain('second');
            expect(screen.getAllByRole('option').at(2)?.textContent).toContain('third');
        });

        test('should select the specified value', async () => {
            renderView({ value: 'second' });

            await userEvent.click(screen.getByLabelText('Dropdown Label second'));

            expect(screen.getAllByRole('option').at(0)).toHaveAttribute('aria-selected', 'false');
            expect(screen.getAllByRole('option').at(1)).toHaveAttribute('aria-selected', 'true');
            expect(screen.getAllByRole('option').at(2)).toHaveAttribute('aria-selected', 'false');
        });
    });

    describe('events', () => {
        test('should call onSelect with the list item value when clicked', async () => {
            const onSelect = jest.fn();
            renderView({ onSelect });

            await userEvent.click(screen.getByLabelText('Dropdown Label first'));
            await userEvent.click(within(screen.getByRole('listbox')).getByText('second'));

            expect(onSelect).toHaveBeenCalledWith('second');
        });

        test.each(['Space', 'Enter'])('should call onSelect with the list item value when keydown %s', async key => {
            const onSelect = jest.fn();
            renderView({ onSelect });

            await userEvent.click(screen.getByLabelText('Dropdown Label first'));
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
                const onSelect = jest.fn();
                renderView({ onSelect });

                await userEvent.click(screen.getByLabelText('Dropdown Label first'));
                fireEvent.keyDown(
                    within(screen.getByRole('listbox'))
                        .getAllByRole('option')
                        .at(1)!,
                    { key },
                );

                expect(onSelect).not.toHaveBeenCalled();
            },
        );

        test('should close dropdown after making selection', async () => {
            const onSelect = jest.fn();
            renderView({ onSelect });

            await userEvent.click(screen.getByLabelText('Dropdown Label first'));
            await userEvent.click(within(screen.getByRole('listbox')).getByText('second'));

            expect(screen.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
        });

        test('should close dropdown if Escape is pressed', async () => {
            renderView();

            await userEvent.click(screen.getByLabelText('Dropdown Label first'));
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

            expect(screen.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
        });

        test.each(['ArrowUp', 'ArrowDown', 'Escape'])(
            'should prevent propagation of keydown events for %s',
            async key => {
                const mockGlobalOnPress = jest.fn();
                document.addEventListener('keydown', mockGlobalOnPress);
                renderView();

                await userEvent.click(screen.getByLabelText('Dropdown Label first'));
                fireEvent.keyDown(screen.getByRole('listbox'), { key });

                expect(mockGlobalOnPress).not.toHaveBeenCalled();
                document.removeEventListener('keydown', mockGlobalOnPress);
            },
        );
    });

    describe('focus', () => {
        test('should be able to focus on the dropdown button', () => {
            renderView();

            fireEvent.focus(screen.getByRole('button', { name: /first/i }));

            waitFor(() => {
                expect(document.activeElement).toBe(screen.getByRole('button', { name: /first/i }));
            });
        });
    });
});
