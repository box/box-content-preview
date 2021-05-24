import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import RotateAxisControls, { Props } from '../RotateAxisControls';
import RotateAxisControl from '../RotateAxisControl';

describe('RotateAxisControls', () => {
    const getDefaults = (): Props => ({
        onRotateOnAxisChange: jest.fn(),
    });
    const getWrapper = (props = {}): ShallowWrapper => shallow(<RotateAxisControls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });
            const controls = wrapper.find(RotateAxisControl);

            expect(wrapper.hasClass('bp-RotateAxisControls')).toBe(true);
            expect(wrapper.find('[data-testid="bp-RotateAxisControls-label"]').text()).toBe(
                __('box3d_settings_rotate_label'),
            );
            ['x', 'y', 'z'].forEach((axis, index) => {
                expect(controls.at(index).props()).toMatchObject({
                    axis,
                    onRotateOnAxisChange,
                });
            });
        });
    });
});
