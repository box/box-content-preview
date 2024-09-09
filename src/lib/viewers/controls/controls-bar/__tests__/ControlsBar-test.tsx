import React from 'react';
import { render } from '@testing-library/react';
import ControlsBar from '../ControlsBar';

describe('ControlsBar', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const children = <div className="test">Hello</div>;
            const wrapper = render(<ControlsBar>{children}</ControlsBar>);

            expect(wrapper.getByText('Hello')).toBeInTheDocument();
            expect(wrapper.container.getElementsByClassName('bp-ControlsBar')).toHaveLength(1);
        });

        test('should return null if the children property is undefined', () => {
            const children = undefined;
            const wrapper = render(<ControlsBar>{children}</ControlsBar>);

            expect(wrapper.container).toBeEmptyDOMElement();
        });
    });
});
