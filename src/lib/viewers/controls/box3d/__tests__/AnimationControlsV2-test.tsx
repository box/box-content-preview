import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationControlsV2 from '../AnimationControlsV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import { Props } from '../AnimationControls';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('AnimationControlsV2', () => {
    beforeAll(() => {
        mockResizeObserver();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <AnimationControlsV2
                    animationClips={[{ duration: 2, id: '1', name: 'first' }]}
                    currentAnimationClipId="1"
                    onAnimationClipSelect={jest.fn()}
                    onPlayPause={jest.fn()}
                    {...props}
                />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

    test('should render play and the clips menu trigger in the toolbar', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');
        const play = screen.getByRole('button', { name: __('media_play') });

        expect(toolbar).toContainElement(play);
        expect(play).toHaveAttribute('data-resin-target', 'playPause');
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('box3d_animation_clips') }));
    });

    test('should offer to pause while playing', () => {
        getWrapper({ isPlaying: true });

        expect(screen.getByRole('button', { name: __('media_pause') })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: __('media_play') })).not.toBeInTheDocument();
    });

    test.each`
        isPlaying | label            | next
        ${false}  | ${'media_play'}  | ${true}
        ${true}   | ${'media_pause'} | ${false}
    `('should call onPlayPause with $next from $label', async ({ isPlaying, label, next }) => {
        const onPlayPause = jest.fn();
        getWrapper({ isPlaying, onPlayPause });

        await userEvent.click(screen.getByRole('button', { name: __(label) }));

        expect(onPlayPause).toHaveBeenCalledWith(next);
    });

    test('should render nothing if the model has no animation clips', () => {
        getWrapper({ animationClips: [] });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
