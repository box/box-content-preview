import * as React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import ColorPickerControl from '../ColorPickerControl';

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />);

    const getColorPickerPalette = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerControl-palette"]');

    const getToggleButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerControl-button"]');

    describe('render', () => {
        test('should not render ColorPickerPalette when the component is first mounted', () => {
            const wrapper = getWrapper();

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
        });

        test('should render ColorPickerPalette when the toggle button is clicked', () => {
            const wrapper = getWrapper();

            getToggleButton(wrapper).simulate('click');

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);
        });

        test('should close the palette when button is blurred', () => {
            const wrapper = getWrapper();
            const toggleButton = getToggleButton(wrapper);

            toggleButton.simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
        });

        test('should not close the palette when palette is active', () => {
            const wrapper = getWrapper();

            getToggleButton(wrapper).simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            getColorPickerPalette(wrapper).simulate('focus');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', () => {
            const onColorSelect = jest.fn();
            const wrapper = getWrapper({ onColorSelect });

            getToggleButton(wrapper).simulate('click');
            wrapper.find('[data-testid="bp-ColorPickerPalette"]').simulate('select', defaultColor);

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
            expect(onColorSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
