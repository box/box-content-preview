import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import AnimationControls from '../../../controls/model3d/AnimationControls';
import FullscreenToggle from '../../../controls/fullscreen';
import Model3DControls, { Props } from '../Model3DControlsNew';
import ResetControl from '../../../controls/model3d/ResetControl';
import Model3DSettings, { CameraProjection, RenderMode } from '../../../controls/model3d/Model3DSettings';

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    const getDefaults = (): Props => ({
        animationClips: [],
        cameraProjection: CameraProjection.PERSPECTIVE,
        currentAnimationClipId: '123',
        isPlaying: false,
        onAnimationClipSelect: jest.fn(),
        onCameraProjectionChange: jest.fn(),
        onFullscreenToggle: jest.fn(),
        onPlayPause: jest.fn(),
        onRenderModeChange: jest.fn(),
        onRotateOnAxisChange: jest.fn(),
        onReset: jest.fn(),
        onSettingsClose: jest.fn(),
        onSettingsOpen: jest.fn(),
        onShowGridToggle: jest.fn(),
        onShowSkeletonsToggle: jest.fn(),
        onShowWireframesToggle: jest.fn(),
        renderMode: RenderMode.LIT,
        showGrid: true,
        showSkeletons: false,
        showWireframes: false,
    });

    const getWrapper = (props: Partial<Props>): ShallowWrapper =>
        shallow(<Model3DControls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onAnimationClipSelect = jest.fn();
            const onCameraProjectionChange = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onPlayPause = jest.fn();
            const onRenderModeChange = jest.fn();
            const onRotateOnAxisChange = jest.fn();
            const onReset = jest.fn();
            const onSettingsClose = jest.fn();
            const onSettingsOpen = jest.fn();
            const onShowGridToggle = jest.fn();
            const onShowSkeletonsToggle = jest.fn();
            const onShowWireframesToggle = jest.fn();

            const wrapper = getWrapper({
                onAnimationClipSelect,
                onCameraProjectionChange,
                onFullscreenToggle,
                onPlayPause,
                onRenderModeChange,
                onRotateOnAxisChange,
                onReset,
                onSettingsClose,
                onSettingsOpen,
                onShowGridToggle,
                onShowSkeletonsToggle,
                onShowWireframesToggle,
            });

            expect(wrapper.find(ResetControl).props()).toMatchObject({
                onReset,
            });
            expect(wrapper.find(AnimationControls).props()).toMatchObject({
                animationClips: [],
                currentAnimationClipId: '123',
                isPlaying: false,
                onAnimationClipSelect,
                onPlayPause,
            });
            expect(wrapper.find(Model3DSettings).props()).toMatchObject({
                cameraProjection: CameraProjection.PERSPECTIVE,
                onCameraProjectionChange,
                onClose: onSettingsClose,
                onOpen: onSettingsOpen,
                onRenderModeChange,
                onRotateOnAxisChange,
                onShowGridToggle,
                onShowSkeletonsToggle,
                onShowWireframesToggle,
                renderMode: RenderMode.LIT,
                showGrid: true,
                showSkeletons: false,
                showWireframes: false,
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
