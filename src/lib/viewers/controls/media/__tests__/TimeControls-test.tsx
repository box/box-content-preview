import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TimeControls from '../TimeControls';

describe('TimeControls', () => {
    const renderView = (props = {}) =>
        render(
            <TimeControls
                currentTime={0}
                durationTime={10000}
                filmstripUrl="http://example.com/image.png"
                onTimeChange={jest.fn()}
                {...props}
            />,
        );
    const mouseEventOptions = {
        bubbles: true,
        pageX: 250, // The center of the slider
        pageY: 478,
    };

    beforeEach(() => {
        jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
            (): DOMRect => ({
                toJSON: jest.fn(),
                bottom: 1000,
                height: 930,
                left: 0, // Values are reduced by the left offset of the slider
                right: 500,
                top: 60,
                width: 500, // Values are calculated based on width of the slider
                x: 0,
                y: 60,
            }),
        );
    });

    test('should update the slider on mousemove', () => {
        renderView({ filmstripInterval: 1 });

        const slider = screen.getByLabelText('Media Slider');

        expect(screen.getByTestId('bp-Filmstrip-time')).toHaveTextContent('0:00');

        fireEvent(slider, new MouseEventExtended('mouseenter', mouseEventOptions));
        fireEvent(slider, new MouseEventExtended('mouseover', mouseEventOptions));
        fireEvent(slider, new MouseEventExtended('mousedown', mouseEventOptions));
        fireEvent(slider, new MouseEventExtended('mousemove', mouseEventOptions));
        fireEvent(slider, new MouseEventExtended('mouseup', mouseEventOptions));

        expect(screen.getByTestId('bp-Filmstrip-time')).toHaveTextContent('1:23:20'); // 1:23:20 = 5000 seconds, half of 10000
    });

    test('should update the slider hover state on mouseover and mouseout', () => {
        renderView({ filmstripInterval: 1 });

        const slider = screen.getByLabelText('Media Slider');

        fireEvent(slider, new MouseEventExtended('mouseenter', mouseEventOptions));
        fireEvent(slider, new MouseEventExtended('mouseover', mouseEventOptions));

        expect(screen.getByTestId('bp-TimeControls').firstChild).toHaveClass('bp-is-shown');

        fireEvent(slider, new MouseEventExtended('mouseout', mouseEventOptions));

        expect(screen.getByTestId('bp-TimeControls').firstChild).not.toHaveClass('bp-is-shown');
    });

    test('should render the filmstrip with the correct props', () => {
        renderView({
            aspectRatio: 1.5,
            filmstripInterval: 2,
            filmstripUrl: 'https://app.box.com',
        });

        expect(screen.getByTestId('bp-Filmstrip-frame')).toHaveStyle({
            backgroundImage: 'url(https://app.box.com)',
        });
    });
});
