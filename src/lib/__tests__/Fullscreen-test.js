/* eslint-disable no-unused-expressions */
import fscreen from 'fscreen';
import fullscreen from '../Fullscreen';
import { CLASS_FULLSCREEN } from '../constants';

jest.mock('fscreen', () => ({
    addEventListener: jest.fn(),
    exitFullscreen: jest.fn(),
    fullscreenElement: null,
    removeEventListener: jest.fn(),
    requestFullscreenFunction: jest.fn(),
}));

describe('lib/Fullscreen', () => {
    beforeEach(() => {
        fscreen.fullscreenElement = document.createElement('div');
    });

    describe('isFullscreen()', () => {
        test('should return whether document is in fullscreen if true fullscreen is supported', () => {
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(true);

            expect(fullscreen.isFullscreen()).toBe(true);

            fscreen.fullscreenElement = null;

            expect(fullscreen.isFullscreen()).toBe(false);
        });

        test('should return whether element has fullscreen class if true fullscreen is not supported', () => {
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(false);
            fscreen.fullscreenElement = null;

            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            expect(fullscreen.isFullscreen(element)).toBe(true);

            element.classList.remove(CLASS_FULLSCREEN);
            expect(fullscreen.isFullscreen(element)).toBe(false);
        });
    });

    describe('fullscreenEnterHandler()', () => {
        test('should add the fullscreen class and focus the element', () => {
            const element = document.createElement('div');
            jest.spyOn(element, 'focus');
            jest.spyOn(fullscreen, 'emit');

            fullscreen.fullscreenEnterHandler(element);

            expect(element.classList.contains(CLASS_FULLSCREEN)).toBe(true);
            expect(element.focus).toBeCalled();
            expect(fullscreen.emit).toBeCalledWith('enter');
        });
    });

    describe('fullscreenExitHandler()', () => {
        test('should remove the fullscreen class and not focus the element', () => {
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);
            jest.spyOn(element, 'focus');
            jest.spyOn(fullscreen, 'emit');

            fullscreen.fullscreenElement = element;
            fullscreen.fullscreenExitHandler();

            expect(element.classList.contains(CLASS_FULLSCREEN)).toBe(false);
            expect(element.focus).not.toBeCalled();
            expect(fullscreen.emit).toBeCalledWith('exit');
        });
    });

    describe('enter()', () => {
        beforeEach(() => {
            jest.spyOn(fullscreen, 'fullscreenEnterHandler');
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
        });

        test('should trigger native requestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const fullscreenStub = jest.fn();
            jest.spyOn(fscreen, 'requestFullscreenFunction').mockReturnValue(fullscreenStub);
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(true);

            const element = document.createElement('div');
            fullscreen.enter(element);

            expect(fullscreenStub).toBeCalledWith(Element.ALLOW_KEYBOARD_INPUT);
        });

        test('should trigger the fullscreenEnterHandler immediately if true fullscreen is not supported', () => {
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(false);

            const element = document.createElement('div');
            fullscreen.enter(element);

            expect(fullscreen.fullscreenEnterHandler).toBeCalled();
        });
    });

    describe('exit()', () => {
        beforeEach(() => {
            jest.spyOn(fullscreen, 'fullscreenExitHandler');
            jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
        });

        test('should trigger native exitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(true);

            fullscreen.exit();

            expect(fscreen.exitFullscreen).toBeCalled();
        });

        test('should trigger the fullscreenExitHandler immediately if true fullscreen is not supported', () => {
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(false);

            fullscreen.exit();

            expect(fullscreen.fullscreenExitHandler).toBeCalled();
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            jest.spyOn(fullscreen, 'enter');
            jest.spyOn(fullscreen, 'exit');
            jest.spyOn(fullscreen, 'isSupported').mockReturnValue(false);
        });

        test('should call enter if not already in fullscreen', () => {
            const element = document.createElement('div');

            fullscreen.toggle(element);

            expect(fullscreen.enter).toBeCalled();
        });

        test('should call exit if already in fullscreen', () => {
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            fullscreen.toggle(element);

            expect(fullscreen.exit).toBeCalled();
        });
    });
});
