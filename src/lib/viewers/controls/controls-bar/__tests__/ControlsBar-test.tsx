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
    });
});
