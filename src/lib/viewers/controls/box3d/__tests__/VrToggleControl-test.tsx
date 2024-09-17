import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VrToggleControl from '../VrToggleControl';

describe('VrToggleControl', () => {
    const renderView = (props = {}) => render(<VrToggleControl isVrShown onVrToggle={jest.fn()} {...props} />);

    describe('render', () => {
        test('should render valid output', async () => {
            const onVrToggle = jest.fn();
            renderView({ onVrToggle });

            expect(screen.getByTitle('Toggle VR display')).toBeInTheDocument();

            await userEvent.click(screen.getByTitle('Toggle VR display'));

            expect(onVrToggle).toHaveBeenCalled();
        });

        test('should not render null if isVrShown is false', () => {
            renderView({ isVrShown: false });

            expect(screen.queryByTitle('Toggle VR display')).not.toBeInTheDocument();
        });
    });
});
