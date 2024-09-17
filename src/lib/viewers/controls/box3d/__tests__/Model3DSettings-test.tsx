import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const renderView = (props = {}) => render(<Model3DSettings {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const onCameraProjectionChange = jest.fn();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const onRenderModeChange = jest.fn();
            const onRotateOnAxisChange = jest.fn();
            const onShowGridToggle = jest.fn();
            const onShowSkeletonsToggle = jest.fn();
            const onShowWireframesToggle = jest.fn();

            renderView({
                onCameraProjectionChange,
                onClose,
                onOpen,
                onRenderModeChange,
                onRotateOnAxisChange,
                onShowGridToggle,
                onShowSkeletonsToggle,
                onShowWireframesToggle,
            });

            await userEvent.click(screen.getByTitle('Settings'));

            expect(onOpen).toHaveBeenCalled();

            expect(screen.getByRole('menu')).toHaveClass('bp-Model3DSettings-menu');
            expect(screen.getByRole('menu')).toHaveClass('bp-is-active');

            // CheckboxItems
            expect(screen.getByLabelText('Show grid')).toHaveAttribute('checked');
            expect(screen.getByLabelText('Show wireframes')).not.toHaveAttribute('checked');
            expect(screen.getByLabelText('Show skeletons')).not.toHaveAttribute('checked');

            // Dropdowns
            const dropdowns = screen.queryAllByTestId('bp-SettingsDropdown-container');

            expect(within(dropdowns.at(0)!).getByLabelText('Render mode', { selector: 'button' })).toBeInTheDocument();
            const renderModeDropdown = within(dropdowns.at(0)!).queryByLabelText(RenderMode.LIT, {
                selector: 'button',
            })!;

            await userEvent.click(renderModeDropdown);

            expect(renderModeDropdown).toHaveAttribute('aria-expanded', 'true');

            const renderModeList = within(dropdowns.at(0)!).getByRole('listbox');

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

            await userEvent.click(cameraProjectionDropdown);

            expect(cameraProjectionDropdown).toHaveAttribute('aria-expanded', 'true');

            const cameraProjectionsList = within(dropdowns.at(1)!).getByRole('listbox');
            expect(cameraProjectionsList?.children[0]).toHaveTextContent('Perspective');
            expect(cameraProjectionsList?.children[1]).toHaveTextContent('Orthographic');

            expect(screen.queryByText('Rotate Model')).toBeInTheDocument();

            await userEvent.click(screen.getByTitle('Settings'));

            expect(onClose).toHaveBeenCalled();
        });
    });
});
