import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import DurationLabels from '../DurationLabels';

describe('DurationLabels', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<DurationLabels currentTime={0} durationTime={60} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-DurationLabels')).toBe(true);
        });

        test.each`
            input    | result
            ${0}     | ${'0:00'}
            ${9}     | ${'0:09'}
            ${105}   | ${'1:45'}
            ${705}   | ${'11:45'}
            ${10800} | ${'3:00:00'}
            ${11211} | ${'3:06:51'}
        `('should render both current and duration time $input to $result', ({ input, result }) => {
            const wrapper = getWrapper({ currentTime: input, durationTime: input });
            const current = wrapper.childAt(0);
            const duration = wrapper.childAt(2);

            expect(current.text()).toBe(result);
            expect(duration.text()).toBe(result);
        });
    });
});
