/* eslint-disable no-unused-expressions */
import Box3D from '../box3d';
import Base from '../../base';
import fullscreen from '../../../fullscreen';
import {
    EVENT_ERROR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR
} from '../box3d-constants';

const sandbox = sinon.sandbox.create();

let containerEl;
let box3d;
let stubs = {};

describe('box3d', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/box3d-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = sandbox.stub(window, 'BoxSDK');
        box3d = new Box3D(containerEl, {});
    });

    afterEach(() => {
        box3d.destroy();
        box3d = undefined;
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
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
        it('should call super.resize()', () => {
            Object.defineProperty(Object.getPrototypeOf(Box3D.prototype), 'resize', {
                value: sandbox.stub()
            });

            box3d.resize();

            expect(Base.prototype.resize).to.have.been.called;
        });

        it('should call renderer.resize() when it exists', () => {
            Object.defineProperty(Object.getPrototypeOf(Box3D.prototype), 'resize', {
                value: sandbox.stub()
            });
            sandbox.stub(box3d.renderer, 'resize');

            box3d.resize();

            expect(box3d.renderer.resize).to.have.been.called;
            expect(Base.prototype.resize).to.have.been.called;
        });
    });

    describe('destroy()', () => {
        it('should detach event handlers', () => {
            sandbox.stub(box3d, 'detachEventHandlers');

            box3d.destroy();

            expect(box3d.detachEventHandlers).to.have.been.called;
        });

        it('should call controls.destroy() if it exists', () => {
            sandbox.stub(box3d.controls, 'destroy');

            box3d.destroy();

            expect(box3d.controls.destroy).to.have.been.called;
        });

        it('should call renderer.destroy() if it exists', () => {
            sandbox.stub(box3d.renderer, 'destroy');

            box3d.destroy();

            expect(box3d.renderer.destroy).to.have.been.called;
        });

        it('should set .destroyed to true', () => {
            box3d.destroy();
            expect(box3d.destroyed).to.be.true;
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            Object.defineProperty(Object.getPrototypeOf(Box3D.prototype), 'load', {
                value: sandbox.stub()
            });
        });

        afterEach(() => {
            expect(Base.prototype.load).to.have.been.called;
        });

        it('should call renderer.load()', () => {
            sandbox.stub(box3d.renderer, 'load', () => { return new Promise(() => {}, () => {}); });
            box3d.load('');

            expect(box3d.renderer.load).to.have.been.called;
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
            sandbox.stub(box3d.renderer, 'toggleVr');
            box3d.handleToggleVr();

            expect(box3d.renderer.toggleVr).to.have.been.called;
        });
    });

    describe('handleSceneLoaded()', () => {
        let eventNameUsed;
        beforeEach(() => {
            sandbox.stub(box3d, 'emit', (eventName) => {
                eventNameUsed = eventName;
            });
        });

        afterEach(() => {
            expect(eventNameUsed).to.equal(EVENT_LOAD);
        });

        it('should set .loaded to true', () => {
            box3d.handleSceneLoaded();
            expect(box3d.loaded).to.be.true;
        });
        it('should call controls.addUi() if it exists', () => {
            sandbox.stub(box3d.controls, 'addUi');
            box3d.handleSceneLoaded();

            expect(box3d.controls.addUi).to.have.been.called;
        });
    });

    describe('handleShowVrButton()', () => {
        it('should call controls.showVrButton()', () => {
            sandbox.stub(box3d.controls, 'showVrButton');

            box3d.handleShowVrButton();

            expect(box3d.controls.showVrButton).to.have.been.called;
        });
    });

    describe('handleReset()', () => {
        it('should call renderer.reset()', () => {
            sandbox.stub(box3d.renderer, 'reset');

            box3d.handleReset();

            expect(box3d.renderer.reset).to.have.been.called;
        });
    });

    describe('handleError()', () => {
        it('should call emit() with params ["error", error_object]', () => {
            const error = {};
            const emitStub = sandbox.stub(box3d, 'emit', (eventName, errorObj) => {
                expect(eventName).to.equal(EVENT_ERROR);
                expect(errorObj).to.equal(error);
            });

            box3d.handleError(error);

            expect(emitStub).to.have.been.called;
        });
    });
});
