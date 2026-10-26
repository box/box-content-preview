import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsPaletteControlsV2, { Props } from '../AnnotationsPaletteControlsV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import { AnnotationColor } from '../../../../AnnotationModule';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsPaletteControlsV2', () => {
    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <AnnotationsPaletteControlsV2
                annotationMode={AnnotationMode.REGION}
                modes={[AnnotationMode.REGION, AnnotationMode.DRAWING]}
                onAnnotationColorChange={jest.fn()}
                {...props}
            />,
            { wrapper: BlueprintProviders },
        );

    test('should render a button for each mode', () => {
        getWrapper();

        expect(screen.getAllByRole('radio').map(button => button.dataset.testid)).toEqual([
            'bp-AnnotationsControls-regionBtn',
            'bp-AnnotationsControls-drawBtn',
        ]);
        expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();
    });

    test('should switch modes from the palette', async () => {
        const onAnnotationModeClick = jest.fn();
        getWrapper({ onAnnotationModeClick });

        await userEvent.click(screen.getByTestId('bp-AnnotationsControls-drawBtn'));

        expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
    });

    test('should show the drawing colors while drawing', async () => {
        const onAnnotationColorChange = jest.fn();
        getWrapper({ annotationMode: AnnotationMode.DRAWING, onAnnotationColorChange });

        expect(screen.getByTestId('bp-color-picker-control')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: __('drawing_color_red') }));

        expect(onAnnotationColorChange).toHaveBeenCalledWith(AnnotationColor.WATERMELON_RED);
    });

    test.each`
        annotationMode           | modes
        ${AnnotationMode.NONE}   | ${[AnnotationMode.REGION]}
        ${AnnotationMode.REGION} | ${[]}
    `('should render nothing in mode $annotationMode with modes $modes', ({ annotationMode, modes }) => {
        getWrapper({ annotationMode, modes });

        expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
    });
});
