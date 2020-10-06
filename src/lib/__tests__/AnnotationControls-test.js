/* eslint-disable no-unused-expressions */
import { ICON_REGION_COMMENT } from '../icons/icons';
import AnnotationControls, {
    AnnotationMode,
    CLASS_ANNOTATIONS_BUTTON,
    CLASS_ANNOTATIONS_GROUP,
    CLASS_GROUP_HIDE,
    CLASS_REGION_BUTTON,
} from '../AnnotationControls';
import Controls from '../Controls';

let annotationControls;
let stubs = {};

describe('lib/AnnotationControls', () => {
    beforeEach(() => {
        fixture.load('__tests__/AnnotationControls-test.html');
        stubs.classListAdd = jest.fn();
        stubs.classListRemove = jest.fn();
        stubs.onClick = jest.fn();
        stubs.querySelector = jest.fn(() => ({
            classList: {
                add: stubs.classListAdd,
                remove: stubs.classListRemove,
            },
        }));

        const controls = new Controls(document.getElementById('test-annotation-controls-container'));
        annotationControls = new AnnotationControls(controls);
        annotationControls.controlsElement.querySelector = stubs.querySelector;
    });

    afterEach(() => {
        fixture.cleanup();

        annotationControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should create the correct DOM structure', () => {
            expect(annotationControls.controls).toBeDefined();
            expect(annotationControls.controlsElement).toBeDefined();
            expect(annotationControls.currentMode).toBe(AnnotationMode.NONE);
        });

        test('should throw an exception if controls is not provided', () => {
            expect(() => new AnnotationControls()).toThrowError(Error);
        });
    });

    describe('destroy()', () => {
        test('should remove all listeners', () => {
            jest.spyOn(document, 'removeEventListener');
            annotationControls.hasInit = true;

            annotationControls.destroy();

            expect(document.removeEventListener).toBeCalledWith('keydown', annotationControls.handleKeyDown);
            expect(annotationControls.hasInit).toBe(false);
        });

        test('should early return if hasInit is false', () => {
            jest.spyOn(document, 'removeEventListener');

            annotationControls.destroy();

            expect(document.removeEventListener).not.toBeCalled();
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            jest.spyOn(annotationControls, 'addButton');
            jest.spyOn(annotationControls, 'setMode');
        });

        test('should only add region button', () => {
            annotationControls.init({ fileId: '0', onClick: stubs.onClick });

            expect(annotationControls.addButton).toBeCalledWith(
                AnnotationMode.REGION,
                stubs.onClick,
                expect.anything(),
                '0',
            );
        });

        test('should add highlight button', () => {
            annotationControls.init({ fileId: '0', onClick: stubs.onClick, showHighlightText: true });

            expect(annotationControls.addButton).toBeCalledWith(
                AnnotationMode.HIGHLIGHT,
                stubs.onClick,
                expect.anything(),
                '0',
            );
        });

        test('should add keydown event listener', () => {
            jest.spyOn(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(document.addEventListener).toBeCalledWith('keydown', annotationControls.handleKeyDown);
        });

        test('should set onEscape and hasInit', () => {
            const onEscapeMock = jest.fn();

            annotationControls.init({ fileId: '0', onEscape: onEscapeMock });

            expect(annotationControls.onEscape).toBe(onEscapeMock);
            expect(annotationControls.hasInit).toBe(true);
        });

        test('should early return if hasInit is true', () => {
            annotationControls.hasInit = true;

            jest.spyOn(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(annotationControls.addButton).not.toBeCalled();
            expect(document.addEventListener).not.toBeCalled();
        });

        test('should call setMode with the initialMode that is passed in', () => {
            annotationControls.init({ initialMode: AnnotationMode.REGION });

            expect(annotationControls.currentMode).toBe(AnnotationMode.REGION);
        });
    });

    describe('handleKeyDown', () => {
        let eventMock;

        beforeEach(() => {
            annotationControls.resetControls = jest.fn();
            annotationControls.currentMode = 'region';
            eventMock = {
                key: 'Escape',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
        });

        test('should not call resetControls if key is not Escape or mode is none', () => {
            annotationControls.handleKeyDown({ key: 'Enter' });

            expect(annotationControls.resetControls).not.toBeCalled();

            annotationControls.currentMode = 'none';
            annotationControls.handleKeyDown({ key: 'Escape' });

            expect(annotationControls.resetControls).not.toBeCalled();
        });

        test('should call resetControls and prevent default event', () => {
            annotationControls.handleKeyDown(eventMock);

            expect(eventMock.preventDefault).toBeCalled();
            expect(eventMock.stopPropagation).toBeCalled();
        });
    });

    describe('resetControls()', () => {
        beforeEach(() => {
            jest.spyOn(annotationControls, 'updateButton');

            stubs.onEscape = jest.fn();
        });

        test('should not change if no current active control', () => {
            annotationControls.resetControls();

            expect(annotationControls.currentMode).toBe(AnnotationMode.NONE);
            expect(annotationControls.updateButton).not.toBeCalled();
        });

        test('should call updateButton if current control is region', () => {
            annotationControls.currentMode = AnnotationMode.REGION;

            annotationControls.resetControls();

            expect(annotationControls.currentMode).toBe(AnnotationMode.NONE);
            expect(annotationControls.updateButton).toBeCalledWith(AnnotationMode.REGION);
        });
    });

    describe('toggle()', () => {
        test('should show or hide the entire button group', () => {
            annotationControls.toggle(false);
            expect(stubs.querySelector).toBeCalledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListAdd).toBeCalledWith(CLASS_GROUP_HIDE);

            annotationControls.toggle(true);
            expect(stubs.querySelector).toBeCalledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListRemove).toBeCalledWith(CLASS_GROUP_HIDE);
        });
    });

    describe('addButton()', () => {
        beforeEach(() => {
            stubs.buttonElement = {
                setAttribute: jest.fn(),
            };

            jest.spyOn(annotationControls.controls, 'add').mockReturnValue(stubs.buttonElement);
        });

        test('should do nothing for unknown button', () => {
            annotationControls.addButton('draw', jest.fn(), 'group', '0');

            expect(annotationControls.controls.add).not.toBeCalled();
        });

        test('should add controls and add resin tags', () => {
            annotationControls.addButton(AnnotationMode.REGION, jest.fn(), 'group', '0');

            expect(annotationControls.controls.add).toBeCalledWith(
                __('region_comment'),
                expect.any(Function),
                `${CLASS_ANNOTATIONS_BUTTON} ${CLASS_REGION_BUTTON}`,
                ICON_REGION_COMMENT,
                'button',
                'group',
            );

            expect(stubs.buttonElement.setAttribute).toBeCalledWith('data-resin-target', 'highlightRegion');
            expect(stubs.buttonElement.setAttribute).toBeCalledWith('data-resin-fileId', '0');
        });
    });

    describe('setMode()', () => {
        beforeEach(() => {
            annotationControls.resetControls = jest.fn();
            annotationControls.updateButton = jest.fn();
        });

        test('should do nothing if mode is the same', () => {
            annotationControls.currentMode = 'region';
            annotationControls.setMode('region');

            expect(annotationControls.resetControls).not.toBeCalled();
            expect(annotationControls.updateButton).not.toBeCalled();
        });

        test('should update controls if mode is not the same', () => {
            annotationControls.currentMode = 'region';

            annotationControls.setMode('highlight');

            expect(annotationControls.resetControls).toBeCalled();
            expect(annotationControls.updateButton).toBeCalledWith('highlight');
        });
    });
});
