import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import SettingsCheckboxItem from '../SettingsCheckboxItem';

describe('SettingsCheckboxItem', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<SettingsCheckboxItem isChecked label="label" onChange={jest.fn()} {...props} />);

    describe('onChange()', () => {
        test.each([true, false])('should call onChange with the new checked value when initially %s', isChecked => {
            const nextIsChecked = !isChecked;
            const onChange = jest.fn();
            const wrapper = getWrapper({ isChecked, onChange });

            wrapper.find('input').simulate('change', { target: { checked: nextIsChecked } });

            expect(onChange).toBeCalledWith(nextIsChecked);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper({ label: 'foo' });

            expect(wrapper.hasClass('bp-SettingsCheckboxItem')).toBe(true);
            expect(wrapper.exists('input')).toBe(true);
            expect(wrapper.find('label').text()).toBe('foo');
        });

        test.each([true, false])('should set checked attribute as when specified as %s', isChecked => {
            const wrapper = getWrapper({ isChecked });

            expect(wrapper.find('input').prop('checked')).toBe(isChecked);
        });
    });
});
