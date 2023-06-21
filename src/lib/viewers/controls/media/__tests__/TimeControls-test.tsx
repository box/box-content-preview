import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import Filmstrip from '../Filmstrip';
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
        test('should update the slider hover state on mousemove', () => {
            const wrapper = getWrapper({ filmstripInterval: 1 });

            wrapper.find(SliderControl).simulate('move', 100, 1000, 10000); // Time, position, max position

            expect(wrapper.find(Filmstrip).props()).toMatchObject({
                position: 1000,
                positionMax: 10000,
                time: 100,
            });
        });

        test('should update the slider hover state on mouseover and mouseout', () => {
            const wrapper = getWrapper({ filmstripInterval: 1 });

            wrapper.find(SliderControl).simulate('mouseover');
            expect(wrapper.find(Filmstrip).prop('isShown')).toBe(true);

            wrapper.find(SliderControl).simulate('mouseout');
            expect(wrapper.find(Filmstrip).prop('isShown')).toBe(false);
        });
    });

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
            ${0}        | ${'linear-gradient(to right, #0061d5 0%, #fff 0%, #fff 10%, #6f6f6f 10%, #6f6f6f 100%)'}
            ${50}       | ${'linear-gradient(to right, #0061d5 0.5%, #fff 0.5%, #fff 10%, #6f6f6f 10%, #6f6f6f 100%)'}
            ${1000}     | ${'linear-gradient(to right, #0061d5 10%, #fff 10%, #fff 10%, #6f6f6f 10%, #6f6f6f 100%)'}
            ${2500}     | ${'linear-gradient(to right, #0061d5 25%, #fff 25%, #fff 10%, #6f6f6f 10%, #6f6f6f 100%)'}
            ${10000}    | ${'linear-gradient(to right, #0061d5 100%, #fff 100%, #fff 10%, #6f6f6f 10%, #6f6f6f 100%)'}
        `('should render the correct track for currentTime $currentTime', ({ currentTime, track }) => {
            const buffer = getBuffer(1000, 0); // 10% buffered
            const wrapper = getWrapper({ bufferedRange: buffer, currentTime });
            expect(wrapper.find(SliderControl).prop('track')).toEqual(track);
        });

        test('should render the filmstrip with the correct props', () => {
            const wrapper = getWrapper({
                aspectRatio: 1.5,
                filmstripInterval: 2,
                filmstripUrl: 'https://app.box.com',
            });

            expect(wrapper.find(Filmstrip).props()).toMatchObject({
                aspectRatio: 1.5,
                imageUrl: 'https://app.box.com',
                interval: 2,
            });
        });

        test('should not render the filmstrip if the interval is missing', () => {
            const wrapper = getWrapper({
                aspectRatio: 1.5,
                imageUrl: 'https://app.box.com',
            });

            expect(wrapper.exists(Filmstrip)).toBe(false);
        });
    });
});
