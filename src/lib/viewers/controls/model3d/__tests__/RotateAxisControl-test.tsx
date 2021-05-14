import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import RotateAxisControl, { Props } from '../RotateAxisControl';

describe('RotateAxisControl', () => {
    const getDefaults = (): Props => ({
        axis: 'x',
        onRotateOnAxisChange: jest.fn(),
    });
    const getWrapper = (props = {}): ShallowWrapper => shallow(<RotateAxisControl {...getDefaults()} {...props} />);

    describe('onRotateOnAxisChange()', () => {
        test('should indicate a negative rotation when the left button is clicked', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });

            wrapper.find('[data-testid="bp-RotateAxisControl-left"]').simulate('click');

            expect(onRotateOnAxisChange).toBeCalledWith({ x: -90 });
        });

        test('should indicate a positive rotation when the right button is clicked', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });

            wrapper.find('[data-testid="bp-RotateAxisControl-right"]').simulate('click');

            expect(onRotateOnAxisChange).toBeCalledWith({ x: 90 });
        });
    });

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-RotateAxisControl')).toBe(true);
            expect(wrapper.find('[data-testid="bp-RotateAxisControl-left"]').props()).toMatchObject({
                className: 'bp-RotateAxisControl-left',
                onClick: expect.any(Function),
                type: 'button',
            });
            expect(wrapper.find('[data-testid="bp-RotateAxisControl-label"]').text()).toBe('x');
            expect(wrapper.find('[data-testid="bp-RotateAxisControl-right"]').props()).toMatchObject({
                className: 'bp-RotateAxisControl-right',
                onClick: expect.any(Function),
                type: 'button',
            });
        });
    });
});
