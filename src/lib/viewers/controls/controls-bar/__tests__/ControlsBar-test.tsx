import React from 'react';
import { shallow } from 'enzyme';
import ControlsBar from '../ControlsBar';

describe('ControlsBar', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const children = <div className="test">Hello</div>;
            const wrapper = shallow(<ControlsBar>{children}</ControlsBar>);

            expect(wrapper.contains(children)).toBe(true);
            expect(wrapper.hasClass('bp-ControlsBar')).toBe(true);
        });
    });
});
