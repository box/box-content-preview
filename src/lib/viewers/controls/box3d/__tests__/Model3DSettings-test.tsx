import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Model3DSettings, { CameraProjection, Props, RenderMode } from '../Model3DSettings';

describe('Model3DSettings', () => {
    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const user = userEvent.setup();
            const onCameraProjectionChange = jest.fn();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const onRenderModeChange = jest.fn();
            const onRotateOnAxisChange = jest.fn();
            const onShowGridToggle = jest.fn();
            const onShowSkeletonsToggle = jest.fn();
            const onShowWireframesToggle = jest.fn();
            render(
                <Model3DSettings
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    onCameraProjectionChange={onCameraProjectionChange}
                    onClose={onClose}
                    onOpen={onOpen}
                    onRenderModeChange={onRenderModeChange}
                    onRotateOnAxisChange={onRotateOnAxisChange}
                    onShowGridToggle={onShowGridToggle}
                    onShowSkeletonsToggle={onShowSkeletonsToggle}
                    onShowWireframesToggle={onShowWireframesToggle}
                    renderMode={RenderMode.LIT}
                    showGrid
                    showSkeletons={false}
                    showWireframes={false}
                />,
            );

            await user.click(screen.getByTitle('Settings'));

            expect(onOpen).toHaveBeenCalled();

            expect(screen.getByRole('menu')).toHaveClass('bp-Model3DSettings-menu');
            expect(screen.getByRole('menu')).toHaveClass('bp-is-active');

            // CheckboxItems
            expect(screen.getByLabelText('Show grid')).toHaveAttribute('checked');
            expect(screen.getByLabelText('Show wireframes')).not.toHaveAttribute('checked');
            expect(screen.getByLabelText('Show skeletons')).not.toHaveAttribute('checked');

            // Dropdowns
            const dropdowns = screen.queryAllByTestId('bp-settings-dropdown-container');

            expect(within(dropdowns.at(0)!).getByLabelText('Render mode', { selector: 'button' })).toBeInTheDocument();
            const renderModeDropdown = within(dropdowns.at(0)!).queryByLabelText(RenderMode.LIT, {
                selector: 'button',
            })!;

            await user.click(renderModeDropdown);

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

            await user.click(cameraProjectionDropdown);

            expect(cameraProjectionDropdown).toHaveAttribute('aria-expanded', 'true');

            const cameraProjectionsList = within(dropdowns.at(1)!).getByRole('listbox');
            expect(cameraProjectionsList?.children[0]).toHaveTextContent('Perspective');
            expect(cameraProjectionsList?.children[1]).toHaveTextContent('Orthographic');

            expect(screen.queryByText('Rotate Model')).toBeInTheDocument();

            await user.click(screen.getByTitle('Settings'));

            expect(onClose).toHaveBeenCalled();
        });
    });
});
