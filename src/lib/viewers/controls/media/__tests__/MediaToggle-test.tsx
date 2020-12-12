import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaToggle from '../MediaToggle';
import usePreventKey from '../../hooks/usePreventKey';

jest.mock('../../hooks/usePreventKey');

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

        test('should call the usePreventKey hook with specific keys', () => {
            getWrapper();

            expect(usePreventKey).toBeCalledWith({ current: expect.any(Object) }, ['Enter', 'Space']);
        });
    });
});
