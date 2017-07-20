/* eslint-disable no-unused-expressions */
import Controls from '../Controls';
import { CLASS_HIDDEN } from './../constants';

let controls;
let clock;

const sandbox = sinon.sandbox.create();

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const RESET_TIMEOUT_CLOCK_TICK = 2001;

describe('lib/Controls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/Controls-test.html');
        controls = new Controls(document.getElementById('test-controls-container'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
            expect(controls.containerEl).to.equal(document.getElementById('test-controls-container'));

            const controlsWrapperEl = controls.controlsEl.parentNode;
            expect(controlsWrapperEl.parentNode).to.equal(controls.containerEl);
            expect(controlsWrapperEl.classList.contains('bp-controls-wrapper')).to.true;

            expect(controls.controlsEl.parentNode).to.equal(controlsWrapperEl);
            expect(controls.controlsEl.classList.contains('bp-controls')).to.true;
        });
    });

    describe('destroy()', () => {
        it('should remove the correct event listeners', () => {
            const containerElEventListener = sandbox.stub(controls.containerEl, 'removeEventListener');
            const controlsElEventListener = sandbox.stub(controls.controlsEl, 'removeEventListener');
            controls.hasTouch = true;

            controls.destroy();
            expect(containerElEventListener).to.be.calledWith('mousemove', controls.mousemoveHandler);
            expect(containerElEventListener).to.be.calledWith('touchstart', controls.mousemoveHandler);
            expect(controlsElEventListener).to.be.calledWith('mouseenter', controls.mouseenterHandler);
            expect(controlsElEventListener).to.be.calledWith('mouseleave', controls.mouseleaveHandler);
            expect(controlsElEventListener).to.be.calledWith('focusin', controls.focusinHandler);
            expect(controlsElEventListener).to.be.calledWith('focusout', controls.focusoutHandler);
            expect(controlsElEventListener).to.be.calledWith('click', controls.clickHandler);
        });

        it('should remove click listeners for any button references', () => {
            const button1 = {
                button: { removeEventListener: sandbox.stub() },
                handler: 'handler'
            };
            const button2 = {
                button: { removeEventListener: sandbox.stub() },
                handler: 'handler'
            };
            controls.buttonRefs = [button1, button2];

            controls.destroy();
            expect(button1.button.removeEventListener).to.be.calledWith('click', 'handler');
            expect(button2.button.removeEventListener).to.be.calledWith('click', 'handler');
        });
    });

    describe('isPreviewControlButton()', () => {
        it('should determine whether the element is a preview control button', () => {
            let parent = null;
            let element = null;
            expect(controls.isPreviewControlButton(element)).to.be.false;

            parent = document.createElement('div');
            element = document.createElement('div');
            element.className = 'bp-controls-btn';
            parent.appendChild(element);

            expect(controls.isPreviewControlButton(element)).to.be.true;

            element.className = '';
            expect(controls.isPreviewControlButton(element)).to.be.false;

            parent.className = 'bp-doc-page-num-wrapper';
            expect(controls.isPreviewControlButton(element)).to.be.true;
        });
    });

    describe('resetTimeout()', () => {
        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should clear the timeout of the control display timeout Id', () => {
            const clearTimeoutStub = sandbox.stub(window, 'clearTimeout');

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(clearTimeoutStub).to.be.calledTwice;
        });

        it('should call resetTimeout again if should hide is false', () => {
            controls.shouldHide = false;
            controls.resetTimeout();

            const resetTimeoutStub = sandbox.stub(controls, 'resetTimeout');
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(resetTimeoutStub).to.be.called;
        });

        it('should call resetTimeout again if the page number input is focused', () => {
            controls.shouldHide = true;
            const isPageNumFocusedStub = sandbox.stub(controls, 'isPageNumFocused').returns(true);
            controls.resetTimeout();

            const resetTimeoutStub = sandbox.stub(controls, 'resetTimeout');
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(isPageNumFocusedStub).to.be.called;
            expect(resetTimeoutStub).to.be.called;
        });

        it('should not remove the preview controls class if should hide is false', () => {
            controls.shouldHide = false;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should remove the preview controls class if should hide is true', () => {
            controls.shouldHide = true;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
        });

        it('should blur the controls if they are active', () => {
            controls.shouldHide = true;
            const containsStub = sandbox.stub(controls.controlsEl, 'contains').returns(true);
            const blurStub = sandbox.stub(document.activeElement, 'blur');

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(containsStub).to.be.called;
            expect(blurStub).to.be.called;
        });
    });

    describe('mouseenterHandler()', () => {
        it('should make block hiding true', () => {
            controls.mouseenterHandler();

            expect(controls.shouldHide).to.be.false;
        });
    });

    describe('mouseleaveHandler()', () => {
        it('should make block hiding false', () => {
            controls.mouseleaveHandler();

            expect(controls.shouldHide).to.be.true;
        });
    });

    describe('focusinHandler()', () => {
        it('should add the controls class, block hiding if the element is a preview control button', () => {
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton').returns(true);

            controls.focusinHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
            expect(controls.shouldHide).to.be.false;
        });

        it('should not add the controls class if the element is not a preview control button', () => {
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton').returns(false);

            controls.focusinHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
        });
    });

    describe('focusoutHandler()', () => {
        it('should remove the controls class if the element is a preview control button and the related target is not', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton');
            isControlButtonStub.onCall(0).returns(true);
            isControlButtonStub.onCall(1).returns(false);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.shouldHide).to.be.true;
        });

        it('should not remove the controls class if the element is not a preview control button and the related target is not', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton');
            isControlButtonStub.onCall(0).returns(false);
            isControlButtonStub.onCall(1).returns(false);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should not remove the controls class if the element is a preview control button and the related target is', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton');
            isControlButtonStub.onCall(0).returns(true);
            isControlButtonStub.onCall(1).returns(true);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should not remove the controls class if the element is  a preview control button and the related target is', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton');
            isControlButtonStub.onCall(0).returns(false);
            isControlButtonStub.onCall(1).returns(true);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });
    });

    describe('clickHandler()', () => {
        it('should stop block hiding', () => {
            controls.clickHandler(event);
            expect(controls.shouldHide).to.be.true;
        });
    });

    describe('add()', () => {
        it('should create a button with the right attributes', () => {
            const btn = controls.add('test button', sandbox.stub(), 'test1', 'test content');
            expect(btn.attributes.title.value).to.equal('test button');
            expect(btn.attributes['aria-label'].value).to.equal('test button');
            expect(btn.classList.contains('test1')).to.be.true;
            expect(btn.innerHTML).to.equal('test content');
            expect(btn.parentNode.parentNode).to.equal(controls.controlsEl);
        });
    });

    describe('enable()', () => {
        it('should unhide the controls', () => {
            controls.controlsEl.className = CLASS_HIDDEN;
            controls.enable();

            expect(controls.controlsEl.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('disable()', () => {
        it('should hide the controls', () => {
            controls.disable();

            expect(controls.controlsEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });
    });
});
