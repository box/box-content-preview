import React from 'react';
import noop from 'lodash/noop';
import { Popover, Select, Switch } from '@box/blueprint-web';
import RotateAxisControlsV2 from './RotateAxisControlsV2';
import SettingsToggleV2 from '../settings/SettingsToggleV2';
import { CameraProjection, cameraProjectionOptions, Props, RenderMode, renderModeOptions } from './Model3DSettings';
import { PortalContainerContext } from '../../../BlueprintProviders';
import './Model3DSettingsV2.scss';

export default function Model3DSettingsV2({
    cameraProjection,
    onCameraProjectionChange,
    onClose = noop,
    onOpen = noop,
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
    const container = React.useContext(PortalContainerContext) ?? undefined;

    const handleOpenChange = (isOpen: boolean): void => {
        if (isOpen) {
            onOpen();
        } else {
            onClose();
        }
    };

    return (
        <Popover.Root modal={false} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
                <SettingsToggleV2 label={__('box3d_settings')} />
            </Popover.Trigger>
            <Popover.ContentContainer
                align="start"
                aria-label={__('box3d_settings')}
                container={container}
                data-testid="bp-model3d-settings"
                side="top"
            >
                <Popover.MainContent>
                    <div className="bp-Model3DSettingsV2">
                        <Select
                            data-resin-target="settingsDropdown"
                            label={__('box3d_settings_render_label')}
                            onValueChange={value => onRenderModeChange(value as RenderMode)}
                            placeholder={__('box3d_settings_render_label')}
                            value={renderMode}
                        >
                            <Select.Content container={container}>
                                {renderModeOptions.map(({ label, value }) => (
                                    <Select.Option key={value} text={label} value={value} />
                                ))}
                            </Select.Content>
                        </Select>
                        <Switch.Item
                            checked={showGrid}
                            data-resin-target="settingsCheckbox"
                            label={__('box3d_settings_grid_label')}
                            onCheckedChange={onShowGridToggle}
                            value="grid"
                        />
                        <Switch.Item
                            checked={showWireframes}
                            data-resin-target="settingsCheckbox"
                            label={__('box3d_settings_wireframes_label')}
                            onCheckedChange={onShowWireframesToggle}
                            value="wireframes"
                        />
                        <Switch.Item
                            checked={showSkeletons}
                            data-resin-target="settingsCheckbox"
                            label={__('box3d_settings_skeletons_label')}
                            onCheckedChange={onShowSkeletonsToggle}
                            value="skeletons"
                        />
                        <Select
                            data-resin-target="settingsDropdown"
                            label={__('box3d_settings_projection_label')}
                            onValueChange={value => onCameraProjectionChange(value as CameraProjection)}
                            placeholder={__('box3d_settings_projection_label')}
                            value={cameraProjection}
                        >
                            <Select.Content container={container}>
                                {cameraProjectionOptions.map(({ label, value }) => (
                                    <Select.Option key={value} text={label} value={value} />
                                ))}
                            </Select.Content>
                        </Select>
                        <RotateAxisControlsV2 onRotateOnAxisChange={onRotateOnAxisChange} />
                    </div>
                </Popover.MainContent>
            </Popover.ContentContainer>
        </Popover.Root>
    );
}
