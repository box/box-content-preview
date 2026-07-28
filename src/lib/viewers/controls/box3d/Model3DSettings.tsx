import React from 'react';
import Icon3DClay24 from '../icons/Icon3DClay24';
import Icon3DEnvironment24 from '../icons/Icon3DEnvironment24';
import Icon3DGrid24 from '../icons/Icon3DGrid24';
import Icon3DLights24 from '../icons/Icon3DLights24';
import Icon3DNormals24 from '../icons/Icon3DNormals24';
import Icon3DRealistic24 from '../icons/Icon3DRealistic24';
import Icon3DWireframes24 from '../icons/Icon3DWireframes24';
import Model3DPreviewToggle from './Model3DPreviewToggle';
import Model3DRenderModeItem from './Model3DRenderModeItem';
import Settings, { Menu, Props as SettingsProps } from '../settings';
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
    onShowEnvironmentToggle: (visible: boolean) => void;
    onShowGridToggle: (visible: boolean) => void;
    onShowLightsToggle: (visible: boolean) => void;
    onShowWireframesToggle: (visible: boolean) => void;
    renderMode: RenderMode;
    showEnvironment: boolean;
    showGrid: boolean;
    showLights: boolean;
    showWireframes: boolean;
};

const cameraProjectionOptions = [
    { label: __('box3d_camera_projection_perspective'), value: CameraProjection.PERSPECTIVE },
    { label: __('box3d_camera_projection_orthographic'), value: CameraProjection.ORTHOGRAPHIC },
];

export default function Model3DSettings({
    cameraProjection,
    onCameraProjectionChange,
    onClose,
    onOpen,
    onRenderModeChange,
    onShowEnvironmentToggle,
    onShowGridToggle,
    onShowLightsToggle,
    onShowWireframesToggle,
    renderMode,
    showEnvironment,
    showGrid,
    showLights,
    showWireframes,
}: Props): JSX.Element {
    // The render-mode list (Image #4) is a radio group over four named looks. Wireframes maps to
    // the wireframe overlay toggle; the other three map to Box3D render modes. Selection derives
    // from the underlying renderMode + wireframe state so no new render-mode plumbing is needed.
    const selectRealistic = (): void => {
        onShowWireframesToggle(false);
        onRenderModeChange(RenderMode.LIT);
    };
    const selectWireframes = (): void => onShowWireframesToggle(true);
    const selectClay = (): void => {
        onShowWireframesToggle(false);
        onRenderModeChange(RenderMode.SHAPE);
    };
    const selectNormals = (): void => {
        onShowWireframesToggle(false);
        onRenderModeChange(RenderMode.NORMALS);
    };

    const isRealistic = !showWireframes && renderMode === RenderMode.LIT;
    const isClay = !showWireframes && renderMode === RenderMode.SHAPE;
    const isNormals = !showWireframes && renderMode === RenderMode.NORMALS;

    return (
        <Settings className="bp-Model3DSettings" onClose={onClose} onOpen={onOpen}>
            <Settings.Menu className="bp-Model3DSettings-menu" name={Menu.MAIN}>
                <div className="bp-Model3DSettings-sectionLabel">{__('box3d_settings_render_label')}</div>
                <Model3DRenderModeItem
                    icon={<Icon3DRealistic24 />}
                    isSelected={isRealistic}
                    label={__('box3d_render_mode_realistic')}
                    onSelect={selectRealistic}
                />
                <Model3DRenderModeItem
                    icon={<Icon3DWireframes24 />}
                    isSelected={showWireframes}
                    label={__('box3d_render_mode_wireframes')}
                    onSelect={selectWireframes}
                />
                <Model3DRenderModeItem
                    icon={<Icon3DClay24 />}
                    isSelected={isClay}
                    label={__('box3d_render_mode_clay')}
                    onSelect={selectClay}
                />
                <Model3DRenderModeItem
                    icon={<Icon3DNormals24 />}
                    isSelected={isNormals}
                    label={__('box3d_render_mode_normals')}
                    onSelect={selectNormals}
                />

                <div className="bp-Model3DSettings-divider" />

                <div className="bp-Model3DSettings-sectionLabel">{__('box3d_settings_preview_options_label')}</div>
                <Model3DPreviewToggle
                    icon={<Icon3DLights24 />}
                    isChecked={showLights}
                    label={__('box3d_settings_lights_label')}
                    onChange={onShowLightsToggle}
                />
                <Model3DPreviewToggle
                    icon={<Icon3DEnvironment24 />}
                    isChecked={showEnvironment}
                    label={__('box3d_settings_environment_label')}
                    onChange={onShowEnvironmentToggle}
                />
                <Model3DPreviewToggle
                    icon={<Icon3DGrid24 />}
                    isChecked={showGrid}
                    label={__('box3d_settings_grid_label')}
                    onChange={onShowGridToggle}
                />

                <div className="bp-Model3DSettings-divider" />

                <div className="bp-Model3DSettings-sectionLabel">{__('box3d_settings_projection_label')}</div>
                {cameraProjectionOptions.map(({ label, value }) => (
                    <Model3DRenderModeItem
                        key={value}
                        isSelected={cameraProjection === value}
                        label={label}
                        onSelect={(): void => onCameraProjectionChange(value)}
                    />
                ))}
            </Settings.Menu>
        </Settings>
    );
}
