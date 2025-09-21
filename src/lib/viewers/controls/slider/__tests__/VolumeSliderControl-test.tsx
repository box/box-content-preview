import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import VolumeSliderControl from '../VolumeSliderControl';

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

describe('VolumeSliderControl', () => {
    const defaultProps = {
        title: 'Volume Slider',
        value: 50,
        onMouseOver: jest.fn(),
    };

    beforeEach(() => {
        jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
            (): DOMRect => ({
                bottom: 0,
                height: 100, // Height for vertical slider
                left: 0,
                right: 0,
                top: 0,
                toJSON: jest.fn(),
                width: 20, // Width for vertical slider
                x: 0,
                y: 0,
            }),
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('event handlers', () => {
        test.each`
            pageY  | clientY | result
            ${-50} | ${-50}  | ${100}
            ${0}   | ${0}    | ${100}
            ${25}  | ${25}   | ${75}
            ${50}  | ${50}   | ${50}
            ${75}  | ${75}   | ${25}
            ${100} | ${100}  | ${5}
            ${150} | ${150}  | ${5}
        `(
            'should handle mousedown and update the value for pageY $pageY, clientY $clientY with 0 being the top of the slider',
            ({ pageY, clientY, result }) => {
                const onUpdate = jest.fn();
                render(
                    <VolumeSliderControl {...defaultProps} max={100} min={0} onUpdate={onUpdate} step={1} value={0} />,
                );

                fireEvent(
                    screen.getByRole('slider')!,
                    new MouseEventExtended('mousedown', {
                        button: 0,
                        bubbles: true,
                        pageY,
                        clientY,
                    }),
                );

                expect(onUpdate).toHaveBeenCalledWith(result);
            },
        );

        test('should handle mousemove by calling onMove with the value, position, and height', () => {
            const onMove = jest.fn();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} onMove={onMove} step={1} value={0} />);

            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousemove', {
                    button: 0,
                    bubbles: true,
                    pageY: 25,
                    clientY: 25,
                }),
            );

            expect(onMove).toHaveBeenCalledWith(75, 75, 100); // Value, position, height
        });

        test.each`
            initial | result
            ${0}    | ${0}
            ${10}   | ${9}
            ${100}  | ${99}
        `('should handle keydown ArrowDown and decrement the value $initial to $result', ({ initial, result }) => {
            const onUpdate = jest.fn();
            render(
                <VolumeSliderControl
                    {...defaultProps}
                    max={100}
                    min={0}
                    onUpdate={onUpdate}
                    step={1}
                    value={initial}
                />,
            );

            fireEvent.keyDown(screen.getByRole('slider')!, { key: 'ArrowDown' });

            expect(onUpdate).toHaveBeenCalledWith(result);
        });

        test.each`
            initial | result
            ${0}    | ${1}
            ${10}   | ${11}
            ${100}  | ${100}
        `('should handle keydown ArrowUp and increment the value $initial to $result', ({ initial, result }) => {
            const onUpdate = jest.fn();
            render(
                <VolumeSliderControl
                    {...defaultProps}
                    max={100}
                    min={0}
                    onUpdate={onUpdate}
                    step={1}
                    value={initial}
                />,
            );

            fireEvent.keyDown(screen.getByRole('slider')!, { key: 'ArrowUp' });

            expect(onUpdate).toHaveBeenCalledWith(result);
        });

        test('should handle touchstart and update the value', () => {
            const onUpdate = jest.fn();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} onUpdate={onUpdate} step={1} value={0} />);

            fireEvent(
                screen.getByRole('slider')!,
                new TouchEvent('touchstart', {
                    touches: [
                        {
                            ...getTouchEventDefaults(),
                            pageY: 25,
                            clientY: 25,
                        },
                    ],
                    bubbles: true,
                }),
            );

            expect(onUpdate).toHaveBeenCalledWith(75);
        });

        test('should call onMouseOver when mouse over event occurs', () => {
            const onMouseOver = jest.fn();
            render(<VolumeSliderControl {...defaultProps} onMouseOver={onMouseOver} value={50} />);

            fireEvent.mouseOver(screen.getByRole('slider')!);

            expect(onMouseOver).toHaveBeenCalled();
        });

        test('should call onMouseOver when focus event occurs', () => {
            const onMouseOver = jest.fn();
            render(<VolumeSliderControl {...defaultProps} onMouseOver={onMouseOver} value={50} />);

            fireEvent.focus(screen.getByRole('slider')!);

            expect(onMouseOver).toHaveBeenCalled();
        });

        test('should not handle mousedown with right button or modifier keys', () => {
            const onUpdate = jest.fn();
            render(<VolumeSliderControl {...defaultProps} onUpdate={onUpdate} value={50} />);

            // Right button
            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousedown', {
                    button: 2,
                    bubbles: true,
                    pageY: 25,
                    clientY: 25,
                }),
            );

            // Ctrl key
            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousedown', {
                    button: 0,
                    bubbles: true,
                    ctrlKey: true,
                    pageY: 25,
                    clientY: 25,
                }),
            );

            // Meta key
            fireEvent(
                screen.getByRole('slider')!,
                new MouseEventExtended('mousedown', {
                    button: 0,
                    bubbles: true,
                    metaKey: true,
                    pageY: 25,
                    clientY: 25,
                }),
            );

            expect(onUpdate).not.toHaveBeenCalled();
        });
    });

    describe('effects', () => {
        beforeEach(() => {
            jest.spyOn(document, 'addEventListener');
            jest.spyOn(document, 'removeEventListener');
        });

        test('should add document-level event handlers when scrubbing starts', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={0} />);

            fireEvent.mouseDown(screen.getByRole('slider')!);

            expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
        });

        test('should remove document-level event handlers when scrubbing stops', async () => {
            const user = userEvent.setup();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={0} />);

            fireEvent.mouseDown(screen.getByRole('slider')!);
            await user.click(document.body);

            expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
        });

        test('should handle document-level mousemove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} onUpdate={onUpdate} step={1} value={0} />);

            fireEvent.mouseDown(screen.getByRole('slider')!);
            fireEvent(
                document,
                new MouseEventExtended('mousemove', {
                    bubbles: true,
                    clientY: 25,
                }),
            );

            // The document-level mousemove calls getPositionRelativeToSlider directly, which returns raw position
            expect(onUpdate).toHaveBeenCalledWith(75);
        });

        test('should handle document-level touchmove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} onUpdate={onUpdate} step={1} value={0} />);

            fireEvent(
                screen.getByRole('slider')!,
                new TouchEvent('touchstart', {
                    touches: [
                        {
                            ...getTouchEventDefaults(),
                            pageY: 25,
                            clientY: 25,
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
                            clientY: 25,
                        },
                    ],
                }),
            );

            // The document-level touchmove calls getPositionRelativeToSlider directly, which returns raw position
            expect(onUpdate).toHaveBeenCalledWith(75);
        });

        test('should not handle document-level mousemove when not scrubbing', () => {
            const onUpdate = jest.fn();
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} onUpdate={onUpdate} step={1} value={0} />);

            fireEvent(
                document,
                new MouseEventExtended('mousemove', {
                    bubbles: true,
                    clientY: 25,
                }),
            );

            expect(onUpdate).not.toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper with correct classes', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={50} />);

            const container = screen.getByRole('slider').closest('.bp-VolumeVerticalSliderControl');
            expect(container).toBeInTheDocument();
            expect(container).toHaveClass('bp-VolumeVerticalSliderControl');
        });

        test('should apply custom className', () => {
            render(
                <VolumeSliderControl
                    {...defaultProps}
                    className="custom-class"
                    max={100}
                    min={0}
                    step={1}
                    value={50}
                />,
            );

            const container = screen.getByRole('slider').closest('.bp-VolumeVerticalSliderControl');
            expect(container).toHaveClass('custom-class');
        });

        test('should apply scrubbing class when scrubbing', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={50} />);

            const container = screen.getByRole('slider').closest('.bp-VolumeVerticalSliderControl');
            expect(container).not.toHaveClass('bp-is-scrubbing');

            fireEvent.mouseDown(screen.getByRole('slider')!);

            expect(container).toHaveClass('bp-is-scrubbing');
        });

        test('should set correct accessibility attributes', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={50} />);

            const slider = screen.getByRole('slider');
            expect(slider).toHaveAttribute('aria-label', 'Volume Slider');
            expect(slider).toHaveAttribute('aria-valuemax', '100');
            expect(slider).toHaveAttribute('aria-valuemin', '0');
            expect(slider).toHaveAttribute('aria-valuenow', '50');
            expect(slider).toHaveAttribute('tabIndex', '0');
        });

        test('should set correct height style based on value', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={25} />);

            const slider = screen.getByRole('slider');
            expect(slider).toHaveStyle({
                height: '25%',
            });
        });

        test('should set minimum height of 5% when value is 0', () => {
            render(<VolumeSliderControl {...defaultProps} max={100} min={0} step={1} value={0} />);

            const slider = screen.getByRole('slider');
            expect(slider).toHaveStyle({
                height: '5%',
            });
        });

        test('should forward additional props to the container', () => {
            render(
                <VolumeSliderControl
                    {...defaultProps}
                    data-testid="volume-slider"
                    max={100}
                    min={0}
                    step={1}
                    value={50}
                />,
            );

            const container = screen.getByTestId('volume-slider');
            expect(container).toHaveClass('bp-VolumeVerticalSliderControl');
        });
    });

    describe('custom props', () => {
        test('should use custom min, max, and step values', () => {
            const onUpdate = jest.fn();
            render(
                <VolumeSliderControl {...defaultProps} max={200} min={50} onUpdate={onUpdate} step={5} value={100} />,
            );

            const slider = screen.getByRole('slider');
            expect(slider).toHaveAttribute('aria-valuemax', '200');
            expect(slider).toHaveAttribute('aria-valuemin', '50');
            expect(slider).toHaveAttribute('aria-valuenow', '100');

            // Test step increment
            fireEvent.keyDown(slider, { key: 'ArrowUp' });
            expect(onUpdate).toHaveBeenCalledWith(105);

            // Test step decrement
            fireEvent.keyDown(slider, { key: 'ArrowDown' });
            expect(onUpdate).toHaveBeenCalledWith(95);
        });

        test('should respect min and max bounds in keyboard navigation', () => {
            const onUpdate = jest.fn();

            // Test min bound
            const { rerender } = render(
                <VolumeSliderControl {...defaultProps} max={100} min={10} onUpdate={onUpdate} step={1} value={10} />,
            );

            const slider = screen.getByRole('slider');

            // Should not go below min
            fireEvent.keyDown(slider, { key: 'ArrowDown' });
            expect(onUpdate).toHaveBeenCalledWith(10);

            // Test max bound
            rerender(
                <VolumeSliderControl {...defaultProps} max={100} min={10} onUpdate={onUpdate} step={1} value={100} />,
            );

            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' });
            expect(onUpdate).toHaveBeenCalledWith(100);
        });
    });
});
