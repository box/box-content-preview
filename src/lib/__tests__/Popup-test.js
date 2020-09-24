/* eslint-disable no-unused-expressions */
import { CLASS_HIDDEN } from '../constants';
import Popup from '../Popup';

let popup;

describe('lib/Popup', () => {
    beforeEach(() => {
        fixture.load('__tests__/Popup-test.html');
        popup = new Popup(document.getElementById('test-popup-container'));
    });

    afterEach(() => {
        fixture.cleanup();

        if (popup && typeof popup.destroy() === 'function') {
            popup.destroy();
        }

        popup = null;
    });

    describe('constructor()', () => {
        test('should have the right classes assigned', () => {
            expect(popup.popupEl.className).toBe('bp-modal-dialog bp-is-hidden');
        });

        test('should have the correct aria attributes', () => {
            expect(popup.popupEl.getAttribute('role')).toBe('alert');
            expect(popup.popupEl.getAttribute('aria-labeledby')).toBeDefined();
        });

        test("shouldn't have any message or button text", () => {
            expect(popup.buttonEl.textContext).toBeUndefined();
            expect(popup.messageEl.textContent).toBe('');
        });

        test('should have the correct parent wrapper', () => {
            expect(popup.popupEl.parentNode).toBeDefined();
            expect(popup.popupEl.parentNode.className).toBe('bp-popup-modal');
        });

        test('should initialize buttonDisabled to false', () => {
            expect(popup.buttonDisabled).toBe(false);
        });
    });

    describe('destroy()', () => {
        test('should do nothing if there is no popup element', () => {
            const removeEventListenerStub = jest.spyOn(document, 'removeEventListener');
            popup.popupEl = undefined;

            popup.destroy();
            expect(removeEventListenerStub).not.toBeCalled();
        });

        test('should remove event listeners', () => {
            const removeEventListenerStub = jest.spyOn(document, 'removeEventListener');
            popup.popupEl = {
                removeEventListener: jest.fn(),
                parentNode: {
                    parentNode: {
                        removeChild: jest.fn(),
                    },
                },
            };
            const popupStub = popup.popupEl.removeEventListener;

            popup.destroy();
            expect(removeEventListenerStub).toBeCalled();
            expect(popupStub).toBeCalled();
        });

        test('should set the popupEl to null', () => {
            popup.destroy();

            expect(popup.popupEl).toBeNull();
        });
    });

    describe('show()', () => {
        test('should set the message element', () => {
            const message = 'message';

            popup.show(message, '', undefined);
            expect(popup.messageEl.textContent).toBe(message);
        });

        test('should set the button text, otherwise use the default value', () => {
            const buttonText = 'button';

            popup.show('message', undefined, undefined);
            expect(popup.buttonEl.textContent).toBe(__('notification_button_default_text'));

            popup.show('message', '', undefined);
            expect(popup.buttonEl.textContent).toBe(__('notification_button_default_text'));

            popup.show('message', buttonText, undefined);
            expect(popup.buttonEl.textContent).toBe(buttonText);
        });

        test('should set the button handler if it exists', () => {
            const handler = () => {}; // eslint-disable-line require-jsdoc

            popup.show('message', 'button', undefined);
            expect(popup.buttonEl.handler).toBeUndefined();

            popup.show('message', 'button', 'handler');
            expect(popup.buttonEl.handler).toBeUndefined();

            popup.show('message', 'button', handler);
            expect(popup.buttonEl.handler).toBe(handler);
        });

        test('should show and focus the popup element', () => {
            const focusStub = jest.spyOn(popup.popupEl, 'focus');

            popup.show('message', 'button', undefined);
            expect(popup.popupEl.classList.contains(CLASS_HIDDEN)).toBe(false);
            expect(focusStub).toBeCalled();
        });
    });

    describe('hide()', () => {
        test('should hide the popup element', () => {
            popup.show('message', 'button', undefined);

            popup.hide();
            expect(popup.popupEl.classList.contains(CLASS_HIDDEN)).toBe(true);
        });
    });

    describe('addContent()', () => {
        const element = 'element';

        test('should insert content before if prepending', () => {
            const insertBeforeStub = jest.spyOn(popup.contentEl, 'insertBefore').mockImplementation();

            popup.addContent(element, true);
            expect(insertBeforeStub).toBeCalledWith(element, popup.contentEl.firstChild);
        });

        test('should insert content after if appending', () => {
            const appendChildStub = jest.spyOn(popup.contentEl, 'appendChild').mockImplementation();

            popup.addContent(element, false);
            expect(appendChildStub).toBeCalledWith(element);
        });
    });

    describe('isVisible()', () => {
        test('should return true if popup is visible', () => {
            popup.popupEl.classList.remove(CLASS_HIDDEN);
            expect(popup.isVisible()).toBe(true);
        });

        test('should return false if popup is hidden', () => {
            popup.popupEl.classList.add(CLASS_HIDDEN);
            expect(popup.isVisible()).toBe(false);
        });
    });

    describe('isButtonDisabled()', () => {
        test('should return true if button is disabled', () => {
            popup.disableButton();
            expect(popup.isButtonDisabled()).toBe(true);
        });

        test('should return false if button is enabled', () => {
            popup.enableButton();
            expect(popup.isButtonDisabled()).toBe(false);
        });
    });

    describe('disableButton()', () => {
        test('set the correct boolean and add the disabled class', () => {
            popup.disableButton();
            expect(popup.buttonDisabled).toBe(true);
            expect(popup.buttonEl.classList.contains('is-disabled')).toBe(true);
        });
    });

    describe('enableButton()', () => {
        test('should set the correct boolean and remove the disabled class', () => {
            popup.enableButton();
            expect(popup.buttonDisabled).toBe(false);
            expect(popup.buttonEl.classList.contains('is-disabled')).toBe(false);
        });
    });

    describe('enableButton()', () => {
        test('should set the correct boolean and remove the disabled class', () => {
            popup.enableButton();
            expect(popup.buttonDisabled).toBe(false);
            expect(popup.buttonEl.classList.contains('is-disabled')).toBe(false);
        });
    });

    describe('popupClickHandler()', () => {
        let event;

        beforeEach(() => {
            popup.hide = jest.spyOn(popup, 'hide');
            event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
        });

        test('should prevent default and stop propagation', () => {
            popup.popupClickHandler(event);

            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should hide the popup if the close button is clicked', () => {
            event.target = popup.closeButtonEl;

            popup.popupClickHandler(event);
            expect(popup.hide).toBeCalled();
        });

        test('should hide the popup if the backdrop is clicked', () => {
            event.target = popup.backdropEl;

            popup.popupClickHandler(event);
            expect(popup.hide).toBeCalled();
        });

        test('should call the button handler if the button is clicked', () => {
            event.target = popup.buttonEl;
            popup.buttonEl.handler = jest.fn();

            popup.popupClickHandler(event);
            expect(popup.buttonEl.handler).toBeCalled();
        });

        test('should not call the button handler if the button is clicked but the button is disabled', () => {
            event.target = popup.buttonEl;
            popup.buttonEl.handler = jest.fn();
            jest.spyOn(popup, 'isButtonDisabled').mockReturnValue(true);

            popup.popupClickHandler(event);
            expect(popup.buttonEl.handler).not.toBeCalled();
        });

        test('should hide the popup if the buttone element is clicked without a handler', () => {
            event.target = popup.buttonEl;

            popup.popupClickHandler(event);
            expect(popup.hide).toBeCalled();
        });
    });

    describe('popupClickHandler()', () => {
        test('should hide the popup and return true if Esc is pressed', () => {
            const event = {
                key: 'Esc',
            };
            const hideStub = jest.spyOn(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).toBeCalled();
            expect(result).toBe(true);
        });

        test('should hide the popup and return true if Escape is pressed', () => {
            const event = {
                key: 'Escape',
            };
            const hideStub = jest.spyOn(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).toBeCalled();
            expect(result).toBe(true);
        });

        test('should do nothing and return false if anything other key is pressed', () => {
            const event = {
                key: 'EscapeNot',
            };
            const hideStub = jest.spyOn(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).not.toBeCalled();
            expect(result).toBe(false);
        });
    });
});
