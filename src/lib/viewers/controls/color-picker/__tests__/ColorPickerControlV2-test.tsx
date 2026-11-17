import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ColorPickerControlV2 from '../ColorPickerControlV2';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';
import { ANNOTATION_COLORS, AnnotationColor } from '../../../../AnnotationModule';
import { Props } from '../ColorPickerControl';

describe('ColorPickerControlV2', () => {
    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <ControlsBarV2>
                <ColorPickerControlV2 colors={ANNOTATION_COLORS} onColorSelect={jest.fn()} {...props} />
            </ControlsBarV2>,
            { wrapper: BlueprintProviders },
        );

    const getGrid = () => screen.getByRole('grid', { name: __('drawing_color') });
    const getSwatch = (label: string) => within(getGrid()).getByRole('button', { name: label });

    describe('render', () => {
        test('should render every color inline as a swatch with its tracking target', () => {
            getWrapper();

            const swatches = within(getGrid()).getAllByRole('button');

            expect(screen.getByTestId('bp-color-picker-control')).toContainElement(getGrid());
            expect(swatches).toHaveLength(ANNOTATION_COLORS.length);
            swatches.forEach(swatch => expect(swatch).toHaveAttribute('data-resin-target', 'colorSelect'));
        });

        test('should style the swatches for the dark palette', () => {
            getWrapper();

            within(getGrid())
                .getAllByRole('button')
                .forEach(swatch => expect(swatch).toHaveClass('bp-ColorPickerControlV2-swatch'));
        });

        test('should render the swatches in a single row', () => {
            getWrapper();

            expect(within(getGrid()).getAllByRole('row')).toHaveLength(1);
        });

        test.each`
            color                             | label
            ${AnnotationColor.BOX_BLUE}       | ${'drawing_color_blue'}
            ${AnnotationColor.GREEN_LIGHT}    | ${'drawing_color_green'}
            ${AnnotationColor.WATERMELON_RED} | ${'drawing_color_red'}
            ${AnnotationColor.YELLORANGE}     | ${'drawing_color_orange'}
            ${AnnotationColor.YELLOW}         | ${'drawing_color_yellow'}
            ${AnnotationColor.GRIMACE}        | ${'drawing_color_purple'}
        `('should label the $color swatch with $label', ({ label }) => {
            getWrapper();

            expect(getSwatch(__(label))).toBeInTheDocument();
        });

        test('should fall back to the color value for a color without a label', () => {
            getWrapper({ colors: ['#123456'] });

            expect(getSwatch('#123456')).toBeInTheDocument();
        });

        test('should default the active color to Box blue', () => {
            getWrapper();

            expect(getSwatch(__('drawing_color_blue')).className).toMatch(/active/);
            expect(getSwatch(__('drawing_color_yellow')).className).not.toMatch(/active/);
        });

        test('should mark the active color', () => {
            getWrapper({ activeColor: AnnotationColor.YELLOW });

            expect(getSwatch(__('drawing_color_yellow')).className).toMatch(/active/);
            expect(getSwatch(__('drawing_color_blue')).className).not.toMatch(/active/);
        });

        test('should show the color name in a tooltip on hover', async () => {
            getWrapper();

            await userEvent.hover(getSwatch(__('drawing_color_green')));

            expect((await screen.findAllByText(__('drawing_color_green'))).length).toBeGreaterThan(0);
        });
    });

    describe('selection', () => {
        test('should call onColorSelect with the clicked color', async () => {
            const onColorSelect = jest.fn();
            getWrapper({ onColorSelect });

            await userEvent.click(getSwatch(__('drawing_color_red')));

            expect(onColorSelect).toHaveBeenCalledWith(AnnotationColor.WATERMELON_RED);
        });

        test('should move between swatches with the arrow keys and select with Enter', async () => {
            const onColorSelect = jest.fn();
            getWrapper({ onColorSelect });

            await userEvent.tab();

            expect(getSwatch(__('drawing_color_blue'))).toHaveFocus();

            await userEvent.keyboard('{ArrowRight}');

            expect(getSwatch(__('drawing_color_green'))).toHaveFocus();

            await userEvent.keyboard('{Enter}');

            expect(onColorSelect).toHaveBeenCalledWith(AnnotationColor.GREEN_LIGHT);
        });
    });
});
