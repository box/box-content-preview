/* global Box3D */
/* eslint-disable no-unused-expressions */
import Box3DRenderer from '../Box3DRenderer';
import Box3DRuntime from '../__mocks__/Box3DRuntime';
import { EVENT_SHOW_VR_BUTTON, EVENT_WEBGL_CONTEXT_RESTORED } from '../box3DConstants';

const sandbox = sinon.createSandbox();
const PREVIEW_CAMERA_CONTROLLER_ID = 'orbit_camera';

let containerEl;
let renderer;

describe('lib/viewers/box3d/Box3DRenderer', () => {
    beforeAll(() => {
        global.Box3D = Box3DRuntime;
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DRenderer-test.html');
        containerEl = document.querySelector('.container');
        renderer = new Box3DRenderer(containerEl, {});
    });

    afterEach(() => {
        renderer = null;
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('constructor()', () => {
        test('should correctly set container element, BoxSDK and add a render event listener', () => {
            expect(renderer.containerEl).toEqual(containerEl);
            expect(renderer.boxSdk).toBeDefined();
            expect(renderer._events).toBeDefined();
        });
    });

    describe('destroy()', () => {
        const stubs = {};

        beforeEach(() => {
            stubs.box3d = {
                destroy: jest.fn(),
            };
            renderer.box3d = stubs.box3d;
            renderer.disableVr = jest.fn();
        });

        test('should call destroy on the engine', () => {
            renderer.destroy();

            expect(stubs.box3d.destroy).toBeCalled();
        });

        test('should fully shutdown by disabling vr and unbinding events ', () => {
            renderer.destroy();

            expect(renderer.disableVr).toBeCalled();
        });

        test('should not call Box3D cleanup path if no Box3D engine', () => {
            renderer.box3d = null;
            renderer.destroy();

            expect(renderer.disableVr).not.toBeCalled();
        });

        test('should remove the reference to box3d', () => {
            renderer.destroy();

            expect(renderer.box3d).toBeNull();
        });
    });

    describe('load()', () => {
        test('should return a promise', () => {
            // We don't care about the error, but we'll catch it
            const loadPromise = renderer.load().catch(jest.fn());
            expect(loadPromise).toBeInstanceOf(Promise);
        });
    });

    describe('reset()', () => {
        let camera;
        let cameraMock;
        beforeEach(() => {
            camera = {
                setPosition: jest.fn(),
                setQuaternion: jest.fn(),
                trigger: jest.fn(),
            };
            renderer.box3d = {
                getObjectByClass: jest.fn().mockReturnValue(camera),
            };
            renderer.savedCameraPosition = { x: 0, y: 0, z: 0 };
            renderer.savedCameraQuaternion = { x: 0, y: 0, z: 0, w: 1 };
            cameraMock = sandbox.mock(camera);
        });

        test('should set camera position and orientation to default values', () => {
            cameraMock.expects('setPosition');
            cameraMock.expects('setQuaternion');

            renderer.reset();
        });
    });

    describe('getCamera()', () => {
        test('should return a camera object if one exists in the scene', () => {
            renderer.box3d = {
                getObjectByClass: jest.fn().mockReturnValue({}),
            };

            const camera = renderer.getCamera();
            expect(camera).toBeDefined();
        });

        test('should return null if no scene present', () => {
            const camera = renderer.getCamera();
            expect(camera).toBeNull();
        });
    });

    describe('getScene()', () => {
        test('should return the scene prefab that exists in the Box3D runtime', () => {
            renderer.box3d = {
                getObjectByClass: jest.fn().mockReturnValue({}),
            };

            const scene = renderer.getScene();
            expect(scene).toBeDefined();
        });

        test('should return null if the Box3D runtime is missing', () => {
            const scene = renderer.getScene();
            expect(scene).toBeNull();
        });
    });

    describe('getBox3D()', () => {
        test('should return whatever exists in the box3d reference', () => {
            expect(renderer.getBox3D()).not.toBeDefined();

            renderer.box3d = {};
            expect(typeof renderer.getBox3D()).toBe('object');

            renderer.box3d = 'foo';
            expect(typeof renderer.getBox3D()).toBe('string');
        });
    });

    describe('configureXHR()', () => {
        test('should return a Promise', () => {
            const promise = renderer.configureXHR({}, 'path/to/stuff.jpg', { isExternal: true });
            expect(promise).toBeInstanceOf(Promise);
        });

        test('should return a Promise that resolves in an XMLHttpRequest object', done => {
            const promise = renderer.configureXHR({}, 'path/to/stuff.wav', { isExternal: true });
            promise.then(xhr => {
                expect(xhr).toBeInstanceOf(XMLHttpRequest);
                done();
            });
        });

        test('should invoke .open() on the XMLHttpRequest object, with "GET" and the provided path', () => {
            const openSpy = jest.spyOn(XMLHttpRequest.prototype, 'open');
            const path = 'path/to/resource.psd';
            renderer.configureXHR({}, path, { isExternal: true });

            expect(openSpy).toBeCalledWith('GET', path);
        });

        test('should append "Authorization" request header to the XHR with the provided auth token', () => {
            const setReqHeaderSpy = jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader');
            const token = 'ABCDEFG';
            const expectedAuthHeaderValue = `Bearer ${token}`;

            renderer.configureXHR({ token }, 'a/path/tp/stuff.gif', { isExternal: false });

            expect(setReqHeaderSpy).toBeCalledWith('Authorization', expectedAuthHeaderValue);
        });

        test('should append "boxapi" request header to the XHR with the provided shared link', () => {
            jest.spyOn(window, 'encodeURI').mockImplementation(uri => {
                return uri;
            });
            const setReqHeaderSpy = jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader');
            const sharedLink = 'abcde';
            const expectedAuthHeaderValue = `shared_link=${sharedLink}`;

            renderer.configureXHR({ sharedLink, token: 'asdf' }, 'some/path.png');

            expect(setReqHeaderSpy).toBeCalledWith('boxapi', expectedAuthHeaderValue);
        });

        test('should append "boxapi" request header to the XHR with the shared link AND shared link password', () => {
            jest.spyOn(window, 'encodeURI').mockImplementation(uri => {
                return uri;
            });
            const setReqHeaderSpy = jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader');
            const sharedLink = 'abcde';
            const sharedLinkPassword = '!!myP455w0rD';
            const expectedAuthHeaderValue = `shared_link=${sharedLink}&shared_link_password=${sharedLinkPassword}`;

            renderer.configureXHR({ sharedLink, sharedLinkPassword, token: 'asdf' }, 'some/path.png');

            expect(setReqHeaderSpy).toBeCalledWith('boxapi', expectedAuthHeaderValue);
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

            test('should fail when no global Box3D present', done => {
                window.Box3D = undefined;
                const rejected = renderer.initBox3d();

                expect(rejected).toBeInstanceOf(Promise);

                rejected.catch(err => {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toBe('Missing Box3D');
                    done();
                });
            });
        });

        describe('with global Box3D', () => {
            test('should fail when missing file property on option', done => {
                const rejected = renderer.initBox3d({});

                expect(rejected).toBeInstanceOf(Promise);

                rejected.catch(err => {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toBe('Missing file version');
                    done();
                });
            });

            test('should fail when file option is missing version property', done => {
                const rejected = renderer.initBox3d({ file: {} });

                expect(rejected).toBeInstanceOf(Promise);

                rejected.catch(err => {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toBe('Missing file version');
                    done();
                });
            });

            test('should create a new box3d instance', done => {
                const expectedEntities = {
                    one: 'a',
                    two: 'b',
                };

                jest.spyOn(renderer, 'createBox3d').mockImplementation((loader, entities) => {
                    expect(entities).toBe(expectedEntities);
                    done();
                });

                renderer.initBox3d({
                    file: { file_version: 'abcdef' },
                    sceneEntities: expectedEntities,
                });
            });

            test('should produce an XhrResourceLoader which supports token, sharedLink and sharedLinkPassword', done => {
                const createBox3DStub = jest.spyOn(renderer, 'createBox3d').mockImplementation(loader => {
                    jest.spyOn(loader.queue, 'add').mockImplementation(fn => fn());
                    const resource = {
                        once: (event, cb) => cb(),
                    };
                    jest.spyOn(loader, 'load').mockImplementation(() => resource);

                    loader.load('path/to/texture.jpg', window.Box3D.LoadingType.IMAGE, {});

                    expect(createBox3DStub).toBeCalled();
                    done();
                });

                renderer.initBox3d({
                    file: { file_version: 'abcdef' },
                    sceneEntities: [],
                    token: 'foo',
                    sharedLink: 'bar',
                    sharedLinkPassword: 'baz',
                });
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

        test('should create new Box3D engine instance, initialize it with properties, load an app, and resolve in the new Box3D', done => {
            const loader = { name: 'loader' };
            const entities = { name: 'entities' };
            const expectedInitProps = {
                apiBase: 'dummyBase',
                container: containerEl,
                engineName: 'Default',
                resourceLoader: loader,
            };
            let initProps;
            const Box3DFake = {
                Engine: function contructor(props) {
                    initProps = props;
                    this.addEntities = jest.fn();
                    this.getAssetByClass = jest.fn().mockReturnValue({
                        load: function load() {},
                    });
                },
            };
            window.Box3D = Box3DFake;

            const callPromise = renderer.createBox3d(loader, entities, [], 'dummyBase').then(b3d => {
                expect(b3d).toBeInstanceOf(window.Box3D.Engine);
                expect(initProps).toEqual(expectedInitProps);
                expect(callPromise).toBeInstanceOf(Promise);
                done();
            });
        });

        test('should return a promise', () => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = jest.fn();
                    this.getAssetById = jest.fn().mockReturnValue({
                        load: function load() {},
                    });
                },
            };
            window.Box3D = Box3DFake;

            // We don't care about the error
            const shouldBePromise = renderer.createBox3d({}, {}).catch(jest.fn());
            expect(shouldBePromise).toBeInstanceOf(Promise);
        });

        test('should bind to context loss and restore events', done => {
            jest.spyOn(renderer, 'handleContextRestored');
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = jest.fn();
                    this.getAssetByClass = jest.fn().mockReturnValue({
                        load: function load() {},
                    });
                    this.canvas = { addEventListener: jest.fn() };
                    jest.spyOn(this.canvas, 'addEventListener').mockImplementation(() => {
                        renderer.handleContextRestored();
                    });
                },
            };
            window.Box3D = Box3DFake;
            renderer.createBox3d({}, {}).then(() => {
                expect(renderer.box3d.canvas.addEventListener).toBeCalledTimes(2);
                expect(renderer.handleContextRestored).toBeCalled();
                done();
            });
        });

        test('should not set reference if error occurs initializing engine', done => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = function addEntities() {
                        throw new Error('Error while initializing');
                    };
                },
            };
            window.Box3D = Box3DFake;

            renderer.createBox3d({}, {}).catch(() => {
                expect(renderer.box3d).not.toBeDefined();
                done();
            });
        });

        test('should not set reference if error loading app', done => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.initialize = function initialize(props, callback) {
                        callback();
                    };

                    this.getAssetById = function getAssetById() {
                        return {
                            load: function load() {
                                throw new Error('Error while loading');
                            },
                        };
                    };
                },
            };
            window.Box3D = Box3DFake;

            renderer.createBox3d({}, {}).catch(() => {
                expect(renderer.box3d).not.toBeDefined();
                done();
            });
        });
    });

    describe('onSceneLoad()', () => {
        test('should emit a scene loaded event and init VR mode if present', () => {
            const mock = sandbox.mock(renderer);
            mock.expects('emit').withArgs('sceneLoaded');
            mock.expects('initVr');
            renderer.onSceneLoad();
        });
    });

    describe('handleContextRestored()', () => {
        test('should fire event to be picked up by the viewer', () => {
            const emitStub = jest.spyOn(renderer, 'emit').mockImplementation(eventName => {
                expect(eventName).toBe(EVENT_WEBGL_CONTEXT_RESTORED);
            });
            renderer.handleContextRestored();
            expect(emitStub).toBeCalled();
        });
    });

    describe('toggleVr()', () => {
        test("should enable vr if it's currently disabled", () => {
            let called = false;
            jest.spyOn(renderer, 'enableVr').mockImplementation(() => {
                called = true;
            });
            renderer.toggleVr();
            expect(called).toBe(true);
        });

        test("should disable vr if it's currently enabled", () => {
            let called = false;
            jest.spyOn(renderer, 'disableVr').mockImplementation(() => {
                called = true;
            });
            renderer.vrEnabled = true;
            renderer.toggleVr();
            expect(called).toBe(true);
        });
    });

    describe('onEnableVr()', () => {
        let disableCameraStub;
        let setAttribStub;

        beforeEach(() => {
            disableCameraStub = jest.spyOn(renderer, 'disableCameraControls').mockImplementation();
            setAttribStub = jest.fn();
            const box3dRenderer = { setAttribute: setAttribStub };
            renderer.box3d = {
                getRenderer: jest.fn().mockReturnValue(box3dRenderer),
                getVrDisplay: jest.fn().mockReturnValue({ isPresenting: true }),
            };
            renderer.onEnableVr();
        });

        test('should disable all camera components', () => {
            expect(disableCameraStub).toBeCalled();
        });

        test('should disable render on demand for the renderer', () => {
            expect(setAttribStub).toBeCalledWith('renderOnDemand', false);
        });

        test('should set the vrEnabled flag to true', () => {
            expect(renderer.vrEnabled).toBe(true);
        });
    });

    describe('enableVr()', () => {
        beforeEach(() => {
            renderer.box3d = {
                trigger: jest.fn(),
            };
        });

        test('should do nothing if vr is already enabled', () => {
            renderer.vrEnabled = true;
            renderer.enableVr();

            expect(renderer.box3d.trigger).not.toBeCalled();
        });

        test('should trigger the "enableVrRendering" event the Box3DRuntime instance', () => {
            renderer.enableVr();

            expect(renderer.box3d.trigger).toBeCalledWith('enableVrRendering');
        });
    });

    describe('onDisableVr()', () => {
        let enableCameraStub;
        let resetStub;
        let setAttribStub;

        beforeEach(() => {
            enableCameraStub = jest.spyOn(renderer, 'enableCameraControls').mockImplementation();
            resetStub = jest.spyOn(renderer, 'resetView').mockImplementation();
            setAttribStub = jest.fn();
            const box3dRenderer = { setAttribute: setAttribStub };
            renderer.box3d = {
                getRenderer: jest.fn().mockReturnValue(box3dRenderer),
                getVrDisplay: jest.fn().mockReturnValue({ isPresenting: false }),
                trigger: jest.fn(),
            };
            renderer.onDisableVr();
        });

        test('should re-enable all camera components', () => {
            expect(enableCameraStub).toBeCalled();
        });

        test('should reset the state of camera view', () => {
            expect(resetStub).toBeCalled();
        });

        test('should notify Box3D Runtime instance to trigger a resize event', () => {
            expect(renderer.box3d.trigger).toBeCalledWith('resize');
        });

        test('should re-enable render on demand for the renderer', () => {
            expect(setAttribStub).toBeCalledWith('renderOnDemand', true);
        });

        test('should set the vrEnabled flag to false', () => {
            expect(renderer.vrEnabled).toBe(false);
        });
    });

    describe('disableVr()', () => {
        beforeEach(() => {
            renderer.box3d = {
                trigger: jest.fn(),
            };
        });

        test('should do nothing if vr is already disabled', () => {
            renderer.vrEnabled = false;
            renderer.disableVr();

            expect(renderer.box3d.trigger).not.toBeCalled();
        });

        test('should trigger the "disableVrRendering" event on the Box3DRuntime instance', () => {
            renderer.vrEnabled = true;
            renderer.disableVr();

            expect(renderer.box3d.trigger).toBeCalledWith('disableVrRendering');
        });
    });

    describe('resize()', () => {
        test("should do nothing if Box3D doesn't exist", () => {
            /* eslint-disable require-jsdoc */
            const shouldNotThrow = () => {
                renderer.resize();
            };
            expect(shouldNotThrow).not.toThrowError(Error);
        });

        test('should trigger resize on Box3D', () => {
            renderer.box3d = {
                trigger: jest.fn(),
            };
            sandbox
                .mock(renderer.box3d)
                .expects('trigger')
                .withArgs('resize');
            renderer.resize();
        });
    });

    describe('enableCameraControls()', () => {
        let cameraMock;

        beforeEach(() => {
            const camera = {
                getComponentByScriptId: jest.fn(),
            };
            cameraMock = sandbox.mock(camera);
            jest.spyOn(renderer, 'getCamera').mockReturnValue(camera);
        });

        test('should enable the component if it available on the camera', () => {
            const component = { enable: jest.fn() };
            cameraMock
                .expects('getComponentByScriptId')
                .withArgs(PREVIEW_CAMERA_CONTROLLER_ID)
                .returns(component);
            renderer.enableCameraControls();
            expect(component.enable).toBeCalled();
        });
    });

    describe('disableCameraControls()', () => {
        let cameraMock;

        beforeEach(() => {
            const camera = {
                getComponentByScriptId: jest.fn(),
            };
            cameraMock = sandbox.mock(camera);
            jest.spyOn(renderer, 'getCamera').mockReturnValue(camera);
        });

        test('should disable the component if it available on the camera', () => {
            const component = { disable: jest.fn() };
            cameraMock
                .expects('getComponentByScriptId')
                .withArgs(PREVIEW_CAMERA_CONTROLLER_ID)
                .returns(component);
            renderer.disableCameraControls();
            expect(component.disable).toBeCalled();
        });
    });

    describe('initVr()', () => {
        let vrPresenter;
        let emitStub;

        beforeEach(() => {
            vrPresenter = {
                whenDisplaysAvailable: jest.fn(),
            };
            renderer.box3d = {
                getApplication: jest.fn(),
                listenTo: jest.fn(),
            };
            emitStub = jest.spyOn(renderer, 'emit');
        });

        describe('With a valid device', () => {
            beforeEach(() => {
                jest.spyOn(Box3D, 'isTablet').mockReturnValue(false);
                renderer.box3d.getApplication.mockReturnValue({ getComponentByScriptId: () => vrPresenter });
            });

            test('should emit a EVENT_SHOW_VR_BUTTON event when vr displays are ready', done => {
                jest.spyOn(vrPresenter, 'whenDisplaysAvailable').mockImplementation(callback => {
                    callback([{}, {}]);
                    done();
                });
                jest.spyOn(renderer, 'createVrGamepads').mockImplementation();
                renderer.initVr();
                expect(emitStub).toBeCalledWith(EVENT_SHOW_VR_BUTTON);
            });

            test('should add an event listeners for vr enabled/disabled events via listenTo', done => {
                jest.spyOn(vrPresenter, 'whenDisplaysAvailable').mockImplementation(callback => {
                    callback([{}, {}]);
                    done();
                });
                jest.spyOn(renderer, 'createVrGamepads').mockImplementation();
                renderer.initVr();

                expect(renderer.box3d.listenTo).toBeCalledTimes(2);
            });

            test('should do nothing if no displays are available', done => {
                jest.spyOn(vrPresenter, 'whenDisplaysAvailable').mockImplementation(callback => {
                    callback([]);
                    done();
                });
                renderer.initVr();
                expect(emitStub).not.toBeCalled();
            });
        });

        test("should do nothing if the device we're using is a Tablet device", () => {
            jest.spyOn(Box3D, 'isTablet').mockReturnValue(true);

            renderer.initVr();

            expect(renderer.box3d.getApplication).not.toBeCalled();
        });
    });
});
