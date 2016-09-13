/* eslint-disable no-unused-expressions */
import Controls from '../controls';
import { CLASS_HIDDEN } from './../constants';

let controls;
let clock;

const sandbox = sinon.sandbox.create();

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';

describe('controls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/controls-test.html');
        controls = new Controls(document.getElementById('test-controls-container'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
            expect(controls.containerEl).to.equal(document.getElementById('test-controls-container'));

            expect(controls.controlsWrapperEl.parentNode).to.equal(controls.containerEl);
            expect(controls.controlsWrapperEl.classList.contains('box-preview-controls-wrapper')).to.true;

            expect(controls.controlsEl.parentNode).to.equal(controls.controlsWrapperEl);
            expect(controls.controlsEl.classList.contains('box-preview-controls')).to.true;
        });
    });

    describe('destroy()', () => {
        it('should remove the correct event listeners', () => {
            const containerElEventListener = sandbox.stub(controls.containerEl, 'removeEventListener');
            const controlsElEventListener = sandbox.stub(controls.controlsEl, 'removeEventListener');

            controls.destroy();
            expect(containerElEventListener).to.be.calledWith('mousemove', controls.mousemoveHandler);
            expect(controlsElEventListener).to.be.calledWith('mouseenter', controls.mouseenterHandler);
            expect(controlsElEventListener).to.be.calledWith('mouseleave', controls.mouseleaveHandler);
            expect(controlsElEventListener).to.be.calledWith('focusin', controls.focusinHandler);
            expect(controlsElEventListener).to.be.calledWith('focusout', controls.focusoutHandler);
        });

        it('should remove click listeners for any button references', () => {
            const button1 = { button:
                                { removeEventListener: sandbox.stub() },
                                handler: 'handler' };
            const button2 = { button:
                                { removeEventListener: sandbox.stub() },
                                handler: 'handler' };
            controls.buttonRefs = [button1, button2];

            controls.destroy();
            expect(button1.button.removeEventListener).to.be.calledWith('click', 'handler');
            expect(button2.button.removeEventListener).to.be.calledWith('click', 'handler');
        });
    });

    describe('isPreviewControlButton()', () => {
        it('should determine whether the element is a preview control button', () => {
            let element = null;
            expect(controls.isPreviewControlButton(element)).to.be.false;

            element = document.createElement('div');
            element.className = 'box-preview-controls-btn';
            expect(controls.isPreviewControlButton(element)).to.be.true;

            element.className = '';
            expect(controls.isPreviewControlButton(element)).to.be.false;
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
            clock.tick(1501);

            expect(clearTimeoutStub).to.be.calledTwice;
        });

        it('should call resetTimeout again if block hiding is true', () => {
            controls.blockHiding = true;
            controls.resetTimeout();

            const resetTimeoutStub = sandbox.stub(controls, 'resetTimeout');
            clock.tick(1501);

            expect(resetTimeoutStub).to.be.called;
        });

        it('should not remove the preview controls class if block hiding is true', () => {
            controls.blockHiding = true;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(1501);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should remove the preview controls class if block hiding is false', () => {
            controls.blockHiding = false;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(1501);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
        });

        it('should blur the controls if they are active', () => {
            controls.blockHiding = false;
            const containsStub = sandbox.stub(controls.controlsEl, 'contains').returns(true);
            const blurStub = sandbox.stub(document.activeElement, 'blur');


            controls.resetTimeout();
            clock.tick(1501);

            expect(containsStub).to.be.called;
            expect(blurStub).to.be.called;
        });
    });

    describe('mouseenterHandler()', () => {
        it('should make block hiding true', () => {
            controls.mouseenterHandler();

            expect(controls.blockHiding).to.be.true;
        });
    });

    describe('mouseleaveHandler()', () => {
        it('should make block hiding false', () => {
            controls.mouseleaveHandler();

            expect(controls.blockHiding).to.be.false;
        });
    });

    describe('focusinHandler()', () => {
        it('should add the controls class if the element is a preview control button', () => {
            const isControlButtonStub = sandbox.stub(controls, 'isPreviewControlButton').returns(true);

            controls.focusinHandler('event');
            expect(isControlButtonStub).to.be.called;
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
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
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
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
