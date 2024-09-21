import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Image360Controls from '../Image360Controls';

describe('lib/viewers/box3d/image360/Image360Controls', () => {
    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const user = userEvent.setup();
            const onFullscreenToggle = jest.fn();
            render(
                <Image360Controls isVrShown={false} onFullscreenToggle={onFullscreenToggle} onVrToggle={jest.fn()} />,
            );

            expect(screen.queryByTitle('Toggle VR display')).not.toBeInTheDocument();

            await user.click(screen.getByTitle('Enter fullscreen'));

            expect(onFullscreenToggle).toHaveBeenCalled();
        });
    });
});
