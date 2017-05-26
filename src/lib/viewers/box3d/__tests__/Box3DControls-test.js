/* eslint-disable no-unused-expressions */
import Box3DControls from '../Box3DControls';
import Controls from '../../../Controls';
import { UIRegistry } from '../Box3DUIUtils';
import { CLASS_HIDDEN } from '../../../constants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_3D_VR } from '../../../icons/icons';
import { EVENT_RESET, EVENT_SCENE_LOADED, EVENT_TOGGLE_FULLSCREEN, EVENT_TOGGLE_VR } from '../box3DConstants';

const sandbox = sinon.sandbox.create();

let containerEl;
let controls;

describe('lib/viewers/box3d/Box3DControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DControls-test.html');
        containerEl = document.querySelector('.container');
        controls = new Box3DControls(containerEl);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
        fixture.cleanup();
    });

    describe('constructor()', () => {
        it('should set .el to passed in container element', () => {
            expect(controls.el).to.deep.equal(containerEl);
        });

        it('should create new Controls instance for .controls', () => {
            expect(controls.controls).to.be.an.instanceof(Controls);
        });

        it('should create new UIRegistry for .uiRegistry', () => {
            expect(controls.uiRegistry).to.be.an.instanceof(UIRegistry);
        });
    });

    describe('addUi()', () => {
        it('should call .addVrButton()', () => {
            const stub = sandbox.stub(controls, 'addVrButton');
            controls.addUi();

            expect(stub).to.be.called;
        });

        it('should call .addFullscreenButton()', () => {
            const stub = sandbox.stub(controls, 'addFullscreenButton');
            controls.addUi();

            expect(stub).to.be.called;
        });

        it('should call .hideVrButton()', () => {
            const stub = sandbox.stub(controls, 'hideVrButton');
            controls.addUi();

            expect(stub).to.be.called;
        });
    });

    describe('addFullscreenButton()', () => {
        beforeEach(() => {
            sandbox.stub(controls.controls, 'add');
            controls.addFullscreenButton();
        });

        it('should invoke controls.add() with enter fullscreen button params', () => {
            expect(controls.controls.add).to.be.calledWith(
                'Enter fullscreen',
                controls.handleToggleFullscreen,
                'bp-enter-fullscreen-icon',
                ICON_FULLSCREEN_IN
            );
        });

        it('should invoke controls.add() with exit fullscreen button params', () => {
            expect(controls.controls.add).to.be.calledWith(
                'Exit fullscreen',
                controls.handleToggleFullscreen,
                'bp-exit-fullscreen-icon',
                ICON_FULLSCREEN_OUT
            );
        });
    });

    describe('addVrButton()', () => {
        it('should invoke controls.add() with vr button params', () => {
            const vrAddStub = sandbox.stub(controls.controls, 'add');
            controls.addVrButton();

            expect(vrAddStub).to.be.calledWith('Toggle VR display', controls.handleToggleVr, '', ICON_3D_VR);
        });
    });

    describe('handleSceneLoaded()', () => {
        it('should call emit() with EVENT_SCENE_LOADED', () => {
            const emitStub = sandbox.stub(controls, 'emit');
            controls.handleSceneLoaded();

            expect(emitStub).to.be.calledWith(EVENT_SCENE_LOADED);
        });
    });

    describe('handleToggleVr()', () => {
        it('should call emit() with EVENT_TOGGLE_VR', () => {
            const emitStub = sandbox.stub(controls, 'emit');
            controls.handleToggleVr();

            expect(emitStub).to.be.calledWith(EVENT_TOGGLE_VR);
        });
    });

    describe('handleToggleFullscreen()', () => {
        it('should call emit() with EVENT_TOGGLE_FULLSCREEN', () => {
            const emitStub = sandbox.stub(controls, 'emit');
            controls.handleToggleFullscreen();

            expect(emitStub).to.be.calledWith(EVENT_TOGGLE_FULLSCREEN);
        });
    });

    describe('handleReset()', () => {
        it('should call emit() with EVENT_RESET', () => {
            const emitStub = sandbox.stub(controls, 'emit');
            controls.handleReset();

            expect(emitStub).to.be.calledWith(EVENT_RESET);
        });
    });

    describe('showVrButton()', () => {
        it('should should remove CLASS_HIDDEN to vrButtonEl if it exists', () => {
            const removeStub = sandbox.stub();
            controls.vrButtonEl = {
                classList: {
                    remove: removeStub
                }
            };

            controls.showVrButton();

            expect(removeStub).to.be.calledWith(CLASS_HIDDEN);
        });
    });

    describe('hideVrButton()', () => {
        it('should should add CLASS_HIDDEN to vrButtonEl if it exists', () => {
            const addStub = sandbox.stub();
            controls.vrButtonEl = {
                classList: {
                    add: addStub
                }
            };

            controls.hideVrButton();

            expect(addStub).to.be.calledWith(CLASS_HIDDEN);
        });
    });

    describe('setElementVisibility()', () => {
        let el;
        beforeEach(() => {
            el = {
                classList: {
                    add: sandbox.stub(),
                    remove: sandbox.stub()
                }
            };
        });

        afterEach(() => {
            el = null;
        });

        it('should element.classList.remove() with CLASS_HIDDEN from provided element if visible param is true', () => {
            controls.setElementVisibility(el, true);
            expect(el.classList.remove).to.be.calledWith(CLASS_HIDDEN);
        });

        it('should element.classList.add() with CLASS_HIDDEN to provided element if visible param is false', () => {
            controls.setElementVisibility(el, false);
            expect(el.classList.add).to.be.calledWith(CLASS_HIDDEN);
        });

        it('should invoke element.classList.add() with CLASS_HIDDEN to provided element if visible param is missing', () => {
            controls.setElementVisibility(el);
            expect(el.classList.add).to.be.calledWith(CLASS_HIDDEN);
        });
    });

    describe('toggleElementVisibility()', () => {
        it('should invoke element.classList.toggle() with CLASS_HIDDEN', () => {
            const el = {
                classList: {
                    toggle: sandbox.stub()
                }
            };

            controls.toggleElementVisibility(el);

            expect(el.classList.toggle).to.be.calledWith(CLASS_HIDDEN);
        });
    });

    describe('destroy()', () => {
        it('should call controls.destroy() if .controls exists', () => {
            const destroyStub = sandbox.stub(controls.controls, 'destroy');
            controls.destroy();

            expect(destroyStub).to.be.called;
        });

        it('should not call controls.destroy() if .controls doesn\'t exist', () => {
            const destroyStub = sandbox.stub(controls.controls, 'destroy');
            controls.controls = null;
            controls.destroy();

            expect(destroyStub).to.not.be.called;
        });

        it('should nullify .controls', () => {
            controls.destroy();
            expect(controls.controls).to.not.exist;
        });

        it('should call uiRegistry.unregisterAll() if .uiRegistry exists', () => {
            const unregisterStub = sandbox.stub(controls.uiRegistry, 'unregisterAll');
            controls.destroy();

            expect(unregisterStub).to.be.called;
        });

        it('should not call uiRegistry.unregisterAll() if .uiRegistry doesn\'t exist', () => {
            const unregisterStub = sandbox.stub(controls.uiRegistry, 'unregisterAll');
            controls.uiRegistry = null;
            controls.destroy();

            expect(unregisterStub).to.not.be.called;
        });

        it('should nullify uiRegistry', () => {
            controls.destroy();
            expect(controls.uiRegistry).to.not.exist;
        });
    });
});
