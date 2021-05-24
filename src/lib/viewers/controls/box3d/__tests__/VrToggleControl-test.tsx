import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconVr24 from '../../icons/IconVr24';
import VrToggleControl, { Props } from '../VrToggleControl';

describe('VrToggleControl', () => {
    const getDefaults = (): Props => ({
        isVrShown: true,
        onVrToggle: jest.fn(),
    });
    const getWrapper = (props = {}): ShallowWrapper => shallow(<VrToggleControl {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should render valid wrapper', () => {
            const onVrToggle = jest.fn();
            const wrapper = getWrapper({ onVrToggle });

            expect(wrapper.props()).toMatchObject({
                className: 'bp-VrToggleControl',
                onClick: onVrToggle,
                title: __('box3d_toggle_vr'),
                type: 'button',
            });
            expect(wrapper.exists(IconVr24)).toBe(true);
        });

        test('should render null if isVrShown is false', () => {
            const wrapper = getWrapper({ isVrShown: false });

            expect(wrapper.isEmptyRender()).toBe(true);
        });
    });
});
