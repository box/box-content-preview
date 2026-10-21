import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import MarkdownControlsV2 from '../MarkdownControlsV2';

describe('MarkdownControlsV2', () => {
    const getWrapper = (onFullscreenToggle = jest.fn()) =>
        render(<MarkdownControlsV2 onFullscreenToggle={onFullscreenToggle} />, { wrapper: BlueprintProviders });

    test('should render only the fullscreen toggle inside the Blueprint toolbar', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
        expect(screen.getAllByRole('button')).toEqual([screen.getByRole('button', { name: __('enter_fullscreen') })]);
    });

    test('should toggle fullscreen with the toggle so focus can return to it', async () => {
        const onFullscreenToggle = jest.fn();
        getWrapper(onFullscreenToggle);

        const toggle = screen.getByRole('button', { name: __('enter_fullscreen') });

        await userEvent.click(toggle);

        expect(onFullscreenToggle).toHaveBeenCalledWith(true, toggle);
    });
});
