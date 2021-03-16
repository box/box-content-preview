import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconCheckMark24 from '../../../icons/IconCheckMark24';
import MediaSettingsRadioItem from '../MediaSettingsRadioItem';

describe('MediaSettingsRadioItem', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<MediaSettingsRadioItem label="1.0" onChange={jest.fn()} value={1} {...props} />);

    describe('event handlers', () => {
        test('should set the active menu when clicked', () => {
            const onChange = jest.fn();
            const wrapper = getWrapper({ onChange });

            wrapper.simulate('click');

            expect(onChange).toBeCalledWith(1);
        });

        test.each`
            key            | calledTimes
            ${'ArrowLeft'} | ${1}
            ${'Enter'}     | ${1}
            ${'Escape'}    | ${0}
            ${'Space'}     | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', ({ key, calledTimes }) => {
            const onChange = jest.fn();
            const wrapper = getWrapper({ onChange });

            wrapper.simulate('keydown', { key });

            expect(onChange).toBeCalledTimes(calledTimes);
        });
    });

    describe('render', () => {
        test.each([true, false])('should set classes based on isSelected prop %s', isSelected => {
            const wrapper = getWrapper({ isSelected });

            expect(wrapper.hasClass('bp-is-selected')).toBe(isSelected);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsRadioItem')).toBe(true);
            expect(wrapper.find('.bp-MediaSettingsRadioItem-value').contains('1.0')).toBe(true);
            expect(wrapper.exists(IconCheckMark24)).toBe(true); // Rendered, but visually hidden by default
        });
    });
});
