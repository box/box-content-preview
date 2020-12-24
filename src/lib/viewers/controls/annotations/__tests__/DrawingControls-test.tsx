import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import DrawingControls from '../DrawingControls';
import { AnnotationMode } from '../../../../types';

describe('DrawingControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<DrawingControls onAnnotationColorChange={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return nothing if annotationMode is not DRAWING', () => {
            const wrapper = getWrapper();
            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return ColorPickerControl if annotationMode is DRAWING', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING });

            expect(wrapper.exists('ColorPickerControl')).toBe(true);
        });
    });
});
