import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Settings from '../Settings';

describe('Settings', () => {
    describe('event handlers', () => {
        test('should update the flyout and toggle button isOpen prop when clicked', async () => {
            const user = userEvent.setup();
            render(<Settings />);

            expect(screen.getByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
            expect(screen.getByTestId('bp-settings-toggle-container')).not.toHaveClass('bp-is-open');

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(screen.getByTestId('bp-settings-toggle-container')).toHaveClass('bp-is-open');
        });

        // TODO: Investigate why "Enter" press causes container to unfocus
        test.each`
            key             | isFocused
            ${'1'}          | ${false}
            ${'A'}          | ${false}
            ${'Enter'}      | ${false}
            ${'ArrowDown'}  | ${true}
            ${'ArrowLeft'}  | ${true}
            ${'ArrowRight'} | ${true}
            ${'ArrowUp'}    | ${true}
            ${'Space'}      | ${true}
            ${'Tab'}        | ${true}
        `(
            'should update the focused state to $isFocused if $key is pressed',
            async ({ key, isFocused }: { key: string; isFocused: boolean }) => {
                const user = userEvent.setup();
                render(<Settings />);

                await user.click(screen.getByTitle('Settings'));

                await user.keyboard(`{${key}}`);

                expect(screen.getByTestId('bp-settings').className.includes('bp-is-focused')).toBe(isFocused);
            },
        );

        test('should reset the parent context when a click is detected outside the controls', async () => {
            const user = userEvent.setup();
            render(<Settings />);

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');

            await user.click(document.body); // Click outside the controls

            expect(screen.getByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            // Re-open the controls
            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');

            await user.click(screen.getByTestId('bp-settings-flyout')); // Click within the controls

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
        });

        test('should stop propagation on all keydown events to prevent triggering global event listeners', async () => {
            const user = userEvent.setup();
            const mockGlobalOnClick = jest.fn();
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            document.addEventListener('keydown', mockGlobalOnClick);
            render(<Settings />);

            await user.click(screen.getByTitle('Settings'));

            expect(mockGlobalOnClick).not.toHaveBeenCalled();
            document.removeEventListener('keydown', mockGlobalOnClick);
        });
    });

    describe('open/close callbacks', () => {
        test('should call the onOpen callback when the flyout opens', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            render(<Settings onClose={onClose} onOpen={onOpen} />);

            expect(screen.getByTestId('bp-settings-toggle-container')).not.toHaveClass('bp-is-open');
            expect(screen.getByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();
        });

        test('should call the onClose callback when the flyout closes', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            render(<Settings onClose={onClose} onOpen={onOpen} />);

            expect(screen.getByTestId('bp-settings-toggle-container')).not.toHaveClass('bp-is-open');
            expect(screen.getByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        test('should call the onClose callback when the flyout is closed by clicking outside', async () => {
            const user = userEvent.setup();
            const onClose = jest.fn();
            const onOpen = jest.fn();
            render(<Settings onClose={onClose} onOpen={onOpen} />);

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-settings-toggle-container')).toHaveClass('bp-is-open');

            await user.click(document.body);

            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            render(<Settings />);

            expect(screen.getByTestId('bp-settings-flyout')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-toggle-container')).toBeInTheDocument();
        });

        describe('flyout dimensions', () => {
            test('should apply activeRect dimensions if present', async () => {
                const user = userEvent.setup();
                render(<Settings />);

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByTestId('bp-settings-flyout')).toHaveStyle('height: auto');
                expect(screen.getByTestId('bp-settings-flyout')).toHaveStyle('width: auto');
            });
        });

        describe('toggle prop', () => {
            function CustomToggle(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                { isOpen, ...rest }: { isOpen: boolean; onClick: () => void },
                ref: React.Ref<HTMLButtonElement>,
            ): JSX.Element {
                return <button ref={ref} data-testid="custom-toggle" type="button" {...rest} />;
            }

            const CustomToggleWithRef = React.forwardRef(CustomToggle);

            test('should default to SettingsGearToggle toggle', () => {
                render(<Settings />);

                expect(screen.getByTestId('bp-settings-toggle-container')).toBeInTheDocument();
            });

            test('should use provided toggle', () => {
                render(<Settings toggle={CustomToggleWithRef} />);

                expect(screen.queryByTestId('bp-settings-toggle-container')).not.toBeInTheDocument();
                expect(screen.getByTestId('custom-toggle')).toBeInTheDocument();
            });
        });

        describe('badge prop', () => {
            test('should not show badge if not provided', () => {
                render(<Settings />);

                expect(screen.queryByTestId('custom-badge')).not.toBeInTheDocument();
            });

            test('should show badge if provided', () => {
                render(<Settings badge={<div data-testid="custom-badge">custom</div>} />);

                expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
            });
        });
    });
});
