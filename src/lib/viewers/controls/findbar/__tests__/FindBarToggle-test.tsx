import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import FindBarToggle from '../FindBarToggle';
import IconSearch18 from '../../icons/IconSearch18';

describe('FindBarToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<FindBarToggle onFindBarToggle={jest.fn()} {...props} />);

    describe('event handlers', () => {
        test('should forward the click from the button', () => {
            const onToggle = jest.fn();
            const wrapper = getWrapper({ onFindBarToggle: onToggle });

            wrapper.simulate('click');

            expect(onToggle).toBeCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-FindBarToggle')).toBe(true);
            expect(wrapper.exists(IconSearch18)).toBe(true);
        });
    });
});
