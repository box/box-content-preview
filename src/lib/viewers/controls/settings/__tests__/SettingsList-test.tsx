import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import SettingsList from '../SettingsList';

describe('SettingsList', () => {
    const renderView = (props = {}) =>
        render(
            <SettingsList {...props}>
                <div aria-selected="true" data-testid="test1" role="option" tabIndex={0} />
                <div aria-selected="false" data-testid="test2" role="option" tabIndex={0} />
                <div aria-selected="false" data-testid="test3" role="option" tabIndex={0} />
            </SettingsList>,
        );

    describe('Event handling', () => {
        test('should handle navigating the list and setting focus on the active item', () => {
            renderView();

            // index 0 has focus
            expect(screen.queryByTestId('test1')).toHaveFocus();
            expect(screen.queryByTestId('test2')).not.toHaveFocus();
            expect(screen.queryByTestId('test3')).not.toHaveFocus();

            // index 1 has focus
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

            expect(screen.queryByTestId('test1')).not.toHaveFocus();
            expect(screen.queryByTestId('test2')).toHaveFocus();
            expect(screen.queryByTestId('test3')).not.toHaveFocus();

            // index 2 has focus
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

            expect(screen.queryByTestId('test1')).not.toHaveFocus();
            expect(screen.queryByTestId('test2')).not.toHaveFocus();
            expect(screen.queryByTestId('test3')).toHaveFocus();

            // index 2 should keep focus because we are at the end of the list
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

            expect(screen.queryByTestId('test1')).not.toHaveFocus();
            expect(screen.queryByTestId('test2')).not.toHaveFocus();
            expect(screen.queryByTestId('test3')).toHaveFocus();

            // index 1 has focus
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });

            expect(screen.queryByTestId('test1')).not.toHaveFocus();
            expect(screen.queryByTestId('test2')).toHaveFocus();
            expect(screen.queryByTestId('test3')).not.toHaveFocus();

            // index 0 has focus
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });

            expect(screen.queryByTestId('test1')).toHaveFocus();
            expect(screen.queryByTestId('test2')).not.toHaveFocus();
            expect(screen.queryByTestId('test3')).not.toHaveFocus();

            // index 0 should keep focus because we are at the top of the list
            fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });

            expect(screen.queryByTestId('test1')).toHaveFocus();
            expect(screen.queryByTestId('test2')).not.toHaveFocus();
            expect(screen.queryByTestId('test3')).not.toHaveFocus();
        });
    });
});
