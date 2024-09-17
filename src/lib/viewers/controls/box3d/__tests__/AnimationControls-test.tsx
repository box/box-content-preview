import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationControls, { Props as AnimationControlsProps } from '../AnimationControls';

describe('AnimationControls', () => {
    const getDefaults = (): AnimationControlsProps => ({
        animationClips: [{ duration: 1, id: '1', name: 'one' }],
        currentAnimationClipId: '1',
        isPlaying: false,
        onAnimationClipSelect: jest.fn(),
        onPlayPause: jest.fn(),
    });
    const renderView = (props = {}) => render(<AnimationControls {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should render nothing if animationClips is empty', () => {
            renderView({ animationClips: [] });

            expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Animation clips')).not.toBeInTheDocument();
        });

        test('should return valid wrapper', async () => {
            const onAnimationClipSelect = jest.fn();
            const onPlayPause = jest.fn();
            renderView({ onAnimationClipSelect, onPlayPause });

            await userEvent.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledWith(true);

            await userEvent.click(screen.getByTitle('Animation clips'));
            await userEvent.click(screen.getByRole('menuitemradio', { name: '00:00:01 one' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('1');
        });
    });
});
