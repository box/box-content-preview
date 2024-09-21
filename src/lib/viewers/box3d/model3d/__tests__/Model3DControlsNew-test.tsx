import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Model3DControls from '../Model3DControlsNew';
import { CameraProjection, RenderMode } from '../../../controls/box3d/Model3DSettings';

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    describe('render()', () => {
        test('should render valid output', async () => {
            const user = userEvent.setup();
            const onReset = jest.fn();
            const onPlayPause = jest.fn();
            const onAnimationClipSelect = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onVrToggle = jest.fn();
            const onSettingsOpen = jest.fn();
            render(
                <Model3DControls
                    animationClips={[
                        {
                            duration: 2,
                            id: '123',
                            name: 'foo',
                        },
                    ]}
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    currentAnimationClipId="123"
                    isPlaying={false}
                    isVrShown
                    onAnimationClipSelect={onAnimationClipSelect}
                    onCameraProjectionChange={jest.fn()}
                    onFullscreenToggle={onFullscreenToggle}
                    onPlayPause={onPlayPause}
                    onRenderModeChange={jest.fn()}
                    onReset={onReset}
                    onRotateOnAxisChange={jest.fn()}
                    onSettingsClose={jest.fn()}
                    onSettingsOpen={onSettingsOpen}
                    onShowGridToggle={jest.fn()}
                    onShowSkeletonsToggle={jest.fn()}
                    onShowWireframesToggle={jest.fn()}
                    onVrToggle={onVrToggle}
                    renderMode={RenderMode.LIT}
                    showGrid
                    showSkeletons={false}
                    showWireframes={false}
                />,
            );

            await user.click(screen.getByTitle('Reset'));
            expect(onReset).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Animation clips'));
            const animationClip = screen.getByRole('menuitemradio');
            expect(animationClip).toHaveTextContent('00:00:02 foo');

            await user.click(animationClip);
            expect(onAnimationClipSelect).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Enter fullscreen'));
            expect(onFullscreenToggle).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Toggle VR display'));
            expect(onVrToggle).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Settings'));
            expect(onSettingsOpen).toHaveBeenCalledTimes(1);
        });
    });
});
