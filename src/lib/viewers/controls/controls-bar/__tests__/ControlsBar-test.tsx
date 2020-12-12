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

        test('should return null if the children property is undefined', () => {
            const children = undefined;
            const wrapper = shallow(<ControlsBar>{children}</ControlsBar>);

            expect(wrapper.isEmptyRender()).toBe(true);
        });
    });
});
