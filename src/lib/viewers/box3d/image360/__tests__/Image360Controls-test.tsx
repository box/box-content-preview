import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Image360Controls, { Props } from '../Image360Controls';

describe('lib/viewers/box3d/image360/Image360Controls', () => {
    const getDefaults = (): Props => ({
        isVrShown: false,
        onFullscreenToggle: jest.fn(),
        onVrToggle: jest.fn(),
    });

    const renderView = (props: Partial<Props>) => render(<Image360Controls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const onFullscreenToggle = jest.fn();
            const onVrToggle = jest.fn();

            renderView({
                onFullscreenToggle,
                onVrToggle,
            });

            expect(screen.queryByTitle('Toggle VR display')).not.toBeInTheDocument();

            await userEvent.click(screen.getByTitle('Enter fullscreen'));

            expect(onFullscreenToggle).toHaveBeenCalled();
        });
    });
});
