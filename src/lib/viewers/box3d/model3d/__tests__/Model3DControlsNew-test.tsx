import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Model3DControls, { Props } from '../Model3DControlsNew';
import { CameraProjection, RenderMode } from '../../../controls/box3d/Model3DSettings';

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    const getDefaults = (): Props => ({
        animationClips: [
            {
                duration: 2,
                id: '123',
                name: 'foo',
            },
        ],
        cameraProjection: CameraProjection.PERSPECTIVE,
        currentAnimationClipId: '123',
        isPlaying: false,
        isVrShown: true,
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
        onVrToggle: jest.fn(),
        renderMode: RenderMode.LIT,
        showGrid: true,
        showSkeletons: false,
        showWireframes: false,
    });

    const getWrapper = (props: Partial<Props>) => render(<Model3DControls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', async () => {
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
            const onVrToggle = jest.fn();

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
                onVrToggle,
            });

            await act(async () => {
                await wrapper.queryByTitle('Reset')?.click();
            });
            await expect(onReset).toHaveBeenCalledTimes(1);

            await act(async () => {
                await wrapper.queryByTitle('Play')?.click();
            });
            await expect(onPlayPause).toHaveBeenCalledTimes(1);

            await act(async () => {
                await wrapper.queryByTitle('Animation clips')?.click();
            });
            const animationClip = await wrapper.getByRole('menuitemradio');
            await expect(animationClip).toHaveTextContent('00:00:02 foo');
            await act(async () => {
                await animationClip.click();
            });
            await expect(onAnimationClipSelect).toHaveBeenCalledTimes(1);

            await act(async () => {
                await wrapper.queryByTitle('Enter fullscreen')?.click();
            });
            await expect(onFullscreenToggle).toHaveBeenCalledTimes(1);

            await act(async () => {
                await wrapper.queryByTitle('Toggle VR display')?.click();
            });
            await expect(onVrToggle).toHaveBeenCalledTimes(1);

            const settings = await wrapper.queryByTitle('Settings');
            await act(async () => {
                await settings?.click();
            });
            await expect(onSettingsOpen).toHaveBeenCalledTimes(1);
            await act(async () => {
                await settings?.click();
            });
        });
    });
});
