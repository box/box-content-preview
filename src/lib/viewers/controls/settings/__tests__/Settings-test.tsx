import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render } from '@testing-library/react';
import Settings from '../Settings';

describe('Settings', () => {
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}) => render(<Settings {...props} />, { container: getHostNode() });

    describe('event handlers', () => {
        test('should update the flyout and toggle button isOpen prop when clicked', () => {
            const wrapper = getWrapper();

            const settings = wrapper.queryByTitle('Settings');

            expect(wrapper.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).not.toHaveClass('bp-is-open');

            act(() => {
                settings?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).toHaveClass('bp-is-open');
        });

        test.each`
            key             | isFocused
            ${'1'}          | ${false}
            ${'A'}          | ${false}
            ${'ArrowDown'}  | ${true}
            ${'ArrowLeft'}  | ${true}
            ${'ArrowRight'} | ${true}
            ${'ArrowUp'}    | ${true}
            ${'Enter'}      | ${true}
            ${'Space'}      | ${true}
            ${'Tab'}        | ${true}
        `('should update the focused state to $isFocused if $key is pressed', ({ key, isFocused }) => {
            const wrapper = getWrapper();

            expect(wrapper.container.children[0].className.includes('bp-is-focused')).toBe(false);

            act(() => {
                fireEvent.keyDown(wrapper.container.children[0], { key });
            });

            expect(wrapper.container.children[0].className.includes('bp-is-focused')).toBe(isFocused);
        });

        test('should reset the parent context when a click is detected outside the controls', () => {
            const wrapper = getWrapper();

            act(() => {
                wrapper.queryByTitle('Settings')?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');

            act(() => {
                fireEvent.click(document); // Click outside the controls
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            // Re-open the controls
            act(() => {
                wrapper.queryByTitle('Settings')?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');

            act(() => {
                wrapper.queryByTestId('bp-settings-flyout')?.click(); // Click within the controls
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
        });

        test('should stop propagation on all keydown events to prevent triggering global event listeners', () => {
            const mockGlobalOnClick = jest.fn();
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            document.addEventListener('keydown', mockGlobalOnClick);
            const wrapper = getWrapper();

            act(() => {
                fireEvent.keyDown(wrapper.container.children[0], { key: 'Enter' }); // Key is not relevant
            });

            expect(mockGlobalOnClick).not.toHaveBeenCalled();
            document.removeEventListener('keydown', mockGlobalOnClick);
        });
    });

    describe('open/close callbacks', () => {
        test('should call the onOpen callback when the flyout opens', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });

            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).not.toHaveClass('bp-is-open');
            expect(wrapper.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            act(() => {
                wrapper.queryByTitle('Settings')?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();
        });

        test('should call the onClose callback when the flyout closes', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });

            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).not.toHaveClass('bp-is-open');
            expect(wrapper.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');

            act(() => {
                wrapper.queryByTitle('Settings')?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveClass('bp-is-open');

            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();

            act(() => {
                wrapper.queryByTitle('Settings')?.click();
            });

            expect(wrapper.queryByTestId('bp-settings-flyout')).not.toHaveClass('bp-is-open');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        test('should call the onClose callback when the flyout is closed by clicking outside', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });

            act(() => {
                wrapper.queryByTitle('Settings')?.click(); // Open the controls
            });

            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).toHaveClass('bp-is-open');

            act(() => {
                fireEvent.click(document);
            });

            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.container.children[0]).toHaveClass('bp-Settings');
            expect(wrapper.queryByTestId('bp-settings-flyout')).toBeInTheDocument();
            expect(wrapper.queryByTestId('bp-SettingsToggle-container')).toBeInTheDocument();
        });

        describe('flyout dimensions', () => {
            test('should apply activeRect dimensions if present', () => {
                const wrapper = getWrapper();

                act(() => {
                    wrapper.queryByTitle('Settings')?.click();
                });

                expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveStyle('height: auto');
                expect(wrapper.queryByTestId('bp-settings-flyout')).toHaveStyle('width: auto');
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
                const wrapper = getWrapper();

                expect(wrapper.queryByTestId('bp-SettingsToggle-container')).toBeInTheDocument();
            });

            test('should use provided toggle', () => {
                const wrapper = getWrapper({ toggle: CustomToggleWithRef });

                expect(wrapper.queryByTestId('bp-SettingsToggle-container')).not.toBeInTheDocument();
                expect(wrapper.queryByTestId('custom-toggle')).toBeInTheDocument();
            });
        });

        describe('badge prop', () => {
            function CustomBadge(): JSX.Element {
                return <div data-testid="custom-badge">custom</div>;
            }

            test('should not show badge if not provided', () => {
                const wrapper = getWrapper();

                expect(wrapper.queryByTestId('custom-badge')).not.toBeInTheDocument();
            });

            test('should show badge if provided', () => {
                const badge = <CustomBadge />;
                const wrapper = getWrapper({ badge });

                expect(wrapper.queryByTestId('custom-badge')).toBeInTheDocument();
            });
        });
    });
});
