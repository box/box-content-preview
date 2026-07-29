import React from 'react';
import AnimationControls, { Props as AnimationControlsProps } from '../../controls/box3d/AnimationControls';
import Comment3DOnboardingTooltip from '../../controls/box3d/Comment3DOnboardingTooltip';
import CommentControl from '../../controls/box3d/CommentControl';
import ControlsBar, { ControlsBarDivider, ControlsBarGroup } from '../../controls/controls-bar';
import DrawControl from '../../controls/box3d/DrawControl';
import DrawingControls, { Props as DrawingControlsProps } from '../../controls/annotations/DrawingControls';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../../controls/fullscreen';
import Model3DSettings, { Props as Model3DSettingsProps } from '../../controls/box3d/Model3DSettings';
import PanControl from '../../controls/box3d/PanControl';
import ResetControl, { Props as ResetControlProps } from '../../controls/box3d/ResetControl';
import VersionDiffControl from '../../controls/box3d/VersionDiffControl';
import VrToggleControl, { Props as VrToggleControlProps } from '../../controls/box3d/VrToggleControl';
import WatermarkControl from '../../controls/box3d/WatermarkControl';
import ZoomControls, { Props as ZoomControlsProps } from '../../controls/zoom';
import { AnnotationMode } from '../../../types';

export type Props = AnimationControlsProps &
    Omit<DrawingControlsProps, 'annotationMode'> &
    FullscreenToggleProps &
    Model3DSettingsProps &
    ResetControlProps &
    VrToggleControlProps &
    ZoomControlsProps & {
        isCommentModeActive: boolean;
        isCommentOnboardingActive?: boolean;
        isDrawModeActive: boolean;
        isPanModeActive: boolean;
        isVersionDiffActive: boolean;
        isWatermarkActive: boolean;
        onCommentOnboardingDismiss?: () => void;
        onCommentToggle: () => void;
        onDrawToggle: () => void;
        onPanToggle: () => void;
        onSettingsClose: () => void;
        onSettingsOpen: () => void;
        onVersionDiffToggle: () => void;
        onWatermarkToggle: () => void;
    };

export default function Model3DControls({
    annotationColor,
    animationClips,
    cameraProjection,
    currentAnimationClipId,
    isCommentModeActive,
    isCommentOnboardingActive = false,
    isDrawModeActive,
    isPanModeActive,
    isVersionDiffActive,
    isWatermarkActive,
    isPlaying,
    isVrShown,
    maxScale,
    minScale,
    onAnimationClipSelect,
    onAnnotationColorChange,
    onCameraProjectionChange,
    onCommentOnboardingDismiss,
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
        <>
            <ControlsBar>
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
                <WatermarkControl isActive={isWatermarkActive} onWatermarkToggle={onWatermarkToggle} />
                <ControlsBarDivider />
                <ResetControl onReset={onReset} />
                <ControlsBarGroup isDistinct>
                    <ZoomControls
                        maxScale={maxScale}
                        minScale={minScale}
                        onZoomIn={onZoomIn}
                        onZoomOut={onZoomOut}
                        scale={scale}
                    />
                </ControlsBarGroup>
                <PanControl isActive={isPanModeActive} onPanToggle={onPanToggle} />
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                <ControlsBarDivider />
                <AnimationControls
                    animationClips={animationClips}
                    currentAnimationClipId={currentAnimationClipId}
                    isPlaying={isPlaying}
                    onAnimationClipSelect={onAnimationClipSelect}
                    onPlayPause={onPlayPause}
                />
                <VrToggleControl isVrShown={isVrShown} onVrToggle={onVrToggle} />
                <VersionDiffControl isActive={isVersionDiffActive} onVersionDiffToggle={onVersionDiffToggle} />
                <DrawControl isActive={isDrawModeActive} onDrawToggle={onDrawToggle} />
                <Comment3DOnboardingTooltip
                    isEnabled={isCommentOnboardingActive}
                    onDismiss={onCommentOnboardingDismiss}
                >
                    <CommentControl isActive={isCommentModeActive} onCommentToggle={onCommentToggle} />
                </Comment3DOnboardingTooltip>
            </ControlsBar>
            <ControlsBar>
                <DrawingControls
                    annotationColor={annotationColor}
                    annotationMode={isDrawModeActive ? AnnotationMode.DRAWING : AnnotationMode.NONE}
                    onAnnotationColorChange={onAnnotationColorChange}
                />
            </ControlsBar>
        </>
    );
}
