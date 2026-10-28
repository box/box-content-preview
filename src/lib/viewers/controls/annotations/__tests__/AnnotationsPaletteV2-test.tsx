import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsPaletteV2 from '../AnnotationsPaletteV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import { ActiveAnnotationMode } from '../annotationModeIcons';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsPaletteV2', () => {
    const allModes: ActiveAnnotationMode[] = [AnnotationMode.REGION, AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING];
    const renderPalette = ({
        annotationMode = AnnotationMode.REGION,
        extra = null,
        modes = allModes,
        onAnnotationModeClick = jest.fn(),
    }: {
        annotationMode?: AnnotationMode;
        extra?: React.ReactNode;
        modes?: ActiveAnnotationMode[];
        onAnnotationModeClick?: jest.Mock;
    } = {}) =>
        render(
            <AnnotationsPaletteV2>
                <AnnotationsPaletteV2.Modes
                    annotationMode={annotationMode}
                    onAnnotationModeClick={onAnnotationModeClick}
                >
                    {modes.map(mode => (
                        <AnnotationsPaletteV2.Mode key={mode} value={mode} />
                    ))}
                </AnnotationsPaletteV2.Modes>
                {extra}
            </AnnotationsPaletteV2>,
            { wrapper: BlueprintProviders },
        );

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
        test('should render the modes in a toolbar of its own', () => {
            renderPalette();

            const toolbar = within(screen.getByTestId('bp-AnnotationsPaletteV2')).getByRole('toolbar');

            expect(toolbar).toContainElement(screen.getByTestId('bp-annotations-controls'));
        });

        test('should render the small toolbar size', () => {
            renderPalette();

            const toolbar = within(screen.getByTestId('bp-AnnotationsPaletteV2')).getByRole('toolbar');

            expect(toolbar).toHaveClass('bp-ControlsBarV2--small');
        });

        test('should render the mode buttons with their tracking targets', () => {
            renderPalette();

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

        test('should render only the modes it is given, in the given order', () => {
            renderPalette({ modes: [AnnotationMode.DRAWING, AnnotationMode.REGION] });

            expect(screen.queryAllByRole('radio').map(button => button.dataset.testid)).toEqual([
                'bp-AnnotationsControls-drawBtn',
                'bp-AnnotationsControls-regionBtn',
            ]);
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

        test('should render other children in the palette bar beside the modes', () => {
            renderPalette({ extra: <button type="button">extra</button> });

            expect(screen.getByRole('toolbar')).toContainElement(screen.getByRole('button', { name: 'extra' }));
            expect(screen.getByTestId('bp-annotations-controls')).not.toContainElement(
                screen.getByRole('button', { name: 'extra' }),
            );
        });
    });
});
