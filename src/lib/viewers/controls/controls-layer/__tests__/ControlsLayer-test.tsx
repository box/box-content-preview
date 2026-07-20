import React from 'react';
import { act, EventType, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ControlsLayer, { Helpers, HIDE_DELAY_MS, SHOW_CLASSNAME } from '../ControlsLayer';
import ControlsLayerContext from '../ControlsLayerContext';

describe('ControlsLayer', () => {
    const children = <div className="TestControls">Controls</div>;
    const getElement = async () => screen.findByTestId('bp-ControlsLayer');
    const getWrapper = (props = {}) => render(<ControlsLayer {...props}>{children}</ControlsLayer>);

    beforeEach(() => {
        jest.useFakeTimers();
    });

    describe('event handlers', () => {
        test.each(['focus', 'mouseEnter'] as EventType[])(
            'should show the controls %s',
            async (eventType: EventType) => {
                getWrapper();
                const element = await getElement();

                fireEvent[eventType](element);

                expect(element).toHaveClass(SHOW_CLASSNAME);
            },
        );

        test.each`
            showTrigger     | hideTrigger
            ${'focus'}      | ${'blur'}
            ${'mouseEnter'} | ${'mouseLeave'}
        `(
            'should show $showTrigger and hide $hideTrigger',
            async ({ hideTrigger, showTrigger }: { hideTrigger: EventType; showTrigger: EventType }) => {
                getWrapper();
                const element = await getElement();

                fireEvent[showTrigger](element);

                expect(element).toHaveClass(SHOW_CLASSNAME);

                fireEvent[hideTrigger](element);

                await waitFor(
                    async () => {
                        expect(element).not.toHaveClass(SHOW_CLASSNAME);
                    },
                    { timeout: HIDE_DELAY_MS + 1000 },
                );
            },
        );

        test('should blur focused element inside layer on mouseLeave', async () => {
            render(
                <ControlsLayer>
                    <button data-testid="inner-button" type="button">
                        Play
                    </button>
                </ControlsLayer>,
            );
            const element = await getElement();
            const button = screen.getByTestId('inner-button');

            button.focus();
            fireEvent.mouseEnter(element);

            expect(document.activeElement).toBe(button);

            fireEvent.mouseLeave(element);

            expect(document.activeElement).not.toBe(button);

            await waitFor(
                async () => {
                    expect(element).not.toHaveClass(SHOW_CLASSNAME);
                },
                { timeout: HIDE_DELAY_MS + 1000 },
            );
        });

        test('should keep controls visible for keyboard users with focus', async () => {
            render(
                <ControlsLayer>
                    <button data-testid="inner-button" type="button">
                        Play
                    </button>
                </ControlsLayer>,
            );
            const element = await getElement();

            fireEvent.focus(element);

            expect(element).toHaveClass(SHOW_CLASSNAME);

            jest.advanceTimersByTime(HIDE_DELAY_MS);

            expect(element).toHaveClass(SHOW_CLASSNAME);
        });

        test('should always show the controls if they have the mouse cursor', async () => {
            getWrapper();
            const element = await getElement();

            fireEvent.focus(element);
            fireEvent.mouseEnter(element);

            expect(element).toHaveClass(SHOW_CLASSNAME);

            fireEvent.blur(element);
            jest.advanceTimersByTime(HIDE_DELAY_MS);

            expect(element).toHaveClass(SHOW_CLASSNAME);
        });
    });

    describe('setIsForced context', () => {
        // ColorPickerControl pins the layer with setIsForced(true) from an effect keyed on
        // the function identity. If that identity changed every render the effect's cleanup refired and
        // instantly un-pinned the layer, so these two contracts must hold.
        const seen: Array<(value: boolean) => void> = [];

        const ForcedConsumer = (): JSX.Element => {
            const { setIsForced } = React.useContext(ControlsLayerContext);
            seen.push(setIsForced);
            return (
                <button data-testid="force-open" onClick={(): void => setIsForced(true)} type="button">
                    force
                </button>
            );
        };

        beforeEach(() => {
            seen.length = 0;
        });

        test('should hand down a stable setIsForced identity across re-renders', async () => {
            const { rerender } = render(
                <ControlsLayer>
                    <ForcedConsumer />
                </ControlsLayer>,
            );
            rerender(
                <ControlsLayer onShow={jest.fn()}>
                    <ForcedConsumer />
                </ControlsLayer>,
            );

            expect(seen.length).toBeGreaterThan(1);
            expect(seen.every(fn => fn === seen[0])).toBe(true);
        });

        test('should keep the controls visible through a mouse-leave while forced open', async () => {
            render(
                <ControlsLayer>
                    <ForcedConsumer />
                </ControlsLayer>,
            );
            const element = await getElement();

            fireEvent.click(screen.getByTestId('force-open'));
            expect(element).toHaveClass(SHOW_CLASSNAME);

            fireEvent.mouseLeave(element);
            // The hide timer fires and flips isShown → false, but isForced keeps the layer visible. Wrap the
            // timer flush in act() since that state update happens outside an event handler.
            act(() => {
                jest.advanceTimersByTime(HIDE_DELAY_MS);
            });

            expect(element).toHaveClass(SHOW_CLASSNAME);
        });
    });

    describe('unmount', () => {
        test('should destroy any existing hide timeout', () => {
            jest.spyOn(window, 'clearTimeout');

            const { unmount } = getWrapper({
                onMount: (helpers: Helpers): void => {
                    helpers.hide(); // Kick off the hide timeout
                },
            });
            unmount();

            expect(window.clearTimeout).toHaveBeenCalledTimes(2); // Once on hide, once on unmount
        });
    });

    describe('render', () => {
        test('should invoke the onMount callback once with the visibility helpers', () => {
            const onMount = jest.fn();
            getWrapper({ onMount });

            expect(onMount).toHaveBeenCalledTimes(1);
            expect(onMount).toHaveBeenCalledWith({
                clean: expect.any(Function),
                hide: expect.any(Function),
                reset: expect.any(Function),
                show: expect.any(Function),
            });
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const element = await getElement();

            expect(element).toBeInTheDocument();
        });
    });
});
