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

    describe('event handlers', () => {
        test.each`
            percentage | value
            ${0}       | ${0}
            ${20}      | ${1111}
            ${33}      | ${1833.15}
            ${33.3333} | ${1851.6648}
            ${100}     | ${5555}
        `(
            'should calculate the absolute value $value based on the relative slider percentage $percentage',
            ({ percentage, value }) => {
                const onChange = jest.fn();
                const wrapper = getWrapper({ durationTime: 5555, onTimeChange: onChange });
                const slider = wrapper.find(SliderControl);

                slider.simulate('change', percentage);

                expect(onChange).toBeCalledWith(value);
            },
        );
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-TimeControls')).toBe(true);
            expect(wrapper.prop('step')).toEqual(0.1);
        });

        test.each`
            currentTime | track                                                                                        | value
            ${0}        | ${'linear-gradient(to right, #0061d5 0%, #fff 0%, #fff 10%, #767676 10%, #767676 100%)'}     | ${0}
            ${50}       | ${'linear-gradient(to right, #0061d5 0.5%, #fff 0.5%, #fff 10%, #767676 10%, #767676 100%)'} | ${0.5}
            ${1000}     | ${'linear-gradient(to right, #0061d5 10%, #fff 10%, #fff 10%, #767676 10%, #767676 100%)'}   | ${10}
            ${2500}     | ${'linear-gradient(to right, #0061d5 25%, #fff 25%, #fff 10%, #767676 10%, #767676 100%)'}   | ${25}
            ${10000}    | ${'linear-gradient(to right, #0061d5 100%, #fff 100%, #fff 10%, #767676 10%, #767676 100%)'} | ${100}
        `('should render the correct track and value for currentTime $currentTime', ({ currentTime, track, value }) => {
            const buffer = getBuffer(1000, 0); // 10% buffered
            const wrapper = getWrapper({ bufferedRange: buffer, currentTime });

            expect(wrapper.find(SliderControl).props()).toMatchObject({
                track,
                value,
            });
        });
    });
});
