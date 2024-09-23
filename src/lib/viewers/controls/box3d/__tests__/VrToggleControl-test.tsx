import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VrToggleControl from '../VrToggleControl';

describe('VrToggleControl', () => {
    describe('render', () => {
        test('should render valid output', async () => {
            const user = userEvent.setup();
            const onVrToggle = jest.fn();
            render(<VrToggleControl isVrShown onVrToggle={onVrToggle} />);

            expect(screen.getByTitle('Toggle VR display')).toBeInTheDocument();

            await user.click(screen.getByTitle('Toggle VR display'));

            expect(onVrToggle).toHaveBeenCalled();
        });

        test('should not render null if isVrShown is false', () => {
            render(<VrToggleControl isVrShown={false} onVrToggle={jest.fn()} />);

            expect(screen.queryByTitle('Toggle VR display')).not.toBeInTheDocument();
        });
    });
});
