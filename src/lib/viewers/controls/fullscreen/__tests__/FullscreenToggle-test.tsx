import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggle from '../FullscreenToggle';

describe('FullscreenToggle', () => {
    const getWrapper = (props = {}) => render(<FullscreenToggle onFullscreenToggle={jest.fn()} {...props} />);
    const getEnterToggleButton = async () => screen.findByRole('button', { name: 'Enter fullscreen' });
    const getExitToggleButton = async () => screen.findByRole('button', { name: 'Exit fullscreen' });

    describe('event handlers', () => {
        test('should respond to fullscreen events', async () => {
            getWrapper();

            act(() => {
                fullscreen.enter();
            });

            const exitToggleButton = await getExitToggleButton();
            expect(exitToggleButton).toBeInTheDocument();

            act(() => {
                fullscreen.exit();
            });

            const enterToggleButton = await getEnterToggleButton();
            expect(enterToggleButton).toBeInTheDocument();
        });

        test('should invoke onFullscreenToggle prop on click', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFullscreenToggle: onToggle });

            const enterToggleButton = await getEnterToggleButton();
            await userEvent.click(enterToggleButton);
            expect(onToggle).toHaveBeenCalledWith(true, enterToggleButton);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();

            const enterToggleButton = await getEnterToggleButton();
            expect(enterToggleButton).toBeInTheDocument();
        });
    });
});
