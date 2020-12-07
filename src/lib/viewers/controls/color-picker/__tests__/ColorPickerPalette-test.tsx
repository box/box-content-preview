import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerPalette from '../ColorPickerPalette';
import { AnnotationColor } from '../../../../AnnotationModule';

describe('ColorPickerPalette', () => {
    const colors = Object.values(AnnotationColor);
    const onColorSelect = jest.fn();

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerPalette colors={colors} onColorSelect={onColorSelect} {...props} />);

    describe('render', () => {
        test('should render the six color swatches', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('button').length).toBe(6);
        });
    });
});
