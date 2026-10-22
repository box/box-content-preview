import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsToggleV2, { IconProps, ToolbarProps } from '../AnnotationsToggleV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';
import { ActiveAnnotationMode } from '../annotationModeIcons';
import { AnnotationMode } from '../../../../types';

type WithRef = { ref?: React.Ref<HTMLButtonElement> };

describe('AnnotationsToggleV2', () => {
    const allModes: ActiveAnnotationMode[] = [AnnotationMode.REGION, AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING];
    const getWrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>{children}</BlueprintProviders>
    );
    const renderToggle = (props: Partial<ToolbarProps> & WithRef = {}) =>
        render(
            <ControlsBarV2>
                <AnnotationsToggleV2 modes={allModes} {...props} />
            </ControlsBarV2>,
            { wrapper: getWrapper },
        );
    const getToggle = () => screen.getByRole('button', { name: __('annotation_tools') });

    describe('lifecycle', () => {
        beforeEach(() => {
            jest.spyOn(document, 'addEventListener');
            jest.spyOn(document, 'removeEventListener');
        });

        test('should add and remove its event handlers on mount and unmount', () => {
            const { unmount } = renderToggle({ annotationMode: AnnotationMode.REGION });

            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();

            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            renderToggle();

            expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('event handlers', () => {
        test.each`
            modes                                                                        | result
            ${[AnnotationMode.REGION, AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING]} | ${AnnotationMode.REGION}
            ${[AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING]}                        | ${AnnotationMode.HIGHLIGHT}
            ${[AnnotationMode.DRAWING, AnnotationMode.REGION]}                           | ${AnnotationMode.DRAWING}
        `(
            'should turn on the first mode, $result, when the toggle is clicked with $modes',
            async ({ modes, result }) => {
                const onClick = jest.fn();
                renderToggle({ modes, onAnnotationModeClick: onClick });

                await userEvent.click(getToggle());

                expect(onClick).toHaveBeenCalledWith({ mode: result });
            },
        );

        test.each(allModes)('should turn off %s mode when the toggle is clicked', async mode => {
            const onClick = jest.fn();
            renderToggle({ annotationMode: mode, onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
        });

        test('should resume the last mode used when the toggle is clicked again', async () => {
            const onClick = jest.fn();
            const { rerender } = renderToggle({
                annotationMode: AnnotationMode.DRAWING,
                onAnnotationModeClick: onClick,
            });

            rerender(
                <ControlsBarV2>
                    <AnnotationsToggleV2
                        annotationMode={AnnotationMode.NONE}
                        modes={allModes}
                        onAnnotationModeClick={onClick}
                    />
                </ControlsBarV2>,
            );
            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
        });

        test('should fall back to the first mode if the last mode used is no longer offered', async () => {
            const onClick = jest.fn();
            const { rerender } = renderToggle({
                annotationMode: AnnotationMode.DRAWING,
                onAnnotationModeClick: onClick,
            });

            rerender(
                <ControlsBarV2>
                    <AnnotationsToggleV2
                        annotationMode={AnnotationMode.NONE}
                        modes={[AnnotationMode.REGION, AnnotationMode.HIGHLIGHT]}
                        onAnnotationModeClick={onClick}
                    />
                </ControlsBarV2>,
            );
            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const onEscape = jest.fn();
            renderToggle({ annotationMode: AnnotationMode.REGION, onAnnotationModeEscape: onEscape });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).toHaveBeenCalled();
        });

        test('should not invoke the escape callback if any key other than escape is pressed', async () => {
            const onEscape = jest.fn();
            renderToggle({ annotationMode: AnnotationMode.REGION, onAnnotationModeEscape: onEscape });

            await userEvent.keyboard('{Enter}');

            expect(onEscape).not.toHaveBeenCalled();
        });

        test('should not invoke the escape callback if no mode is active', async () => {
            const onEscape = jest.fn();
            renderToggle({ onAnnotationModeEscape: onEscape });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).not.toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should render nothing if no mode is offered', () => {
            renderToggle({ modes: [] });

            expect(screen.queryByTestId('bp-AnnotationsControls-toggleBtn')).not.toBeInTheDocument();
        });

        test('should render the toggle with its tracking target and no exit button', () => {
            renderToggle();

            expect(getToggle()).toHaveAttribute('data-resin-target', 'annotations');
            expect(getToggle()).toHaveAttribute('data-testid', 'bp-AnnotationsControls-toggleBtn');
            expect(screen.queryByTestId('bp-annotations-controls-exit-btn')).not.toBeInTheDocument();
        });

        test('should forward its ref to the toggle button', () => {
            const ref = React.createRef<HTMLButtonElement>();
            renderToggle({ ref });

            expect(ref.current).toBe(getToggle());
        });

        test.each`
            annotationMode              | isPressed
            ${AnnotationMode.NONE}      | ${false}
            ${AnnotationMode.DRAWING}   | ${true}
            ${AnnotationMode.HIGHLIGHT} | ${true}
            ${AnnotationMode.REGION}    | ${true}
        `('should be pressed $isPressed while in $annotationMode mode', ({ annotationMode, isPressed }) => {
            renderToggle({ annotationMode });

            expect(getToggle()).toHaveAttribute('aria-pressed', `${isPressed}`);
            expect(getToggle()).toHaveAttribute('aria-expanded', `${isPressed}`);
        });
    });

    describe('with buttonType="icon"', () => {
        const mediaModes: ActiveAnnotationMode[] = [AnnotationMode.REGION, AnnotationMode.DRAWING];
        const renderIconToggle = (props: Partial<Omit<IconProps, 'buttonType'>> & WithRef = {}) =>
            render(<AnnotationsToggleV2 buttonType="icon" modes={mediaModes} {...props} />, {
                wrapper: getWrapper,
            });

        test('should render a standalone toggle without a toolbar', () => {
            renderIconToggle();

            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
            expect(getToggle()).toHaveAttribute('data-resin-target', 'annotations');
            expect(getToggle()).toHaveAttribute('data-testid', 'bp-AnnotationsControls-toggleBtn');
        });

        test('should pass size and variant through to the toggle button', () => {
            renderIconToggle({ size: 'small', variant: 'high-contrast' });

            expect(getToggle().className).toMatch(/small/);
            expect(getToggle().className).toMatch(/high-contrast/);
        });

        test('should forward its ref to the toggle button', () => {
            const ref = React.createRef<HTMLButtonElement>();
            renderIconToggle({ ref });

            expect(ref.current).toBe(getToggle());
        });

        test.each`
            annotationMode            | isPressed
            ${AnnotationMode.NONE}    | ${false}
            ${AnnotationMode.DRAWING} | ${true}
            ${AnnotationMode.REGION}  | ${true}
        `('should be pressed $isPressed while in $annotationMode mode', ({ annotationMode, isPressed }) => {
            renderIconToggle({ annotationMode });

            expect(getToggle()).toHaveAttribute('aria-pressed', `${isPressed}`);
            expect(getToggle()).toHaveAttribute('aria-expanded', `${isPressed}`);
        });

        test('should turn on the first mode offered when pressed', async () => {
            const onClick = jest.fn();
            renderIconToggle({ modes: [AnnotationMode.DRAWING], onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
        });

        test('should exit the mode when pressed while a mode is on', async () => {
            const onClick = jest.fn();
            renderIconToggle({ annotationMode: AnnotationMode.REGION, onAnnotationModeClick: onClick });

            await userEvent.click(getToggle());

            expect(onClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', async () => {
            const onEscape = jest.fn();
            renderIconToggle({ annotationMode: AnnotationMode.DRAWING, onAnnotationModeEscape: onEscape });

            await userEvent.keyboard('{Escape}');

            expect(onEscape).toHaveBeenCalled();
        });
    });
});
