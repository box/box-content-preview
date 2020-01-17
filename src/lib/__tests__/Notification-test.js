/* eslint-disable no-unused-expressions */
import Notification from '../Notification';

const HIDE_TIMEOUT_MS = 5000; // 5s

let notif;

describe('lib/Notification', () => {
    beforeEach(() => {
        fixture.load('__tests__/Notification-test.html');
        notif = new Notification(document.getElementById('test-notif-container'));
    });

    afterEach(() => {
        fixture.cleanup();

        notif = null;
    });

    describe('Notification()', () => {
        test('should have the right classes assigned', () => {
            expect(notif.notificationEl.className).toEqual('bp-notification bp-is-hidden');
        });

        test("shouldn't have any message or button text", () => {
            expect(notif.buttonEl.textContext).toEqual(undefined);
            expect(notif.messageEl.textContext).toEqual(undefined);
        });

        test('should have the correct parent wrapper', () => {
            expect(notif.notificationEl.parentNode).not.toEqual('undefined');
            expect(notif.notificationEl.parentNode.className).toEqual('bp-notifications-wrapper');
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            jest.spyOn(window, 'setTimeout');
            jest.spyOn(notif, 'hide');
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
        });

        test('should properly show the notification', () => {
            notif.show('test', 'test');
            expect(notif.notificationEl.className).toEqual('bp-notification');
        });

        test('should add text to both the button and the message', () => {
            notif.show('test', 'test');
            expect(notif.messageEl.textContent).toEqual('test');
            expect(notif.buttonEl.textContent).toEqual('test');
        });

        test('should not show button text if the notification is hidden and re-shown with no text', () => {
            notif.show('test', 'test');
            notif.hide();
            notif.show('test');
            expect(notif.messageEl.textContent).toEqual('test');
            expect(notif.buttonEl.children[0].nodeName).toEqual('svg');
        });

        test('should hide after the timeout', () => {
            notif.show('test', 'test');
            jest.advanceTimersByTime(HIDE_TIMEOUT_MS + 1);
            expect(notif.hide).toBeCalled();
        });

        test('should not hide after the timeout if the notification is set to persist', () => {
            notif.show('test', 'test', true);
            jest.advanceTimersByTime(HIDE_TIMEOUT_MS + 1);
            expect(notif.hide).not.toBeCalled();
        });
    });

    describe('hide()', () => {
        test('should be properly hidden', () => {
            notif.hide();
            expect(notif.notificationEl).toHaveClass('bp-is-hidden');
        });
    });

    describe('clickHandler()', () => {
        test('should stop propagation of event', () => {
            const event = {
                stopPropagation: jest.fn(),
            };

            notif.clickHandler(event);

            expect(event.stopPropagation).toBeCalled();
        });

        test('should hide notification if button is clicked', () => {
            jest.spyOn(notif, 'hide');

            const event = {
                stopPropagation: jest.fn(),
                target: notif.notificationEl.querySelector('button'),
            };

            notif.clickHandler(event);

            expect(notif.hide).toBeCalled();
        });
    });
});
