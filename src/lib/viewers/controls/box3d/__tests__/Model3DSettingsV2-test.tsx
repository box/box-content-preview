import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import Model3DSettingsV2 from '../Model3DSettingsV2';
import { CameraProjection, Props, RenderMode } from '../Model3DSettings';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('Model3DSettingsV2', () => {
    let container: HTMLDivElement;

    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock;
        Element.prototype.hasPointerCapture = jest.fn();
        Element.prototype.releasePointerCapture = jest.fn();
        Element.prototype.scrollIntoView = jest.fn();
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

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
    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <Model3DSettingsV2 {...getDefaults()} {...props} />
            </Toolbar.Root>,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getToggle = () => screen.getByRole('button', { name: 'Settings' });
    const getPanel = () => within(container).getByRole('dialog', { name: 'Settings' });
    const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(getToggle());
        return getPanel();
    };

    describe('render', () => {
        test('should render a closed settings toggle in the toolbar', () => {
            getWrapper();

            expect(screen.getByRole('toolbar')).toContainElement(getToggle());
            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveAttribute('data-resin-target', 'settingsOpen');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('should portal the panel into the container and reflect the current settings', async () => {
            const user = userEvent.setup();
            getWrapper();

            const panel = await openPanel(user);

            expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(getToggle()).toHaveAttribute('data-state', 'open');
            expect(within(panel).getByRole('combobox', { name: 'Render mode' })).toHaveTextContent('Lit');
            expect(within(panel).getByRole('combobox', { name: 'Camera Projection' })).toHaveTextContent('Perspective');
            expect(within(panel).getByRole('switch', { name: 'Show grid' })).toBeChecked();
            expect(within(panel).getByRole('switch', { name: 'Show wireframes' })).not.toBeChecked();
            expect(within(panel).getByRole('switch', { name: 'Show skeletons' })).not.toBeChecked();
            expect(within(panel).getByRole('group', { name: 'Rotate Model' })).toBeInTheDocument();
        });

        test('should keep the v1 resin targets on the panel controls', async () => {
            const user = userEvent.setup();
            getWrapper();

            const panel = await openPanel(user);

            within(panel)
                .getAllByRole('combobox')
                .forEach(select => expect(select).toHaveAttribute('data-resin-target', 'settingsDropdown'));
            within(panel)
                .getAllByRole('switch')
                .forEach(toggle => expect(toggle).toHaveAttribute('data-resin-target', 'settingsCheckbox'));
        });
    });

    describe('open state', () => {
        test('should call onOpen when opened and onClose when closed with the toggle', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            getWrapper({ onClose, onOpen });

            await user.click(getToggle());

            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();

            await user.click(getToggle());

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('should close on Escape, call onClose, and return focus to the toggle', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            getWrapper({ onClose });

            await openPanel(user);
            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(getToggle()).toHaveFocus();
        });

        test('should not let Escape reach a host hotkey listener on window', async () => {
            const user = userEvent.setup();
            const onHostKeyDown = jest.fn();
            window.addEventListener('keydown', onHostKeyDown);
            getWrapper();

            await openPanel(user);
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(onHostKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
            window.removeEventListener('keydown', onHostKeyDown);
        });

        test('should keep other keys pressed in the panel or its selects from reaching preview and host listeners', async () => {
            const user = userEvent.setup();
            const onKeyDown = jest.fn();
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('keydown', onKeyDown);
            getWrapper();

            const panel = await openPanel(user);
            await user.keyboard('{ArrowLeft}{ArrowRight}');
            await user.click(within(panel).getByRole('combobox', { name: 'Render mode' }));
            await user.keyboard('{ArrowDown}{ArrowLeft}{ArrowRight}');

            expect(screen.getByRole('listbox')).toBeInTheDocument();
            expect(onKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keydown', onKeyDown);
        });

        test('should close and call onClose when clicking outside', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            getWrapper({ onClose });

            await openPanel(user);
            await user.click(document.body);

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('callbacks', () => {
        test.each`
            label                | callback
            ${'Show grid'}       | ${'onShowGridToggle'}
            ${'Show wireframes'} | ${'onShowWireframesToggle'}
            ${'Show skeletons'}  | ${'onShowSkeletonsToggle'}
        `('should call $callback when "$label" is toggled', async ({ callback, label }) => {
            const user = userEvent.setup();
            const handler = jest.fn();
            getWrapper({ [callback]: handler });

            const panel = await openPanel(user);
            await user.click(within(panel).getByRole('switch', { name: label }));

            expect(handler).toHaveBeenCalledTimes(1);
        });

        test('should call onRenderModeChange with the selected render mode from a list in the container', async () => {
            const user = userEvent.setup();
            const onRenderModeChange = jest.fn();
            getWrapper({ onRenderModeChange });

            const panel = await openPanel(user);
            await user.click(within(panel).getByRole('combobox', { name: 'Render mode' }));
            const listbox = within(container).getByRole('listbox');

            expect(
                within(listbox)
                    .getAllByRole('option')
                    .map(option => option.textContent),
            ).toEqual(['Lit', 'Unlit', 'Normals', 'Shape', 'UV Overlay']);

            await user.click(within(listbox).getByRole('option', { name: 'Normals' }));

            expect(onRenderModeChange).toHaveBeenCalledWith(RenderMode.NORMALS);
            expect(getPanel()).toBeInTheDocument();
        });

        test('should call onCameraProjectionChange with the selected projection', async () => {
            const user = userEvent.setup();
            const onCameraProjectionChange = jest.fn();
            getWrapper({ onCameraProjectionChange });

            const panel = await openPanel(user);
            await user.click(within(panel).getByRole('combobox', { name: 'Camera Projection' }));
            await user.click(within(container).getByRole('option', { name: 'Orthographic' }));

            expect(onCameraProjectionChange).toHaveBeenCalledWith(CameraProjection.ORTHOGRAPHIC);
        });

        test('should close only the open select on Escape', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            const onHostKeyDown = jest.fn();
            window.addEventListener('keydown', onHostKeyDown);
            getWrapper({ onClose });

            const panel = await openPanel(user);
            await user.click(within(panel).getByRole('combobox', { name: 'Render mode' }));
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
            expect(getPanel()).toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
            expect(onHostKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
            window.removeEventListener('keydown', onHostKeyDown);
        });

        test('should call onRotateOnAxisChange from the rotate controls', async () => {
            const user = userEvent.setup();
            const onRotateOnAxisChange = jest.fn();
            getWrapper({ onRotateOnAxisChange });

            const panel = await openPanel(user);
            await user.click(within(panel).getByRole('button', { name: 'Rotate right around X axis' }));

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: 90 });
        });
    });
});
