import React from 'react';
import AnimationControls, { Props as AnimationControlsProps } from '../../controls/model3d/AnimationControls';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import Model3DSettings, { Props as Model3DSettingsProps } from '../../controls/model3d/Model3DSettings';
import ResetControl, { Props as ResetControlProps } from '../../controls/model3d/ResetControl';

export type Props = AnimationControlsProps &
    FullscreenToggleProps &
    Model3DSettingsProps &
    ResetControlProps & {
        onSettingsClose: () => void;
        onSettingsOpen: () => void;
    };

export default function Model3DControls({
    animationClips,
    cameraProjection,
    currentAnimationClipId,
    isPlaying,
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
            {/* TODO: VR button */}
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
