import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconArrowRight24 from '../../../icons/IconArrowRight24';
import MediaSettingsMenuItem from '../MediaSettingsMenuItem';

describe('MediaSettingsMenuItem', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<MediaSettingsMenuItem label="Speed" onClick={jest.fn()} value="Normal" {...props} />);

    describe('event handlers', () => {
        test.each`
            key         | calledTimes
            ${'Escape'} | ${0}
            ${'Enter'}  | ${1}
            ${'Space'}  | ${1}
        `('should call onClick $calledTimes times when $key keydown', ({ key, calledTimes }) => {
            const mockOnClick = jest.fn();
            const mockEvent = { key, preventDefault: jest.fn(), stopPropagation: jest.fn() };
            const wrapper = getWrapper({ onClick: mockOnClick });

            wrapper.simulate('keydown', mockEvent);

            expect(mockOnClick).toHaveBeenCalledTimes(calledTimes);
            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(calledTimes);
            expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(calledTimes);
        });

        test('should update the toggle button when clicked', () => {
            const mockOnClick = jest.fn();
            const wrapper = getWrapper({ onClick: mockOnClick });

            wrapper.simulate('click');

            expect(mockOnClick).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsMenuItem')).toBe(true);

            expect(wrapper.find('.bp-MediaSettingsMenuItem-label').contains('Speed')).toBe(true);
            expect(wrapper.find('.bp-MediaSettingsMenuItem-value').contains('Normal')).toBe(true);
            expect(wrapper.find('.bp-MediaSettingsMenuItem-arrow').containsMatchingElement(<IconArrowRight24 />)).toBe(
                true,
            );
        });
    });
});
