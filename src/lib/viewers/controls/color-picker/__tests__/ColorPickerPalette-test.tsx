import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerPalette from '../ColorPickerPalette';

describe('ColorPickerPalette', () => {
    const colors = ['#fff'];

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerPalette colors={colors} onSelect={jest.fn()} {...props} />);

    describe('render', () => {
        test('should render a single color swatch', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('button').length).toBe(1);
        });
    });
});
