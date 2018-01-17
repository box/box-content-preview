/* eslint-disable no-unused-expressions */
import Box3DViewer from '../Box3DViewer';
import Box3DControls from '../Box3DControls';
import Box3DRenderer from '../Box3DRenderer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import fullscreen from '../../../Fullscreen';
import * as util from '../../../util';
import {
    EVENT_ERROR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR,
    EVENT_WEBGL_CONTEXT_RESTORED
} from '../box3DConstants';
import { VIEWER_EVENTS } from '../../../events';

const sandbox = sinon.sandbox.create();

let containerEl;
let box3d;
let stubs = {};

describe('lib/viewers/box3d/Box3DViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = sandbox.stub(window, 'BoxSDK');
        box3d = new Box3DViewer({
            file: {
                id: 0,
                file_version: {
                    id: 1
                }
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo'
                }
            },
            ui: {
                showLoadingIndicator: () => {}
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        box3d.containerEl = containerEl;
        box3d.setup();

        sandbox.stub(box3d, 'createSubModules');
        box3d.controls = {
            on: () => {},
            removeListener: () => {},
            destroy: () => {}
        };
        box3d.renderer = {
            load: () => Promise.resolve(),
            on: () => {},
            removeListener: () => {},
            destroy: () => {}
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
        it('should create and save references to 3d controls and 3d renderer', () => {
            box3d = new Box3DViewer({
                file: {
                    id: 0,
                    file_version: {
                        id: 1
                    }
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo'
                    }
                }
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
            box3d.containerEl = containerEl;
            box3d.setup();

            box3d.createSubModules();

            expect(box3d.controls).to.be.instanceof(Box3DControls);
            expect(box3d.renderer).to.be.instanceof(Box3DRenderer);
        });
    });

    describe('attachEventHandlers()', () => {
        describe('with box3d.controls defined', () => {
            it('should invoke box3d.controls.on() with EVENT_TOGGLE_FULLSCREEN', () => {
                const onSpy = sandbox.spy(box3d.controls, 'on');
                onSpy.withArgs(EVENT_TOGGLE_FULLSCREEN);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_TOGGLE_FULLSCREEN).called).to.be.true;
            });

            it('should invoke box3d.controls.on() with EVENT_TOGGLE_VR', () => {
                const onSpy = sandbox.spy(box3d.controls, 'on');
                onSpy.withArgs(EVENT_TOGGLE_VR);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_TOGGLE_VR).called).to.be.true;
            });

            it('should invoke box3d.controls.on() with EVENT_RESET', () => {
                const onSpy = sandbox.spy(box3d.controls, 'on');
                onSpy.withArgs(EVENT_RESET);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_RESET).called).to.be.true;
            });
        });

        it('should not attach handlers to controls if controls instance doesn\'t exist', () => {
            const onSpy = sandbox.spy(box3d.controls, 'on');
            // Only checking first method call in block
            onSpy.withArgs(EVENT_TOGGLE_FULLSCREEN);

            box3d.controls = undefined;
            box3d.attachEventHandlers();

            expect(onSpy.withArgs(EVENT_TOGGLE_FULLSCREEN).called).to.be.false;
        });

        describe('with box3d.renderer defined', () => {
            it('should invoke box3d.renderer.on() with EVENT_SCENE_LOADED', () => {
                const onSpy = sandbox.spy(box3d.renderer, 'on');
                onSpy.withArgs(EVENT_SCENE_LOADED);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_SCENE_LOADED).called).to.be.true;
            });

            it('should invoke box3d.renderer.on() with EVENT_SHOW_VR_BUTTON', () => {
                const onSpy = sandbox.spy(box3d.renderer, 'on');
                onSpy.withArgs(EVENT_SHOW_VR_BUTTON);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_SHOW_VR_BUTTON).called).to.be.true;
            });

            it('should invoke box3d.renderer.on() with EVENT_ERROR', () => {
                const onSpy = sandbox.spy(box3d.renderer, 'on');
                onSpy.withArgs(EVENT_ERROR);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_ERROR).called).to.be.true;
            });

            it('should invoke box3d.renderer.on() with EVENT_WEBGL_CONTEXT_RESTORED', () => {
                const onSpy = sandbox.spy(box3d.renderer, 'on');
                onSpy.withArgs(EVENT_WEBGL_CONTEXT_RESTORED);

                box3d.attachEventHandlers();

                expect(onSpy.withArgs(EVENT_WEBGL_CONTEXT_RESTORED).called).to.be.true;
            });
        });

        it('should not attach handlers to renderer if renderer instance doesn\'t exist', () => {
            const onSpy = sandbox.spy(box3d.renderer, 'on');
            // Only checking first method call in block
            onSpy.withArgs(EVENT_SCENE_LOADED);

            box3d.renderer = undefined;
            box3d.attachEventHandlers();

            expect(onSpy.withArgs(EVENT_SCENE_LOADED).called).to.be.false;
        });
    });

    describe('detachEventHandlers()', () => {
        describe('with box3d.controls defined', () => {
            it('should invoke box3d.controls.removeListener() with EVENT_TOGGLE_FULLSCREEN', () => {
                const detachSpy = sandbox.spy(box3d.controls, 'removeListener');
                detachSpy.withArgs(EVENT_TOGGLE_FULLSCREEN);
                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_TOGGLE_FULLSCREEN).called).to.be.true;
            });

            it('should invoke box3d.controls.removeListener() with EVENT_TOGGLE_VR', () => {
                const detachSpy = sandbox.spy(box3d.controls, 'removeListener');
                detachSpy.withArgs(EVENT_TOGGLE_VR);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_TOGGLE_VR).called).to.be.true;
            });

            it('should invoke box3d.controls.removeListener() with EVENT_RESET', () => {
                const detachSpy = sandbox.spy(box3d.controls, 'removeListener');
                detachSpy.withArgs(EVENT_RESET);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_RESET).called).to.be.true;
            });
        });

        it('should not invoke controls.removeListener() when controls is undefined', () => {
            const detachSpy = sandbox.spy(box3d.controls, 'removeListener');
            // Only checking first method call in block
            detachSpy.withArgs(EVENT_TOGGLE_FULLSCREEN);

            box3d.controls = undefined;
            box3d.detachEventHandlers();

            expect(detachSpy.withArgs(EVENT_TOGGLE_FULLSCREEN).called).to.be.false;
        });

        describe('with box3d.renderer defined', () => {
            it('should invoke box3d.renderer.removeListener() with EVENT_SCENE_LOADED', () => {
                const detachSpy = sandbox.spy(box3d.renderer, 'removeListener');
                detachSpy.withArgs(EVENT_SCENE_LOADED);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_SCENE_LOADED).called).to.be.true;
            });

            it('should invoke box3d.renderer.removeListener() with EVENT_SHOW_VR_BUTTON', () => {
                const detachSpy = sandbox.spy(box3d.renderer, 'removeListener');
                detachSpy.withArgs(EVENT_SHOW_VR_BUTTON);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_SHOW_VR_BUTTON).called).to.be.true;
            });

            it('should invoke box3d.renderer.removeListener() with EVENT_ERROR', () => {
                const detachSpy = sandbox.spy(box3d.renderer, 'removeListener');
                detachSpy.withArgs(EVENT_ERROR);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_ERROR).called).to.be.true;
            });

            it('should invoke box3d.renderer.removeListener() with EVENT_WEBGL_CONTEXT_RESTORED', () => {
                const detachSpy = sandbox.spy(box3d.renderer, 'removeListener');
                detachSpy.withArgs(EVENT_WEBGL_CONTEXT_RESTORED);

                box3d.detachEventHandlers();

                expect(detachSpy.withArgs(EVENT_WEBGL_CONTEXT_RESTORED).called).to.be.true;
            });
        });

        it('should not invoke renderer.removeListener() when renderer is undefined', () => {
            const detachSpy = sandbox.spy(box3d.renderer, 'removeListener');
            // Only checking first method call in block
            detachSpy.withArgs(EVENT_SCENE_LOADED);

            box3d.renderer = undefined;
            box3d.detachEventHandlers();

            expect(detachSpy.withArgs(EVENT_SCENE_LOADED).called).to.be.false;
        });
    });

    describe('resize()', () => {
        const resizeFunc = BaseViewer.prototype.resize;

        beforeEach(() => {
            box3d.renderer.resize = sandbox.stub();
        });

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: resizeFunc });
        });

        it('should call super.resize()', () => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: sandbox.mock() });
            box3d.resize();
        });

        it('should call renderer.resize() when it exists', () => {
            Object.defineProperty(BaseViewer.prototype, 'resize', { value: sandbox.stub() });
            box3d.resize();
            expect(box3d.renderer.resize).to.be.called;
        });
    });

    describe('destroy()', () => {
        it('should detach event handlers', () => {
            sandbox.stub(box3d, 'detachEventHandlers');

            box3d.destroy();

            expect(box3d.detachEventHandlers).to.be.called;
        });

        it('should call controls.destroy() if it exists', () => {
            sandbox.stub(box3d.controls, 'destroy');

            box3d.destroy();

            expect(box3d.controls.destroy).to.be.called;
        });

        it('should call renderer.destroy() if it exists', () => {
            sandbox.stub(box3d.renderer, 'destroy');

            box3d.destroy();

            expect(box3d.renderer.destroy).to.be.called;
        });

        it('should set .destroyed to true', () => {
            box3d.destroy();
            expect(box3d.destroyed).to.be.true;
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should call renderer.load()', () => {
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
            box3d.containerEl = containerEl;
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });
            sandbox.stub(box3d, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(box3d, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(box3d, 'postLoad');
            return box3d.load().then(() => {
                expect(box3d.postLoad).to.be.called;
            });
        });
    });

    describe('postLoad()', () => {
        it('should setup a Box SDK, create sub modules, and attach event handlers', () => {
            sandbox.stub(box3d, 'attachEventHandlers');

            box3d.postLoad();

            expect(box3d.createSubModules).to.be.called;
            expect(box3d.attachEventHandlers).to.be.called;
            expect(box3d.boxSdk).to.be.an.object;
        });

        it('should call renderer.load() with the entities.json file and options', () => {
            const contentUrl = 'someEntitiesJsonUrl';
            sandbox.stub(box3d, 'createContentUrl').returns(contentUrl);
            sandbox.mock(box3d.renderer).expects('load').withArgs(contentUrl, box3d.options).returns(Promise.resolve());

            box3d.postLoad();
        });
    });

    describe('prefetch()', () => {
        it('should prefetch assets if assets is true', () => {
            sandbox.stub(box3d, 'prefetchAssets');
            box3d.prefetch({ assets: true, content: false });
            expect(box3d.prefetchAssets).to.be.called;
        });

        it('should prefetch content if content is true and representation is ready', () => {
            const headers = {};
            const contentUrl = 'someContentUrl';
            sandbox.stub(box3d, 'createContentUrl').returns(contentUrl);
            sandbox.stub(box3d, 'appendAuthHeader').returns(headers);
            sandbox.stub(box3d, 'isRepresentationReady').returns(true);
            sandbox.mock(util).expects('get').withArgs(contentUrl, headers, 'any');

            box3d.prefetch({ assets: false, content: true });
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(box3d, 'isRepresentationReady').returns(false);
            sandbox.mock(util).expects('get').never();
            box3d.prefetch({ assets: false, content: true });
        });
    });

    describe('toggleFullscreen()', () => {
        it('should call fullscreen.toggle()', () => {
            Object.defineProperty(Object.getPrototypeOf(fullscreen), 'toggle', {
                value: sandbox.spy()
            });

            box3d.toggleFullscreen();

            expect(fullscreen.toggle.called).to.be.true;
        });

        it('should call fullsceen.toggle() with parent container element', () => {
            const toggleSpy = sandbox.spy();
            toggleSpy.withArgs(box3d.containerEl);
            Object.defineProperty(Object.getPrototypeOf(fullscreen), 'toggle', {
                value: toggleSpy
            });

            box3d.toggleFullscreen();

            expect(toggleSpy.withArgs(box3d.containerEl).called).to.be.true;
        });
    });

    describe('handleToggleVr()', () => {
        it('should call renderer.toggleVr()', () => {
            box3d.renderer.toggleVr = sandbox.mock();
            box3d.handleToggleVr();
        });
    });

    describe('onVrPresentChange()', () => {
        beforeEach(() => {
            box3d.renderer.box3d = {
                getVrDisplay: sandbox.stub().returns({
                    isPresenting: true
                })
            };
            box3d.controls.vrEnabled = false;
        });

        it('should not do anything on desktop', () => {
            sandbox.stub(Browser, 'isMobile').returns(false);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).to.not.have.class('vr-enabled');
            expect(box3d.controls.vrEnabled).to.be.false;
        });

        it('should add vr-enabled class to wrapper and set controls property if VR is presenting on mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).to.have.class('vr-enabled');
            expect(box3d.controls.vrEnabled).to.be.true;
        });

        it('should not add vr-enabled class to wrapper and not set controls property if on mobile, but VR is not presenting', () => {
            box3d.renderer.box3d.getVrDisplay = sandbox.stub().returns({
                isPresenting: false
            });
            sandbox.stub(Browser, 'isMobile').returns(true);

            box3d.onVrPresentChange();

            expect(box3d.wrapperEl).to.not.have.class('vr-enabled');
            expect(box3d.controls.vrEnabled).to.not.be.true;
        });
    });

    describe('handleSceneLoaded()', () => {
        let eventNameUsed;
        beforeEach(() => {
            sandbox.stub(box3d, 'emit').callsFake((eventName) => {
                eventNameUsed = eventName;
            });
            box3d.controls.addUi = sandbox.stub();
        });

        afterEach(() => {
            expect(eventNameUsed).to.equal(EVENT_LOAD);
        });

        it('should set .loaded to true', () => {
            box3d.handleSceneLoaded();
            expect(box3d.loaded).to.be.true;
        });
        it('should call controls.addUi() if it exists', () => {
            box3d.handleSceneLoaded();
            expect(box3d.controls.addUi).to.be.called;
        });
    });

    describe('handleShowVrButton()', () => {
        it('should call controls.showVrButton()', () => {
            box3d.controls.showVrButton = sandbox.mock();
            box3d.handleShowVrButton();
        });
    });

    describe('handleReset()', () => {
        it('should call renderer.reset()', () => {
            box3d.renderer.reset = sandbox.mock();
            box3d.handleReset();
        });
    });

    describe('handleError()', () => {
        it('should call emit() with params ["error", error_object]', () => {
            const error = {};
            const emitStub = sandbox.stub(box3d, 'emit').callsFake((eventName, errorObj) => {
                expect(eventName).to.equal(EVENT_ERROR);
                expect(errorObj).to.equal(error);
            });

            box3d.handleError(error);

            expect(emitStub).to.be.called;
        });
    });

    describe('handleContextLost()', () => {
        it('should call destroySubModules', () => {
            const destroySubModules = sandbox.stub(box3d, 'destroySubModules').callsFake(() => {});
            box3d.handleContextLost();
            expect(destroySubModules).to.be.called;
        });
    });

    describe('handleContextRestored()', () => {
        it('should call emit() with params ["progressstart"]', () => {
            const emitStub = sandbox.stub(box3d, 'emit').callsFake((eventName) => {
                expect(eventName).to.equal(VIEWER_EVENTS.progressStart);
            });

            box3d.handleContextRestored();

            expect(emitStub).to.be.called;
        });

        it('should call detachEventHandlers', () => {
            const detachHandlers = sandbox.stub(box3d, 'detachEventHandlers');
            box3d.handleContextRestored();
            expect(detachHandlers).to.be.called;
        });

        it('should call postLoad', () => {
            box3d.postLoad = sandbox.stub();
            box3d.handleContextRestored();
            expect(box3d.postLoad).to.be.called;
        });
    });
});
