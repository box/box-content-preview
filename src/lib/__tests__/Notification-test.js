/* eslint-disable no-unused-expressions */
import Notification from '../Notification';

const HIDE_TIMEOUT_MS = 5000; // 5s

let notif;
let clock;

const sandbox = sinon.sandbox.create();

describe('lib/Notification', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/Notification-test.html');
        notif = new Notification(document.getElementById('test-notif-container'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        notif = null;
    });

    describe('Notification()', () => {
        it('should have the right classes assigned', () => {
            assert.equal(notif.notificationEl.className, 'bp-notification bp-is-hidden');
        });

        it('shouldn\'t have any message or button text', () => {
            assert.equal(notif.buttonEl.textContext, undefined);
            assert.equal(notif.messageEl.textContext, undefined);
        });

        it('should have the correct parent wrapper', () => {
            assert.notEqual(notif.notificationEl.parentNode, 'undefined');
            assert.equal(notif.notificationEl.parentNode.className, 'bp-notifications-wrapper');
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            sandbox.stub(window, 'setTimeout');
            sandbox.stub(notif, 'hide');
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should properly show the notification', () => {
            notif.show('test', 'test');
            assert.equal(notif.notificationEl.className, 'bp-notification');
        });

        it('should add text to both the button and the message', () => {
            notif.show('test', 'test');
            assert.equal(notif.messageEl.textContent, 'test');
            assert.equal(notif.buttonEl.textContent, 'test');
        });

        it('should not show button text if the notification is hidden and re-shown with no text', () => {
            notif.show('test', 'test');
            notif.hide();
            notif.show('test');
            assert.equal(notif.messageEl.textContent, 'test');
            assert.equal(notif.buttonEl.textContent, __('notification_button_default_text'));
        });

        it('should hide after the timeout', () => {
            notif.show('test', 'test');
            clock.tick(HIDE_TIMEOUT_MS + 1);
            expect(notif.hide).to.be.called;
        });

        it('should not hide after the timeout if the notification is set to persist', () => {
            notif.show('test', 'test', true);
            clock.tick(HIDE_TIMEOUT_MS + 1);
            expect(notif.hide).to.not.be.called;
        });
    });

    describe('hide()', () => {
        it('should be properly hidden', () => {
            notif.hide();
            expect(notif.notificationEl).to.have.class('bp-is-hidden');
        });
    });

    describe('clickHandler()', () => {
        it('should stop propagation of event', () => {
            const event = {
                stopPropagation: sandbox.stub()
            };

            notif.clickHandler(event);

            expect(event.stopPropagation).to.have.been.called;
        });

        it('should hide notification if button is clicked', () => {
            sandbox.stub(notif, 'hide');

            const event = {
                stopPropagation: sandbox.stub(),
                target: notif.notificationEl.querySelector('button')
            };

            notif.clickHandler(event);

            expect(notif.hide).to.have.been.called;
        });
    });
});
