import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationClipsControlV2 from '../AnimationClipsControlV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import { Props } from '../AnimationClipsControl';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('AnimationClipsControlV2', () => {
    const recordAction = jest.fn();
    let container: HTMLDivElement;

    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock;
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        window.Box = { Preview: { resin: { recordAction } } };
    });

    afterEach(() => {
        container.remove();
        delete window.Box;
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <AnimationClipsControlV2
                    animationClips={[
                        { duration: 1, id: '1', name: 'first' },
                        { duration: 62, id: '2', name: 'second' },
                    ]}
                    currentAnimationClipId="1"
                    onAnimationClipSelect={jest.fn()}
                    {...props}
                />
            </Toolbar.Root>,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getToggle = () => screen.getByRole('button', { name: 'Animation clips' });

    describe('render', () => {
        test('should render a closed toolbar trigger with its resin target', () => {
            getWrapper();

            expect(screen.getByRole('toolbar')).toContainElement(getToggle());
            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveAttribute('data-resin-target', 'animationClips');
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });

        test('should show the trigger tooltip in the container', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.hover(getToggle());

            expect(await within(container).findByRole('tooltip')).toHaveTextContent('Animation clips');
        });

        test('should list the clips in a menu portaled into the container with the current clip checked', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getToggle());

            const menu = within(container).getByRole('menu');
            const items = within(menu).getAllByRole('menuitemradio');

            expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(getToggle()).toHaveAttribute('data-state', 'open');
            expect(items).toHaveLength(2);
            expect(items[0]).toHaveTextContent('00:00:01 first');
            expect(items[0]).toHaveAttribute('aria-checked', 'true');
            expect(items[0]).toHaveAttribute('data-resin-target', 'settingsRadioItem');
            expect(items[1]).toHaveTextContent('00:01:02 second');
            expect(items[1]).toHaveAttribute('aria-checked', 'false');
        });
    });

    describe('selection', () => {
        test('should call onAnimationClipSelect with the clip id and record the programmatic resin action', async () => {
            const user = userEvent.setup();
            const onAnimationClipSelect = jest.fn();
            getWrapper({ onAnimationClipSelect });

            await user.click(getToggle());
            await user.click(screen.getByRole('menuitemradio', { name: '00:01:02 second' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('2');
            expect(recordAction).toHaveBeenCalledTimes(1);
            expect(recordAction).toHaveBeenCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                target: 'settingsRadioItem',
            });
        });

        test('should select a clip with the keyboard', async () => {
            const user = userEvent.setup();
            const onAnimationClipSelect = jest.fn();
            getWrapper({ onAnimationClipSelect });

            await user.tab();
            await user.keyboard('{Enter}');
            await user.keyboard('{ArrowDown}');
            await user.keyboard('{Enter}');

            expect(onAnimationClipSelect).toHaveBeenCalledWith('2');
            expect(recordAction).toHaveBeenCalledTimes(1);
        });

        test('should not fail if resin is unavailable', async () => {
            const user = userEvent.setup();
            const onAnimationClipSelect = jest.fn();
            delete window.Box;
            getWrapper({ onAnimationClipSelect });

            await user.click(getToggle());
            await user.click(screen.getByRole('menuitemradio', { name: '00:00:01 first' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('1');
        });
    });

    describe('keyboard', () => {
        test('should close on Escape and return focus to the trigger', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getToggle());
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(getToggle()).toHaveFocus();
        });

        test('should not let Escape reach a host hotkey listener on window', async () => {
            const user = userEvent.setup();
            const onHostKeyDown = jest.fn();
            window.addEventListener('keydown', onHostKeyDown);
            getWrapper();

            await user.click(getToggle());
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(onHostKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
            window.removeEventListener('keydown', onHostKeyDown);
        });

        test('should keep other keys pressed in the menu from reaching preview and host listeners', async () => {
            const user = userEvent.setup();
            const onKeyDown = jest.fn();
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('keydown', onKeyDown);
            getWrapper();

            await user.click(getToggle());
            await user.keyboard('{ArrowDown}{ArrowLeft}{ArrowRight}s');

            expect(screen.getByRole('menu')).toBeInTheDocument();
            expect(onKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keydown', onKeyDown);
        });

        test('should keep the tooltip closed over the open menu so Escape closes the menu', async () => {
            jest.useFakeTimers();
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            getWrapper();

            await user.click(getToggle());
            act(() => {
                jest.advanceTimersByTime(2000);
            });

            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            jest.useRealTimers();
        });
    });
});
