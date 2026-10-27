import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlsBarV2 from '../ControlsBarV2';

describe('ControlsBarV2', () => {
    describe('render', () => {
        test('should render its children inside a Blueprint toolbar', () => {
            render(
                <ControlsBarV2>
                    <button type="button">Hello</button>
                </ControlsBarV2>,
            );

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
            expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Hello' }));
        });

        test('should render the dark toolbar', () => {
            render(
                <ControlsBarV2>
                    <button type="button">Hello</button>
                </ControlsBarV2>,
            );

            expect(screen.getByRole('toolbar')).toHaveAttribute('data-color-scheme', 'dark');
        });

        test('should forward its ref to the toolbar', () => {
            const ref = React.createRef<HTMLDivElement>();

            render(
                <ControlsBarV2 ref={ref}>
                    <button type="button">Hello</button>
                </ControlsBarV2>,
            );

            expect(ref.current).toBe(screen.getByRole('toolbar'));
        });

        test('should render nothing if the children property is undefined', () => {
            render(<ControlsBarV2>{undefined}</ControlsBarV2>);

            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
        });
    });

    describe('keyboard', () => {
        const onDocumentKeyDown = jest.fn();
        const getWrapper = () =>
            render(
                <ControlsBarV2>
                    <Toolbar.Button aria-label="First">1</Toolbar.Button>
                    <Toolbar.Button aria-label="Second">2</Toolbar.Button>
                </ControlsBarV2>,
            );

        beforeEach(() => {
            document.addEventListener('keydown', onDocumentKeyDown);
        });

        afterEach(() => {
            document.removeEventListener('keydown', onDocumentKeyDown);
            onDocumentKeyDown.mockClear();
        });

        test.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])(
            'should keep %s from reaching preview while focus is in the bar',
            async key => {
                const user = userEvent.setup();
                getWrapper();

                screen.getByRole('button', { name: 'First' }).focus();
                await user.keyboard(`{${key}}`);

                expect(onDocumentKeyDown).not.toHaveBeenCalled();
            },
        );

        test('should still move focus between the items with the arrow keys', async () => {
            const user = userEvent.setup();
            getWrapper();

            screen.getByRole('button', { name: 'First' }).focus();
            await user.keyboard('{ArrowRight}');

            expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
        });

        test.each(['f', 'r', 'Escape'])('should let the %s shortcut reach preview', async key => {
            const user = userEvent.setup();
            getWrapper();

            screen.getByRole('button', { name: 'First' }).focus();
            await user.keyboard(`{${key}}`);

            expect(onDocumentKeyDown).toHaveBeenCalledTimes(1);
        });
    });
});
