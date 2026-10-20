import React from 'react';
import { render, screen } from '@testing-library/react';
import ControlsBarV2 from '../ControlsBarV2';

describe('ControlsBarV2', () => {
    describe('render', () => {
        test('should render its children inside a Blueprint toolbar', () => {
            render(
                <ControlsBarV2>
                    <button type="button">Hello</button>
                </ControlsBarV2>,
            );

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
            expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Hello' }));
        });

        test('should render the dark toolbar', () => {
            render(
                <ControlsBarV2>
                    <button type="button">Hello</button>
                </ControlsBarV2>,
            );

            expect(screen.getByRole('toolbar')).toHaveAttribute('data-color-scheme', 'dark');
        });

        test('should render nothing if the children property is undefined', () => {
            render(<ControlsBarV2>{undefined}</ControlsBarV2>);

            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
        });
    });
});
