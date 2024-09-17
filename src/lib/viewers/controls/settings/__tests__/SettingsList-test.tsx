import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        test('should handle navigating the list and setting focus on the active item', async () => {
            renderView();

            // index 0 has focus
            expect(screen.getByTestId('test1')).toHaveFocus();
            expect(screen.getByTestId('test2')).not.toHaveFocus();
            expect(screen.getByTestId('test3')).not.toHaveFocus();

            // index 1 has focus
            await userEvent.keyboard('{ArrowDown}');

            expect(screen.getByTestId('test1')).not.toHaveFocus();
            expect(screen.getByTestId('test2')).toHaveFocus();
            expect(screen.getByTestId('test3')).not.toHaveFocus();

            // index 2 has focus
            await userEvent.keyboard('{ArrowDown}');

            expect(screen.getByTestId('test1')).not.toHaveFocus();
            expect(screen.getByTestId('test2')).not.toHaveFocus();
            expect(screen.getByTestId('test3')).toHaveFocus();

            // index 2 should keep focus because we are at the end of the list
            await userEvent.keyboard('{ArrowDown}');

            expect(screen.getByTestId('test1')).not.toHaveFocus();
            expect(screen.getByTestId('test2')).not.toHaveFocus();
            expect(screen.getByTestId('test3')).toHaveFocus();

            // index 1 has focus
            await userEvent.keyboard('{ArrowUp}');

            expect(screen.getByTestId('test1')).not.toHaveFocus();
            expect(screen.getByTestId('test2')).toHaveFocus();
            expect(screen.getByTestId('test3')).not.toHaveFocus();

            // index 0 has focus
            await userEvent.keyboard('{ArrowUp}');

            expect(screen.getByTestId('test1')).toHaveFocus();
            expect(screen.getByTestId('test2')).not.toHaveFocus();
            expect(screen.getByTestId('test3')).not.toHaveFocus();

            // index 0 should keep focus because we are at the top of the list
            await userEvent.keyboard('{ArrowUp}');

            expect(screen.getByTestId('test1')).toHaveFocus();
            expect(screen.getByTestId('test2')).not.toHaveFocus();
            expect(screen.getByTestId('test3')).not.toHaveFocus();
        });
    });
});
