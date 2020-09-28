/* eslint-disable no-unused-expressions */
import Box3DRuntime from '../../__mocks__/Box3DRuntime';
import Image360Renderer from '../Image360Renderer';
import sceneEntities from '../SceneEntities';

describe('lib/viewers/box3d/image360/Image360Renderer', () => {
    let containerEl;
    let renderer;

    beforeAll(() => {
        global.Box3D = Box3DRuntime;
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/image360/__tests__/Image360Renderer-test.html');
        containerEl = document.querySelector('.container');
        renderer = new Image360Renderer(containerEl, {});
    });

    afterEach(() => {
        fixture.cleanup();

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('destroy()', () => {
        test('should call cleanupTexture()', () => {
            const stub = jest.spyOn(renderer, 'cleanupTexture');
            renderer.destroy();

            expect(stub).toBeCalled();
        });

        test('should invoke imageAsset.destroy(), if it exists', () => {
            renderer.imageAsset = {
                destroy: jest.fn(),
            };
            const { imageAsset } = renderer;
            renderer.destroy();

            expect(imageAsset.destroy).toBeCalled();
        });
    });

    describe('cleanupTexture()', () => {
        beforeEach(() => {
            renderer.box3d = {};
        });

        afterEach(() => {
            renderer.box3d = null;
        });

        test('should do nothing if .box3d does not exist', () => {
            jest.spyOn(renderer, 'getSkyboxComponent');
            renderer.box3d = null;
            renderer.cleanupTexture();

            expect(renderer.getSkyboxComponent).not.toBeCalled();
        });

        test('should invoke textureAsset.destroy()', () => {
            renderer.textureAsset = {
                destroy: jest.fn(),
            };
            const { textureAsset } = renderer;

            jest.spyOn(renderer, 'getSkyboxComponent');
            renderer.cleanupTexture();

            expect(textureAsset.destroy).toBeCalled();
        });

        test('should nullify textureAsset if it exists', () => {
            renderer.textureAsset = {
                destroy: jest.fn(),
            };

            jest.spyOn(renderer, 'getSkyboxComponent');
            renderer.cleanupTexture();

            expect(renderer.textureAsset).toBeNull();
        });

        test('should set "skyboxTexture" attribute to null, if skybox component exists on the scene', () => {
            const skybox = {
                setAttribute: jest.fn(),
            };
            renderer.skybox = skybox;
            jest.spyOn(renderer, 'getSkyboxComponent').mockReturnValue(skybox);
            renderer.cleanupTexture();

            expect(skybox.setAttribute).toBeCalledWith('skyboxTexture', null);
        });
    });

    describe('getSkyboxComponent()', () => {
        test('should return the .skybox instance if available', () => {
            const skybox = {
                name: 'skybox',
                setAttribute: jest.fn(),
            };

            renderer.skybox = skybox;

            const skyboxComponent = renderer.getSkyboxComponent();

            expect(skyboxComponent).toBe(skybox);
        });

        test('should should not attempt to get skybox_renderer component if .skybox exists', () => {
            const skybox = {
                name: 'skybox',
                setAttribute: jest.fn(),
            };
            renderer.skybox = skybox;

            renderer.box3d = {
                getObjectByClass: jest.fn(),
            };

            renderer.getSkyboxComponent();

            expect(renderer.box3d.getObjectByClass).not.toBeCalled();
            renderer.box3d = null;
            renderer.skybox = null;
        });

        test("should should get skybox_renderer component from scene if .skybox doesn't exists", () => {
            const skybox = {
                name: 'skybox',
                setAttribute: jest.fn(),
            };

            const scene = {
                getComponentByScriptId: jest.fn().mockReturnValue(skybox),
            };

            renderer.box3d = {
                getObjectByClass: jest.fn().mockReturnValue(scene),
            };

            renderer.getSkyboxComponent();

            expect(renderer.box3d.getObjectByClass).toBeCalled();
            renderer.box3d = null;
            renderer.skybox = null;
        });
    });

    describe('load()', () => {
        test('should use sceneEntities value if provided for initialization', done => {
            const mySceneEntities = {
                light: 'light',
                camera: 'camera',
                action: ':D',
            };

            jest.spyOn(renderer, 'initBox3d').mockImplementation(options => {
                expect(options.sceneEntities).toBe(mySceneEntities);
                done();
                return new Promise(() => {});
            });

            renderer.load('', { sceneEntities: mySceneEntities });
        });

        test('should use default sceneEntities, if none provided, for initialization', done => {
            jest.spyOn(renderer, 'initBox3d').mockImplementation(options => {
                expect(options.sceneEntities).toBe(sceneEntities);
                done();
                return new Promise(() => {});
            });

            renderer.load('');
        });

        test('should use provided inputSettings for initialization', done => {
            const myInputSettings = {
                mouse_control: true,
                left_click: 'probably',
                right_click: true,
                middle_click: 'always',
            };

            jest.spyOn(renderer, 'initBox3d').mockImplementation(options => {
                expect(options.inputSettings).toBe(myInputSettings);
                done();
                return new Promise(() => {});
            });

            renderer.load('', { inputSettings: myInputSettings });
        });

        test('should call initBox3d() with the passed in options object', done => {
            const myOptions = {
                inputSettings: { some: 'stuff' },
                sceneSettings: { more: 'stuff' },
                even: { more: 'things' },
            };

            jest.spyOn(renderer, 'initBox3d').mockImplementation(options => {
                expect(options).toBe(myOptions);
                done();
                return new Promise(() => {});
            });

            renderer.load('', myOptions);
        });

        test('should call loadPanoramaFile() with url for box3d representation', done => {
            const fileUrl = 'I/am/a/url';

            jest.spyOn(renderer, 'initBox3d').mockResolvedValue(undefined);
            jest.spyOn(renderer, 'loadPanoramaFile').mockImplementation(url => {
                expect(url).toBe(fileUrl);
                done();
                return new Promise(() => {});
            });

            renderer.load(fileUrl);
        });

        test('should call onSceneLoad() when done loading file', done => {
            jest.spyOn(renderer, 'initBox3d').mockResolvedValue(undefined);
            jest.spyOn(renderer, 'loadPanoramaFile').mockResolvedValue(undefined);
            jest.spyOn(renderer, 'onSceneLoad').mockImplementation(() => {
                done();
            });

            renderer.load();
        });
    });

    describe('enableVr()', () => {
        beforeEach(() => {
            // We don't care about super calls :D
            Object.defineProperty(Object.getPrototypeOf(Image360Renderer.prototype), 'enableVr', {
                value: jest.fn(),
            });
        });

        test('should invoke .skybox.setAttribute()', () => {
            const spy = jest.fn();

            const skybox = {
                setAttribute: spy,
            };

            renderer.skybox = skybox;

            renderer.enableVr();

            expect(spy).toBeCalled();
            renderer.skybox = null;
        });

        test('should invoke .skybox.setAttribute() with arguments "stereoEnabled" and true', () => {
            const spy = jest.fn();

            const skybox = {
                setAttribute: spy,
            };

            renderer.skybox = skybox;

            renderer.enableVr();

            expect(spy).toBeCalledWith('stereoEnabled', true);
            renderer.skybox = null;
        });
    });

    describe('disableVr()', () => {
        beforeEach(() => {
            // We don't care about super calls :D
            Object.defineProperty(Object.getPrototypeOf(Image360Renderer.prototype), 'disableVr', {
                value: jest.fn(),
            });
        });

        test('should call .skybox.setAttribute()', () => {
            const spy = jest.fn();

            const skybox = {
                setAttribute: spy,
            };

            renderer.skybox = skybox;

            renderer.disableVr();

            expect(spy).toBeCalled();
            renderer.skybox = null;
        });

        test('should call .skybox.setAttribute() with arguments "stereoEnabled" and false', () => {
            const spy = jest.fn();

            const skybox = {
                setAttribute: spy,
            };

            renderer.skybox = skybox;

            renderer.disableVr();

            expect(spy).toBeCalledWith('stereoEnabled', false);
            renderer.skybox = null;
        });
    });
});
