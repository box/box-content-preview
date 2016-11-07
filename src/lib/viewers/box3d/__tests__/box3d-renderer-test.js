/* eslint-disable no-unused-expressions */
import Box3DRenderer from '../box3d-renderer';

const sandbox = sinon.sandbox.create();

let containerEl;
let renderer;
let stubs = {};

describe('box3d-renderer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/box3d-renderer-test.html');
        stubs.THREE = sandbox.stub(window, 'THREE');
        containerEl = document.querySelector('.container');
        renderer = new Box3DRenderer(containerEl, {});
    });

    afterEach(() => {
        renderer = null;
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('constructor()', () => {
        it('should correctly set container element, BoxSDK and add a render event listener', () => {
            expect(renderer.containerEl).to.equal(containerEl);
            expect(renderer.boxSdk).to.exist;
            expect(renderer._events).to.exist;
            expect(renderer._events.triggerRender).to.exist;
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            renderer.box3d = {
                uninitialize: sandbox.stub()
            };
        });

        it('should call uninitialize on the engine', () => {
            const uninitializeStub = renderer.box3d.uninitialize;

            renderer.destroy();

            expect(uninitializeStub).to.have.been.called;
        });

        it('should fully shutdown by disabling vr and unbinding events ', () => {
            const disableVrSpy = sandbox.spy(renderer, 'disableVr');

            renderer.destroy();

            expect(disableVrSpy.called).to.be.true;
        });

        it('should not call Box3D cleanup path if no Box3D engine', () => {
            renderer.box3d = null;

            renderer.destroy();

            expect(renderer._events.triggerRender).to.not.exist;
        });

        it('should remove the reference to box3d', () => {
            renderer.destroy();

            expect(renderer.box3d).to.not.exist;
        });
    });

    describe('load()', () => {
        it('should return a promise', () => {
            // We don't care about the error, but we'll catch it
            const loadPromise = renderer.load().catch(() => {});
            expect(loadPromise).to.be.a('promise');
        });
    });

    describe('reset()', () => {
        const RESET_CAMERA_EVENT = 'resetOrbitCameraController';
        let camera;
        beforeEach(() => {
            camera = {
                trigger: sandbox.spy()
            };

            renderer.box3d = {
                getObjectById: sandbox.stub().returns(camera)
            };
        });

        it('should trigger "resetOrbitCameraController" event on the camera', () => {
            camera.trigger.withArgs(RESET_CAMERA_EVENT);

            renderer.reset();

            expect(camera.trigger.withArgs(RESET_CAMERA_EVENT).called).to.be.true;
        });

        it('should not trigger "resetOrbitCameraController" event on the camera when VR is enabled', () => {
            camera.trigger.withArgs(RESET_CAMERA_EVENT);

            renderer.vrEnabled = true;
            renderer.reset();

            expect(camera.trigger.withArgs(RESET_CAMERA_EVENT).called).to.be.false;
        });
    });

    describe('getCamera()', () => {
        it('should return a camera object if one exists in the scene', () => {
            renderer.box3d = {
                getObjectById: sandbox.stub().returns({})
            };

            const camera = renderer.getCamera();
            expect(camera).to.exist;
        });

        it('should return null if no scene present', () => {
            const camera = renderer.getCamera();
            expect(camera).to.not.exist;
        });
    });

    describe('getAspect()', () => {
        it('should return aspect ratio of container element', () => {
            renderer.containerEl = {
                clientWidth: 5,
                clientHeight: 10
            };

            expect(renderer.getAspect()).to.equal(0.5);
        });
    });

    describe('getScene()', () => {
        it('should return the scene prefab that exists in the Box3D runtime', () => {
            renderer.box3d = {
                getEntityById: sandbox.stub().returns({})
            };

            const scene = renderer.getScene();
            expect(scene).to.exist;
        });

        it('should return null if the Box3D runtime is missing', () => {
            const scene = renderer.getScene();
            expect(scene).to.not.exist;
        });
    });

    describe('getBox3D()', () => {
        it('should return whatever exists in the box3d reference', () => {
            expect(renderer.getBox3D()).to.not.exist;

            renderer.box3d = {};
            expect(renderer.getBox3D()).to.be.an('object');

            renderer.box3d = 'foo';
            expect(renderer.getBox3D()).to.be.a('string');
        });
    });

    describe('initBox3d()', () => {
        describe('missing global Box3D', () => {
            let box3D;

            beforeEach(() => {
                box3D = window.Box3D;
            });

            afterEach(() => {
                window.Box3D = box3D;
            });

            it('should fail when no global Box3D present', (done) => {
                window.Box3D = undefined;
                const rejected = renderer.initBox3d();

                expect(rejected).to.be.a('promise');

                rejected.catch((err) => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('Missing Box3D');
                    done();
                });
            });
        });

        describe('with global Box3D and ResourceLoader', () => {
            it('should fail when missing file property on option', (done) => {
                const rejected = renderer.initBox3d({});

                expect(rejected).to.be.a('promise');

                rejected.catch((err) => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('Missing file version');
                    done();
                });
            });

            it('should fail when file option is missing version property', (done) => {
                const rejected = renderer.initBox3d({ file: {} });

                expect(rejected).to.be.a('promise');

                rejected.catch((err) => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('Missing file version');
                    done();
                });
            });

            it('should create a new box3d instance', () => {
                const expectedEntities = {
                    one: 'a',
                    two: 'b'
                };

                const expectedInputSettings = {
                    key_board: 'enabled',
                    mouse: 'disabled'
                };

                const creatBox3DStub = sandbox.stub(renderer, 'createBox3d', (loader, entities, inputSettings) => {
                    expect(loader).to.be.an.instanceof(window.Box3D.XhrResourceLoader);
                    expect(entities).to.deep.equal(expectedEntities);
                    expect(inputSettings).to.deep.equal(expectedInputSettings);
                });

                renderer.initBox3d({
                    file: { file_version: 'abcdef' },
                    sceneEntities: expectedEntities,
                    inputSettings: expectedInputSettings
                });

                expect(creatBox3DStub).to.have.been.called;
            });
        });
    });

    describe('createBox3d()', () => {
        let box3D;

        beforeEach(() => {
            box3D = window.Box3D;
        });

        afterEach(() => {
            window.Box3D = box3D;
        });

        it('should create new Box3D engine instance, initialize it with properties, load an app, and resolve in the new Box3D', (done) => {
            const loader = { name: 'loader' };
            const entities = { name: 'entities' };
            const inputSettings = { name: 'some_settings' };
            const expectedInitProps = {
                container: containerEl,
                engineName: 'Default',
                entities,
                inputSettings,
                resourceLoader: loader
            };
            let initProps;
            const Box3DFake = {
                Engine: function contructor() {
                    this.initialize = function init(props, callback) {
                        initProps = props;
                        callback();
                    };

                    this.getAssetById = sandbox.stub().returns({
                        load: function load(onLoad) {
                            onLoad();
                        }
                    });
                }
            };
            window.Box3D = Box3DFake;

            const callPromise = renderer.createBox3d(loader, entities, inputSettings).then((b3d) => {
                expect(b3d).to.be.an.instanceof(window.Box3D.Engine);
                expect(initProps).to.deep.equal(expectedInitProps);
                expect(callPromise).to.be.a('promise');
                done();
            });
        });

        it('should return a promise', () => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.initialize = function init() {};
                }
            };
            window.Box3D = Box3DFake;

            // We don't care about the error
            const shouldBePromise = renderer.createBox3d({}, {}).catch(() => {});
            expect(shouldBePromise).to.be.a('promise');
        });

        it('should not set reference if error occurs initializing engine', (done) => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.initialize = function init() {
                        throw new Error('Error while initializing');
                    };
                }
            };
            window.Box3D = Box3DFake;

            renderer.createBox3d({}, {}).catch(() => {
                expect(renderer.box3d).to.not.exist;
                done();
            });
        });

        it('should not set reference if error loading app', (done) => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.initialize = function initialize(props, callback) {
                        callback();
                    };

                    this.getAssetById = function getAssetById() {
                        return {
                            load: function load() {
                                throw new Error('Error while loading');
                            }
                        };
                    };
                }
            };
            window.Box3D = Box3DFake;

            renderer.createBox3d({}, {}).catch(() => {
                expect(renderer.box3d).to.not.exist;
                done();
            });
        });
    });

    describe('onSceneLoad()', () => {
        it('should emit a scene loaded event and init VR mode if present', () => {
            sandbox.stub(window.Box3D, 'isTablet', () => false);

            const emitSpy = sandbox.spy(renderer, 'emit');
            emitSpy.withArgs('sceneLoaded');
            const initVRSpy = sandbox.spy(renderer, 'initVrIfPresent');

            renderer.onSceneLoad();

            expect(emitSpy.withArgs('sceneLoaded').calledOnce).to.be.true;
            expect(initVRSpy.calledOnce).to.be.true;
        });
    });

    describe('toggleVr()', () => {
        it('should enable vr if it\'s currently disabled', () => {
            let called = false;
            sandbox.stub(renderer, 'enableVr', () => { called = true; });
            renderer.toggleVr();
            expect(called).to.be.true;
        });

        it('should disable vr if it\'s currently enabled', () => {
            let called = false;
            sandbox.stub(renderer, 'disableVr', () => { called = true; });
            renderer.vrEnabled = true;
            renderer.toggleVr();
            expect(called).to.be.true;
        });
    });

    describe('initCameraForVr()', () => {});

    describe('enableVr()', () => {});

    describe('renderVR()', () => {});

    describe('disableVr()', () => {
        it('should not run if vr is disabled', () => {
            const disposeSpy = sandbox.spy();
            renderer.vrControls = {
                dispose: disposeSpy
            };

            renderer.vrEnabled = false;
            renderer.disableVr();

            expect(disposeSpy.called).to.be.false;
        });

        it('should dispose of controls, disable Box3D postupdate listener, exit VR, and reset Box3D render on demand state');

        it('should disable render view component effect on active camera');
    });

    describe('updateVrControls()', () => {});

    describe('handleOnRender()', () => {});

    describe('resize()', () => {
        it('should do nothing if Box3D doesn\'t exist', () => {
            const shouldNotThrow = () => {
                renderer.resize();
            };

            expect(shouldNotThrow).to.not.throw(Error);
        });

        it('should trigger resize on Box3D', () => {
            const triggerSpy = sandbox.spy();
            triggerSpy.withArgs('resize');

            renderer.box3d = {
                trigger: triggerSpy
            };
            renderer.resize();

            expect(triggerSpy.withArgs('resize').calledOnce).to.be.true;
        });
    });

    describe('enableCameraControls()', () => {});

    describe('disableCameraControls()', () => {});

    describe('onVrPresentChange()', () => {});

    describe('initVrIfPresent()', () => {});
});
