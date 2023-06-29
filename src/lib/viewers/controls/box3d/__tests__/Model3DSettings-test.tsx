import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import Model3DSettings, { CameraProjection, Props, RenderMode } from '../Model3DSettings';
import Settings, { Menu } from '../../settings';
import RotateAxisControls from '../RotateAxisControls';

describe('Model3DSettings', () => {
    const getDefaults = (): Props => ({
        cameraProjection: CameraProjection.PERSPECTIVE,
        onCameraProjectionChange: jest.fn(),
        onClose: jest.fn(),
        onOpen: jest.fn(),
        onRenderModeChange: jest.fn(),
        onRotateOnAxisChange: jest.fn(),
        onShowGridToggle: jest.fn(),
        onShowSkeletonsToggle: jest.fn(),
        onShowWireframesToggle: jest.fn(),
        renderMode: RenderMode.LIT,
        showGrid: true,
        showSkeletons: false,
        showWireframes: false,
    });
    const getWrapper = (props = {}): ShallowWrapper => shallow(<Model3DSettings {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onCameraProjectionChange = jest.fn();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const onRenderModeChange = jest.fn();
            const onRotateOnAxisChange = jest.fn();
            const onShowGridToggle = jest.fn();
            const onShowSkeletonsToggle = jest.fn();
            const onShowWireframesToggle = jest.fn();

            const wrapper = getWrapper({
                onCameraProjectionChange,
                onClose,
                onOpen,
                onRenderModeChange,
                onRotateOnAxisChange,
                onShowGridToggle,
                onShowSkeletonsToggle,
                onShowWireframesToggle,
            });
            const checkboxItems = wrapper.find(Settings.CheckboxItem);
            const dropdowns = wrapper.find(Settings.Dropdown);

            expect(wrapper.find(Settings).props()).toMatchObject({
                className: 'bp-Model3DSettings',
                onClose,
                onOpen,
            });
            expect(wrapper.find(Settings.Menu).props()).toMatchObject({
                className: 'bp-Model3DSettings-menu',
                name: Menu.MAIN,
            });

            // CheckboxItems
            expect(checkboxItems.at(0).props()).toMatchObject({
                isChecked: true,
                label: __('box3d_settings_grid_label'),
                onChange: onShowGridToggle,
            });
            expect(checkboxItems.at(1).props()).toMatchObject({
                isChecked: false,
                label: __('box3d_settings_wireframes_label'),
                onChange: onShowWireframesToggle,
            });
            expect(checkboxItems.at(2).props()).toMatchObject({
                isChecked: false,
                label: __('box3d_settings_skeletons_label'),
                onChange: onShowSkeletonsToggle,
            });

            // Dropdowns
            expect(dropdowns.at(0).props()).toMatchObject({
                label: __('box3d_settings_render_label'),
                onSelect: onRenderModeChange,
                value: RenderMode.LIT,
            });
            expect(dropdowns.at(1).props()).toMatchObject({
                label: __('box3d_settings_projection_label'),
                onSelect: onCameraProjectionChange,
                value: CameraProjection.PERSPECTIVE,
            });

            expect(wrapper.find(RotateAxisControls).props()).toMatchObject({ onRotateOnAxisChange });
        });
    });
});
