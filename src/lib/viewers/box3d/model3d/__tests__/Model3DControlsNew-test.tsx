import React from 'react';
import { shallow } from 'enzyme';
import Model3DControls from '../Model3DControlsNew';
import ResetControl from '../../../controls/model3d/ResetControl';
import AnimationControls from '../../../controls/model3d/AnimationControls';
import FullscreenToggle from '../../../controls/fullscreen';

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onAnimationClipSelect = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onPlayPause = jest.fn();
            const onReset = jest.fn();

            const wrapper = shallow(
                <Model3DControls
                    animationClips={[]}
                    currentAnimationClipId="123"
                    isPlaying={false}
                    onAnimationClipSelect={onAnimationClipSelect}
                    onFullscreenToggle={onFullscreenToggle}
                    onPlayPause={onPlayPause}
                    onReset={onReset}
                />,
            );

            wrapper.find(ResetControl).prop('onReset')();

            expect(onReset).toBeCalled();
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
});
