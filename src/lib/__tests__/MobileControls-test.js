/* eslint-disable no-unused-expressions */
import MobileControls from '../MobileControls';

let mobileControls;
let stubs;

const sandbox = sinon.sandbox.create();

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';

describe('lib/Controls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/MobileControls-test.html');
        mobileControls = new MobileControls(document.getElementById('test-controls-container'));
        stubs = {};
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (mobileControls && typeof mobileControls.destroy === 'function') {
            mobileControls.destroy();
        }

        mobileControls = null;
        stubs = null;
    });

    describe('destroy()', () => {
        it('should remove the correct event listeners', () => {
            stubs.removeContainerElListener = sandbox.stub(mobileControls.containerEl, 'removeEventListener');
            stubs.removeControlsElListener = sandbox.stub(mobileControls.controlsEl, 'removeEventListener');

            mobileControls.destroy();
            expect(stubs.removeContainerElListener).to.be.calledWith('touchstart', mobileControls.mousemoveHandler);
            expect(stubs.removeContainerElListener).to.be.calledWith('touchmove', mobileControls.mousemoveHandler);
            expect(stubs.removeControlsElListener).to.be.calledWith('click', mobileControls.clickHandler);
        });
    });

    describe('bindControlListeners()', () => {
        it('should add the correct event listeners', () => {
            stubs.addContainerElListener = sandbox.stub(mobileControls.containerEl, 'addEventListener');
            stubs.addControlsElListener = sandbox.stub(mobileControls.controlsEl, 'addEventListener');

            mobileControls.bindControlListeners();
            expect(stubs.addContainerElListener).to.be.calledWith('touchstart', mobileControls.mousemoveHandler);
            expect(stubs.addContainerElListener).to.be.calledWith('touchmove', mobileControls.mousemoveHandler);
            expect(stubs.addControlsElListener).to.be.calledWith('click', mobileControls.clickHandler);
        });
    });

    describe('focusinHandler()', () => {
        beforeEach(() => {
            stubs.isControl = sandbox.stub(mobileControls, 'isPreviewControlButton').returns(true);
        });

        it('should add the controls class and block hiding if the element is a preview control button', () => {
            mobileControls.focusinHandler('event');
            expect(stubs.isControl).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
            expect(mobileControls.blockHiding).to.be.true;
        });

        it('should not add the controls class if the element is not a preview control button', () => {
            stubs.isControl.returns(false);

            mobileControls.focusinHandler('event');
            expect(stubs.isControl).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
        });
    });

    describe('focusoutHandler()', () => {
        beforeEach(() => {
            mobileControls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            stubs.isControlButton = sandbox.stub(mobileControls, 'isPreviewControlButton');
        });
        it('should remove the controls class and unblock hiding if the element is a preview control button and the related target is not', () => {
            stubs.isControlButton.onCall(0).returns(true);
            stubs.isControlButton.onCall(1).returns(false);

            mobileControls.focusoutHandler('event');
            expect(stubs.isControlButton).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.false;
            expect(mobileControls.blockHiding).to.be.false;
        });

        it('should not remove the controls class if the element is not a preview control button and the related target is not', () => {
            stubs.isControlButton.onCall(0).returns(false);
            stubs.isControlButton.onCall(1).returns(false);

            mobileControls.focusoutHandler('event');
            expect(stubs.isControlButton).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should not remove the controls class if the element is a preview control button and the related target is', () => {
            stubs.isControlButton.onCall(0).returns(true);
            stubs.isControlButton.onCall(1).returns(true);

            mobileControls.focusoutHandler('event');
            expect(stubs.isControlButton).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });

        it('should not remove the controls class if the element is a preview control button and the related target is', () => {
            stubs.isControlButton.onCall(0).returns(false);
            stubs.isControlButton.onCall(1).returns(true);

            mobileControls.focusoutHandler('event');
            expect(stubs.isControlButton).to.be.called;
            expect(mobileControls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).to.be.true;
        });
    });

    describe('clickHandler()', () => {
        it('should prevent default and stop propagation', () => {
            const event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            mobileControls.clickHandler(event);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });
    });
});
