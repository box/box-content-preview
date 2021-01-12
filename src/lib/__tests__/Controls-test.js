/* eslint-disable no-unused-expressions */
import Browser from '../Browser';
import Controls from '../Controls';
import { CLASS_HIDDEN } from '../constants';

let controls;
let clock;

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const RESET_TIMEOUT_CLOCK_TICK = 2001;

describe('lib/Controls', () => {
    beforeEach(() => {
        fixture.load('__tests__/Controls-test.html');
        controls = new Controls(document.getElementById('test-controls-container'));
    });

    afterEach(() => {
        fixture.cleanup();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
    });

    describe('constructor()', () => {
        let container;
        let containerElEventListener;
        let controlsElEventListener;

        beforeEach(() => {
            const controlElement = document.createElement('div');
            container = document.getElementById('test-controls-container');
            containerElEventListener = jest.spyOn(container, 'addEventListener');
            controlsElEventListener = jest.spyOn(controlElement, 'addEventListener');

            jest.spyOn(container, 'appendChild').mockReturnValue(controlElement);
        });

        afterEach(() => {
            container = undefined;
            containerElEventListener = undefined;
            controlsElEventListener = undefined;
        });

        test('should create the correct DOM structure', () => {
            expect(controls.containerEl).toEqual(document.getElementById('test-controls-container'));

            expect(controls.controlsEl.classList.contains('bp-controls')).toBe(true);
        });

        test('should add the correct event listeners', () => {
            jest.spyOn(Browser, 'hasTouch').mockReturnValue(false);
            controls = new Controls(container);

            expect(containerElEventListener).toBeCalledWith('mousemove', controls.mousemoveHandler);
            expect(controlsElEventListener).toBeCalledWith('mouseenter', controls.mouseenterHandler);
            expect(controlsElEventListener).toBeCalledWith('mouseleave', controls.mouseleaveHandler);
            expect(controlsElEventListener).toBeCalledWith('focusin', controls.focusinHandler);
            expect(controlsElEventListener).toBeCalledWith('focusout', controls.focusoutHandler);
            expect(controlsElEventListener).toBeCalledWith('click', controls.clickHandler);
        });

        test('should add the correct event listeners when browser has touch', () => {
            jest.spyOn(Browser, 'hasTouch').mockReturnValue(true);
            controls = new Controls(container);

            expect(containerElEventListener).toBeCalledWith('touchstart', controls.mousemoveHandler);
        });
    });

    describe('destroy()', () => {
        test('should remove the correct event listeners', () => {
            const containerElEventListener = jest.spyOn(controls.containerEl, 'removeEventListener');
            const controlsElEventListener = jest.spyOn(controls.controlsEl, 'removeEventListener');
            controls.hasTouch = true;

            controls.destroy();
            expect(containerElEventListener).toBeCalledWith('mousemove', controls.mousemoveHandler);
            expect(containerElEventListener).toBeCalledWith('touchstart', controls.mousemoveHandler);
            expect(controlsElEventListener).toBeCalledWith('mouseenter', controls.mouseenterHandler);
            expect(controlsElEventListener).toBeCalledWith('mouseleave', controls.mouseleaveHandler);
            expect(controlsElEventListener).toBeCalledWith('focusin', controls.focusinHandler);
            expect(controlsElEventListener).toBeCalledWith('focusout', controls.focusoutHandler);
            expect(controlsElEventListener).toBeCalledWith('click', controls.clickHandler);
        });

        test('should remove click listeners for any button references', () => {
            const button1 = {
                button: { removeEventListener: jest.fn() },
                handler: 'handler',
            };
            const button2 = {
                button: { removeEventListener: jest.fn() },
                handler: 'handler',
            };
            controls.buttonRefs = [button1, button2];

            controls.destroy();
            expect(button1.button.removeEventListener).toBeCalledWith('click', 'handler');
            expect(button2.button.removeEventListener).toBeCalledWith('click', 'handler');
        });
    });

    describe('isPreviewControlButton()', () => {
        test('should determine whether the element is a preview control button', () => {
            let parent = null;
            let element = null;
            expect(controls.isPreviewControlButton(element)).toBe(false);

            parent = document.createElement('div');
            element = document.createElement('div');
            element.className = 'bp-controls-btn';
            parent.appendChild(element);

            expect(controls.isPreviewControlButton(element)).toBe(true);

            element.className = '';
            expect(controls.isPreviewControlButton(element)).toBe(false);
        });
    });

    describe('resetTimeout()', () => {
        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        test('should clear the timeout of the control display timeout Id', () => {
            const clearTimeoutStub = jest.spyOn(window, 'clearTimeout');

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(clearTimeoutStub).toBeCalledTimes(2);
        });

        test('should call resetTimeout again if should hide is false', () => {
            controls.shouldHide = false;
            controls.resetTimeout();

            const resetTimeoutStub = jest.spyOn(controls, 'resetTimeout');
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(resetTimeoutStub).toBeCalled();
        });

        test('should not remove the preview controls class if should hide is false', () => {
            controls.shouldHide = false;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(true);
        });

        test('should remove the preview controls class if should hide is true', () => {
            controls.shouldHide = true;
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(false);
        });

        test('should blur the controls if they are active', () => {
            controls.shouldHide = true;
            const containsStub = jest.spyOn(controls.controlsEl, 'contains').mockReturnValue(true);
            const blurStub = jest.spyOn(document.activeElement, 'blur');

            controls.resetTimeout();
            clock.tick(RESET_TIMEOUT_CLOCK_TICK);

            expect(containsStub).toBeCalled();
            expect(blurStub).toBeCalled();
        });
    });

    describe('mouseenterHandler()', () => {
        test('should make block hiding true', () => {
            controls.mouseenterHandler();

            expect(controls.shouldHide).toBe(false);
        });
    });

    describe('mouseleaveHandler()', () => {
        test('should make block hiding false', () => {
            controls.mouseleaveHandler();

            expect(controls.shouldHide).toBe(true);
        });
    });

    describe('focusinHandler()', () => {
        test('should add the controls class, block hiding if the element is a preview control button', () => {
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton').mockReturnValue(true);

            controls.focusinHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(true);
            expect(controls.shouldHide).toBe(false);
        });

        test('should not add the controls class if the element is not a preview control button', () => {
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton').mockReturnValue(false);

            controls.focusinHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(false);
        });
    });

    describe('focusoutHandler()', () => {
        test('should remove the controls class if the element is a preview control button and the related target is not', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton');
            isControlButtonStub.mockReturnValue(true).mockReturnValue(false);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.shouldHide).toBe(true);
        });

        test('should not remove the controls class if the element is not a preview control button and the related target is not', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton');
            isControlButtonStub.mockReturnValue(false).mockReturnValue(false);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(true);
        });

        test('should not remove the controls class if the element is a preview control button and the related target is', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton');
            isControlButtonStub.mockReturnValue(true).mockReturnValue(true);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(true);
        });

        test('should not remove the controls class if the element is  a preview control button and the related target is', () => {
            controls.containerEl.className = SHOW_PREVIEW_CONTROLS_CLASS;
            const isControlButtonStub = jest.spyOn(controls, 'isPreviewControlButton');
            isControlButtonStub.mockReturnValue(false).mockReturnValue(true);

            controls.focusoutHandler('event');
            expect(isControlButtonStub).toBeCalled();
            expect(controls.containerEl.classList.contains(SHOW_PREVIEW_CONTROLS_CLASS)).toBe(true);
        });
    });

    describe('clickHandler()', () => {
        test('should stop block hiding', () => {
            controls.hasTouch = true;
            controls.clickHandler();
            expect(controls.shouldHide).toBe(true);
        });

        test('should call stopPropagation on event when called', () => {
            const stopPropagation = jest.fn();

            controls.clickHandler({ stopPropagation });

            expect(stopPropagation).toBeCalled();
        });
    });

    describe('add()', () => {
        beforeEach(() => {
            jest.spyOn(controls.buttonRefs, 'push');
        });

        test('should create a button with the right attributes', () => {
            const btn = controls.add('test button', jest.fn(), 'test1', 'test content');
            expect(btn.attributes.title.value).toBe('test button');
            expect(btn.attributes['aria-label'].value).toBe('test button');
            expect(btn.classList.contains('test1')).toBe(true);
            expect(btn.innerHTML).toBe('test content');
            expect(btn.parentNode.parentNode).toBe(controls.controlsEl);
            expect(controls.buttonRefs.push).toBeCalled();
        });

        test('should create a span if specified', () => {
            const span = controls.add('test span', null, 'span1', 'test content', 'span');
            expect(span.attributes.title.value).toBe('test span');
            expect(span.attributes['aria-label'].value).toBe('test span');
            expect(span.classList.contains('span1')).toBe(true);
            expect(span.classList.contains('bp-controls-btn')).toBe(false);
            expect(span.innerHTML).toBe('test content');
            expect(span.parentNode.parentNode).toBe(controls.controlsEl);
            expect(controls.buttonRefs.push).not.toBeCalled();
        });

        test('should append the controls to the provided element', () => {
            const div = controls.addGroup('test-group');
            const btn = controls.add('test button', jest.fn(), 'test1', 'test content', undefined, div);
            expect(btn.parentNode.parentNode).toBe(div);
        });
    });

    describe('addGroup()', () => {
        test('should create a controls group within the controls element', () => {
            const div = controls.addGroup('test-group');
            expect(div.parentNode).toBe(controls.controlsEl);
            expect(div.classList.contains('test-group'));
        });
    });

    describe('enable()', () => {
        test('should unhide the controls', () => {
            controls.controlsEl.className = CLASS_HIDDEN;
            controls.enable();

            expect(controls.controlsEl.classList.contains(CLASS_HIDDEN)).toBe(false);
        });
    });

    describe('disable()', () => {
        test('should hide the controls', () => {
            controls.disable();

            expect(controls.controlsEl.classList.contains(CLASS_HIDDEN)).toBe(true);
        });
    });
});
