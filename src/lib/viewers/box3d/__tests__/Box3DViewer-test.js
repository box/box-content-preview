/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import Box3DViewer from '../Box3DViewer';
import Box3DControls from '../Box3DControls';
import Box3DRenderer from '../Box3DRenderer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import fullscreen from '../../../Fullscreen';
import {
    EVENT_ERROR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR,
    EVENT_WEBGL_CONTEXT_RESTORED,
} from '../box3DConstants';
import { VIEWER_EVENT } from '../../../events';
import { SELECTOR_BOX_PREVIEW_CONTENT } from '../../../constants';

const sandbox = sinon.createSandbox();

let containerEl;
let box3d;
let stubs = {};

describe('lib/viewers/box3d/Box3DViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = jest.spyOn(window, 'BoxSDK');
        stubs.api = new Api();
        box3d = new Box3DViewer({
            api: stubs.api,
            file: {
                id: 0,
                file_version: {
                    id: 1,
                },
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo',
                },
            },
            ui: {
                showLoadingIndicator: () => {},
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        box3d.containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
        box3d.setup();

        jest.spyOn(box3d, 'createSubModules').mockImplementation();
        box3d.controls = {
            on: () => {},
            removeListener: () => {},
            destroy: () => {},
        };
        box3d.renderer = {
            load: () => Promise.resolve(),
            on: () => {},
            removeListener: () => {},
            destroy: () => {},
        };

        box3d.postLoad();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (box3d && typeof box3d.destroy === 'function') {
            box3d.destroy();
        }

        box3d = undefined;
        stubs = {};
    });

    describe('createSubModules()', () => {
        test('should create and save references to 3d controls and 3d renderer', () => {
            box3d = new Box3DViewer({
                file: {
                    id: 0,
                    file_version: {
                        id: 1,
                    },
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
            box3d.containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
            box3d.setup();

            box3d.createSubModules();

            expect(box3d.controls).toBeInstanceOf(Box3DControls);
            expect(box3d.renderer).toBeInstanceOf(Box3DRenderer);
        });
    });

    describe('attachEventHandlers()', () => {
        describe('with box3d.controls defined', () => {
            test('should invoke box3d.controls.on() with EVENT_TOGGLE_FULLSCREEN', () => {
                const onSpy = jest.spyOn(box3d.controls, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_TOGGLE_FULLSCREEN, expect.any(Function));
            });

            test('should invoke box3d.controls.on() with EVENT_TOGGLE_VR', () => {
                const onSpy = jest.spyOn(box3d.controls, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_TOGGLE_VR, expect.any(Function));
            });

            test('should invoke box3d.controls.on() with EVENT_RESET', () => {
                const onSpy = jest.spyOn(box3d.controls, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_RESET, expect.any(Function));
            });
        });

        test("should not attach handlers to controls if controls instance doesn't exist", () => {
            const onSpy = jest.spyOn(box3d.controls, 'on');

            box3d.controls = undefined;
            box3d.attachEventHandlers();

            expect(onSpy).not.toBeCalledWith(EVENT_TOGGLE_FULLSCREEN, expect.any(Function));
        });

        describe('with box3d.renderer defined', () => {
            test('should invoke box3d.renderer.on() with EVENT_SCENE_LOADED', () => {
                const onSpy = jest.spyOn(box3d.renderer, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_SCENE_LOADED, expect.any(Function));
            });

            test('should invoke box3d.renderer.on() with EVENT_SHOW_VR_BUTTON', () => {
                const onSpy = jest.spyOn(box3d.renderer, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_SHOW_VR_BUTTON, expect.any(Function));
            });

            test('should invoke box3d.renderer.on() with EVENT_ERROR', () => {
                const onSpy = jest.spyOn(box3d.renderer, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_ERROR, expect.any(Function));
            });

            test('should invoke box3d.renderer.on() with EVENT_WEBGL_CONTEXT_RESTORED', () => {
                const onSpy = jest.spyOn(box3d.renderer, 'on');

                box3d.attachEventHandlers();

                expect(onSpy).toBeCalledWith(EVENT_WEBGL_CONTEXT_RESTORED, expect.any(Function));
            });
        });

        test("should not attach handlers to renderer if renderer instance doesn't exist", () => {
            const onSpy = jest.spyOn(box3d.renderer, 'on');

            box3d.renderer = undefined;
            box3d.attachEventHandlers();

            expect(onSpy).not.toBeCalledWith(EVENT_SCENE_LOADED, expect.any(Function));
        });
    });

    describe('detachEventHandlers()', () => {
        describe('with box3d.controls defined', () => {
            test('should invoke box3d.controls.removeListener() with EVENT_TOGGLE_FULLSCREEN', () => {
                const detachSpy = jest.spyOn(box3d.controls, 'removeListener');
                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_TOGGLE_FULLSCREEN, expect.any(Function));
            });

            test('should invoke box3d.controls.removeListener() with EVENT_TOGGLE_VR', () => {
                const detachSpy = jest.spyOn(box3d.controls, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_TOGGLE_VR, expect.any(Function));
            });

            test('should invoke box3d.controls.removeListener() with EVENT_RESET', () => {
                const detachSpy = jest.spyOn(box3d.controls, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_RESET, expect.any(Function));
            });
        });

        test('should not invoke controls.removeListener() when controls is undefined', () => {
            const detachSpy = jest.spyOn(box3d.controls, 'removeListener');

            box3d.controls = undefined;
            box3d.detachEventHandlers();

            expect(detachSpy).not.toBeCalledWith(EVENT_TOGGLE_FULLSCREEN, expect.any(Function));
        });

        describe('with box3d.renderer defined', () => {
            test('should invoke box3d.renderer.removeListener() with EVENT_SCENE_LOADED', () => {
                const detachSpy = jest.spyOn(box3d.renderer, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_SCENE_LOADED, expect.any(Function));
            });

            test('should invoke box3d.renderer.removeListener() with EVENT_SHOW_VR_BUTTON', () => {
                const detachSpy = jest.spyOn(box3d.renderer, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_SHOW_VR_BUTTON, expect.any(Function));
            });

            test('should invoke box3d.renderer.removeListener() with EVENT_ERROR', () => {
                const detachSpy = jest.spyOn(box3d.renderer, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_ERROR, expect.any(Function));
            });

            test('should invoke box3d.renderer.removeListener() with EVENT_WEBGL_CONTEXT_RESTORED', () => {
                const detachSpy = jest.spyOn(box3d.renderer, 'removeListener');

                box3d.detachEventHandlers();

                expect(detachSpy).toBeCalledWith(EVENT_WEBGL_CONTEXT_RESTORED, expect.any(Function));
            });
        });

        test('should not invoke renderer.removeListener() when renderer is undefined', () => {
            const detachSpy = jest.spyOn(box3d.renderer, 'removeListener');

            box3d.renderer = undefined;
            box3d.detachEventHandlers();

            expect(detachSpy).not.toBeCalledWith(EVENT_SCENE_LOADED, expect.any(Function));
        });
    });

    describe('resize()', () => {
        const resizeFunc = BaseViewer.prototype.resize;

        beforeEach(() => {
            box3d.renderer.resize = jest.fn();
        });

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: resizeFunc });
        });

        test('should call super.resize()', () => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: sandbox.mock() });
            box3d.resize();
        });

        test('should call renderer.resize() when it exists', () => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: jest.fn() });
            box3d.resize();
            expect(box3d.renderer.resize).toBeCalled();
        });
    });

    describe('destroy()', () => {
        test('should detach event handlers', () => {
            jest.spyOn(box3d, 'detachEventHandlers');

            box3d.destroy();

            expect(box3d.detachEventHandlers).toBeCalled();
        });

        test('should call controls.destroy() if it exists', () => {
            jest.spyOn(box3d.controls, 'destroy');

            box3d.destroy();

            expect(box3d.controls.destroy).toBeCalled();
        });

        test('should call renderer.destroy() if it exists', () => {
            jest.spyOn(box3d.renderer, 'destroy');

            box3d.destroy();

            expect(box3d.renderer.destroy).toBeCalled();
        });

        test('should set .destroyed to true', () => {
            box3d.destroy();
            expect(box3d.destroyed).toBe(true);
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        test('should call renderer.load()', () => {
            box3d.containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });
            jest.spyOn(box3d, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(box3d, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            jest.spyOn(box3d, 'postLoad');
            return box3d.load().then(() => {
                expect(box3d.postLoad).toBeCalled();
            });
        });
    });

    describe('postLoad()', () => {
        test('should setup a Box SDK, create sub modules, and attach event handlers', () => {
            jest.spyOn(box3d, 'attachEventHandlers');

            box3d.postLoad();

            expect(box3d.createSubModules).toBeCalled();
            expect(box3d.attachEventHandlers).toBeCalled();
            expect(typeof box3d.boxSdk).toBe('object');
        });

        test('should call renderer.load() with the entities.json file and options', () => {
            const contentUrl = 'someEntitiesJsonUrl';
            jest.spyOn(box3d, 'createContentUrl').mockReturnValue(contentUrl);
            sandbox
                .mock(box3d.renderer)
                .expects('load')
                .withArgs(contentUrl, box3d.options)
                .returns(Promise.resolve());

            box3d.postLoad();
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(box3d, 'startLoadTimer');
            box3d.postLoad();

            expect(box3d.startLoadTimer).toBeCalled();
        });
    });

    describe('prefetch()', () => {
        test('should prefetch assets if assets is true', () => {
            jest.spyOn(box3d, 'prefetchAssets').mockImplementation();
            box3d.prefetch({ assets: true, content: false });
            expect(box3d.prefetchAssets).toBeCalled();
        });

        test('should prefetch content if content is true and representation is ready', () => {
            const headers = {};
            const contentUrl = 'someContentUrl';
            jest.spyOn(box3d, 'createContentUrl').mockReturnValue(contentUrl);
            jest.spyOn(box3d, 'appendAuthHeader').mockReturnValue(headers);
            jest.spyOn(box3d, 'isRepresentationReady').mockReturnValue(true);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .withArgs(contentUrl, { headers, type: 'document' });
            box3d.prefetch({ assets: false, content: true });
        });

        test('should not prefetch content if content is true but representation is not ready', () => {
            jest.spyOn(box3d, 'isRepresentationReady').mockReturnValue(false);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .never();
            box3d.prefetch({ assets: false, content: true });
        });
    });

    describe('toggleFullscreen()', () => {
        test('should call fullscreen.toggle()', () => {
            Object.defineProperty(Object.getPrototypeOf(fullscreen), 'toggle', {
                value: jest.fn(),
            });

            box3d.toggleFullscreen();

            expect(fullscreen.toggle).toBeCalled();
        });

        test('should call fullsceen.toggle() with parent container element', () => {
            const toggleSpy = jest.fn();
            Object.defineProperty(Object.getPrototypeOf(fullscreen), 'toggle', {
                value: toggleSpy,
            });

            box3d.toggleFullscreen();

            expect(toggleSpy).toBeCalledWith(box3d.containerEl);
        });
    });

    describe('handleToggleVr()', () => {
        test('should call renderer.toggleVr()', () => {
            box3d.renderer.toggleVr = jest.fn();
            box3d.handleToggleVr();
        });
    });

    describe('onVrPresentChange()', () => {
        beforeEach(() => {
            box3d.renderer.box3d = {
                getVrDisplay: jest.fn().mockReturnValue({
                    isPresenting: true,
                }),
            };
            box3d.controls.vrEnabled = false;
        });

        test('should not do anything on desktop', () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(false);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).not.toHaveClass('vr-enabled');
            expect(box3d.controls.vrEnabled).toBe(false);
        });

        test('should add vr-enabled class to wrapper and set controls property if VR is presenting on mobile', () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(true);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).toHaveClass('vr-enabled');
            expect(box3d.controls.vrEnabled).toBe(true);
        });

        test('should not add vr-enabled class to wrapper and not set controls property if on mobile, but VR is not presenting', () => {
            box3d.renderer.box3d.getVrDisplay = jest.fn().mockReturnValue({
                isPresenting: false,
            });
            jest.spyOn(Browser, 'isMobile').mockReturnValue(true);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).not.toHaveClass('vr-enabled');
            expect(box3d.controls.vrEnabled).not.toBe(true);
        });
    });

    describe('handleSceneLoaded()', () => {
        let eventNameUsed;
        beforeEach(() => {
            jest.spyOn(box3d, 'emit').mockImplementation(eventName => {
                eventNameUsed = eventName;
            });
            box3d.controls.addUi = jest.fn();
        });

        afterEach(() => {
            expect(eventNameUsed).toBe(EVENT_LOAD);
        });

        test('should set .loaded to true', () => {
            box3d.handleSceneLoaded();
            expect(box3d.loaded).toBe(true);
        });
        test('should call controls.addUi() if it exists', () => {
            box3d.handleSceneLoaded();
            expect(box3d.controls.addUi).toBeCalled();
        });
    });

    describe('handleShowVrButton()', () => {
        test('should call controls.showVrButton()', () => {
            box3d.controls.showVrButton = jest.fn();
            box3d.handleShowVrButton();
        });
    });

    describe('handleReset()', () => {
        test('should call renderer.reset()', () => {
            box3d.renderer.reset = jest.fn();
            box3d.handleReset();
        });
    });

    describe('handleError()', () => {
        test('should call emit() with params ["error", error_object]', () => {
            const error = {};
            jest.spyOn(box3d, 'emit').mockImplementation();

            box3d.handleError(error);

            expect(box3d.emit).toBeCalledWith(EVENT_ERROR, error);
        });
    });

    describe('handleContextLost()', () => {
        test('should call destroySubModules', () => {
            const destroySubModules = jest.spyOn(box3d, 'destroySubModules').mockImplementation();
            box3d.handleContextLost();
            expect(destroySubModules).toBeCalled();
        });
    });

    describe('handleContextRestored()', () => {
        test('should call emit() with params ["progressstart"]', () => {
            jest.spyOn(box3d, 'emit').mockImplementation();

            box3d.handleContextRestored();

            expect(box3d.emit).toBeCalledWith(VIEWER_EVENT.progressStart);
        });

        test('should call detachEventHandlers', () => {
            const detachHandlers = jest.spyOn(box3d, 'detachEventHandlers');
            box3d.handleContextRestored();
            expect(detachHandlers).toBeCalled();
        });

        test('should call postLoad', () => {
            box3d.postLoad = jest.fn();
            box3d.handleContextRestored();
            expect(box3d.postLoad).toBeCalled();
        });
    });
});
