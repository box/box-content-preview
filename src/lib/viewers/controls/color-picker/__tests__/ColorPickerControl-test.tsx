import * as React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerControl from '../ColorPickerControl';

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />);

    const getColorPickerPalette = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerPalette"]');

    const getToggleButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerControl-button"]');

    describe('render', () => {
        test('should not render ColorPickerPalette when the component is first mounted', () => {
            const wrapper = getWrapper();

            expect(getColorPickerPalette(wrapper).exists()).toBe(false);
        });

        test('should render ColorPickerPalette when the toggle button is clicked', () => {
            const wrapper = getWrapper();

            getToggleButton(wrapper).simulate('click');

            expect(getColorPickerPalette(wrapper).exists()).toBe(true);
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', () => {
            const onColorSelect = jest.fn();
            const wrapper = getWrapper({ onColorSelect });

            getToggleButton(wrapper).simulate('click');
            getColorPickerPalette(wrapper).simulate('select', defaultColor);

            expect(getColorPickerPalette(wrapper).exists()).toBe(false);
            expect(onColorSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
