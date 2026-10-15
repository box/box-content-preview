import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsToggleV2, { IconProps } from '../AnnotationsToggleV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';
import ExperiencesProvider from '../../experiences';
import fullscreen from '../../../../Fullscreen';
import { AnnotationMode, Experiences } from '../../../../types';
import { Props } from '../AnnotationsControls';

describe('AnnotationsToggleV2', () => {
    const renderToggle = (props: Props = {}, experiences: Experiences = {}) =>
        render(
            <ControlsBarV2>
                <AnnotationsToggleV2 {...props} />
            </ControlsBarV2>,
            {
                wrapper: ({ children }) => (
                    <BlueprintProviders>
                        <ExperiencesProvider experiences={experiences}>{children}</ExperiencesProvider>
                    </BlueprintProviders>
                ),
            },
        );
    const getToggle = () => screen.getByRole('button', { name: __('annotation_tools') });

    describe('lifecycle', () => {
        const getExperiences = (canShow: boolean): Experiences => ({
            tooltipFlowAnnotationsExperience: {
                canShow,
                onClose: jest.fn(),
                onComplete: jest.fn(),
                onShow: jest.fn(),
            },
        });

        beforeEach(() => {
            jest.spyOn(document, 'addEventListener');
            jest.spyOn(document, 'removeEventListener');
        });

        test('should not render tooltip if annotations experience can show is false', () => {
            renderToggle({ hasHighlight: true, hasRegion: true }, getExperiences(false));

            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });

        test('should render tooltip if annotations experience can show is true', () => {
            renderToggle({ hasHighlight: true, hasRegion: true }, getExperiences(true));

            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        test('should not show the discoverability tooltip on hover if the host passes no annotations experience', async () => {
            renderToggle({ hasHighlight: true, hasRegion: true });

            await userEvent.hover(getToggle());

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('annotation_tools'));
            expect(screen.queryByText(__('annotations_tooltip_title'))).not.toBeInTheDocument();
        });

        test('should not render tooltip if region mode is not enabled', () => {
            renderToggle({ hasHighlight: true }, getExperiences(true));

            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });

        test('should add and remove its event handlers on mount and unmount', () => {
            const { unmount } = renderToggle({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
            });

            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();

            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            renderToggle({ hasHighlight: true, hasRegion: true });

            expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('event handlers', () => {
        test.each`
            options                                                      | result
            ${{ hasDrawing: true, hasHighlight: true, hasRegion: true }} | ${AnnotationMode.REGION}
            ${{ hasDrawing: true, hasHighlight: true }}                  | ${AnnotationMode.HIGHLIGHT}
            ${{ hasDrawing: true }}                                      | ${AnnotationMode.DRAWING}
        `('should turn on $result when the toggle is clicked with $options enabled', async ({ options, result }) => {
            const onClick = jest.fn();
            renderToggle({ ...options, onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: result });
        });

        test.each([AnnotationMode.DRAWING, AnnotationMode.HIGHLIGHT, AnnotationMode.REGION])(
            'should turn off %s mode when the toggle is clicked',
            async mode => {
                const onClick = jest.fn();
                renderToggle({
                    annotationMode: mode,
                    hasDrawing: true,
                    hasHighlight: true,
                    hasRegion: true,
                    onAnnotationModeClick: onClick,
                });

                await userEvent.click(getToggle());

                expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
            },
        );

        test('should resume the last mode used when the toggle is clicked again', async () => {
            const onClick = jest.fn();
            const props = { hasDrawing: true, hasHighlight: true, hasRegion: true, onAnnotationModeClick: onClick };
            const { rerender } = renderToggle({ ...props, annotationMode: AnnotationMode.DRAWING });

            rerender(
                <ControlsBarV2>
                    <AnnotationsToggleV2 {...props} annotationMode={AnnotationMode.NONE} />
                </ControlsBarV2>,
            );
            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
        });

        test('should fall back to the default mode if the last mode used is no longer enabled', async () => {
            const onClick = jest.fn();
            const props = { hasHighlight: true, hasRegion: true, onAnnotationModeClick: onClick };
            const { rerender } = renderToggle({ ...props, annotationMode: AnnotationMode.DRAWING, hasDrawing: true });

            rerender(
                <ControlsBarV2>
                    <AnnotationsToggleV2 {...props} annotationMode={AnnotationMode.NONE} hasDrawing={false} />
                </ControlsBarV2>,
            );
            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const onEscape = jest.fn();
            renderToggle({
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
            renderToggle({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeEscape: onEscape,
            });

            await userEvent.keyboard('{Enter}');

            expect(onEscape).not.toHaveBeenCalled();
        });

        test('should not invoke the escape callback if no mode is active', async () => {
            const onEscape = jest.fn();
            renderToggle({ hasHighlight: true, hasRegion: true, onAnnotationModeEscape: onEscape });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).not.toHaveBeenCalled();
        });

        test.each([AnnotationMode.DRAWING, AnnotationMode.HIGHLIGHT, AnnotationMode.REGION])(
            'while in %s mode, should exit and focus on the toggle when exit button is clicked',
            async mode => {
                const onClick = jest.fn();
                renderToggle({
                    annotationMode: mode,
                    hasDrawing: true,
                    hasHighlight: true,
                    hasRegion: true,
                    onAnnotationModeClick: onClick,
                });

                await userEvent.click(screen.getByTestId('bp-annotations-controls-exit-btn'));

                expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
                expect(getToggle()).toHaveFocus();
            },
        );
    });

    describe('render', () => {
        test('should render nothing if no mode is enabled', () => {
            renderToggle();

            expect(screen.queryByTestId('bp-AnnotationsControls-toggleBtn')).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-annotations-controls-exit-btn')).not.toBeInTheDocument();
        });

        test('should render nothing while in fullscreen', () => {
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);

            renderToggle({ hasDrawing: true, hasHighlight: true, hasRegion: true });

            expect(screen.queryByTestId('bp-AnnotationsControls-toggleBtn')).not.toBeInTheDocument();
        });

        test('should render the toggle and the exit button', () => {
            renderToggle({ hasHighlight: true, hasRegion: true });

            expect(getToggle()).toHaveAttribute('data-resin-target', 'annotations');
            expect(getToggle()).toHaveAttribute('data-testid', 'bp-AnnotationsControls-toggleBtn');
            expect(screen.getByRole('button', { name: __('exit_annotations') })).toHaveAttribute(
                'data-resin-target',
                'exit',
            );
            expect(screen.getByTestId('bp-annotations-controls-exit-btn').parentElement).toHaveClass(
                'bp-AnnotationsControls-exitBtn',
            );
        });

        test('should not render the exit button for video', () => {
            renderToggle({ hasHighlight: true, hasRegion: true, isVideo: true });

            expect(getToggle()).toBeInTheDocument();
            expect(screen.queryByTestId('bp-annotations-controls-exit-btn')).not.toBeInTheDocument();
        });

        test.each`
            annotationMode              | isPressed
            ${AnnotationMode.NONE}      | ${false}
            ${AnnotationMode.DRAWING}   | ${true}
            ${AnnotationMode.HIGHLIGHT} | ${true}
            ${AnnotationMode.REGION}    | ${true}
        `('should be pressed $isPressed while in $annotationMode mode', ({ annotationMode, isPressed }) => {
            renderToggle({ annotationMode, hasDrawing: true, hasHighlight: true, hasRegion: true });

            expect(getToggle()).toHaveAttribute('aria-pressed', `${isPressed}`);
            expect(getToggle()).toHaveAttribute('aria-expanded', `${isPressed}`);
        });
    });

    describe('with buttonType="icon"', () => {
        const renderIconToggle = (props: Omit<IconProps, 'buttonType'> = {}, experiences: Experiences = {}) =>
            render(<AnnotationsToggleV2 buttonType="icon" {...props} />, {
                wrapper: ({ children }) => (
                    <BlueprintProviders>
                        <ExperiencesProvider experiences={experiences}>{children}</ExperiencesProvider>
                    </BlueprintProviders>
                ),
            });
        const videoModes = { hasDrawing: true, hasRegion: true, isVideo: true };

        test('should render a standalone toggle without a toolbar or separator', () => {
            renderIconToggle(videoModes);

            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
            expect(screen.queryByRole('separator')).not.toBeInTheDocument();
            expect(getToggle()).toHaveAttribute('data-resin-target', 'annotations');
            expect(getToggle()).toHaveAttribute('data-testid', 'bp-AnnotationsControls-toggleBtn');
        });

        test('should pass size and variant through to the toggle button', () => {
            renderIconToggle({ ...videoModes, size: 'small', variant: 'high-contrast' });

            expect(getToggle().className).toMatch(/small/);
            expect(getToggle().className).toMatch(/high-contrast/);
        });

        test('should not render the exit button for video', () => {
            renderIconToggle(videoModes);

            expect(screen.queryByTestId('bp-annotations-controls-exit-btn')).not.toBeInTheDocument();
        });

        test('should render the exit button outside video', async () => {
            const onClick = jest.fn();
            renderIconToggle({
                annotationMode: AnnotationMode.REGION,
                hasRegion: true,
                onAnnotationModeClick: onClick,
            });

            await userEvent.click(screen.getByRole('button', { name: __('exit_annotations') }));

            expect(screen.getByTestId('bp-annotations-controls-exit-btn')).toHaveAttribute('data-resin-target', 'exit');
            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
            expect(getToggle()).toHaveFocus();
        });

        test.each`
            annotationMode            | isPressed
            ${AnnotationMode.NONE}    | ${false}
            ${AnnotationMode.DRAWING} | ${true}
            ${AnnotationMode.REGION}  | ${true}
        `('should be pressed $isPressed while in $annotationMode mode', ({ annotationMode, isPressed }) => {
            renderIconToggle({ ...videoModes, annotationMode });

            expect(getToggle()).toHaveAttribute('aria-pressed', `${isPressed}`);
            expect(getToggle()).toHaveAttribute('aria-expanded', `${isPressed}`);
        });

        test('should turn on the default mode for the enabled modes when pressed', async () => {
            const onClick = jest.fn();
            renderIconToggle({ hasDrawing: true, isVideo: true, onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
        });

        test('should exit the mode when pressed while a mode is on', async () => {
            const onClick = jest.fn();
            renderIconToggle({ ...videoModes, annotationMode: AnnotationMode.REGION, onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const onEscape = jest.fn();
            renderIconToggle({
                ...videoModes,
                annotationMode: AnnotationMode.DRAWING,
                onAnnotationModeEscape: onEscape,
            });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).toHaveBeenCalled();
        });

        test('should show the discoverability tooltip only when the host targets it', () => {
            const experience = { canShow: true, onClose: jest.fn(), onComplete: jest.fn(), onShow: jest.fn() };
            renderIconToggle(videoModes, { tooltipFlowAnnotationsExperience: experience });

            expect(screen.getByText(__('annotations_tooltip_title'))).toBeInTheDocument();
            expect(experience.onShow).toHaveBeenCalled();
        });
    });
});
