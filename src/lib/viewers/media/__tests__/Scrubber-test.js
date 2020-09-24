/* eslint-disable no-unused-expressions */
import Scrubber from '../Scrubber';

const CLASS_SCRUBBER_HOVER = 'bp-media-scrubber-hover';
let scrubber;
let stubs = {};

describe('lib/viewers/media/Scrubber', () => {
    beforeEach(() => {
        fixture.load('viewers/media/__tests__/Scrubber-test.html');
        scrubber = new Scrubber(document.querySelector('.container'), 'Scrubbah', '0', '10');
    });

    afterEach(() => {
        if (scrubber && typeof scrubber.destroy === 'function') {
            scrubber.destroy();
        }

        scrubber = null;
        stubs = {};
    });

    describe('Scrubber()', () => {
        test('should set up scrubber element', () => {
            expect(scrubber.containerEl).not.toBeEmptyDOMElement();
            expect(scrubber.containerEl.getAttribute('role')).toBe('slider');
            expect(scrubber.containerEl.getAttribute('aria-label')).toBe('Scrubbah');
            expect(scrubber.containerEl.getAttribute('title')).toBe('Scrubbah');
            expect(scrubber.containerEl.getAttribute('aria-valuemin')).toBe('0');
            expect(scrubber.containerEl.getAttribute('aria-valuemax')).toBe('10');
            expect(scrubber.value).toBe(0);
            expect(scrubber.convertedValue).toBe(1);
            expect(scrubber.bufferedValue).toBe(1);
        });
    });

    describe('destroy()', () => {
        test('should remove event listeners on the scrubber', () => {
            jest.spyOn(scrubber, 'removeAllListeners').mockImplementation();
            jest.spyOn(scrubber, 'destroyDocumentHandlers').mockImplementation();

            stubs.played = jest.spyOn(scrubber.playedEl, 'removeEventListener');
            stubs.converted = jest.spyOn(scrubber.convertedEl, 'removeEventListener');
            stubs.handle = jest.spyOn(scrubber.handleEl, 'removeEventListener');

            scrubber.destroy();

            expect(scrubber.removeAllListeners).toBeCalled();
            expect(scrubber.destroyDocumentHandlers).toBeCalled();
            expect(stubs.played).toBeCalledWith('mousedown', expect.any(Function));
            expect(stubs.converted).toBeCalledWith('mousedown', expect.any(Function));
            expect(stubs.handle).toBeCalledWith('mousedown', expect.any(Function));
            expect(scrubber.containerEl).toBeEmptyDOMElement();

            // Ensures that afterEach() cleanup doesn't trigger destroy() again
            scrubber = null;
        });
    });

    describe('resize()', () => {
        test('should resize the scrubber accordingly to the provided offset', () => {
            Object.defineProperty(scrubber.containerEl, 'clientWidth', { value: 25 });

            scrubber.resize(10);

            expect(scrubber.scrubberWrapperEl.style.width).toBe('15px');
        });
    });

    describe('setValue()', () => {
        test('should do nothing if the scrubber handle position value has not changed', () => {
            const oldPos = scrubber.handleEl.style.left;
            scrubber.setValue();

            expect(scrubber.handleEl.style.left).toBe(oldPos);
        });

        test('set the new scrubber value', () => {
            scrubber.convertedValue = 0.5;
            scrubber.setValue(0.25);

            expect(scrubber.value).toBe(0.25);
            expect(scrubber.handleEl.style.left).toBe('25%');
        });
    });

    describe('setBufferedValue()', () => {
        test('should do nothing if the scrubber buffered value has not changed', () => {
            scrubber.setBufferedValue();
            expect(scrubber.bufferedValue).toBe(1);
        });

        test('should set the scrubber buffered value', () => {
            scrubber.value = 0.25;
            scrubber.convertedValue = 0.75;
            scrubber.setBufferedValue(0.5);
            expect(scrubber.bufferedValue).toBe(0.5);
        });
    });

    describe('setConvertedValue()', () => {
        test('should do nothing if the scrubber converted value has not changed', () => {
            scrubber.setConvertedValue();
        });

        test('should set the scrubber converted value', () => {
            scrubber.value = 0.25;
            scrubber.convertedValue = 0.45;
            scrubber.setConvertedValue(0.5);
            expect(scrubber.convertedValue).toBe(0.5);
        });
    });

    describe('scrubbingHandler()', () => {
        beforeEach(() => {
            stubs.setValue = jest.spyOn(scrubber, 'setValue');
            stubs.emit = jest.spyOn(scrubber, 'emit');
            stubs.scrubberPosition = jest.spyOn(scrubber, 'computeScrubberPosition').mockReturnValue(0.5);
            stubs.event = {
                pageX: 50,
                preventDefault: jest.fn(),
            };
        });
        test('should adjust the scrubber value to the current scrubber handle position value in the video', () => {
            scrubber.scrubbingHandler(stubs.event);

            expect(stubs.event.preventDefault).toBeCalled();
            expect(stubs.scrubberPosition).toBeCalledWith(50);
            expect(stubs.setValue).toBeCalledWith(0.5);
            expect(stubs.emit).toBeCalledWith('valuechange');
        });

        test('should use the touch list if the event contains touches', () => {
            stubs.event.touches = [
                {
                    pageX: 55,
                },
            ];

            scrubber.scrubbingHandler(stubs.event);

            expect(stubs.scrubberPosition).toBeCalledWith(55);
        });
    });

    describe('computeScrubberPosition()', () => {
        test('should compute correct scrubber position', () => {
            jest.spyOn(scrubber.scrubberEl, 'getBoundingClientRect').mockReturnValue({
                left: 20,
                width: 100,
            });

            const position = scrubber.computeScrubberPosition(30);

            expect(position).toBe(0.1);
        });

        test('should cap the scrubber position to 1', () => {
            jest.spyOn(scrubber.scrubberEl, 'getBoundingClientRect').mockReturnValue({
                left: 20,
                width: 100,
            });

            const position = scrubber.computeScrubberPosition(130);

            expect(position).toBe(1);
        });

        test('should floor the scrubber position to 0', () => {
            jest.spyOn(scrubber.scrubberEl, 'getBoundingClientRect').mockReturnValue({
                left: 20,
                width: 100,
            });

            const position = scrubber.computeScrubberPosition(10);

            expect(position).toBe(0);
        });
    });

    describe('pointerDownHandler()', () => {
        beforeEach(() => {
            stubs.scrub = jest.spyOn(scrubber, 'scrubbingHandler');
            stubs.event = {
                button: 5,
                ctrlKey: undefined,
                metaKey: undefined,
                preventDefault: jest.fn(),
            };
        });

        test('should ignore if event is not a left click', () => {
            scrubber.pointerDownHandler(stubs.event);
            expect(stubs.scrub).not.toBeCalled();
        });

        test('should ignore if event is a CTRL click', () => {
            stubs.event.ctrlKey = '';
            scrubber.pointerDownHandler(stubs.event);
            expect(stubs.scrub).not.toBeCalled();
        });

        test('should ignore if event is a CMD click', () => {
            stubs.event.metaKey = '';
            scrubber.pointerDownHandler(stubs.event);
            expect(stubs.scrub).not.toBeCalled();
        });

        test('should set the mouse move state to true and calls the mouse action handler', () => {
            scrubber.hasTouch = false;
            stubs.event.button = 1;
            scrubber.pointerDownHandler(stubs.event);

            expect(stubs.scrub).toBeCalledWith(stubs.event);
            expect(scrubber.scrubberWrapperEl).toHaveClass(CLASS_SCRUBBER_HOVER);
        });

        test('should add touch events if the browser has touch', () => {
            stubs.event.button = 1;
            scrubber.hasTouch = true;
            stubs.addEventListener = jest.spyOn(document, 'addEventListener');

            scrubber.pointerDownHandler(stubs.event);

            expect(stubs.addEventListener).toBeCalledWith('touchmove', scrubber.scrubbingHandler);
            expect(stubs.addEventListener).toBeCalledWith('touchend', scrubber.pointerUpHandler);
            expect(scrubber.scrubberWrapperEl).not.toHaveClass(CLASS_SCRUBBER_HOVER);
        });
    });

    describe('pointerUpHandler()', () => {
        test('should set the mouse move state to false thus stopping mouse action handling', () => {
            stubs.destroy = jest.spyOn(scrubber, 'destroyDocumentHandlers');
            scrubber.pointerUpHandler(stubs.event);
            expect(stubs.destroy).toBeCalled();
            expect(scrubber.scrubberWrapperEl).not.toHaveClass(CLASS_SCRUBBER_HOVER);
        });
    });

    describe('destroyDocumentHandlers()', () => {
        test('should remove event listeners', () => {
            stubs.remove = jest.spyOn(document, 'removeEventListener');
            scrubber.destroyDocumentHandlers();

            expect(stubs.remove).toBeCalledWith('mousemove', scrubber.scrubbingHandler);
            expect(stubs.remove).toBeCalledWith('mouseup', scrubber.pointerUpHandler);
            expect(stubs.remove).toBeCalledWith('mouseleave', scrubber.pointerUpHandler);
        });

        test('should remove touch events if the browser has touch', () => {
            scrubber.hasTouch = true;
            stubs.remove = jest.spyOn(document, 'removeEventListener');

            scrubber.destroyDocumentHandlers();

            expect(stubs.remove).toBeCalledWith('touchmove', scrubber.scrubbingHandler);
            expect(stubs.remove).toBeCalledWith('touchend', scrubber.pointerUpHandler);
        });
    });

    describe('getValue()', () => {
        test('should get the value of the scrubble handle position', () => {
            expect(scrubber.getValue()).toBe(scrubber.value);
        });
    });

    describe('getHandleEl()', () => {
        test('should get the dom element for the scrubber handle', () => {
            expect(scrubber.getHandleEl()).toBe(scrubber.handleEl);
        });
    });

    describe('getConvertedEl()', () => {
        test('should get the dom element for the scrubber conversion bar', () => {
            expect(scrubber.getConvertedEl()).toBe(scrubber.convertedEl);
        });
    });
});
