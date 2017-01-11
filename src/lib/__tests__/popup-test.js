/* eslint-disable no-unused-expressions */
import { CLASS_HIDDEN } from '../constants';
import Popup from '../popup';

let popup;

const sandbox = sinon.sandbox.create();

describe('Popup', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/popup-test.html');
        popup = new Popup(document.getElementById('test-popup-container'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (popup && typeof popup.destroy() === 'function') {
            popup.destroy();
        }

        popup = null;
    });

    describe('constructor()', () => {
        it('should have the right classes assigned', () => {
            expect(popup.popupEl.className).to.equal('bp-modal-dialog bp-is-hidden');
        });

        it('should have the correct aria attributes', () => {
            expect(popup.popupEl.getAttribute('role')).to.equal('alert');
            expect(popup.popupEl.getAttribute('aria-labeledby')).to.not.equal(undefined);
        });

        it('shouldn\'t have any message or button text', () => {
            expect(popup.buttonEl.textContext).to.equal(undefined);
            expect(popup.messageEl.textContent).to.equal('');
        });

        it('should have the correct parent wrapper', () => {
            expect(popup.popupEl.parentNode).to.not.equal(undefined);
            expect(popup.popupEl.parentNode.className).to.equal('bp-popup-modal');
        });

        it('should initialize buttonDisabled to false', () => {
            expect(popup.buttonDisabled).to.be.false;
        });
    });

    describe('destroy()', () => {
        it('should do nothing if there is no popup element', () => {
            const removeEventListenerStub = sandbox.stub(document, 'removeEventListener');
            popup.popupEl = undefined;

            popup.destroy();
            expect(removeEventListenerStub).to.not.be.called;
        });

        it('should remove event listeners', () => {
            const removeEventListenerStub = sandbox.stub(document, 'removeEventListener');
            popup.popupEl = {
                removeEventListener: sandbox.stub(),
                parentNode: {
                    parentNode: {
                        removeChild: sandbox.stub()
                    }
                }
            };
            const popupStub = popup.popupEl.removeEventListener;

            popup.destroy();
            expect(removeEventListenerStub).to.be.called;
            expect(popupStub).to.be.called;
        });

        it('should set the popupEl to null', () => {
            popup.destroy();

            expect(popup.popupEl).to.equal(null);
        });
    });

    describe('show()', () => {
        it('should set the message element', () => {
            const message = 'message';

            popup.show(message, '', undefined);
            expect(popup.messageEl.textContent).to.equal(message);
        });

        it('should set the button text, otherwise use the default value', () => {
            const buttonText = 'button';

            popup.show('message', undefined, undefined);
            expect(popup.buttonEl.textContent).to.equal(__('notification_button_default_text'));

            popup.show('message', '', undefined);
            expect(popup.buttonEl.textContent).to.equal(__('notification_button_default_text'));

            popup.show('message', buttonText, undefined);
            expect(popup.buttonEl.textContent).to.equal(buttonText);
        });

        it('should set the button handler if it exists', () => {
            const handler = () => {};

            popup.show('message', 'button', undefined);
            expect(popup.buttonEl.handler).to.equal(undefined);

            popup.show('message', 'button', 'handler');
            expect(popup.buttonEl.handler).to.equal(undefined);

            popup.show('message', 'button', handler);
            expect(popup.buttonEl.handler).to.equal(handler);
        });

        it('should show and focus the popup element', () => {
            const focusStub = sandbox.stub(popup.popupEl, 'focus');

            popup.show('message', 'button', undefined);
            expect(popup.popupEl.classList.contains(CLASS_HIDDEN)).to.be.false;
            expect(focusStub).to.be.called;
        });
    });

    describe('hide()', () => {
        it('should hide the popup element', () => {
            popup.show('message', 'button', undefined);

            popup.hide();
            expect(popup.popupEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });
    });

    describe('addContent()', () => {
        const element = 'element';

        it('should insert content before if prepending', () => {
            const insertBeforeStub = sandbox.stub(popup.contentEl, 'insertBefore');

            popup.addContent(element, true);
            expect(insertBeforeStub).to.be.calledWith(element, popup.contentEl.firstChild);
        });

        it('should insert content after if appending', () => {
            const appendChildStub = sandbox.stub(popup.contentEl, 'appendChild');

            popup.addContent(element, false);
            expect(appendChildStub).to.be.calledWith(element);
        });
    });

    describe('isVisible()', () => {
        it('should return true if popup is visible', () => {
            popup.popupEl.classList.remove(CLASS_HIDDEN);
            expect(popup.isVisible()).to.be.true;
        });

        it('should return false if popup is hidden', () => {
            popup.popupEl.classList.add(CLASS_HIDDEN);
            expect(popup.isVisible()).to.be.false;
        });
    });

    describe('isButtonDisabled()', () => {
        it('should return true if button is disabled', () => {
            popup.disableButton();
            expect(popup.isButtonDisabled()).to.be.true;
        });

        it('should return false if button is enabled', () => {
            popup.enableButton();
            expect(popup.isButtonDisabled()).to.be.false;
        });
    });

    describe('disableButton()', () => {
        it('set the correct boolean and add the disabled class', () => {
            popup.disableButton();
            expect(popup.buttonDisabled).to.be.true;
            expect(popup.buttonEl.classList.contains('is-disabled')).to.be.true;
        });
    });

    describe('enableButton()', () => {
        it('should set the correct boolean and remove the disabled class', () => {
            popup.enableButton();
            expect(popup.buttonDisabled).to.be.false;
            expect(popup.buttonEl.classList.contains('is-disabled')).to.be.false;
        });
    });

    describe('enableButton()', () => {
        it('should set the correct boolean and remove the disabled class', () => {
            popup.enableButton();
            expect(popup.buttonDisabled).to.be.false;
            expect(popup.buttonEl.classList.contains('is-disabled')).to.be.false;
        });
    });

    describe('popupClickHandler()', () => {
        let event;

        beforeEach(() => {
            popup.hide = sandbox.stub(popup, 'hide');
            event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
        });

        it('should prevent default and stop propagation', () => {
            popup.popupClickHandler(event);

            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should hide the popup if the close button is clicked', () => {
            event.target = popup.closeButtonEl;

            popup.popupClickHandler(event);
            expect(popup.hide).to.be.called;
        });

        it('should hide the popup if the backdrop is clicked', () => {
            event.target = popup.backdropEl;

            popup.popupClickHandler(event);
            expect(popup.hide).to.be.called;
        });

        it('should call the button handler if the button is clicked', () => {
            event.target = popup.buttonEl;
            popup.buttonEl.handler = sandbox.stub();

            popup.popupClickHandler(event);
            expect(popup.buttonEl.handler).to.be.called;
        });

        it('should not call the button handler if the button is clicked but the button is disabled', () => {
            event.target = popup.buttonEl;
            popup.buttonEl.handler = sandbox.stub();
            sandbox.stub(popup, 'isButtonDisabled').returns(true);

            popup.popupClickHandler(event);
            expect(popup.buttonEl.handler).to.not.be.called;
        });

        it('should hide the popup if the buttone element is clicked without a handler', () => {
            event.target = popup.buttonEl;

            popup.popupClickHandler(event);
            expect(popup.hide).to.be.called;
        });
    });

    describe('popupClickHandler()', () => {
        it('should hide the popup and return true if Esc is pressed', () => {
            const event = {
                key: 'Esc'
            };
            const hideStub = sandbox.stub(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).to.be.called;
            expect(result).to.be.true;
        });

        it('should hide the popup and return true if Escape is pressed', () => {
            const event = {
                key: 'Escape'
            };
            const hideStub = sandbox.stub(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).to.be.called;
            expect(result).to.be.true;
        });

        it('should do nothing and return false if anything other key is pressed', () => {
            const event = {
                key: 'EscapeNot'
            };
            const hideStub = sandbox.stub(popup, 'hide');

            const result = popup.keydownHandler(event);
            expect(hideStub).to.be.not.called;
            expect(result).to.be.false;
        });
    });
});
