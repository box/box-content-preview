import React from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsControls from '../AnnotationsControls';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsControls', () => {
    const renderView = (props = {}) => {
        return render(<AnnotationsControls {...props} />);
    };

    beforeEach(() => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
    });

    describe('lifecycle', () => {
        let unmount = (): void => {
            // placeholder
        };

        beforeEach(() => {
            let found = false; // we want to find the first use of useEffect
            jest.spyOn(React, 'useEffect').mockImplementation(cb => {
                if (!found) {
                    found = true;
                    unmount = cb() as () => void; // Enzyme unmount helper does not currently invoke useEffect cleanup
                }
            });
        });

        test('should add and remove its event handlers on mount and unmount', () => {
            renderView({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
            });
            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            renderView({ hasHighlight: true, hasRegion: true });
            expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('event handlers', () => {
        test.each`
            current                   | selector                                 | result
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-regionBtn'}    | ${AnnotationMode.REGION}
            ${AnnotationMode.REGION}  | ${'bp-AnnotationsControls-regionBtn'}    | ${AnnotationMode.NONE}
            ${AnnotationMode.REGION}  | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-drawBtn'}      | ${AnnotationMode.DRAWING}
            ${AnnotationMode.DRAWING} | ${'bp-AnnotationsControls-drawBtn'}      | ${AnnotationMode.NONE}
        `('in $current mode returns $result when $selector is clicked', async ({ current, result, selector }) => {
            const onClick = jest.fn();
            renderView({
                annotationMode: current,
                hasDrawing: true,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeClick: onClick,
            });

            await userEvent.click(screen.getByTestId(selector));

            expect(onClick).toHaveBeenCalledWith({ mode: result });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const onEscape = jest.fn();

            renderView({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeEscape: onEscape,
            });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).toHaveBeenCalled();
        });

        test('should not invoke the escape callback if any key other than escape is pressed', async () => {
            const onEscape = jest.fn();

            renderView({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeEscape: onEscape,
            });

            await userEvent.keyboard('{Enter}');

            expect(onEscape).not.toHaveBeenCalled();
        });

        test.each`
            current                     | selector
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-regionBtn'}
            ${AnnotationMode.HIGHLIGHT} | ${'bp-AnnotationsControls-highlightBtn'}
            ${AnnotationMode.DRAWING}   | ${'bp-AnnotationsControls-drawBtn'}
        `(
            'while in $current mode, should focus on $current button when exit button is clicked',
            async ({ current, selector }) => {
                renderView({
                    annotationMode: current,
                    hasDrawing: true,
                    hasHighlight: true,
                    hasRegion: true,
                });

                await userEvent.click(screen.getByTestId('bp-annotations-controls-exit-btn'));

                expect(screen.getByTestId(selector) === document.activeElement).toBe(true);
            },
        );
    });

    describe('render', () => {
        test('should render nothing if no mode is enabled', () => {
            renderView();

            expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
        });

        test('should render a valid output', () => {
            renderView({ hasHighlight: true, hasRegion: true });

            expect(screen.getByTestId('bp-annotations-controls')).toBeInTheDocument();
        });

        test.each`
            fill          | mode
            ${bdlBoxBlue} | ${AnnotationMode.DRAWING}
            ${'#fff'}     | ${AnnotationMode.NONE}
        `('should return an IconDrawing24 with the fill set as $fill if annotationMode is $mode', ({ fill, mode }) => {
            renderView({ annotationMode: mode, hasDrawing: true });

            const icon = screen.getByTitle('Markup').querySelector('svg');

            expect(icon?.children[0]).toHaveAttribute('fill', fill);
        });
    });
});
