import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerPalette from '../ColorPickerPalette';

describe('ColorPickerPalette', () => {
    const onColorSelect = jest.fn();

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerPalette onColorSelect={onColorSelect} {...props} />);

    describe('render', () => {
        test('should render the six color swatches', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('button').length).toBe(6);
        });
    });
});
