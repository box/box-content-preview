import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggle from '../FullscreenToggle';

describe('FullscreenToggle', () => {
    const getWrapper = (props = {}) => render(<FullscreenToggle onFullscreenToggle={jest.fn()} {...props} />);
    const getEnterToggleButton = async () => screen.findByTitle('Enter fullscreen');
    const getExitToggleButton = async () => screen.findByTitle('Exit fullscreen');
    const getIconFullscreenIn = async () => screen.findByTestId('IconFullscreenIn24');
    const getIconFullscreenOut = async () => screen.findByTestId('IconFullscreenOut24');

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

        test('should apply modernized class when modernizationEnabled is true', async () => {
            getWrapper({ modernizationEnabled: true });
            const button = await getEnterToggleButton();

            expect(button).toHaveClass('bp-FullscreenToggle--modernized');
        });

        test('should not apply modernized class when modernizationEnabled is false', async () => {
            getWrapper({ modernizationEnabled: false });
            const button = await getEnterToggleButton();

            expect(button).not.toHaveClass('bp-FullscreenToggle--modernized');
        });

        test('should render modern icons when modernizationEnabled is true', async () => {
            getWrapper({ modernizationEnabled: true });

            expect(await screen.findByTestId('IconArrowsMaximizeMedium24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconFullscreenIn24')).not.toBeInTheDocument();

            // Enter fullscreen
            act(() => {
                fullscreen.enter();
            });

            expect(await screen.findByTestId('IconArrowsMinimizeMedium24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconFullscreenOut24')).not.toBeInTheDocument();
        });

        test('should render original icons when modernizationEnabled is false', async () => {
            getWrapper({ modernizationEnabled: false });

            expect(await getIconFullscreenIn()).toBeInTheDocument();
            expect(screen.queryByTestId('IconArrowsMaximizeMedium24')).not.toBeInTheDocument();

            // Enter fullscreen
            act(() => {
                fullscreen.enter();
            });

            expect(await getIconFullscreenOut()).toBeInTheDocument();
            expect(screen.queryByTestId('IconArrowsMinimizeMedium24')).not.toBeInTheDocument();
        });
    });
});
