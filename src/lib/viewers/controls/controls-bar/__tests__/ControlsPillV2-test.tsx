import React from 'react';
import { render, screen } from '@testing-library/react';
import ControlsPillV2 from '../ControlsPillV2';

describe('ControlsPillV2', () => {
    describe('render', () => {
        test('should render its children inside the pill', () => {
            render(
                <ControlsPillV2>
                    <button type="button">Hello</button>
                </ControlsPillV2>,
            );

            const pill = screen.getByTestId('bp-ControlsPill');

            expect(pill).toHaveClass('bp-ControlsPillV2');
            expect(pill).toContainElement(screen.getByRole('button', { name: 'Hello' }));
        });
    });
});
