/* eslint-disable no-unused-expressions */
import Box3DControls from '../Box3DControls';
import Controls from '../../../Controls';
import { UIRegistry } from '../Box3DUIUtils';
import { CLASS_HIDDEN } from '../../../constants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_3D_VR } from '../../../icons';
import { EVENT_RESET, EVENT_SCENE_LOADED, EVENT_TOGGLE_FULLSCREEN, EVENT_TOGGLE_VR } from '../box3DConstants';

let containerEl;
let controls;

describe('lib/viewers/box3d/Box3DControls', () => {
    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DControls-test.html');
        containerEl = document.querySelector('.container');
        controls = new Box3DControls(containerEl);
    });

    afterEach(() => {
        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
        fixture.cleanup();
    });

    describe('constructor()', () => {
        test('should set .el to passed in container element', () => {
            expect(controls.el).toBe(containerEl);
        });

        test('should create new Controls instance for .controls', () => {
            expect(controls.controls).toBeInstanceOf(Controls);
        });

        test('should create new UIRegistry for .uiRegistry', () => {
            expect(controls.uiRegistry).toBeInstanceOf(UIRegistry);
        });
    });

    describe('addUi()', () => {
        test('should call .addVrButton()', () => {
            const stub = jest.spyOn(controls, 'addVrButton');
            controls.addUi();

            expect(stub).toBeCalled();
        });

        test('should call .addFullscreenButton()', () => {
            const stub = jest.spyOn(controls, 'addFullscreenButton');
            controls.addUi();

            expect(stub).toBeCalled();
        });

        test('should call .hideVrButton()', () => {
            const stub = jest.spyOn(controls, 'hideVrButton');
            controls.addUi();

            expect(stub).toBeCalled();
        });
    });

    describe('addFullscreenButton()', () => {
        beforeEach(() => {
            jest.spyOn(controls.controls, 'add');
            controls.addFullscreenButton();
        });

        test('should invoke controls.add() with enter fullscreen button params', () => {
            expect(controls.controls.add).toBeCalledWith(
                'Enter fullscreen',
                controls.handleToggleFullscreen,
                'bp-enter-fullscreen-icon',
                ICON_FULLSCREEN_IN,
            );
        });

        test('should invoke controls.add() with exit fullscreen button params', () => {
            expect(controls.controls.add).toBeCalledWith(
                'Exit fullscreen',
                controls.handleToggleFullscreen,
                'bp-exit-fullscreen-icon',
                ICON_FULLSCREEN_OUT,
            );
        });
    });

    describe('addVrButton()', () => {
        test('should invoke controls.add() with vr button params', () => {
            const vrAddStub = jest.spyOn(controls.controls, 'add');
            controls.addVrButton();

            expect(vrAddStub).toBeCalledWith('Toggle VR display', controls.handleToggleVr, '', ICON_3D_VR);
        });
    });

    describe('handleSceneLoaded()', () => {
        test('should call emit() with EVENT_SCENE_LOADED', () => {
            const emitStub = jest.spyOn(controls, 'emit');
            controls.handleSceneLoaded();

            expect(emitStub).toBeCalledWith(EVENT_SCENE_LOADED);
        });
    });

    describe('handleToggleVr()', () => {
        test('should call emit() with EVENT_TOGGLE_VR', () => {
            const emitStub = jest.spyOn(controls, 'emit');
            controls.handleToggleVr();

            expect(emitStub).toBeCalledWith(EVENT_TOGGLE_VR);
        });
    });

    describe('handleToggleFullscreen()', () => {
        test('should call emit() with EVENT_TOGGLE_FULLSCREEN', () => {
            const emitStub = jest.spyOn(controls, 'emit');
            controls.handleToggleFullscreen();

            expect(emitStub).toBeCalledWith(EVENT_TOGGLE_FULLSCREEN);
        });
    });

    describe('handleReset()', () => {
        test('should call emit() with EVENT_RESET', () => {
            const emitStub = jest.spyOn(controls, 'emit');
            controls.handleReset();

            expect(emitStub).toBeCalledWith(EVENT_RESET);
        });
    });

    describe('showVrButton()', () => {
        test('should should remove CLASS_HIDDEN to vrButtonEl if it exists', () => {
            const removeStub = jest.fn();
            controls.vrButtonEl = {
                classList: {
                    remove: removeStub,
                },
            };

            controls.showVrButton();

            expect(removeStub).toBeCalledWith(CLASS_HIDDEN);
        });
    });

    describe('hideVrButton()', () => {
        test('should should add CLASS_HIDDEN to vrButtonEl if it exists', () => {
            const addStub = jest.fn();
            controls.vrButtonEl = {
                classList: {
                    add: addStub,
                },
            };

            controls.hideVrButton();

            expect(addStub).toBeCalledWith(CLASS_HIDDEN);
        });
    });

    describe('setElementVisibility()', () => {
        let el;
        beforeEach(() => {
            el = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
            };
        });

        afterEach(() => {
            el = null;
        });

        test('should element.classList.remove() with CLASS_HIDDEN from provided element if visible param is true', () => {
            controls.setElementVisibility(el, true);
            expect(el.classList.remove).toBeCalledWith(CLASS_HIDDEN);
        });

        test('should element.classList.add() with CLASS_HIDDEN to provided element if visible param is false', () => {
            controls.setElementVisibility(el, false);
            expect(el.classList.add).toBeCalledWith(CLASS_HIDDEN);
        });

        test('should invoke element.classList.add() with CLASS_HIDDEN to provided element if visible param is missing', () => {
            controls.setElementVisibility(el);
            expect(el.classList.add).toBeCalledWith(CLASS_HIDDEN);
        });
    });

    describe('toggleElementVisibility()', () => {
        test('should invoke element.classList.toggle() with CLASS_HIDDEN', () => {
            const el = {
                classList: {
                    toggle: jest.fn(),
                },
            };

            controls.toggleElementVisibility(el);

            expect(el.classList.toggle).toBeCalledWith(CLASS_HIDDEN);
        });
    });

    describe('destroy()', () => {
        test('should call controls.destroy() if .controls exists', () => {
            const destroyStub = jest.spyOn(controls.controls, 'destroy');
            controls.destroy();

            expect(destroyStub).toBeCalled();
        });

        test("should not call controls.destroy() if .controls doesn't exist", () => {
            const destroyStub = jest.spyOn(controls.controls, 'destroy');
            controls.controls = null;
            controls.destroy();

            expect(destroyStub).not.toBeCalled();
        });

        test('should nullify .controls', () => {
            controls.destroy();
            expect(controls.controls).toBeNull();
        });

        test('should call uiRegistry.unregisterAll() if .uiRegistry exists', () => {
            const unregisterStub = jest.spyOn(controls.uiRegistry, 'unregisterAll');
            controls.destroy();

            expect(unregisterStub).toBeCalled();
        });

        test("should not call uiRegistry.unregisterAll() if .uiRegistry doesn't exist", () => {
            const unregisterStub = jest.spyOn(controls.uiRegistry, 'unregisterAll');
            controls.uiRegistry = null;
            controls.destroy();

            expect(unregisterStub).not.toBeCalled();
        });

        test('should nullify uiRegistry', () => {
            controls.destroy();
            expect(controls.uiRegistry).toBeNull();
        });
    });
});
