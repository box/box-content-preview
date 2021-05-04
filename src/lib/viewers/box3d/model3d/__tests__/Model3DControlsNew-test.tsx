import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import Model3DControls, { Props } from '../Model3DControlsNew';
import ResetControl from '../../../controls/model3d/ResetControl';
import AnimationControls from '../../../controls/model3d/AnimationControls';
import FullscreenToggle from '../../../controls/fullscreen';

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    const getDefaults = (): Props => ({
        animationClips: [],
        currentAnimationClipId: '123',
        isPlaying: false,
        onAnimationClipSelect: jest.fn(),
        onFullscreenToggle: jest.fn(),
        onPlayPause: jest.fn(),
        onReset: jest.fn(),
    });

    const getWrapper = (props: Partial<Props>): ShallowWrapper =>
        shallow(<Model3DControls {...getDefaults()} {...props} />);
    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onAnimationClipSelect = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onPlayPause = jest.fn();

            const wrapper = getWrapper({ onAnimationClipSelect, onFullscreenToggle, onPlayPause });

            expect(wrapper.find(AnimationControls).props()).toMatchObject({
                animationClips: [],
                currentAnimationClipId: '123',
                isPlaying: false,
                onAnimationClipSelect,
                onPlayPause,
            });
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onFullscreenToggle);
        });
    });

    describe('onReset()', () => {
        test('should call onReset prop when reset button is clicked', () => {
            const onReset = jest.fn();
            const wrapper = getWrapper({ onReset });

            wrapper.find(ResetControl).prop('onReset')();

            expect(onReset).toBeCalled();
        });
    });
});
