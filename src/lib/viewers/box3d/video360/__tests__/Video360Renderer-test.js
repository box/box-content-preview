/* eslint-disable no-unused-expressions */
import Video360Renderer from '../Video360Renderer';

describe('lib/viewers/box3d/video360/Video360Renderer', () => {
    let containerEl;
    let renderer;
    const OPTIONS = {
        token: '12345572asdfliuohhr34812348960',
        file: {
            id: 'f_098765',
        },
    };

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/Video360Renderer-test.html');
        containerEl = document.querySelector('.container');
        renderer = new Video360Renderer(containerEl, OPTIONS);
    });

    afterEach(() => {
        fixture.cleanup();

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('getInputController()', () => {
        beforeEach(() => {
            renderer.box3d = {
                getApplication: () => {},
            };
        });

        afterEach(() => {
            renderer.box3d = null;
        });

        test('should return the .inputController reference instead of getting it from the runtime, if it already exists', () => {
            const getAppStub = jest.spyOn(renderer.box3d, 'getApplication');
            renderer.inputController = {};

            const inputController = renderer.getInputController();
            expect(inputController).toBe(renderer.inputController);
            expect(getAppStub).not.toBeCalled();
        });

        test('should return null if Application does not exist on runtime instance', () => {
            jest.spyOn(renderer.box3d, 'getApplication').mockReturnValue(null);

            const inputController = renderer.getInputController();
            expect(inputController).toBeNull();
        });

        test('should invoke .getComponentByScriptName() with "Input Controller" to get Input Controller component on runtime', () => {
            const app = {
                getComponentByScriptName: jest.fn().mockReturnValue({}),
            };
            jest.spyOn(renderer.box3d, 'getApplication').mockReturnValue(app);
            const inputController = renderer.getInputController();

            expect(app.getComponentByScriptName).toBeCalledWith('Input');
            expect(inputController).toBeDefined();
        });
    });

    describe('destroy()', () => {
        test('should nullify .inputController', () => {
            renderer.destroy();
            expect(renderer.inputController).toBeNull();
        });

        test('should call super.destroy()', () => {
            const destroyStub = jest.fn();
            Object.defineProperty(Object.getPrototypeOf(Video360Renderer.prototype), 'destroy', {
                value: destroyStub,
            });
            renderer.destroy();

            expect(destroyStub).toBeCalled();
        });
    });
});
