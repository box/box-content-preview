import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import AnimationClipsControl from '../AnimationClipsControl';
import AnimationControls, { Props as AnimationControlsProps } from '../AnimationControls';
import PlayPauseToggle from '../../media/PlayPauseToggle';

describe('AnimationControls', () => {
    const getDefaults = (): AnimationControlsProps => ({
        animationClips: [{ duration: 1, id: '1', name: 'one' }],
        currentAnimationClipId: '1',
        isPlaying: false,
        onAnimationClipSelect: jest.fn(),
        onPlayPause: jest.fn(),
    });
    const getWrapper = (props = {}): ShallowWrapper => shallow(<AnimationControls {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should return null if animationClips is empty', () => {
            const wrapper = getWrapper({ animationClips: [] });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return valid wrapper', () => {
            const onAnimationClipSelect = jest.fn();
            const onPlayPause = jest.fn();
            const wrapper = getWrapper({ onAnimationClipSelect, onPlayPause });

            expect(wrapper.find(PlayPauseToggle).props()).toMatchObject({
                isPlaying: false,
                onPlayPause,
            });
            expect(wrapper.find(AnimationClipsControl).props()).toMatchObject({
                animationClips: expect.any(Array),
                currentAnimationClipId: '1',
                onAnimationClipSelect,
            });
        });
    });
});
