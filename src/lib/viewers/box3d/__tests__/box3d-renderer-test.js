/* eslint-disable no-unused-expressions */
import Box3DRenderer from '../box3d-renderer';
import Cache from '../../../cache';

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
                pause: sandbox.stub(),
                trigger: sandbox.stub(),
                resourceLoader: {
                    destroy: sandbox.spy()
                }
            };
        });

        it('should fully shutdown by disabling vr, hiding canvas, unbinding events and destryoing resourceLoader', () => {
            const hideBox3dSpy = sandbox.spy(renderer, 'hideBox3d');
            const disableVrSpy = sandbox.spy(renderer, 'disableVr');

            renderer.destroy();

            expect(hideBox3dSpy.called).to.be.true;
            expect(disableVrSpy.called).to.be.true;
            expect(renderer.box3d.resourceLoader.destroy.called).to.be.true;
        });

        it('should not call Box3D cleanup path if no Box3D engine', () => {
            renderer.box3d = null;

            const hideBox3dSpy = sandbox.spy(renderer, 'hideBox3d');
            renderer.destroy();

            expect(hideBox3dSpy.called).to.be.false;
            expect(renderer._events.triggerRender).to.not.exist;
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
        it('should return the scene that exists in the Box3D asset registry', () => {
            renderer.box3d = {
                getAssetById: sandbox.stub().returns({})
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
        describe('missing global Box3D OR Box3DResourceLoader', () => {
            let box3D;
            let resourceLoader;

            beforeEach(() => {
                box3D = window.Box3D;
                resourceLoader = window.Box3DResourceLoader;
            });

            afterEach(() => {
                window.Box3D = box3D;
                window.Box3DResourceLoader = resourceLoader;
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

            it('should fail when no global Box3DResourceLoader present', (done) => {
                window.Box3DResourceLoader = undefined;

                const rejected = renderer.initBox3d();

                expect(rejected).to.be.a('promise');

                rejected.catch((err) => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('Missing Box3DResourceLoader');
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

            it('should create a new box3d instance if it doesn\'t exist in the cache', () => {
                Object.defineProperty(Object.getPrototypeOf(Cache), 'get', {
                    value: sandbox.stub().returns(null)
                });

                const expectedEntities = {
                    one: 'a',
                    two: 'b'
                };

                const expectedInputSettings = {
                    key_board: 'enabled',
                    mouse: 'disabled'
                };

                const creatBox3DStub = sandbox.stub(renderer, 'createBox3d', (loader, entities, inputSettings) => {
                    expect(loader).to.be.an.instanceof(window.Box3DResourceLoader);
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

            it('should get the cached box3d instance if in the cache', () => {
                Object.defineProperty(Object.getPrototypeOf(Cache), 'get', {
                    value: sandbox.stub().returns({})
                });

                const getFromCacheStub = sandbox.stub(renderer, 'getBox3DFromCache', (loader) => {
                    expect(loader).to.be.an.instanceof(window.Box3DResourceLoader);
                });

                renderer.initBox3d({ file: { file_version: 'abcdef' } });

                expect(getFromCacheStub).to.have.been.called;
            });
        });
    });

    describe('getBox3DFromCache()', () => {
        it('should call showBox3D, assign a loader, and return a promise resolved with Box3D instance', (done) => {
            const box3d = { name: 'fooey' };
            const loader = { name: 'loader' };

            Object.defineProperty(Object.getPrototypeOf(Cache), 'get', {
                value: sandbox.stub().returns(box3d)
            });

            const showStub = sandbox.stub(renderer, 'showBox3d');

            renderer.getBox3DFromCache(loader).then((b3d) => {
                expect(b3d).to.deep.equal(box3d);
                expect(renderer.box3d).to.deep.equal(b3d);
                expect(b3d.resourceLoader).to.deep.equal(loader);
                expect(showStub).to.have.been.called;
                done();
            });
        });
    });

    describe('createBox3d()', () => {
        let box3D;
        let resourceLoader;

        beforeEach(() => {
            box3D = window.Box3D;
            resourceLoader = window.Box3DResourceLoader;
        });

        afterEach(() => {
            window.Box3D = box3D;
            window.Box3DResourceLoader = resourceLoader;
        });

        it('should create new Box3D engine instance, initialize it with properties, load an app, and resolve in the new (and cached) Box3D', (done) => {
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

        it('should not add box3d to cache and set reference if error occurs initializing engine', (done) => {
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

        it('should not add box3d to cache if error loading app', (done) => {
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

    describe('showBox3d()', () => {
        it('should do nothing if Box3D reference does not exist', () => {
            const show3D = () => {
                renderer.showBox3d();
            };
            expect(show3D).to.not.throw(Error);
        });

        it('should unpause and trigger a resize event', () => {
            const unpauseSpy = sandbox.spy();
            const triggerSpy = sandbox.spy();
            triggerSpy.withArgs('resize');
            renderer.box3d = {
                unpause: unpauseSpy,
                trigger: triggerSpy,
                container: {} // To prevent addition of container element
            };

            renderer.showBox3d();

            expect(unpauseSpy.calledOnce).to.be.true;
            expect(triggerSpy.withArgs('resize').calledOnce).to.be.true;
        });

        it('should append canvas element to containerEl', () => {
            renderer.box3d = {
                unpause: sandbox.stub(),
                trigger: sandbox.stub(),
                canvas: document.createElement('canvas')
            };

            renderer.showBox3d();

            const canvas = containerEl.querySelector('canvas');
            expect(canvas).to.exist;
        });
    });

    describe('hideBox3d()', () => {
        it('should do nothing if Box3D reference is missing', () => {
            const hide3D = () => {
                renderer.hideBox3d();
            };
            expect(hide3D).to.not.throw(Error);
        });

        it('should trigger an update event, trigger a render event, set box3d.container to null, and pause the runtime', () => {
            const triggerSpy = sandbox.spy();
            triggerSpy.withArgs('update');
            triggerSpy.withArgs('render');
            const pauseSpy = sandbox.spy();

            renderer.box3d = {
                trigger: triggerSpy,
                pause: pauseSpy,
                container: undefined // Just to test nullification
            };

            renderer.hideBox3d();

            expect(triggerSpy.withArgs('update').calledOnce).to.be.true;
            expect(triggerSpy.withArgs('render').calledOnce).to.be.true;
            expect(pauseSpy.calledOnce).to.be.true;
            expect(renderer.box3d.container).to.not.exist;
        });

        it('should remove the Box3D canvas from the containerEl', () => {
            const canvasEl = document.createElement('canvas');
            containerEl.appendChild(canvasEl);

            renderer.box3d = {
                trigger: sandbox.stub(),
                pause: sandbox.stub(),
                container: containerEl,
                canvas: canvasEl
            };

            renderer.hideBox3d();

            expect(renderer.box3d.container).to.not.exist;
            expect(containerEl.querySelector('canvas')).to.not.exist;
            expect(canvasEl.parentNode).to.not.exist;
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
