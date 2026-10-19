import React, { act } from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggleV2 from '../FullscreenToggleV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/ArrowsMaximize', () => ({
    __esModule: true,
    default: () => <svg data-testid="ArrowsMaximize" />,
}));
jest.mock('@box/blueprint-web-assets/icons/Medium/ArrowsMinimize', () => ({
    __esModule: true,
    default: () => <svg data-testid="ArrowsMinimize" />,
}));

describe('FullscreenToggleV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) =>
        render(<FullscreenToggleV2 onFullscreenToggle={jest.fn()} {...props} />, { wrapper });
    const getEnterToggleButton = () => screen.getByRole('button', { name: __('enter_fullscreen') });
    const getExitToggleButton = () => screen.getByRole('button', { name: __('exit_fullscreen') });

    afterEach(() => {
        if (fullscreen.isFullscreen()) {
            act(() => {
                fullscreen.exit();
            });
        }
    });

    describe('event handlers', () => {
        test('should respond to fullscreen events', () => {
            getWrapper();

            act(() => {
                fullscreen.enter();
            });

            expect(getExitToggleButton()).toBeInTheDocument();
            expect(screen.getByTestId('ArrowsMinimize')).toBeInTheDocument();
            expect(screen.queryByTestId('ArrowsMaximize')).not.toBeInTheDocument();

            act(() => {
                fullscreen.exit();
            });

            expect(getEnterToggleButton()).toBeInTheDocument();
            expect(screen.getByTestId('ArrowsMaximize')).toBeInTheDocument();
            expect(screen.queryByTestId('ArrowsMinimize')).not.toBeInTheDocument();
        });

        test('should invoke onFullscreenToggle prop on click', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFullscreenToggle: onToggle });

            const enterToggleButton = getEnterToggleButton();
            await userEvent.click(enterToggleButton);

            expect(onToggle).toHaveBeenCalledWith(true, enterToggleButton);
        });

        test('should invoke onFullscreenToggle prop to exit while in fullscreen', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFullscreenToggle: onToggle });

            act(() => {
                fullscreen.enter();
            });

            const exitToggleButton = getExitToggleButton();
            await userEvent.click(exitToggleButton);

            expect(onToggle).toHaveBeenCalledWith(false, exitToggleButton);
        });

        test('should pass the toggle button even if the click lands on the icon', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFullscreenToggle: onToggle });

            await userEvent.click(screen.getByTestId('ArrowsMaximize'));

            expect(onToggle).toHaveBeenCalledWith(true, getEnterToggleButton());
        });

        test('should forward the onKeyDown prop to the button', async () => {
            const onKeyDown = jest.fn();
            getWrapper({ onKeyDown });

            await userEvent.tab();
            await userEvent.keyboard('a');

            expect(onKeyDown).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should render a button with the fullscreen resin target', () => {
            getWrapper();

            expect(getEnterToggleButton()).toHaveAttribute('data-resin-target', 'fullscreen');
            expect(screen.getByTestId('ArrowsMaximize')).toBeInTheDocument();
        });

        test('should show the label as a tooltip on focus', async () => {
            getWrapper();

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('enter_fullscreen'));
        });
    });
});
