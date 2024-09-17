import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    const renderView = (props: Partial<Props>) => render(<Model3DControls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should render valid output', async () => {
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

            renderView({
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

            await userEvent.click(screen.getByTitle('Reset'));
            expect(onReset).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByTitle('Animation clips'));
            const animationClip = screen.getByRole('menuitemradio');
            expect(animationClip).toHaveTextContent('00:00:02 foo');

            await userEvent.click(animationClip);
            expect(onAnimationClipSelect).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByTitle('Enter fullscreen'));
            expect(onFullscreenToggle).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByTitle('Toggle VR display'));
            expect(onVrToggle).toHaveBeenCalledTimes(1);

            const settings = screen.getByTitle('Settings');
            await userEvent.click(settings);
            expect(onSettingsOpen).toHaveBeenCalledTimes(1);
        });
    });
});
