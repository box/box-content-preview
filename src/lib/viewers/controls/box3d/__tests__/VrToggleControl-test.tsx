import React from 'react';
import { render, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import VrToggleControl, { Props } from '../VrToggleControl';

describe('VrToggleControl', () => {
    const getDefaults = (): Props => ({
        isVrShown: true,
        onVrToggle: jest.fn(),
    });
    const getWrapper = (props = {}) => render(<VrToggleControl {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should render valid wrapper', () => {
            const onVrToggle = jest.fn();
            const wrapper = getWrapper({ onVrToggle });

            expect(wrapper.container).toBeInTheDocument();
            act(() => wrapper.queryByTitle('Toggle VR display')?.click());

            expect(onVrToggle).toHaveBeenCalled();
        });

        test('should render null if isVrShown is false', () => {
            const wrapper = getWrapper({ isVrShown: false });

            expect(wrapper.container).toBeEmptyDOMElement();
        });
    });
});
