import * as React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { AnnotationMode } from '../../annotations/types';
import ColorPickerControl from '../ColorPickerControl';

describe('ColorPickerControl', () => {
    const onAnnotationColorClick = jest.fn();

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerControl onAnnotationColorClick={onAnnotationColorClick} {...props} />);

    const getToggleButton = (wrapper: ShallowWrapper): ShallowWrapper => wrapper.find('.bp-ColorPickerControl-button');

    describe('render', () => {
        test('should render null if annotationMode is not AnnotationMode.DRAWING', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.REGION });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should not render ColorPickerPalette when the component is first mounted', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('ColorPickerPalette').exists()).toBe(false);
        });

        test('should render ColorPickerPalette when the toggle button is clicked', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING });

            getToggleButton(wrapper).simulate('click');

            expect(wrapper.find('ColorPickerPalette').exists()).toBe(true);
        });

        test('should render the toggle button with bp-is-active set to true if isActive is true', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING, isActive: true });

            expect(getToggleButton(wrapper).hasClass('bp-is-active')).toBe(true);
        });
    });
});
