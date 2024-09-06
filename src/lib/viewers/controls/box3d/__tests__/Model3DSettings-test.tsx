import React from 'react';
import { render, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Model3DSettings, { CameraProjection, Props, RenderMode } from '../Model3DSettings';

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
    const getWrapper = (props = {}) => render(<Model3DSettings {...getDefaults()} {...props} />);

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
            act(() => wrapper.queryByTitle('Settings')?.click());

            expect(onOpen).toHaveBeenCalled();

            const checkboxItems = wrapper.queryAllByRole('checkbox');

            expect(wrapper.getByRole('menu')).toHaveClass('bp-Model3DSettings-menu');
            expect(wrapper.getByRole('menu')).toHaveClass('bp-is-active');

            // CheckboxItems
            expect(checkboxItems.at(0)).toHaveAttribute('checked');
            expect(checkboxItems.at(1)).not.toHaveAttribute('checked');
            expect(checkboxItems.at(2)).not.toHaveAttribute('checked');

            expect(checkboxItems.at(0)).toBe(wrapper.getByLabelText('Show grid'));
            expect(checkboxItems.at(1)).toBe(wrapper.getByLabelText('Show wireframes'));
            expect(checkboxItems.at(2)).toBe(wrapper.getByLabelText('Show skeletons'));

            // Dropdowns
            const dropdowns = wrapper.queryAllByTestId('bp-SettingsDropdown-container');

            expect(
                within(dropdowns.at(0)!).queryByLabelText('Render mode', { selector: 'button' }),
            ).toBeInTheDocument();
            const renderModeDropdown = within(dropdowns.at(0)!).queryByLabelText(RenderMode.LIT, {
                selector: 'button',
            })!;
            act(() => renderModeDropdown?.click());
            expect(renderModeDropdown).toHaveAttribute('aria-expanded', 'true');

            const renderModeList = within(dropdowns.at(0)!).queryByRole('listbox');
            expect(renderModeList?.children[0]).toHaveTextContent('Lit');
            expect(renderModeList?.children[1]).toHaveTextContent('Unlit');
            expect(renderModeList?.children[2]).toHaveTextContent('Normals');
            expect(renderModeList?.children[3]).toHaveTextContent('Shape');
            expect(renderModeList?.children[4]).toHaveTextContent('UV Overlay');

            expect(
                within(dropdowns.at(1)!).queryByLabelText('Camera Projection', { selector: 'button' }),
            ).toBeInTheDocument();
            const cameraProjectionDropdown = within(dropdowns.at(1)!).queryByLabelText(CameraProjection.PERSPECTIVE, {
                selector: 'button',
            })!;
            act(() => cameraProjectionDropdown?.click());
            expect(cameraProjectionDropdown).toHaveAttribute('aria-expanded', 'true');
            const cameraProjectionsList = within(dropdowns.at(1)!).queryByRole('listbox');
            expect(cameraProjectionsList?.children[0]).toHaveTextContent('Perspective');
            expect(cameraProjectionsList?.children[1]).toHaveTextContent('Orthographic');

            expect(wrapper.queryByText('Rotate Model')).toBeInTheDocument();

            act(() => wrapper.queryByTitle('Settings')?.click());
            expect(onClose).toHaveBeenCalled();
        });
    });
});
