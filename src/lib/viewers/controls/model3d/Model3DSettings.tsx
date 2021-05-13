import React from 'react';
import RotateAxisControls from './RotateAxisControls';
import Settings, { Menu, Props as SettingsProps } from '../settings';
import { AxisChange } from './RotateAxisControl';
import './Model3DSettings.scss';

export enum CameraProjection {
    PERSPECTIVE = 'Perspective',
    ORTHOGRAPHIC = 'Orthographic',
}

export enum RenderMode {
    LIT = 'Lit',
    UNLIT = 'Unlit',
    NORMALS = 'Normals',
    SHAPE = 'Shape',
    UV_OVERLAY = 'UV Overlay',
}

export type Props = Pick<SettingsProps, 'onClose' | 'onOpen'> & {
    cameraProjection: CameraProjection;
    onCameraProjectionChange: (projection: CameraProjection) => void;
    onRenderModeChange: (mode: RenderMode) => void;
    onRotateOnAxisChange: (change: AxisChange) => void;
    onShowGridToggle: () => void;
    onShowSkeletonsToggle: () => void;
    onShowWireframesToggle: () => void;
    renderMode: RenderMode;
    showGrid: boolean;
    showSkeletons: boolean;
    showWireframes: boolean;
};

const cameraProjectionOptions = [
    { label: __('box3d_camera_projection_perspective'), value: CameraProjection.PERSPECTIVE },
    { label: __('box3d_camera_projection_orthographic'), value: CameraProjection.ORTHOGRAPHIC },
];

const renderModeOptions = [
    { label: __('box3d_render_mode_lit'), value: RenderMode.LIT },
    { label: __('box3d_render_mode_unlit'), value: RenderMode.UNLIT },
    { label: __('box3d_render_mode_normals'), value: RenderMode.NORMALS },
    { label: __('box3d_render_mode_shape'), value: RenderMode.SHAPE },
    { label: __('box3d_render_mode_uv_overlay'), value: RenderMode.UV_OVERLAY },
];

export default function Model3DSettings({
    cameraProjection,
    onCameraProjectionChange,
    onClose,
    onOpen,
    onRenderModeChange,
    onRotateOnAxisChange,
    onShowGridToggle,
    onShowSkeletonsToggle,
    onShowWireframesToggle,
    renderMode,
    showGrid,
    showSkeletons,
    showWireframes,
}: Props): JSX.Element {
    return (
        <Settings className="bp-Model3DSettings" onClose={onClose} onOpen={onOpen}>
            <Settings.Menu className="bp-Model3DSettings-menu" name={Menu.MAIN}>
                <Settings.Dropdown<RenderMode>
                    label={__('box3d_settings_render_label')}
                    listItems={renderModeOptions}
                    onSelect={onRenderModeChange}
                    value={renderMode}
                />
                <Settings.CheckboxItem
                    isChecked={showGrid}
                    label={__('box3d_settings_grid_label')}
                    onChange={onShowGridToggle}
                />
                <Settings.CheckboxItem
                    isChecked={showWireframes}
                    label={__('box3d_settings_wireframes_label')}
                    onChange={onShowWireframesToggle}
                />
                <Settings.CheckboxItem
                    isChecked={showSkeletons}
                    label={__('box3d_settings_skeletons_label')}
                    onChange={onShowSkeletonsToggle}
                />
                <Settings.Dropdown<CameraProjection>
                    label={__('box3d_settings_projection_label')}
                    listItems={cameraProjectionOptions}
                    onSelect={onCameraProjectionChange}
                    value={cameraProjection}
                />
                <RotateAxisControls onRotateOnAxisChange={onRotateOnAxisChange} />
            </Settings.Menu>
        </Settings>
    );
}
