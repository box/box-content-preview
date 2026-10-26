import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import Model3DControlsV2 from '../Model3DControlsV2';
import { CameraProjection, RenderMode } from '../../../controls/box3d/Model3DSettings';
import { Props } from '../Model3DControlsNew';
import { mockResizeObserver } from '../../../controls/__mocks__/resizeObserver';

describe('Model3DControlsV2', () => {
    beforeAll(() => {
        mockResizeObserver();
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Model3DControlsV2
                animationClips={[{ duration: 2, id: '123', name: 'foo' }]}
                cameraProjection={CameraProjection.PERSPECTIVE}
                currentAnimationClipId="123"
                isPlaying={false}
                isVrShown
                onAnimationClipSelect={jest.fn()}
                onCameraProjectionChange={jest.fn()}
                onFullscreenToggle={jest.fn()}
                onPlayPause={jest.fn()}
                onRenderModeChange={jest.fn()}
                onReset={jest.fn()}
                onRotateOnAxisChange={jest.fn()}
                onSettingsClose={jest.fn()}
                onSettingsOpen={jest.fn()}
                onShowGridToggle={jest.fn()}
                onShowSkeletonsToggle={jest.fn()}
                onShowWireframesToggle={jest.fn()}
                onVrToggle={jest.fn()}
                renderMode={RenderMode.LIT}
                showGrid
                showSkeletons={false}
                showWireframes={false}
                {...props}
            />,
            { wrapper: BlueprintProviders },
        );

    test('should render every control inside the Blueprint toolbar in the legacy order', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
        expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
            __('box3d_reset'),
            __('media_play'),
            __('box3d_animation_clips'),
            __('box3d_toggle_vr'),
            __('box3d_settings'),
            __('enter_fullscreen'),
        ]);
        screen.getAllByRole('button').forEach(button => expect(toolbar).toContainElement(button));
    });

    test('should leave out animation and VR controls the model does not support', () => {
        getWrapper({ animationClips: [], isVrShown: false });

        expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
            __('box3d_reset'),
            __('box3d_settings'),
            __('enter_fullscreen'),
        ]);
    });

    test('should call the viewer handlers from each control', async () => {
        const user = userEvent.setup();
        const onFullscreenToggle = jest.fn();
        const onPlayPause = jest.fn();
        const onReset = jest.fn();
        const onSettingsOpen = jest.fn();
        const onVrToggle = jest.fn();
        getWrapper({ onFullscreenToggle, onPlayPause, onReset, onSettingsOpen, onVrToggle });

        await user.click(screen.getByRole('button', { name: __('box3d_reset') }));
        await user.click(screen.getByRole('button', { name: __('media_play') }));
        await user.click(screen.getByRole('button', { name: __('box3d_toggle_vr') }));
        await user.click(screen.getByRole('button', { name: __('enter_fullscreen') }));
        await user.click(screen.getByRole('button', { name: __('box3d_settings') }));

        expect(onReset).toHaveBeenCalledTimes(1);
        expect(onPlayPause).toHaveBeenCalledWith(true);
        expect(onVrToggle).toHaveBeenCalledTimes(1);
        expect(onFullscreenToggle).toHaveBeenCalledWith(
            true,
            screen.getByRole('button', { name: __('enter_fullscreen') }),
        );
        expect(onSettingsOpen).toHaveBeenCalledTimes(1);
    });

    test('should select an animation clip from the clips menu', async () => {
        const user = userEvent.setup();
        const onAnimationClipSelect = jest.fn();
        getWrapper({ onAnimationClipSelect });

        await user.click(screen.getByRole('button', { name: __('box3d_animation_clips') }));
        await user.click(screen.getByRole('menuitemradio', { name: '00:00:02 foo' }));

        expect(onAnimationClipSelect).toHaveBeenCalledWith('123');
    });
});
