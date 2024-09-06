import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import RotateAxisControl, { Props } from '../RotateAxisControl';

describe('RotateAxisControl', () => {
    const getDefaults = (): Props => ({
        axis: 'x',
        onRotateOnAxisChange: jest.fn(),
    });
    const getWrapper = (props = {}) => render(<RotateAxisControl {...getDefaults()} {...props} />);

    describe('onRotateOnAxisChange()', () => {
        test('should indicate a negative rotation when the left button is clicked', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });

            act(() => wrapper.queryByTestId('bp-RotateAxisControl-left')?.click());

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: -90 });
        });

        test('should indicate a positive rotation when the right button is clicked', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });

            act(() => wrapper.queryByTestId('bp-RotateAxisControl-right')?.click());

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: 90 });
        });
    });

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.queryByTestId('bp-RotateAxisControl-left')).toHaveClass('bp-RotateAxisControl-left');
            expect(wrapper.queryByTestId('bp-RotateAxisControl-right')).toHaveClass('bp-RotateAxisControl-right');
            expect(wrapper.queryByTestId('bp-RotateAxisControl-label')).toHaveTextContent('x');
        });
    });
});
