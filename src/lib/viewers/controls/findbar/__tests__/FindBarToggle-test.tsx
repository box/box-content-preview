import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import FindBarToggle from '../FindBarToggle';
import IconSearch24 from '../../icons/IconSearch24';

describe('FindBarToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<FindBarToggle {...props} />);

    describe('event handlers', () => {
        test('should forward the click from the button', () => {
            const onToggle = jest.fn();
            const mockedEvent = { target: document.createElement('button') };
            const wrapper = getWrapper({ onFindBarToggle: onToggle });

            wrapper.simulate('click', mockedEvent);

            expect(onToggle).toBeCalledWith(mockedEvent.target);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper({ onFindBarToggle: jest.fn() });

            expect(wrapper.hasClass('bp-FindBarToggle')).toBe(true);
            expect(wrapper.exists(IconSearch24)).toBe(true);
        });

        test('should return an empty wrapper if no callback is defined', () => {
            const wrapper = getWrapper();

            expect(wrapper.isEmptyRender()).toBe(true);
        });
    });
});
