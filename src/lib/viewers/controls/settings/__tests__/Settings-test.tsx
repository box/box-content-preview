import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import Settings from '../Settings';
import SettingsGearToggle from '../SettingsToggle';
import SettingsFlyout from '../SettingsFlyout';

describe('Settings', () => {
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}): ReactWrapper => mount(<Settings {...props} />, { attachTo: getHostNode() });

    describe('event handlers', () => {
        test('should update the flyout and toggle button isOpen prop when clicked', () => {
            const wrapper = getWrapper();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(false);

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(true);
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

            expect(wrapper.childAt(0).hasClass('bp-is-focused')).toBe(false);

            act(() => {
                wrapper.simulate('keydown', { key });
            });
            wrapper.update();

            expect(wrapper.childAt(0).hasClass('bp-is-focused')).toBe(isFocused);
        });

        test('should reset the parent context when a click is detected outside the controls', () => {
            const wrapper = getWrapper();
            const getEvent = (target: HTMLElement): MouseEvent => {
                const event = new MouseEvent('click');
                Object.defineProperty(event, 'target', { enumerable: true, value: target });
                return event;
            };

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(true);

            act(() => {
                document.dispatchEvent(getEvent(document.body)); // Click outside the controls
            });
            wrapper.update();
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(false);

            // Re-open the controls
            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(true);

            wrapper.find(SettingsFlyout).simulate('click'); // Click within the controls
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(true);
        });

        test('should stop propagation on all keydown events to prevent triggering global event listeners', () => {
            const wrapper = getWrapper();
            const event = { stopPropagation: jest.fn() }; // Key is not relevant

            act(() => {
                wrapper.simulate('keydown', event);
            });
            wrapper.update();

            expect(event.stopPropagation).toBeCalled();
        });
    });

    describe('open/close callbacks', () => {
        test('should call the onOpen callback when the flyout opens', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(false);

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(onOpen).toBeCalledTimes(1);
            expect(onClose).not.toBeCalled();
        });

        test('should call the onClose callback when the flyout closes', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(false);

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(onOpen).toBeCalledTimes(1);
            expect(onClose).not.toBeCalled();

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(onOpen).toBeCalledTimes(1);
            expect(onClose).toBeCalledTimes(1);
        });

        test('should call the onClose callback when the flyout is closed by clicking outside', () => {
            const onClose = jest.fn();
            const onOpen = jest.fn();
            const wrapper = getWrapper({ onClose, onOpen });
            const getEvent = (target: HTMLElement): MouseEvent => {
                const event = new MouseEvent('click');
                Object.defineProperty(event, 'target', { enumerable: true, value: target });
                return event;
            };

            act(() => {
                wrapper.find(SettingsGearToggle).prop('onClick')();
            });
            wrapper.update(); // Open the controls
            expect(wrapper.find(SettingsGearToggle).prop('isOpen')).toBe(true);

            act(() => {
                document.dispatchEvent(getEvent(document.body)); // Click outside the controls
            });
            wrapper.update();

            expect(onOpen).toBeCalledTimes(1);
            expect(onClose).toBeCalledTimes(1);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-Settings');
            expect(wrapper.exists(SettingsFlyout)).toBe(true);
            expect(wrapper.exists(SettingsGearToggle)).toBe(true);
        });

        describe('flyout dimensions', () => {
            test('should apply activeRect dimensions if present', () => {
                const wrapper = getWrapper();

                act(() => {
                    wrapper.find(SettingsGearToggle).prop('onClick')();
                });
                wrapper.update();

                expect(wrapper.find(SettingsFlyout).prop('height')).toBe('auto');
                expect(wrapper.find(SettingsFlyout).prop('width')).toBe('auto');
            });
        });

        describe('toggle prop', () => {
            function CustomToggle(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                { isOpen, ...rest }: { isOpen: boolean; onClick: () => void },
                ref: React.Ref<HTMLButtonElement>,
            ): JSX.Element {
                return <button ref={ref} className="custom-toggle" type="button" {...rest} />;
            }

            const CustomToggleWithRef = React.forwardRef(CustomToggle);

            test('should default to SettingsGearToggle toggle', () => {
                const wrapper = getWrapper();

                expect(wrapper.exists(SettingsGearToggle)).toBe(true);
            });

            test('should use provided toggle', () => {
                const wrapper = getWrapper({ toggle: CustomToggleWithRef });

                expect(wrapper.exists(SettingsGearToggle)).toBe(false);
                expect(wrapper.exists(CustomToggleWithRef)).toBe(true);
            });
        });

        describe('badge prop', () => {
            function CustomBadge(): JSX.Element {
                return <div className="custom-badge">custom</div>;
            }

            test('should not show badge if not provided', () => {
                const wrapper = getWrapper();

                expect(wrapper.exists('.bp-Settings-toggleBadge')).toBe(false);
            });

            test('should show badge if provided', () => {
                const badge = <CustomBadge />;
                const wrapper = getWrapper({ badge });
                expect(wrapper.exists('CustomBadge')).toBe(true);
            });
        });
    });
});
