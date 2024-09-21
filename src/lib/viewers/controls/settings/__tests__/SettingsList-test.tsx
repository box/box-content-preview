import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsList from '../SettingsList';

describe('SettingsList', () => {
    describe('Event handling', () => {
        test('should handle navigating the list and setting focus on the active item', async () => {
            const user = userEvent.setup();
            render(
                <SettingsList>
                    <div aria-selected="true" data-testid="test1" role="option" tabIndex={0} />
                    <div aria-selected="false" data-testid="test2" role="option" tabIndex={0} />
                    <div aria-selected="false" data-testid="test3" role="option" tabIndex={0} />
                </SettingsList>,
            );

            expect(screen.getByTestId('test1')).toHaveFocus();

            await user.keyboard('{ArrowDown}');
            expect(screen.getByTestId('test2')).toHaveFocus();

            await user.keyboard('{ArrowDown}');
            expect(screen.getByTestId('test3')).toHaveFocus();

            await user.keyboard('{ArrowDown}');
            expect(screen.getByTestId('test3')).toHaveFocus();

            await user.keyboard('{ArrowUp}');
            expect(screen.getByTestId('test2')).toHaveFocus();

            await user.keyboard('{ArrowUp}');
            expect(screen.getByTestId('test1')).toHaveFocus();

            await user.keyboard('{ArrowUp}');
            expect(screen.getByTestId('test1')).toHaveFocus();
        });
    });
});
