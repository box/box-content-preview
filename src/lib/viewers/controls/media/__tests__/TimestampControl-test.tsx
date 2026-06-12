import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TimestampControl from '../TimestampControl';

describe('TimestampControl', () => {
    const getWrapper = (props = {}) =>
        render(<TimestampControl currentTime={65} durationTime={120} fps={24} {...props} />);

    const getButton = () => screen.getByTestId('bp-TimestampControl-button');

    describe('render', () => {
        test('should render current and duration time in standard format by default', () => {
            getWrapper();
            expect(getButton()).toHaveTextContent('1:05/2:00');
        });

        test('should render only current time when isNarrowWidth is true', () => {
            getWrapper({ isNarrowWidth: true });

            expect(getButton()).toHaveTextContent('1:05');
            expect(getButton()).not.toHaveTextContent('/');
        });

        test('should not render the flyout by default', () => {
            getWrapper();
            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });
    });

    describe('dropdown', () => {
        test('should open the flyout with 3 format options when clicked', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());

            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Standard time' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Timecode' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Frame numbers' })).toBeInTheDocument();
        });

        test('should mark the current format as selected', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());

            expect(screen.getByRole('option', { name: 'Standard time' })).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByRole('option', { name: 'Timecode' })).toHaveAttribute('aria-selected', 'false');
        });

        test('should close the flyout on selection', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));

            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });

        test('should close the flyout on outside click', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();

            await user.click(document.body);
            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });

        test('should close the flyout on Escape', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.keyboard('{Escape}');

            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });
    });

    describe('formats', () => {
        test('should display timecode format when selected', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 61.5, durationTime: 120, fps: 30 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));

            expect(getButton()).toHaveTextContent('00:01:01:15/00:02:00:00');
        });

        test('should display frame numbers format when selected', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 10, durationTime: 120, fps: 24 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Frame numbers' }));

            expect(getButton()).toHaveTextContent('Frame 240/2880');
        });

        test('should return to standard time format when selected', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));
            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Standard time' }));

            expect(getButton()).toHaveTextContent('1:05/2:00');
        });

        test('should use the provided fps for frame calculation', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 2, durationTime: 10, fps: 60 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Frame numbers' }));

            expect(getButton()).toHaveTextContent('Frame 120/600');
        });
    });
});
