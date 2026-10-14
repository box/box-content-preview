import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsPaletteV2, { Props } from '../AnnotationsPaletteV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import fullscreen from '../../../../Fullscreen';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsPaletteV2', () => {
    const renderPalette = (props: Props = {}) =>
        render(<AnnotationsPaletteV2 hasDrawing hasHighlight hasRegion {...props} />, {
            wrapper: BlueprintProviders,
        });

    describe('event handlers', () => {
        test.each`
            current                     | selector                                 | result
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-drawBtn'}      | ${AnnotationMode.DRAWING}
            ${AnnotationMode.HIGHLIGHT} | ${'bp-AnnotationsControls-regionBtn'}    | ${AnnotationMode.REGION}
            ${AnnotationMode.DRAWING}   | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
        `('in $current mode returns $result when $selector is clicked', async ({ current, result, selector }) => {
            const onClick = jest.fn();
            renderPalette({ annotationMode: current, onAnnotationModeClick: onClick });

            await userEvent.click(screen.getByTestId(selector));

            expect(onClick).toHaveBeenCalledWith({ mode: result });
        });

        test.each`
            current                     | selector
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-regionBtn'}
            ${AnnotationMode.HIGHLIGHT} | ${'bp-AnnotationsControls-highlightBtn'}
            ${AnnotationMode.DRAWING}   | ${'bp-AnnotationsControls-drawBtn'}
        `('in $current mode does nothing when $selector is clicked again', async ({ current, selector }) => {
            const onClick = jest.fn();
            renderPalette({ annotationMode: current, onAnnotationModeClick: onClick });

            await userEvent.click(screen.getByTestId(selector));

            expect(onClick).not.toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should be closed while no mode is active', () => {
            renderPalette();

            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
        });

        test('should open while a mode is active', () => {
            renderPalette({ annotationMode: AnnotationMode.REGION });

            const toolbar = within(screen.getByTestId('bp-AnnotationsPaletteV2')).getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByTestId('bp-annotations-controls'));
        });

        test('should close once the mode is turned off', () => {
            const { rerender } = renderPalette({ annotationMode: AnnotationMode.REGION });

            rerender(<AnnotationsPaletteV2 annotationMode={AnnotationMode.NONE} hasDrawing hasHighlight hasRegion />);

            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });

        test('should render nothing if no mode is enabled', () => {
            render(<AnnotationsPaletteV2 annotationMode={AnnotationMode.REGION} />, { wrapper: BlueprintProviders });

            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });

        test('should render nothing while in fullscreen', () => {
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

            renderPalette({ annotationMode: AnnotationMode.REGION });

            expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
        });

        test('should render the mode buttons with their tracking targets', () => {
            renderPalette({ annotationMode: AnnotationMode.REGION });

            expect(screen.getByRole('radio', { name: __('region_comment') })).toHaveAttribute(
                'data-resin-target',
                'highlightRegion',
            );
            expect(screen.getByRole('radio', { name: __('highlight_text') })).toHaveAttribute(
                'data-resin-target',
                'highlightText',
            );
            expect(screen.getByRole('radio', { name: __('drawing_comment') })).toHaveAttribute(
                'data-resin-target',
                'draw',
            );
        });

        test.each`
            options                                     | testIds
            ${{ hasRegion: true }}                      | ${['bp-AnnotationsControls-regionBtn']}
            ${{ hasHighlight: true }}                   | ${['bp-AnnotationsControls-highlightBtn']}
            ${{ hasDrawing: true, hasHighlight: true }} | ${['bp-AnnotationsControls-highlightBtn', 'bp-AnnotationsControls-drawBtn']}
        `('should only render the buttons for $options', ({ options, testIds }) => {
            render(<AnnotationsPaletteV2 annotationMode={AnnotationMode.HIGHLIGHT} {...options} />, {
                wrapper: BlueprintProviders,
            });

            expect(screen.queryAllByRole('radio').map(button => button.dataset.testid)).toEqual(testIds);
        });

        test.each`
            annotationMode              | selector
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-regionBtn'}
            ${AnnotationMode.HIGHLIGHT} | ${'bp-AnnotationsControls-highlightBtn'}
            ${AnnotationMode.DRAWING}   | ${'bp-AnnotationsControls-drawBtn'}
        `('should select only $selector in $annotationMode mode', ({ annotationMode, selector }) => {
            renderPalette({ annotationMode });

            expect(screen.getByRole('radio', { checked: true })).toHaveAttribute('data-testid', selector);
        });
    });
});
