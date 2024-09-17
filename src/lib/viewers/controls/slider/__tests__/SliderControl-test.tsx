import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import SliderControl from '../SliderControl';

const getTouchEventDefaults = () => ({
    clientX: 0,
    clientY: 0,
    force: 0,
    identifier: 0,
    pageX: 0,
    pageY: 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    screenX: 0,
    screenY: 0,
    target: new EventTarget(),
});

describe('SliderControl', () => {
    const renderView = (props = {}) =>
        render(<SliderControl max={100} min={0} onChange={jest.fn()} step={1} title="Slider" value={0} {...props} />);

    beforeEach(() => {
        jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
            (): DOMRect => ({
                bottom: 0,
                height: 50,
                left: 0, // Values are reduced by the left offset of the slider
                right: 0,
                top: 0,
                toJSON: jest.fn(),
                width: 1000, // Values are calculated based on width of the slider
                x: 0,
                y: 0,
            }),
        );
    });

    describe('event handlers', () => {
        test.each`
            pageX   | result
            ${-50}  | ${0}
            ${0}    | ${0}
            ${50}   | ${5}
            ${999}  | ${99.9}
            ${1500} | ${100}
        `('should handle mousedown and update the value for pageX value $pageX', ({ pageX, result }) => {
            const onUpdate = jest.fn();
            renderView({ onUpdate, value: 0 });

            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousedown', {
                    button: 1,
                    bubbles: true,
                    pageX,
                }),
            );

            expect(onUpdate).toHaveBeenCalledWith(result);
        });

        test('should handle mousemove by calling onMove with the value, position, and width', () => {
            const onMove = jest.fn();
            renderView({ onMove });

            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousemove', {
                    button: 1,
                    bubbles: true,
                    pageX: 100,
                }),
            );

            expect(onMove).toHaveBeenCalledWith(10, 100, 1000); // Value, position, width
        });

        test.each`
            initial | result
            ${0}    | ${0}
            ${10}   | ${9}
            ${100}  | ${99}
        `('should handle keydown and decrement the value $initial to $result ', async ({ initial, result }) => {
            const onUpdate = jest.fn();
            renderView({ onUpdate, value: initial });

            fireEvent.keyDown(screen.getByRole('slider')!, { key: 'ArrowLeft' });

            expect(onUpdate).toHaveBeenCalledWith(result);
        });

        test.each`
            initial | result
            ${0}    | ${1}
            ${10}   | ${11}
            ${100}  | ${100}
        `('should handle keydown and increment the value $initial to $result ', ({ initial, result }) => {
            const onUpdate = jest.fn();
            renderView({ onUpdate, value: initial });

            fireEvent.keyDown(screen.getByRole('slider')!, { key: 'ArrowRight' });

            expect(onUpdate).toHaveBeenCalledWith(result);
        });
    });

    describe('effects', () => {
        beforeEach(() => {
            jest.spyOn(document, 'addEventListener');
            jest.spyOn(document, 'removeEventListener');
        });

        test('should add document-level event handlers when scrubbing starts', () => {
            renderView();

            fireEvent.mouseDown(screen.getByRole('slider')!);

            expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
        });

        test('should remove document-level event handlers when scrubbing stops', async () => {
            renderView();

            fireEvent.mouseDown(screen.getByRole('slider')!);
            await userEvent.click(document.body);

            expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
        });

        test('should handle document-level mousemove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            renderView({ onUpdate });

            fireEvent.mouseDown(screen.getByRole('slider')!);
            fireEvent(
                document,
                new MouseEventExtended('mousemove', {
                    bubbles: true,
                    pageX: 100,
                }),
            );

            expect(onUpdate).toHaveBeenCalledWith(10);
        });

        test('should handle document-level touchmove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            renderView({ onUpdate });

            fireEvent(
                screen.getByRole('slider')!,
                new TouchEvent('touchstart', {
                    touches: [
                        {
                            ...getTouchEventDefaults(),
                            pageX: 100,
                        },
                    ],
                    bubbles: true,
                }),
            );
            fireEvent(
                document,
                new TouchEvent('touchmove', {
                    touches: [
                        {
                            ...getTouchEventDefaults(),
                            pageX: 0,
                        },
                    ],
                }),
            );

            expect(onUpdate).toHaveBeenCalledWith(10);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            renderView();

            expect(screen.getByRole('slider')).toHaveClass('bp-SliderControl');
            expect(screen.getByTestId('bp-slider-control-thumb')).toHaveStyle({
                left: '0%',
            });
        });

        test('should forward the track and value properties properly', () => {
            const track = 'linear-gradient(#fff %20, #000 100%';
            renderView({ track, value: 20 });

            expect(screen.getByTestId('bp-slider-control-thumb')).toHaveStyle({
                left: '20%',
            });
            expect(screen.getByTestId('bp-slider-control-track')).toHaveStyle({
                backgroundImage: track,
            });
        });
    });
});
