import React from 'react';
import AnimationControls, { Props as AnimationControlsProps } from '../../controls/box3d/AnimationControls';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import Model3DSettings, { Props as Model3DSettingsProps } from '../../controls/box3d/Model3DSettings';
import ResetControl, { Props as ResetControlProps } from '../../controls/box3d/ResetControl';
import VrToggleControl, { Props as VrToggleControlProps } from '../../controls/box3d/VrToggleControl';

export type Props = AnimationControlsProps &
    FullscreenToggleProps &
    Model3DSettingsProps &
    ResetControlProps &
    VrToggleControlProps & {
        onSettingsClose: () => void;
        onSettingsOpen: () => void;
    };

export default function Model3DControls({
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
        <ControlsBar>
            <ResetControl onReset={onReset} />
            <AnimationControls
                animationClips={animationClips}
                currentAnimationClipId={currentAnimationClipId}
                isPlaying={isPlaying}
                onAnimationClipSelect={onAnimationClipSelect}
                onPlayPause={onPlayPause}
            />
            <VrToggleControl isVrShown={isVrShown} onVrToggle={onVrToggle} />
            <Model3DSettings
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
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
