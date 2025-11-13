import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggle from '../FullscreenToggle';

describe('FullscreenToggle', () => {
    const getWrapper = (props = {}) => render(<FullscreenToggle onFullscreenToggle={jest.fn()} {...props} />);
    const getEnterToggleButton = async () => screen.findByTitle('Enter fullscreen');
    const getExitToggleButton = async () => screen.findByTitle('Exit fullscreen');
    const getIconFullscreenIn = async () => screen.findByTestId('IconArrowsMaximizeMedium24');
    const getIconFullscreenOut = async () => screen.findByTestId('IconArrowsMinimizeMedium24');

    describe('event handlers', () => {
        test('should respond to fullscreen events', async () => {
            getWrapper();

            act(() => {
                fullscreen.enter();
            });

            const iconFullscreenOut = await getIconFullscreenOut();
            const exitToggleButton = await getExitToggleButton();
            expect(iconFullscreenOut).toBeInTheDocument();
            expect(exitToggleButton).toBeInTheDocument();

            act(() => {
                fullscreen.exit();
            });

            const iconFullscreenIn = await getIconFullscreenIn();
            const enterToggleButton = await getEnterToggleButton();
            expect(iconFullscreenIn).toBeInTheDocument();
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

        test('should render modern icons', async () => {
            getWrapper();

            expect(await screen.findByTestId('IconArrowsMaximizeMedium24')).toBeInTheDocument();

            // Enter fullscreen
            act(() => {
                fullscreen.enter();
            });

            expect(await screen.findByTestId('IconArrowsMinimizeMedium24')).toBeInTheDocument();
        });
    });
});
