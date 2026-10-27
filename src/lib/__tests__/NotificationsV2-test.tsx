import { act, fireEvent, screen, within } from '@testing-library/react';
import { NotificationsV2Root } from '../NotificationsV2';

describe('NotificationsV2Root', () => {
    let containerEl: HTMLElement;
    let notifications: NotificationsV2Root;

    const show = (...args: Parameters<NotificationsV2Root['show']>): void => act(() => notifications.show(...args));

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        act(() => {
            notifications = new NotificationsV2Root(containerEl);
        });
    });

    afterEach(() => {
        act(() => notifications.destroy());
        containerEl.remove();
        jest.useRealTimers();
    });

    test('should mount its host and notifications region inside the container', () => {
        expect(containerEl).toContainElement(notifications.hostEl);
        expect(within(notifications.hostEl).getByRole('region')).toHaveAccessibleName(/Notifications/);
    });

    test('should show the message with an info icon and a close button by default', () => {
        show('message');

        expect(screen.getByText('message')).toBeInTheDocument();
        expect(screen.getByLabelText(__('notification_icon_info'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: __('notification_button_default_label') })).toBeInTheDocument();
    });

    test.each`
        variant      | label
        ${'error'}   | ${'notification_icon_error'}
        ${'success'} | ${'notification_icon_success'}
        ${'warning'} | ${'notification_icon_warning'}
    `('should label the $variant icon', ({ label, variant }) => {
        show('message', null, false, variant);

        expect(screen.getByLabelText(__(label))).toBeInTheDocument();
    });

    test('should stack notifications instead of replacing them', () => {
        show('first');
        show('second');

        expect(screen.getByText('first')).toBeInTheDocument();
        expect(screen.getByText('second')).toBeInTheDocument();
    });

    test('should dismiss a notification after 5 seconds', () => {
        jest.useFakeTimers();
        show('message');

        act(() => jest.advanceTimersByTime(4999));
        expect(screen.getByText('message')).toBeInTheDocument();

        act(() => jest.advanceTimersByTime(1));
        expect(screen.queryByText('message')).not.toBeInTheDocument();
    });

    // fireEvent: Radix swipe handling needs pointer capture, which jsdom lacks.
    test('should keep a persisted notification until it is dismissed', () => {
        jest.useFakeTimers();
        show('message', null, true);

        act(() => jest.advanceTimersByTime(60000));
        expect(screen.getByText('message')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: __('notification_button_default_label') }));
        expect(screen.queryByText('message')).not.toBeInTheDocument();
    });

    test('should dismiss the notification from its action button', () => {
        show('message', 'Okay', true);

        fireEvent.click(screen.getByRole('button', { name: 'Okay' }));

        expect(screen.queryByText('message')).not.toBeInTheDocument();
    });

    test('should hide every notification', () => {
        show('first', null, true);
        show('second');

        act(() => notifications.hide());

        expect(screen.queryByText('first')).not.toBeInTheDocument();
        expect(screen.queryByText('second')).not.toBeInTheDocument();
    });

    test('should replay calls made before the provider mounts', () => {
        let early: NotificationsV2Root;
        act(() => {
            early = new NotificationsV2Root(containerEl);
            early.show('early');
        });

        expect(screen.getByText('early')).toBeInTheDocument();
        act(() => early.destroy());
    });

    test('should remove its host and ignore calls after destroy', () => {
        const { hostEl } = notifications;
        act(() => notifications.destroy());

        expect(containerEl).not.toContainElement(hostEl);
        expect(() => show('message')).not.toThrow();
        expect(screen.queryByText('message')).not.toBeInTheDocument();
    });
});
