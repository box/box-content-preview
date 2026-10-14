import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ColorPickerControlV2 from '../ColorPickerControlV2';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';
import { ANNOTATION_COLORS, AnnotationColor } from '../../../../AnnotationModule';
import { ControlsLayerContext } from '../../controls-layer';
import { Props } from '../ColorPickerControl';

describe('ColorPickerControlV2', () => {
    const getWrapper = (props: Partial<Props> = {}, setIsForced = jest.fn(), container?: HTMLElement) =>
        render(
            <ControlsLayerContext.Provider value={{ setIsForced }}>
                <ControlsBarV2>
                    <ColorPickerControlV2 colors={ANNOTATION_COLORS} onColorSelect={jest.fn()} {...props} />
                </ControlsBarV2>
            </ControlsLayerContext.Provider>,
            { wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders> },
        );

    const getToggleButton = () => screen.getByRole('button', { name: __('drawing_color') });
    const getPalette = () => screen.queryByTestId('bp-ColorPickerControl-palette');

    beforeEach(() => {
        window.ResizeObserver = jest.fn().mockImplementation(() => ({
            disconnect: jest.fn(),
            observe: jest.fn(),
            unobserve: jest.fn(),
        }));
    });

    afterEach(() => {
        // @ts-expect-error jsdom has no ResizeObserver to restore it to
        delete window.ResizeObserver;
    });

    describe('render', () => {
        test('should render the toggle with its tracking target and the active color', () => {
            getWrapper({ activeColor: AnnotationColor.YELLOW });

            expect(screen.getByTestId('bp-color-picker-control')).toContainElement(getToggleButton());
            expect(getToggleButton()).toHaveAttribute('data-resin-target', 'colorPickerOpen');
            expect(getToggleButton()).toHaveAttribute('data-testid', 'bp-ColorPickerControl-toggle');
            expect(getToggleButton().style.getPropertyValue('--toolbar-button-color')).toBe(AnnotationColor.YELLOW);
        });

        test('should default the active color to Box blue', () => {
            getWrapper();

            expect(getToggleButton().style.getPropertyValue('--toolbar-button-color')).toBe(AnnotationColor.BOX_BLUE);
        });

        test('should not render the palette open when the component is first mounted', () => {
            getWrapper();

            expect(getToggleButton()).toHaveAttribute('aria-expanded', 'false');
            expect(getPalette()).not.toBeInTheDocument();
        });

        test('should open the palette with every color when the toggle button is clicked', async () => {
            getWrapper();

            await userEvent.click(getToggleButton());

            const palette = getPalette() as HTMLElement;
            const swatches = within(palette).getAllByRole('button');

            expect(getToggleButton()).toHaveAttribute('aria-expanded', 'true');
            expect(swatches).toHaveLength(ANNOTATION_COLORS.length);
            swatches.forEach(swatch => expect(swatch).toHaveAttribute('data-resin-target', 'colorSelect'));
        });

        test.each`
            color                             | label
            ${AnnotationColor.BOX_BLUE}       | ${'drawing_color_blue'}
            ${AnnotationColor.GREEN_LIGHT}    | ${'drawing_color_green'}
            ${AnnotationColor.WATERMELON_RED} | ${'drawing_color_red'}
            ${AnnotationColor.YELLORANGE}     | ${'drawing_color_orange'}
            ${AnnotationColor.YELLOW}         | ${'drawing_color_yellow'}
            ${AnnotationColor.GRIMACE}        | ${'drawing_color_purple'}
        `('should label the $color swatch with $label', async ({ color, label }) => {
            const onColorSelect = jest.fn();
            getWrapper({ onColorSelect });

            await userEvent.click(getToggleButton());
            await userEvent.click(screen.getByRole('button', { name: __(label) }));

            expect(onColorSelect).toHaveBeenCalledWith(color);
        });

        test('should fall back to the color value for a color without a label', async () => {
            getWrapper({ colors: ['#123456'] });

            await userEvent.click(getToggleButton());

            expect(screen.getByRole('button', { name: '#123456' })).toBeInTheDocument();
        });

        test('should portal the palette into the Blueprint container', async () => {
            const container = document.createElement('div');
            document.body.appendChild(container);
            getWrapper({}, jest.fn(), container);

            await userEvent.click(getToggleButton());

            expect(container).toContainElement(getPalette());

            document.body.removeChild(container);
        });
    });

    describe('close behavior', () => {
        test('should toggle the palette closed when the toggle button is clicked again', async () => {
            getWrapper();

            await userEvent.click(getToggleButton());
            expect(getPalette()).toBeInTheDocument();

            await userEvent.click(getToggleButton());
            expect(getPalette()).not.toBeInTheDocument();
            expect(getToggleButton()).toHaveAttribute('aria-expanded', 'false');
        });

        test('should close the palette when clicking outside the control', async () => {
            getWrapper();

            await userEvent.click(getToggleButton());
            expect(getPalette()).toBeInTheDocument();

            await userEvent.click(document.body);
            expect(getPalette()).not.toBeInTheDocument();
        });

        test('should close the palette when Escape is pressed', async () => {
            getWrapper();

            await userEvent.click(getToggleButton());
            expect(getPalette()).toBeInTheDocument();

            // The swatch focused on open shows its tooltip, which is dismissed by the first Escape
            await userEvent.keyboard('{Escape}{Escape}');
            expect(getPalette()).not.toBeInTheDocument();
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', async () => {
            const onColorSelect = jest.fn();
            getWrapper({ onColorSelect });

            await userEvent.click(getToggleButton());
            await userEvent.keyboard('{Enter}');

            expect(onColorSelect).toHaveBeenCalledWith(AnnotationColor.BOX_BLUE);
            expect(getPalette()).not.toBeInTheDocument();
        });
    });

    describe('controls layer pinning', () => {
        test('should pin the controls layer open while open and release it on close', async () => {
            const setIsForced = jest.fn();
            getWrapper({}, setIsForced);

            await userEvent.click(getToggleButton());
            expect(setIsForced).toHaveBeenLastCalledWith(true);

            await userEvent.click(getToggleButton());
            expect(setIsForced).toHaveBeenLastCalledWith(false);
        });

        test('should release the controls layer on unmount', async () => {
            const setIsForced = jest.fn();
            const { unmount } = getWrapper({}, setIsForced);

            await userEvent.click(getToggleButton());
            unmount();

            expect(setIsForced).toHaveBeenLastCalledWith(false);
        });
    });
});
