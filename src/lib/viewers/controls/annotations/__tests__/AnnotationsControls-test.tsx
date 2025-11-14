import React from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsControls from '../AnnotationsControls';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsControls', () => {
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

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should not render tooltip if annoation experience can show is false', () => {
            jest.spyOn(React, 'useContext').mockImplementation(() => ({
                experiences: {
                    tooltipFlowAnnotationsExperience: {
                        canShow: false,
                        onClose: jest.fn(),
                        onComplete: jest.fn(),
                        onShow: jest.fn(),
                    },
                },
                setIsForced: jest.fn(),
            }));
            render(<AnnotationsControls annotationMode={AnnotationMode.REGION} hasHighlight hasRegion />);
            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });

        test('should render tooltip if annotations experience can show is true', () => {
            jest.spyOn(React, 'useContext').mockImplementation(() => ({
                experiences: {
                    tooltipFlowAnnotationsExperience: {
                        canShow: true,
                        onClose: jest.fn(),
                        onComplete: jest.fn(),
                        onShow: jest.fn(),
                    },
                },
                setIsForced: jest.fn(),
            }));
            render(<AnnotationsControls annotationMode={AnnotationMode.REGION} hasHighlight hasRegion />);
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        test('should add and remove its event handlers on mount and unmount', () => {
            render(<AnnotationsControls annotationMode={AnnotationMode.REGION} hasHighlight hasRegion />);

            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            render(<AnnotationsControls hasHighlight hasRegion />);
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
            const user = userEvent.setup();
            const onClick = jest.fn();
            render(
                <AnnotationsControls
                    annotationMode={current}
                    hasDrawing
                    hasHighlight
                    hasRegion
                    onAnnotationModeClick={onClick}
                />,
            );

            await user.click(screen.getByTestId(selector));

            expect(onClick).toHaveBeenCalledWith({ mode: result });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const user = userEvent.setup();
            const onEscape = jest.fn();
            render(
                <AnnotationsControls
                    annotationMode={AnnotationMode.REGION}
                    hasHighlight
                    hasRegion
                    onAnnotationModeEscape={onEscape}
                />,
            );

            await user.keyboard('{Escape}');

            expect(onEscape).toHaveBeenCalled();
        });

        test('should not invoke the escape callback if any key other than escape is pressed', async () => {
            const user = userEvent.setup();
            const onEscape = jest.fn();
            render(
                <AnnotationsControls
                    annotationMode={AnnotationMode.REGION}
                    hasHighlight
                    hasRegion
                    onAnnotationModeEscape={onEscape}
                />,
            );

            await user.keyboard('{Enter}');

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
                const user = userEvent.setup();
                render(<AnnotationsControls annotationMode={current} hasDrawing hasHighlight hasRegion />);

                await user.click(screen.getByTestId('bp-annotations-controls-exit-btn'));

                expect(screen.getByTestId(selector) === document.activeElement).toBe(true);
            },
        );
    });

    describe('render', () => {
        test('should render nothing if no mode is enabled', () => {
            render(<AnnotationsControls />);

            expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
        });

        test('should render a valid output', () => {
            render(<AnnotationsControls hasHighlight hasRegion />);

            expect(screen.getByTestId('bp-annotations-controls')).toBeInTheDocument();
        });

        test.each`
            fill          | mode
            ${bdlBoxBlue} | ${AnnotationMode.DRAWING}
            ${'#fff'}     | ${AnnotationMode.NONE}
        `('should return the drawing icon with the fill set as $fill if annotationMode is $mode', ({ fill, mode }) => {
            render(<AnnotationsControls annotationMode={mode} hasDrawing />);

            const icon = screen.getByTitle('Markup').querySelector('svg');

            expect(icon?.children[0]).toHaveAttribute('fill', fill);
        });

        test('should render modern icons', () => {
            render(<AnnotationsControls hasDrawing hasHighlight hasRegion />);

            expect(screen.getByTestId('IconPencilScribbleMedium24')).toBeInTheDocument();
            expect(screen.getByTestId('IconTextHighlightMedium24')).toBeInTheDocument();
            expect(screen.getByTestId('IconDashedSquareBubbleMedium24')).toBeInTheDocument();
        });
    });
});
