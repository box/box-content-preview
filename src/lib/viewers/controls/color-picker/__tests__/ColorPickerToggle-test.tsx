import * as React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { AnnotationMode } from '../../annotations/types';
import ColorPickerToggle from '../ColorPickerToggle';

describe('ColorPickerToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<ColorPickerToggle {...props} />);

    const getToggleButton = (wrapper: ShallowWrapper): ShallowWrapper => wrapper.find('.bp-ColorPickerToggle-button');

    describe('render', () => {
        test('should render null if annotatioMode is not AnnotationMode.DRAWING', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.REGION });

            expect(wrapper.find('.bp-ColorPickerToggle').length).toBe(0);
        });

        test('should not render ColorPickerPalette when the component is first mounted', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('ColorPickerPalette').length).toBe(0);
        });

        test('should render ColorPickerPalette when the toggle button is clicked', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING });

            getToggleButton(wrapper).simulate('click');

            expect(wrapper.find('ColorPickerPalette').length).toBe(1);
        });

        test('should render the toggle button with bp-is-active set to true if isActive is true', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING, isActive: true });

            expect(getToggleButton(wrapper).hasClass('bp-is-active')).toBe(true);
        });
    });
});
