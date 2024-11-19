import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkdownControls from '../MarkdownControls';

describe('MarkdownControls', () => {
    const getWrapper = (props = {}) => render(<MarkdownControls onFullscreenToggle={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const controlBar = await screen.findByTestId('bp-ControlsBar');

            expect(controlBar).toBeInTheDocument();
        });

        test('should pass down onFullscreenToggle prop', async () => {
            const onFullscreenToggle = jest.fn();
            getWrapper({ onFullscreenToggle });
            const toggle = await screen.findByTitle(__('enter_fullscreen'));

            await userEvent.click(toggle);

            expect(onFullscreenToggle).toHaveBeenCalled();
        });
    });
});
