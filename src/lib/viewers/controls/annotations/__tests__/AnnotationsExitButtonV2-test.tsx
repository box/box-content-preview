import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsExitButtonV2 from '../AnnotationsExitButtonV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';

describe('AnnotationsExitButtonV2', () => {
    const renderButton = (onClick = jest.fn()) =>
        render(
            <ControlsBarV2>
                <AnnotationsExitButtonV2 onClick={onClick} />
            </ControlsBarV2>,
            { wrapper: BlueprintProviders },
        );

    test('should render the exit button in the wrapper the annotations-only experience reveals', () => {
        renderButton();

        const button = screen.getByRole('button', { name: __('exit_annotations') });

        expect(button).toHaveAttribute('data-resin-target', 'exit');
        expect(button).toHaveAttribute('data-testid', 'bp-annotations-controls-exit-btn');
        expect(button.parentElement).toHaveClass('bp-AnnotationsControls-exitBtn');
    });

    test('should invoke the click callback', async () => {
        const onClick = jest.fn();
        renderButton(onClick);

        await userEvent.click(screen.getByRole('button', { name: __('exit_annotations') }));

        expect(onClick).toHaveBeenCalled();
    });
});
