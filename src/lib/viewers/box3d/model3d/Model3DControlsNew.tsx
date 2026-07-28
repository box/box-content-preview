import React from 'react';
import AnimationControls, { Props as AnimationControlsProps } from '../../controls/box3d/AnimationControls';
import CommentControl from '../../controls/box3d/CommentControl';
import ControlsBar, { ControlsBarGroup } from '../../controls/controls-bar';
import DrawControl from '../../controls/box3d/DrawControl';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import Model3DSettings, { Props as Model3DSettingsProps } from '../../controls/box3d/Model3DSettings';
import PanControl from '../../controls/box3d/PanControl';
import ResetControl, { Props as ResetControlProps } from '../../controls/box3d/ResetControl';
import VersionDiffControl from '../../controls/box3d/VersionDiffControl';
import VrToggleControl, { Props as VrToggleControlProps } from '../../controls/box3d/VrToggleControl';
import WatermarkControl from '../../controls/box3d/WatermarkControl';
import ZoomControls, { Props as ZoomControlsProps } from '../../controls/zoom';

export type Props = AnimationControlsProps &
    FullscreenToggleProps &
    Model3DSettingsProps &
    ResetControlProps &
    VrToggleControlProps &
    ZoomControlsProps & {
        isCommentModeActive: boolean;
        isDrawModeActive: boolean;
        isPanModeActive: boolean;
        isVersionDiffActive: boolean;
        isWatermarkActive: boolean;
        onCommentToggle: () => void;
        onDrawToggle: () => void;
        onPanToggle: () => void;
        onSettingsClose: () => void;
        onSettingsOpen: () => void;
        onVersionDiffToggle: () => void;
        onWatermarkToggle: () => void;
    };

export default function Model3DControls({
    animationClips,
    cameraProjection,
    currentAnimationClipId,
    isCommentModeActive,
    isDrawModeActive,
    isPanModeActive,
    isVersionDiffActive,
    isWatermarkActive,
    isPlaying,
    isVrShown,
    maxScale,
    minScale,
    onAnimationClipSelect,
    onCameraProjectionChange,
    onCommentToggle,
    onDrawToggle,
    onPanToggle,
    onFullscreenToggle,
    onPlayPause,
    onRenderModeChange,
    onReset,
    onSettingsClose,
    onSettingsOpen,
    onVersionDiffToggle,
    onWatermarkToggle,
    onShowEnvironmentToggle,
    onShowGridToggle,
    onShowLightsToggle,
    onShowWireframesToggle,
    onVrToggle,
    onZoomIn,
    onZoomOut,
    renderMode,
    scale,
    showEnvironment,
    showGrid,
    showLights,
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
                onShowEnvironmentToggle={onShowEnvironmentToggle}
                onShowGridToggle={onShowGridToggle}
                onShowLightsToggle={onShowLightsToggle}
                onShowWireframesToggle={onShowWireframesToggle}
                renderMode={renderMode}
                showEnvironment={showEnvironment}
                showGrid={showGrid}
                showLights={showLights}
                showWireframes={showWireframes}
            />
            <ControlsBarGroup isDistinct>
                <ZoomControls
                    maxScale={maxScale}
                    minScale={minScale}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    scale={scale}
                />
            </ControlsBarGroup>
            <WatermarkControl isActive={isWatermarkActive} onWatermarkToggle={onWatermarkToggle} />
            <VersionDiffControl isActive={isVersionDiffActive} onVersionDiffToggle={onVersionDiffToggle} />
            <PanControl isActive={isPanModeActive} onPanToggle={onPanToggle} />
            <DrawControl isActive={isDrawModeActive} onDrawToggle={onDrawToggle} />
            <CommentControl isActive={isCommentModeActive} onCommentToggle={onCommentToggle} />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
