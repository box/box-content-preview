import React from 'react';
import { render, screen } from '@testing-library/react';
import ControlsBar from '../ControlsBar';

describe('ControlsBar', () => {
    describe('render', () => {
        test('should render a valid output', () => {
            const children = <div className="test">Hello</div>;
            render(<ControlsBar>{children}</ControlsBar>);

            expect(screen.getByText('Hello')).toBeInTheDocument();
        });

        test('should render nothing if the children property is undefined', () => {
            const children = undefined;
            render(<ControlsBar>{children}</ControlsBar>);

            expect(screen.queryByText('Hello')).not.toBeInTheDocument();
        });

        test('should apply modernized class when modernizationEnabled is true', () => {
            const children = <div className="test">Hello</div>;
            render(<ControlsBar modernizationEnabled>{children}</ControlsBar>);

            expect(screen.getByTestId('bp-ControlsBar')).toHaveClass('bp-ControlsBar--modernized');
        });

        test('should not apply modernized class when modernizationEnabled is false', () => {
            const children = <div className="test">Hello</div>;
            render(<ControlsBar modernizationEnabled={false}>{children}</ControlsBar>);

            expect(screen.getByTestId('bp-ControlsBar')).not.toHaveClass('bp-ControlsBar--modernized');
        });
    });
});
