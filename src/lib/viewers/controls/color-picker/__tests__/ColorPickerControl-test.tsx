import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import ColorPickerControl from '../ColorPickerControl';

type CallbackFunction = (arg: unknown) => void;

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}): ReactWrapper =>
        mount(<ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />);

    const getColorPickerPalette = (wrapper: ReactWrapper): ReactWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerControl-palette"]');

    const getToggleButton = (wrapper: ReactWrapper): ReactWrapper =>
        wrapper.find('[data-testid="bp-ColorPickerControl-toggle"]');

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

        test('should apply toggle background when the toggle button is clicked and remove the background when the button is blurred', () => {
            const wrapper = getWrapper();
            const toggleButton = getToggleButton(wrapper);

            toggleButton.simulate('click');
            expect(getToggleButton(wrapper).hasClass('bp-is-active')).toBe(true);

            toggleButton.simulate('blur', {});
            expect(getToggleButton(wrapper).hasClass('bp-is-active')).toBe(false);
        });

        test('should close the palette when button is blurred', () => {
            const wrapper = getWrapper();
            const toggleButton = getToggleButton(wrapper);

            toggleButton.simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur', {});
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
        });

        test('should not close the palette when palette is active', () => {
            const wrapper = getWrapper();

            getToggleButton(wrapper).simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            getColorPickerPalette(wrapper).simulate('focus');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);
        });

        test('should not close the palette when next focus is inside palette', () => {
            const wrapper = getWrapper();
            const toggleButton = getToggleButton(wrapper);

            toggleButton.simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur', {
                relatedTarget: getColorPickerPalette(wrapper).getDOMNode(),
            });

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);
        });

        test('should close the palette when focus is outside palette and button', () => {
            const wrapper = getWrapper();
            const toggleButton = getToggleButton(wrapper);
            const colorPaletteChild = getColorPickerPalette(wrapper).getDOMNode().firstChild;
            const divEl = document.createElement('div');

            toggleButton.simulate('click');
            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur', {
                relatedTarget: colorPaletteChild,
            });

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur', {
                relatedTarget: toggleButton.getDOMNode(),
            });

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(true);

            toggleButton.simulate('blur', {
                relatedTarget: divEl,
            });

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
        });

        test('should call focus and stop propagation when mouse down', () => {
            const mockEvent = {
                currentTarget: {
                    focus: jest.fn(),
                },
                preventDefault: jest.fn(),
            };
            (getToggleButton(getWrapper()).prop('onMouseDown') as CallbackFunction)(mockEvent);

            expect(mockEvent.currentTarget.focus).toHaveBeenCalled();
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', () => {
            const onColorSelect = jest.fn();
            const wrapper = getWrapper({ onColorSelect });

            getToggleButton(wrapper).simulate('click');

            act(() => {
                (wrapper.find('[data-testid="bp-ColorPickerPalette"]').prop('onSelect') as CallbackFunction)(
                    defaultColor,
                );
            });
            wrapper.update();

            expect(getColorPickerPalette(wrapper).hasClass('bp-is-open')).toBe(false);
            expect(onColorSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
