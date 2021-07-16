import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import SliderControl from '../../slider';
import TimeControls from '../TimeControls';

describe('TimeControls', () => {
    const getBuffer = (end = 1000, start = 0): TimeRanges => ({
        length: end - start,
        end: jest.fn().mockReturnValue(end),
        start: jest.fn().mockReturnValue(start),
    });
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<TimeControls currentTime={0} durationTime={10000} onTimeChange={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-TimeControls')).toBe(true);
            expect(wrapper.find(SliderControl).props()).toMatchObject({
                max: 10000,
                min: 0,
                step: 5,
                value: 0,
            });
        });

        test('should not default to zero for invalid currentTime value', () => {
            const wrapper = getWrapper({ currentTime: NaN });
            expect(wrapper.find(SliderControl).prop('value')).toBe(0);
        });

        test('should default to zero for invalid durationTime value', () => {
            const wrapper = getWrapper({ durationTime: NaN });
            expect(wrapper.find(SliderControl).prop('max')).toBe(0);
        });

        test.each`
            currentTime | track
            ${0}        | ${'linear-gradient(to right, #0061d5 0%, #fff 0%, #fff 10%, #767676 10%, #767676 100%)'}
            ${50}       | ${'linear-gradient(to right, #0061d5 0.5%, #fff 0.5%, #fff 10%, #767676 10%, #767676 100%)'}
            ${1000}     | ${'linear-gradient(to right, #0061d5 10%, #fff 10%, #fff 10%, #767676 10%, #767676 100%)'}
            ${2500}     | ${'linear-gradient(to right, #0061d5 25%, #fff 25%, #fff 10%, #767676 10%, #767676 100%)'}
            ${10000}    | ${'linear-gradient(to right, #0061d5 100%, #fff 100%, #fff 10%, #767676 10%, #767676 100%)'}
        `('should render the correct track for currentTime $currentTime', ({ currentTime, track }) => {
            const buffer = getBuffer(1000, 0); // 10% buffered
            const wrapper = getWrapper({ bufferedRange: buffer, currentTime });
            expect(wrapper.find(SliderControl).prop('track')).toEqual(track);
        });
    });
});
