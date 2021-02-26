import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaToggle from '../MediaToggle';

describe('MediaToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<MediaToggle {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper({ className: 'test' });

            expect(wrapper.props()).toMatchObject({
                className: 'test',
                type: 'button',
            });
        });

        test.each(['Enter', 'Space'])('should defer to the inner button for the %s key', key => {
            const wrapper = getWrapper();
            const event = { key, stopPropagation: jest.fn() };

            wrapper.simulate('keydown', event);

            expect(event.stopPropagation).toBeCalled();
        });
    });
});
