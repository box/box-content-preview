import React from 'react';
import AnimationControlsV2 from '../../controls/box3d/AnimationControlsV2';
import Model3DSettingsV2 from '../../controls/box3d/Model3DSettingsV2';
import ResetControlV2 from '../../controls/box3d/ResetControlV2';
import VrToggleControlV2 from '../../controls/box3d/VrToggleControlV2';
import { ControlsBarV2 } from '../../controls/controls-bar';
import { FullscreenToggleV2 } from '../../controls/fullscreen';
import { Props } from './Model3DControlsNew';

export default function Model3DControlsV2({
    animationClips,
    cameraProjection,
    currentAnimationClipId,
    isPlaying,
    isVrShown,
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
    renderMode,
    showGrid,
    showSkeletons,
    showWireframes,
}: Props): JSX.Element {
    return (
        <ControlsBarV2>
            <ResetControlV2 onReset={onReset} />
            <AnimationControlsV2
                animationClips={animationClips}
                currentAnimationClipId={currentAnimationClipId}
                isPlaying={isPlaying}
                onAnimationClipSelect={onAnimationClipSelect}
                onPlayPause={onPlayPause}
            />
            <VrToggleControlV2 isVrShown={isVrShown} onVrToggle={onVrToggle} />
            <Model3DSettingsV2
                cameraProjection={cameraProjection}
                onCameraProjectionChange={onCameraProjectionChange}
                onClose={onSettingsClose}
                onOpen={onSettingsOpen}
                onRenderModeChange={onRenderModeChange}
                onRotateOnAxisChange={onRotateOnAxisChange}
                onShowGridToggle={onShowGridToggle}
                onShowSkeletonsToggle={onShowSkeletonsToggle}
                onShowWireframesToggle={onShowWireframesToggle}
                renderMode={renderMode}
                showGrid={showGrid}
                showSkeletons={showSkeletons}
                showWireframes={showWireframes}
            />
            <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
        </ControlsBarV2>
    );
}
