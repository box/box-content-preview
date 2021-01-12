import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import SliderControl from '../SliderControl';

describe('SliderControl', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<SliderControl onChange={jest.fn()} value={0} {...props} />);

    describe('event handlers', () => {
        test('should parse and return the current value on change', () => {
            const onChange = jest.fn();
            const wrapper = getWrapper({ step: 0.1, onChange });
            const input = wrapper.find('[data-testid="bp-SliderControl-input"]');

            input.simulate('change', { target: { value: '0.5' } });

            expect(onChange).toBeCalledWith(0.5);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-SliderControl')).toBe(true);
            expect(wrapper.find('[data-testid="bp-SliderControl-input"]').props()).toMatchObject({
                max: 100,
                min: 0,
                step: 1,
            });
        });

        test('should forward the track and value properties properly', () => {
            const track = 'linear-gradient(#fff %20, #000 100%';
            const wrapper = getWrapper({ track, value: 20 });

            expect(wrapper.find('[data-testid="bp-SliderControl-input"]').prop('value')).toEqual(20);
            expect(wrapper.find('[data-testid="bp-SliderControl-track"]').prop('style')).toEqual({
                backgroundImage: track,
            });
        });
    });
});
