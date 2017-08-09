/* global Box3D */
/* eslint-disable no-unused-expressions */
import Box3DRenderer from '../Box3DRenderer';
import { EVENT_SHOW_VR_BUTTON, EVENT_WEBGL_CONTEXT_RESTORED } from '../box3DConstants';

const sandbox = sinon.sandbox.create();
const PREVIEW_CAMERA_CONTROLLER_ID = 'orbit_camera';

let containerEl;
let renderer;
let stubs = {};

describe('lib/viewers/box3d/Box3DRenderer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DRenderer-test.html');
        stubs.THREE = sandbox.stub(window, 'THREE');
        containerEl = document.querySelector('.container');
        renderer = new Box3DRenderer(containerEl, {});
    });

    afterEach(() => {
        renderer = null;
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('constructor()', () => {
        it('should correctly set container element, BoxSDK and add a render event listener', () => {
            expect(renderer.containerEl).to.equal(containerEl);
            expect(renderer.boxSdk).to.exist;
            expect(renderer._events).to.exist;
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            renderer.box3d = {
                destroy: () => {}
            };
        });

        it('should call destroy on the engine', () => {
            sandbox.mock(renderer.box3d).expects('destroy');
            renderer.destroy();
        });

        it('should fully shutdown by disabling vr and unbinding events ', () => {
            sandbox.mock(renderer).expects('disableVr');
            renderer.destroy();
        });

        it('should not call Box3D cleanup path if no Box3D engine', () => {
            sandbox.mock(renderer).expects('disableVr').never();
            renderer.box3d = null;
            renderer.destroy();
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
        let camera;
        let cameraMock;
        beforeEach(() => {
            camera = {
                setPosition: () => {},
                setQuaternion: () => {},
                trigger: () => {}
            };
            renderer.box3d = {
                getObjectByClass: sandbox.stub().returns(camera)
            };
            renderer.savedCameraPosition = { x: 0, y: 0, z: 0 };
            renderer.savedCameraQuaternion = { x: 0, y: 0, z: 0, w: 1 };
            cameraMock = sandbox.mock(camera);
        });

        it('should set camera position and orientation to default values', () => {
            cameraMock.expects('setPosition');
            cameraMock.expects('setQuaternion');

            renderer.reset();
        });
    });

    describe('getCamera()', () => {
        it('should return a camera object if one exists in the scene', () => {
            renderer.box3d = {
                getObjectByClass: sandbox.stub().returns({})
            };

            const camera = renderer.getCamera();
            expect(camera).to.exist;
        });

        it('should return null if no scene present', () => {
            const camera = renderer.getCamera();
            expect(camera).to.not.exist;
        });
    });

    describe('getScene()', () => {
        it('should return the scene prefab that exists in the Box3D runtime', () => {
            renderer.box3d = {
                getObjectByClass: sandbox.stub().returns({})
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

    describe('configureXHR()', () => {
        it('should return a Promise', () => {
            const promise = renderer.configureXHR({}, 'path/to/stuff.jpg', { isExternal: true });
            expect(promise).to.be.a('promise');
        });

        it('should return a Promise that resolves in an XMLHttpRequest object', (done) => {
            const promise = renderer.configureXHR({}, 'path/to/stuff.wav', { isExternal: true });
            promise.then((xhr) => {
                expect(xhr).to.be.an('XMLHttpRequest');
                done();
            });
        });

        it('should invoke .open() on the XMLHttpRequest object, with "GET" and the provided path', () => {
            const openSpy = sandbox.spy(XMLHttpRequest.prototype, 'open');
            const path = 'path/to/resource.psd';
            renderer.configureXHR({}, path, { isExternal: true });

            expect(openSpy).to.be.calledWith('GET', path);
        });

        it('should append "Authorization" request header to the XHR with the provided auth token', () => {
            const setReqHeaderSpy = sandbox.spy(XMLHttpRequest.prototype, 'setRequestHeader');
            const token = 'ABCDEFG';
            const expectedAuthHeaderValue = `Bearer ${token}`;

            renderer.configureXHR({ token }, 'a/path/tp/stuff.gif', { isExternal: false });

            expect(setReqHeaderSpy).to.be.calledWith('Authorization', expectedAuthHeaderValue);
        });

        it('should append "boxapi" request header to the XHR with the provided shared link', () => {
            sandbox.stub(window, 'encodeURI', (uri) => {
                return uri;
            });
            const setReqHeaderSpy = sandbox.spy(XMLHttpRequest.prototype, 'setRequestHeader');
            const sharedLink = 'abcde';
            const expectedAuthHeaderValue = `shared_link=${sharedLink}`;

            renderer.configureXHR({ sharedLink, token: 'asdf' }, 'some/path.png');

            expect(setReqHeaderSpy).to.be.calledWith('boxapi', expectedAuthHeaderValue);
        });

        it('should append "boxapi" request header to the XHR with the shared link AND shared link password', () => {
            sandbox.stub(window, 'encodeURI', (uri) => {
                return uri;
            });
            const setReqHeaderSpy = sandbox.spy(XMLHttpRequest.prototype, 'setRequestHeader');
            const sharedLink = 'abcde';
            const sharedLinkPassword = '!!myP455w0rD';
            const expectedAuthHeaderValue = `shared_link=${sharedLink}&shared_link_password=${sharedLinkPassword}`;

            renderer.configureXHR({ sharedLink, sharedLinkPassword, token: 'asdf' }, 'some/path.png');

            expect(setReqHeaderSpy).to.be.calledWith('boxapi', expectedAuthHeaderValue);
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

        describe('with global Box3D', () => {
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

            it('should create a new box3d instance', (done) => {
                const expectedEntities = {
                    one: 'a',
                    two: 'b'
                };

                const creatBox3DStub = sandbox.stub(renderer, 'createBox3d', (loader, entities) => {
                    expect(entities).to.deep.equal(expectedEntities);
                    done();
                });

                renderer.initBox3d({
                    file: { file_version: 'abcdef' },
                    sceneEntities: expectedEntities
                });
            });

            it('should produce an XhrResourceLoader which supports token, sharedLink and sharedLinkPassword', (done) => {
                const creatBox3DStub = sandbox.stub(renderer, 'createBox3d', (loader) => {
                    sandbox.stub(loader.queue, 'add', (fn) => fn());
                    const resource = {
                        once: (event, cb) => cb()
                    };
                    sandbox.stub(loader, 'load', () => resource);

                    loader.load('path/to/texture.jpg', window.Box3D.LoadingType.IMAGE, {});

                    expect(creatBox3DStub).to.be.called;
                    done();
                });

                renderer.initBox3d({
                    file: { file_version: 'abcdef' },
                    sceneEntities: [],
                    token: 'foo',
                    sharedLink: 'bar',
                    sharedLinkPassword: 'baz'
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

        it('should create new Box3D engine instance, initialize it with properties, load an app, and resolve in the new Box3D', (done) => {
            const loader = { name: 'loader' };
            const entities = { name: 'entities' };
            const expectedInitProps = {
                apiBase: 'dummyBase',
                container: containerEl,
                engineName: 'Default',
                resourceLoader: loader
            };
            let initProps;
            const Box3DFake = {
                Engine: function contructor(props) {
                    initProps = props;
                    this.addEntities = sandbox.stub();
                    this.getAssetByClass = sandbox.stub().returns({
                        load: function load() {}
                    });
                }
            };
            window.Box3D = Box3DFake;

            const callPromise = renderer.createBox3d(loader, entities, [], 'dummyBase').then((b3d) => {
                expect(b3d).to.be.an.instanceof(window.Box3D.Engine);
                expect(initProps).to.deep.equal(expectedInitProps);
                expect(callPromise).to.be.a('promise');
                done();
            });
        });

        it('should return a promise', () => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = sandbox.stub();
                    this.getAssetById = sandbox.stub().returns({
                        load: function load() {}
                    });
                }
            };
            window.Box3D = Box3DFake;

            // We don't care about the error
            const shouldBePromise = renderer.createBox3d({}, {}).catch(() => {});
            expect(shouldBePromise).to.be.a('promise');
        });

        it('should bind to context loss and restore events', (done) => {
            sandbox.stub(renderer, 'handleContextRestored');
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = sandbox.stub();
                    this.getAssetByClass = sandbox.stub().returns({
                        load: function load() {}
                    });
                    this.canvas = { addEventListener: () => {}};
                    sandbox.stub(this.canvas, 'addEventListener', () => {
                        renderer.handleContextRestored()
                    })
                }
            };
            window.Box3D = Box3DFake;
            renderer.createBox3d({}, {}).then(() => {
                expect(renderer.box3d.canvas.addEventListener).to.be.called.twice;
                expect(renderer.handleContextRestored).to.be.called;
                done();
            });
        });

        it('should not set reference if error occurs initializing engine', (done) => {
            const Box3DFake = {
                Engine: function constructor() {
                    this.addEntities = function addEntities() {
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
            const mock = sandbox.mock(renderer);
            mock.expects('emit').withArgs('sceneLoaded');
            mock.expects('initVr');
            renderer.onSceneLoad();
        });
    });

    describe('handleContextRestored()', () => {
        it('should fire event to be picked up by the viewer', () => {
            const emitStub = sandbox.stub(renderer, 'emit', (eventName) => {
                expect(eventName).to.equal(EVENT_WEBGL_CONTEXT_RESTORED);
            });
            renderer.handleContextRestored();
            expect(emitStub).to.be.called;
        });
    });

    describe('toggleVr()', () => {
        it('should enable vr if it\'s currently disabled', () => {
            let called = false;
            sandbox.stub(renderer, 'enableVr', () => {
                called = true;
            });
            renderer.toggleVr();
            expect(called).to.be.true;
        });

        it('should disable vr if it\'s currently enabled', () => {
            let called = false;
            sandbox.stub(renderer, 'disableVr', () => {
                called = true;
            });
            renderer.vrEnabled = true;
            renderer.toggleVr();
            expect(called).to.be.true;
        });
    });

    describe('onEnableVr()', () => {
        let disableCameraStub;
        let setAttribStub;

        beforeEach(() => {
            disableCameraStub = sandbox.stub(renderer, 'disableCameraControls');
            setAttribStub = sandbox.stub();
            const box3dRenderer = { setAttribute: setAttribStub };
            renderer.box3d = {
                getRenderer: sandbox.stub().returns(box3dRenderer),
                getVrDisplay: sandbox.stub().returns({ isPresenting: true })
            };
            renderer.onEnableVr();
        });

        it('should disable all camera components', () => {
            expect(disableCameraStub).to.be.called;
        });

        it('should disable render on demand for the renderer', () => {
            expect(setAttribStub).to.be.calledWith('renderOnDemand', false);
        });

        it('should set the vrEnabled flag to true', () => {
            expect(renderer.vrEnabled).to.be.true;
        });
    });

    describe('enableVr()', () => {
        let b3dMock;

        beforeEach(() => {
            renderer.box3d = {
                trigger: () => {}
            };

            b3dMock = sandbox.mock(renderer.box3d);
        });

        it('should do nothing if vr is already enabled', () => {
            renderer.vrEnabled = true;
            b3dMock.expects('trigger').never();
            renderer.enableVr();
        });

        it('should trigger the "enableVrRendering" event the Box3DRuntime instance', () => {
            b3dMock.expects('trigger').withArgs('enableVrRendering');
            renderer.enableVr();
        });
    });

    describe('onDisableVr()', () => {
        let enableCameraStub;
        let resetStub;
        let setAttribStub;

        beforeEach(() => {
            enableCameraStub = sandbox.stub(renderer, 'enableCameraControls');
            resetStub = sandbox.stub(renderer, 'resetView');
            setAttribStub = sandbox.stub();
            const box3dRenderer = { setAttribute: setAttribStub };
            renderer.box3d = {
                getRenderer: sandbox.stub().returns(box3dRenderer),
                getVrDisplay: sandbox.stub().returns({ isPresenting: false }),
                trigger: sandbox.stub()
            };
            renderer.onDisableVr();
        });

        it('should re-enable all camera components', () => {
            expect(enableCameraStub).to.be.called;
        });

        it('should reset the state of camera view', () => {
            expect(resetStub).to.be.called;
        });

        it('should notify Box3D Runtime instance to trigger a resize event', () => {
            expect(renderer.box3d.trigger).to.be.calledWith('resize');
        });

        it('should re-enable render on demand for the renderer', () => {
            expect(setAttribStub).to.be.calledWith('renderOnDemand', true);
        });

        it('should set the vrEnabled flag to false', () => {
            expect(renderer.vrEnabled).to.be.false;
        });
    });

    describe('disableVr()', () => {
        let b3dMock;

        beforeEach(() => {
            renderer.box3d = {
                trigger: () => {}
            };

            b3dMock = sandbox.mock(renderer.box3d);
        });

        it('should do nothing if vr is already disabled', () => {
            renderer.vrEnabled = false;
            b3dMock.expects('trigger').never();
            renderer.disableVr();
        });

        it('should trigger the "disableVrRendering" event on the Box3DRuntime instance', () => {
            renderer.vrEnabled = true;
            b3dMock.expects('trigger').withArgs('disableVrRendering');
            renderer.disableVr();
        });
    });

    describe('resize()', () => {
        it('should do nothing if Box3D doesn\'t exist', () => {
            const shouldNotThrow = () => {
                renderer.resize();
            };

            expect(shouldNotThrow).to.not.throw(Error);
        });

        it('should trigger resize on Box3D', () => {
            renderer.box3d = {
                trigger: () => {}
            };
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('resize');
            renderer.resize();
        });
    });

    describe('enableCameraControls()', () => {
        let cameraMock;

        beforeEach(() => {
            const camera = {
                getComponentByScriptId: () => {}
            };
            cameraMock = sandbox.mock(camera);
            sandbox.stub(renderer, 'getCamera').returns(camera);
        });

        it('should enable the component if it available on the camera', () => {
            const component = { enable: sandbox.stub() };
            cameraMock.expects('getComponentByScriptId').withArgs(PREVIEW_CAMERA_CONTROLLER_ID).returns(component);
            renderer.enableCameraControls();
            expect(component.enable).to.be.called;
        });
    });

    describe('disableCameraControls()', () => {
        let cameraMock;

        beforeEach(() => {
            const camera = {
                getComponentByScriptId: () => {}
            };
            cameraMock = sandbox.mock(camera);
            sandbox.stub(renderer, 'getCamera').returns(camera);
        });

        it('should disable the component if it available on the camera', () => {
            const component = { disable: sandbox.stub() };
            cameraMock.expects('getComponentByScriptId').withArgs(PREVIEW_CAMERA_CONTROLLER_ID).returns(component);
            renderer.disableCameraControls();
            expect(component.disable).to.be.called;
        });
    });

    describe('initVr()', () => {
        let box3dMock;
        let vrPresenter;
        let emitStub;
        let globalBox3DMock;

        beforeEach(() => {
            vrPresenter = {
                whenDisplaysAvailable: () => {}
            };
            renderer.box3d = {
                getApplication: () => {},
                listenTo: () => {}
            };
            emitStub = sandbox.stub(renderer, 'emit');
            box3dMock = sandbox.mock(renderer.box3d);
            globalBox3DMock = sandbox.mock(Box3D);
        });

        describe('With a valid device', () => {
            beforeEach(() => {
                box3dMock.expects('getApplication').returns({ getComponentByScriptId: () => vrPresenter });
                globalBox3DMock.expects('isTablet').returns(false);
            });

            it('should emit a EVENT_SHOW_VR_BUTTON event when vr displays are ready', (done) => {
                sandbox.stub(vrPresenter, 'whenDisplaysAvailable', (callback) => {
                    callback([{}, {}]);
                    done();
                });
                sandbox.stub(renderer, 'createVrGamepads', () => {});
                renderer.initVr();
                expect(emitStub).to.be.calledWith(EVENT_SHOW_VR_BUTTON);
            });

            it('should add an event listeners for vr enabled/disabled events via listenTo', (done) => {
                box3dMock.expects('listenTo').twice();
                sandbox.stub(vrPresenter, 'whenDisplaysAvailable', (callback) => {
                    callback([{}, {}]);
                    done();
                });
                sandbox.stub(renderer, 'createVrGamepads', () => {});
                renderer.initVr();
            });

            it('should do nothing if no displays are available', (done) => {
                sandbox.stub(vrPresenter, 'whenDisplaysAvailable', (callback) => {
                    callback([]);
                    done();
                });
                renderer.initVr();
                expect(emitStub).to.not.be.called;
            });
        });

        it('should do nothing if the device we\'re using is a Tablet device', () => {
            globalBox3DMock.expects('isTablet').returns(true);
            box3dMock.expects('getApplication').never();
            renderer.initVr();
        });
    });
});
