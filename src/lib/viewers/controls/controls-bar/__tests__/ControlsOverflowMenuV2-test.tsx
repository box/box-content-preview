import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import Search from '@box/blueprint-web-assets/icons/Medium/Search';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsLayerContext from '../../controls-layer/ControlsLayerContext';
import ControlsMenuItemV2 from '../ControlsMenuItemV2';
import ControlsOverflowMenuV2 from '../ControlsOverflowMenuV2';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('ControlsOverflowMenuV2', () => {
    const setIsForced = jest.fn();
    let container: HTMLDivElement;

    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    const getWrapper = () =>
        render(
            <ControlsLayerContext.Provider value={{ setIsForced }}>
                <div data-resin-component="toolbar" data-resin-fileextension="pdf" data-resin-fileid="123">
                    <Toolbar.Root aria-label="Controls">
                        <ControlsOverflowMenuV2
                            items={[
                                {
                                    control: null,
                                    id: 'find',
                                    menu: <ControlsMenuItemV2 icon={Search} label="Find" onSelect={jest.fn()} />,
                                },
                                {
                                    control: null,
                                    id: 'rotate',
                                    menu: <ControlsMenuItemV2 icon={RotateLeft} label="Rotate" onSelect={jest.fn()} />,
                                },
                            ]}
                        />
                    </Toolbar.Root>
                </div>
            </ControlsLayerContext.Provider>,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getTrigger = () => screen.getByRole('button', { name: __('controls_more') });

    describe('render', () => {
        test('should render a closed trigger that lists the collapsed controls', () => {
            getWrapper();

            expect(screen.getByRole('toolbar')).toContainElement(getTrigger());
            expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
            expect(getTrigger()).toHaveAttribute('data-overflow-ids', 'find rotate');
            expect(getTrigger()).toHaveAttribute('data-resin-target', 'moreOptions');
            expect(getTrigger()).toHaveAttribute('data-testid', 'bp-ControlsBar-overflowBtn');
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });

        test('should show the trigger tooltip in the container', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.hover(getTrigger());

            expect(await within(container).findByRole('tooltip')).toHaveTextContent(__('controls_more'));
        });

        test('should open a menu of the collapsed controls in the container', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getTrigger());

            const menu = within(container).getByRole('menu');

            expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
            expect(menu).toHaveAttribute('data-testid', 'bp-ControlsBar-overflowMenu');
            expect(menu).toHaveClass('bp-ControlsOverflowMenuV2');
            expect(
                within(menu)
                    .getAllByRole('menuitem')
                    .map(row => row.textContent),
            ).toEqual(['Find', 'Rotate']);
        });

        test('should carry the resin attributes of the controls it portals out of', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getTrigger());

            const menu = screen.getByRole('menu');

            expect(menu).toHaveAttribute('data-resin-component', 'toolbar');
            expect(menu).toHaveAttribute('data-resin-fileextension', 'pdf');
            expect(menu).toHaveAttribute('data-resin-fileid', '123');
        });

        test('should keep the controls visible while the menu is open', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getTrigger());

            expect(setIsForced).toHaveBeenLastCalledWith(true);

            await user.keyboard('{Escape}');

            expect(setIsForced).toHaveBeenLastCalledWith(false);
        });
    });

    describe('keyboard', () => {
        test('should close on Escape without reaching a host hotkey listener and return focus to the trigger', async () => {
            const user = userEvent.setup();
            const onHostKeyDown = jest.fn();
            window.addEventListener('keydown', onHostKeyDown);
            getWrapper();

            await user.click(getTrigger());
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(getTrigger()).toHaveFocus();
            expect(onHostKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
            window.removeEventListener('keydown', onHostKeyDown);
        });

        test('should keep other keys pressed in the menu from reaching preview and host listeners', async () => {
            const user = userEvent.setup();
            const onKeyDown = jest.fn();
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('keydown', onKeyDown);
            getWrapper();

            await user.click(getTrigger());
            await user.keyboard('{ArrowDown}{ArrowLeft}{ArrowRight}s');

            expect(screen.getByRole('menu')).toBeInTheDocument();
            expect(onKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keydown', onKeyDown);
        });
    });
});
