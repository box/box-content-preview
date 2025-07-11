import React from 'react';
import { EventType, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ControlsLayer, { Helpers, HIDE_DELAY_MS, SHOW_CLASSNAME } from '../ControlsLayer';

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

        test('should always show the controls if they have focus', async () => {
            getWrapper();
            const element = await getElement();

            fireEvent.focus(element);
            fireEvent.mouseEnter(element);

            expect(element).toHaveClass(SHOW_CLASSNAME);

            fireEvent.mouseLeave(element);
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
