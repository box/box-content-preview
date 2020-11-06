import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconRotate24 from '../../icons/IconRotate24';
import RotateControl from '../RotateControl';

describe('RotateControl', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<RotateControl onRotateLeft={jest.fn()} {...props} />);

    describe('event handlers', () => {
        test('should invoke onRotateLeft prop on click', () => {
            const onRotateLeft = jest.fn();
            const wrapper = getWrapper({ onRotateLeft });

            wrapper.simulate('click');

            expect(onRotateLeft).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-RotateControl')).toBe(true);
            expect(wrapper.exists(IconRotate24)).toBe(true);
        });
    });
});
