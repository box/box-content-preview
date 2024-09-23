import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationControls from '../AnimationControls';

describe('AnimationControls', () => {
    describe('render', () => {
        test('should render nothing if animationClips is empty', () => {
            render(
                <AnimationControls
                    animationClips={[]}
                    currentAnimationClipId="1"
                    isPlaying={false}
                    onAnimationClipSelect={jest.fn()}
                    onPlayPause={jest.fn()}
                />,
            );

            expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Animation clips')).not.toBeInTheDocument();
        });

        test('should return valid wrapper', async () => {
            const user = userEvent.setup();
            const onAnimationClipSelect = jest.fn();
            const onPlayPause = jest.fn();
            render(
                <AnimationControls
                    animationClips={[{ duration: 1, id: '1', name: 'one' }]}
                    currentAnimationClipId="1"
                    isPlaying={false}
                    onAnimationClipSelect={onAnimationClipSelect}
                    onPlayPause={onPlayPause}
                />,
            );

            await user.click(screen.getByTitle('Play'));

            expect(onPlayPause).toHaveBeenCalledWith(true);

            await user.click(screen.getByTitle('Animation clips'));
            await user.click(screen.getByRole('menuitemradio', { name: '00:00:01 one' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('1');
        });
    });
});
