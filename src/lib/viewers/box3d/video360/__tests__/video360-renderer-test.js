/* eslint-disable no-unused-expressions */
import Video360Renderer from '../video360-renderer';

const sandbox = sinon.sandbox.create();

describe('video360-renderer', () => {
    let containerEl;
    let renderer;
    const OPTIONS = {
        token: '12345572asdfliuohhr34812348960',
        file: {
            id: 'f_098765'
        }
    };

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/video360-renderer-test.html');
        containerEl = document.querySelector('.container');
        renderer = new Video360Renderer(containerEl, OPTIONS);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('constructor()', () => {
        it('should create an empty variable, .inputController, for storing Input Controller component reference', () => {
            expect(renderer.inputController).to.be.null;
        });
    });

    describe('enableCameraControls()', () => {
        it('should call super.enableCameraControls() with "orbit_camera_controller"', () => {
            const stub = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(Video360Renderer.prototype), 'enableCameraControls', {
                value: stub
            });

            renderer.enableCameraControls();

            expect(stub).to.have.been.calledWith('orbit_camera_controller');
        });
    });

    describe('disableCameraControls()', () => {
        it('should call super.disableCameraControls() with "orbit_camera_controller"', () => {
            const stub = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(Video360Renderer.prototype), 'disableCameraControls', {
                value: stub
            });

            renderer.disableCameraControls();

            expect(stub).to.have.been.calledWith('orbit_camera_controller');
        });
    });

    describe('getInputController()', () => {
        beforeEach(() => {
            renderer.box3d = {
                getApplication: () => {}
            };
        });

        afterEach(() => {
            renderer.box3d = null;
        });

        it('should return the .inputController reference instead of getting it from the runtime, if it already exists', () => {
            const getAppStub = sandbox.stub(renderer.box3d, 'getApplication');
            renderer.inputController = {};

            const inputController = renderer.getInputController();
            expect(inputController).to.equal(renderer.inputController);
            expect(getAppStub).to.not.have.been.called;
        });

        it('should return null if Application does not exist on runtime instance', () => {
            sandbox.stub(renderer.box3d, 'getApplication').returns(null);

            const inputController = renderer.getInputController();
            expect(inputController).to.be.null;
        });

        it('should invoke .getComponentByScriptName() with "Input Controller" to get Input Controller component on runtime', () => {
            const app = {
                getComponentByScriptName: sandbox.stub().returns({})
            };
            sandbox.stub(renderer.box3d, 'getApplication').returns(app);
            const inputController = renderer.getInputController();

            expect(app.getComponentByScriptName).to.have.been.calledWith('Input Controller');
            expect(inputController).to.exist;
        });
    });

    describe('destroy()', () => {
        it('should nullify .inputController', () => {
            renderer.destroy();
            expect(renderer.inputController).to.not.exist;
        });

        it('should call super.destroy()', () => {
            const destroyStub = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(Video360Renderer.prototype), 'destroy', {
                value: destroyStub
            });
            renderer.destroy();

            expect(destroyStub).to.have.been.called;
        });
    });
});
