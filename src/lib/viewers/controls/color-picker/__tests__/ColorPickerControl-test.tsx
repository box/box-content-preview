import * as React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerControl from '../ColorPickerControl';

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />);

    const getToggleButton = (wrapper: ShallowWrapper): ShallowWrapper => wrapper.find('.bp-ColorPickerControl-button');

    describe('render', () => {
        test('should not render ColorPickerPalette when the component is first mounted', () => {
            const wrapper = getWrapper();

            expect(wrapper.find('ColorPickerPalette').exists()).toBe(false);
        });

        test('should render ColorPickerPalette when the toggle button is clicked', () => {
            const wrapper = getWrapper();

            getToggleButton(wrapper).simulate('click');

            expect(wrapper.find('ColorPickerPalette').exists()).toBe(true);
        });

        test('should render the toggle button with bp-is-active set to true if isActive is true', () => {
            const wrapper = getWrapper({ isActive: true });

            expect(getToggleButton(wrapper).hasClass('bp-is-active')).toBe(true);
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', () => {
            const onColorSelect = jest.fn();
            const wrapper = getWrapper({ onColorSelect });

            getToggleButton(wrapper).simulate('click');
            wrapper.find('ColorPickerPalette').simulate('select', defaultColor);

            expect(wrapper.find('ColorPickerPalette').exists()).toBe(false);
            expect(onColorSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
