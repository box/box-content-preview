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
            const onShowEnvironmentToggle = jest.fn();
            const onShowGridToggle = jest.fn();
            const onShowLightsToggle = jest.fn();
            const onShowWireframesToggle = jest.fn();
            render(
                <Model3DSettings
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    onCameraProjectionChange={onCameraProjectionChange}
                    onClose={onClose}
                    onOpen={onOpen}
                    onRenderModeChange={onRenderModeChange}
                    onShowEnvironmentToggle={onShowEnvironmentToggle}
                    onShowGridToggle={onShowGridToggle}
                    onShowLightsToggle={onShowLightsToggle}
                    onShowWireframesToggle={onShowWireframesToggle}
                    renderMode={RenderMode.LIT}
                    showEnvironment
                    showGrid
                    showLights
                    showWireframes={false}
                />,
            );

            await user.click(screen.getByTitle('Settings'));

            expect(onOpen).toHaveBeenCalled();

            expect(screen.getByRole('menu')).toHaveClass('bp-Model3DSettings-menu');
            expect(screen.getByRole('menu')).toHaveClass('bp-is-active');

            // Render mode + camera projection are both radio lists. Render modes come first.
            const radioItems = screen.getAllByRole('menuitemradio');
            expect(radioItems[0]).toHaveTextContent('Realistic');
            expect(radioItems[0]).toHaveAttribute('aria-checked', 'true');
            expect(radioItems[1]).toHaveTextContent('Wireframes');
            expect(radioItems[1]).toHaveAttribute('aria-checked', 'false');
            expect(radioItems[2]).toHaveTextContent('Clay');
            expect(radioItems[3]).toHaveTextContent('Normals');

            // Selecting Clay clears wireframes and sets the Shape render mode
            await user.click(radioItems[2]);
            expect(onShowWireframesToggle).toHaveBeenCalledWith(false);
            expect(onRenderModeChange).toHaveBeenCalledWith(RenderMode.SHAPE);

            // Selecting Wireframes enables the wireframe overlay
            await user.click(radioItems[1]);
            expect(onShowWireframesToggle).toHaveBeenCalledWith(true);

            // Preview options — Lights/Environment/Grid toggles reflect their props
            expect(screen.getByText('Lights')).toBeInTheDocument();
            expect(screen.getByText('Environment')).toBeInTheDocument();
            expect(screen.getByText('Grid')).toBeInTheDocument();

            // Camera Projection radio list — Perspective is selected, Orthographic is not
            const projectionItems = screen.getAllByRole('menuitemradio').slice(4);
            expect(projectionItems[0]).toHaveTextContent('Perspective');
            expect(projectionItems[0]).toHaveAttribute('aria-checked', 'true');
            expect(projectionItems[1]).toHaveTextContent('Orthographic');
            expect(projectionItems[1]).toHaveAttribute('aria-checked', 'false');

            await user.click(projectionItems[1]);
            expect(onCameraProjectionChange).toHaveBeenCalledWith(CameraProjection.ORTHOGRAPHIC);

            await user.click(screen.getByTitle('Settings'));

            expect(onClose).toHaveBeenCalled();
        });
    });
});
