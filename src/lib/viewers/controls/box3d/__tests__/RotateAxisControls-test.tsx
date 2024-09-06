import React from 'react';
import { render, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import RotateAxisControls, { Props } from '../RotateAxisControls';

describe('RotateAxisControls', () => {
    const getDefaults = (): Props => ({
        onRotateOnAxisChange: jest.fn(),
    });
    const getWrapper = (props = {}) => render(<RotateAxisControls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onRotateOnAxisChange = jest.fn();
            const wrapper = getWrapper({ onRotateOnAxisChange });

            expect(wrapper.queryByTestId('bp-RotateAxisControls-label')).toHaveTextContent('Rotate Model');

            act(() => {
                within(wrapper.queryByTestId('bp-RotateAxisControl-x')!)
                    .queryByTestId('bp-RotateAxisControl-left')
                    ?.click();
                within(wrapper.queryByTestId('bp-RotateAxisControl-y')!)
                    .queryByTestId('bp-RotateAxisControl-right')
                    ?.click();
                within(wrapper.queryByTestId('bp-RotateAxisControl-z')!)
                    .queryByTestId('bp-RotateAxisControl-left')
                    ?.click();
            });

            expect(onRotateOnAxisChange.mock.calls.at(0)).toEqual([{ x: -90 }]);
            expect(onRotateOnAxisChange.mock.calls.at(1)).toEqual([{ y: 90 }]);
            expect(onRotateOnAxisChange.mock.calls.at(2)).toEqual([{ z: -90 }]);
        });
    });
});
