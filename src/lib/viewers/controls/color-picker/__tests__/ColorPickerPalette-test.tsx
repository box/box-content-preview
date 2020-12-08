import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerPalette from '../ColorPickerPalette';

describe('ColorPickerPalette', () => {
    const defaultColor = '#fff';
    const colors = [defaultColor];

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerPalette colors={colors} onSelect={jest.fn()} {...props} />);

    describe('render', () => {
        test('should render a single color swatch', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('button').length).toBe(1);
        });
    });

    describe('onSelect', () => {
        test('should call onSelect with a button is clicked', () => {
            const onSelect = jest.fn();
            const wrapper = getWrapper({ onSelect });

            wrapper
                .find('button')
                .at(0)
                .simulate('click');

            expect(onSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
