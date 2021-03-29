/* eslint-disable no-unused-expressions */
import Video360Viewer from '../Video360Viewer';
import Video360Controls from '../Video360Controls';
import Video360Renderer from '../Video360Renderer';
import { EVENT_TOGGLE_VR, EVENT_SHOW_VR_BUTTON } from '../../box3DConstants';
import JS from '../../box3DAssets';
import sceneEntities from '../SceneEntities';
import fullscreen from '../../../../Fullscreen';

describe('lib/viewers/box3d/video360/Video360Viewer', () => {
    const options = {
        token: '12345572asdfliuohhr34812348960',
        file: {
            id: 'f_098765',
        },
    };
    const VIDEO_PROPS = {
        loop: false,
        generateMipmaps: false,
        querySelector: '.bp-media-container video',
        autoPlay: false,
        muted: false,
    };
    // Taken from ./video360.js
    const VIDEO_TEXTURE_PROPS = {
        imageId: 'VIDEO_ID',
        minFilter: 'linear',
        magFilter: 'linear',
        wrapModeV: 'clampToEdge',
        wrapModeU: 'clampToEdge',
    };

    let viewer;
    let containerEl;

    beforeAll(() => {
        global.Box3D = {
            isTablet: () => false,
        };
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/Video360Viewer-test.html');
        containerEl = document.querySelector('.container');
        options.container = containerEl;
        options.location = {};
        viewer = new Video360Viewer(options);
        jest.spyOn(viewer, 'processMetrics').mockImplementation();
    });

    afterEach(() => {
        fixture.cleanup();

        if (viewer && typeof viewer.destroy === 'function') {
            viewer.destroy();
        }
        viewer = null;
    });

    describe('setup()', () => {
        beforeEach(() => {
            viewer.setup();
        });

        test('should create .destroyed property of false', () => {
            expect(viewer.destroyed).toBe(false);
        });

        test('should set "display" style of mediaEl to "none"', () => {
            expect(viewer.mediaEl.style.display).toBe('none');
        });

        test('should set "width" style of mediaContainerEl to "100%"', () => {
            expect(viewer.mediaContainerEl.style.width).toBe('100%');
        });

        test('should set "height" style of mediaContainerEl to "100%"', () => {
            expect(viewer.mediaContainerEl.style.height).toBe('100%');
        });

        test('should add class bp-video-360 to the wrapperEl', () => {
            expect(viewer.wrapperEl).toHaveClass('bp-video-360');
        });
    });

    describe('destroy()', () => {
        test('should invoke skybox.setAttribute() with params "skyboxTexture" and null, if .skybox exists', () => {
            const spy = jest.fn();
            const skybox = {
                setAttribute: spy,
            };

            viewer.skybox = skybox;
            viewer.destroy();

            expect(spy).toBeCalledWith('skyboxTexture', null);
        });

        test('should invoke textureAsset.destroy() if it exists', () => {
            const textureAsset = {
                destroy: jest.fn(),
            };

            viewer.textureAsset = textureAsset;
            viewer.destroy();

            expect(textureAsset.destroy).toBeCalled();
        });

        test('should invoke videoAsset.destroy() if it exists', () => {
            const videoAsset = {
                destroy: jest.fn(),
            };

            viewer.videoAsset = videoAsset;
            viewer.destroy();

            expect(videoAsset.destroy).toBeCalled();
        });

        test('should invoke .destroyControls() if it exists', () => {
            const destroyStub = jest.spyOn(viewer, 'destroyControls').mockImplementation();

            viewer.controls = {};
            viewer.destroy();

            expect(destroyStub).toBeCalled();
        });

        describe('if renderer exists', () => {
            let rendererMock;
            let b3dMock;
            beforeEach(() => {
                b3dMock = {
                    off: jest.fn(),
                };

                rendererMock = {
                    removeListener: jest.fn(),
                    destroy: jest.fn(),
                    getBox3D: jest.fn().mockReturnValue(b3dMock),
                };

                viewer.renderer = rendererMock;
                viewer.destroy();
            });

            afterEach(() => {
                b3dMock = null;
                rendererMock = null;
            });

            test('should remove mouseDown event listener from renderer.box3d instance', () => {
                expect(b3dMock.off).toBeCalledWith('mouseDown', viewer.onCanvasMouseDown);
            });

            test('should remove mouseUp event listener from renderer.box3d instance', () => {
                expect(b3dMock.off).toBeCalledWith('mouseUp', viewer.onCanvasMouseUp);
            });

            test('should remove EVENT_SHOW_VR_BUTTON from renderer', () => {
                expect(rendererMock.removeListener).toBeCalledWith(EVENT_SHOW_VR_BUTTON, viewer.handleShowVrButton);
            });

            test('should invoke renderer.destroy', () => {
                expect(rendererMock.destroy).toBeCalled();
            });
        });
    });

    describe('getJSAssets()', () => {
        test('return assets including box3d-specific and WebVR JS', () => {
            const assets = viewer.getJSAssets();
            JS.forEach(asset => {
                expect(assets.indexOf(asset) !== -1).toBe(true);
            });
        });
    });

    describe('loadeddataHandler()', () => {
        const stubs = {};
        let superLoadedData;
        beforeAll(() => {
            superLoadedData = jest.fn();
            Object.defineProperty(Object.getPrototypeOf(Video360Viewer.prototype), 'loadeddataHandler', {
                value: superLoadedData,
            });
        });

        beforeEach(() => {
            stubs.on = jest.spyOn(Video360Renderer.prototype, 'on').mockImplementation();
            stubs.initBox3d = jest.spyOn(Video360Renderer.prototype, 'initBox3d').mockResolvedValue(undefined);
            stubs.initVr = jest.spyOn(Video360Renderer.prototype, 'initVr').mockImplementation();
            stubs.create360Environment = jest.spyOn(viewer, 'create360Environment').mockResolvedValue(undefined);
        });

        afterEach(() => {
            Object.keys(stubs).forEach(key => {
                const stub = stubs[key];
                if (stub.restore) {
                    stub.restore();
                }
            });
            viewer.renderer = null;
        });

        test('should create a new Video360 renderer instance', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(done);
            viewer.loadeddataHandler();
            expect(viewer.renderer).toBeInstanceOf(Video360Renderer);
        });

        test('should set .options.sceneEntities to the sceneEntities imported into Video360', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(done);
            viewer.loadeddataHandler();
            expect(viewer.options.sceneEntities).toBe(sceneEntities);
        });

        test('should add custom event handler for VR Toggle to .renderer via .renderer.on()', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(done);
            viewer.loadeddataHandler();
            expect(stubs.on).toBeCalledWith(EVENT_SHOW_VR_BUTTON, viewer.handleShowVrButton);
        });

        test('should invoke .renderer.initBox3d() with .options', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(done);
            viewer.loadeddataHandler();
            expect(stubs.initBox3d).toBeCalledWith(viewer.options);
        });

        test('should invoke .create360Environment() after successfully initializing renderer', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(() => {
                expect(stubs.create360Environment).toBeCalled();
                done();
            });
            viewer.loadeddataHandler();
        });

        test('should invoke super.metadataloadedHandler() on successfully creating 360 environment', done => {
            stubs.createControls = jest.spyOn(viewer, 'createControls').mockImplementation(() => {
                expect(superLoadedData).toBeCalled();
                done();
            });
            viewer.loadeddataHandler();
        });

        test('should invoke .createControls() on successfully creating 360 environment', done => {
            jest.spyOn(viewer, 'createControls').mockImplementation(done);
            viewer.loadeddataHandler();
        });

        test('should invoke .renderer.initVrIfPresent() on successfully creating 360 environment', done => {
            jest.spyOn(viewer, 'createControls').mockImplementation();

            stubs.initVr = jest.spyOn(Video360Renderer.prototype, 'initVr').mockImplementation(() => {
                expect(stubs.initVr).toBeCalled();
                done();
            });
            viewer.loadeddataHandler();
        });
    });

    describe('createControls()', () => {
        let onStub;
        beforeEach(() => {
            onStub = jest.spyOn(Video360Controls.prototype, 'on').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'addUi').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers').mockImplementation();
            viewer.renderer = {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                destroy: jest.fn(),
                getBox3D: jest.fn().mockReturnValue({
                    canvas: document.createElement('canvas'),
                    off: jest.fn(),
                }),
            };
        });

        afterEach(() => {
            viewer.controls = null;
        });

        test('should create and store an instance of Video360Controls', () => {
            viewer.createControls();
            expect(viewer.controls).toBeInstanceOf(Video360Controls);
        });

        test('should attach event handler for vr toggle by invoking .controls.on() with EVENT_TOGGLE_VR and .handleToggleVr()', () => {
            viewer.createControls();
            expect(onStub).toBeCalledWith(EVENT_TOGGLE_VR, viewer.handleToggleVr);
        });

        test('should bind mousemove listener to display video player UI', () => {
            const addStub = jest.spyOn(viewer.renderer.getBox3D().canvas, 'addEventListener').mockImplementation();
            viewer.createControls();

            expect(addStub).toBeCalledWith('mousemove', undefined);
        });

        test('should bind touchstart listener to display video player UI, if touch enabled', () => {
            const addStub = jest.spyOn(viewer.renderer.getBox3D().canvas, 'addEventListener').mockImplementation();
            viewer.hasTouch = true;
            viewer.createControls();

            expect(addStub).toBeCalledWith('touchstart', expect.any(Function));
        });
    });

    describe('destroyControls()', () => {
        let controls;
        let canvas;
        beforeEach(() => {
            controls = {
                removeListener: jest.fn(),
                destroy: jest.fn(),
            };
            viewer.controls = controls;
            viewer.destroyControls();
            canvas = {
                removeEventListener: jest.fn(),
            };
            viewer.renderer = {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                destroy: jest.fn(),
                getBox3D: jest.fn().mockReturnValue({
                    canvas,
                    off: jest.fn(),
                }),
            };
        });

        afterEach(() => {
            viewer.controls = null;
        });

        test('should remove event handler for EVENT_TOGGLE_VR by invoking .controls.removeListener() with EVENT_TOGGLE_VR and .handleToggleVr()', () => {
            expect(controls.removeListener).toBeCalledWith(EVENT_TOGGLE_VR, viewer.handleToggleVr);
        });

        test('should invoke .controls.destroy()', () => {
            expect(controls.destroy).toBeCalled();
        });

        test('should bind mousemove listener to display video player UI', () => {
            viewer.destroyControls();

            expect(canvas.removeEventListener).toBeCalledWith('mousemove', undefined);
        });

        test('should bind touchstart listener to display video player UI, if touch enabled', () => {
            viewer.hasTouch = true;
            viewer.destroyControls();

            expect(canvas.removeEventListener).toBeCalledWith('touchstart', expect.any(Function));
        });
    });

    describe('resize()', () => {
        test('should call resize on .renderer, if it exists', () => {
            Object.defineProperty(Object.getPrototypeOf(Video360Viewer.prototype), 'resize', {
                value: jest.fn(),
            });

            viewer.renderer = {
                resize: jest.fn(),
            };
            viewer.resize();

            expect(viewer.renderer.resize).toBeCalled();
            viewer.renderer = null;
        });
    });

    describe('create360Environment()', () => {
        let renderer;
        let skybox;
        let box3d;
        let scene;
        let createPromise;

        beforeEach(() => {
            skybox = {
                setAttribute: jest.fn(),
                enable: jest.fn(),
            };

            scene = {
                getComponentByScriptId: jest.fn().mockReturnValue(skybox),
            };

            box3d = {
                getEntityById: jest.fn().mockReturnValue(scene),
                createVideo: jest.fn().mockReturnValue({
                    setProperties: jest.fn(),
                }),
                createTexture2d: jest.fn().mockReturnValue({
                    setProperties: jest.fn(),
                    load: jest.fn().mockResolvedValue(undefined),
                    id: '12345',
                }),
                on: jest.fn(),
            };

            renderer = {
                getBox3D: jest.fn().mockReturnValue(box3d),
                getScene: jest.fn().mockReturnValue(scene),
            };

            viewer.setup();
            viewer.renderer = renderer;
            createPromise = viewer.create360Environment();
        });

        afterEach(() => {
            viewer.renderer = null;
            viewer.textureAsset = null;
            viewer.videoAsset = null;
            viewer.skybox = null;
            renderer = null;
            box3d = null;
            skybox = null;
            scene = null;
            createPromise = null;
        });

        test('should return a promise', () => {
            expect(createPromise).toBeInstanceOf(Promise);
        });

        test('should invoke .renderer.getScene() to get the root scene from the runtime', () => {
            expect(renderer.getScene).toBeCalled();
        });

        test('should invoke scene.getComponentByScriptId() to get the skybox_renderer component', () => {
            expect(scene.getComponentByScriptId).toBeCalledWith('skybox_renderer');
            expect(viewer.skybox).toBe(skybox);
        });

        test('should create a new video asset via .renderer.getBox3D().createVideo()', () => {
            expect(box3d.createVideo).toBeCalledWith(VIDEO_PROPS, 'VIDEO_ID');
        });

        test('should create a new texture asset by invoking .renderer.getBox3D().createTexture2d()', () => {
            expect(box3d.createTexture2d).toBeCalledWith(VIDEO_TEXTURE_PROPS, 'VIDEO_TEX_ID');
        });

        describe.skip('load texture asset', () => {
            test('should resolve the Promise returned after successfully loading .textureAsset', done => {
                createPromise.then(done);
            });

            test("should invoke the texture asset's load() via .textureAsset.load()", () => {
                expect(viewer.textureAsset.load).toBeCalled();
            });

            test('should set the skyboxTexture attribute of the skybox component with the textureAsset via .skybox.setAttribute()', done => {
                createPromise.then(() => {
                    expect(skybox.setAttribute).toBeCalledWith('skyboxTexture', viewer.textureAsset.id);
                    done();
                });
            });

            test('should invoke .enable() on the skybox component', done => {
                createPromise.then(() => {
                    expect(skybox.enable).toBeCalled();
                    done();
                });
            });

            test('should attach mouseDown event listener via .renderer.box3d.on()', done => {
                createPromise.then(() => {
                    expect(box3d.on).toBeCalledWith('mouseDown', viewer.onCanvasMouseDown);
                    done();
                });
            });
        });
    });

    describe('toggleFullscreen()', () => {
        test('should invoke fullscreen.toggle() with .wrapperEl', () => {
            jest.spyOn(fullscreen, 'toggle').mockImplementation();
            viewer.toggleFullscreen();

            expect(fullscreen.toggle).toBeCalledWith(viewer.wrapperEl);
        });
    });

    describe('handleToggleVr()', () => {
        beforeEach(() => {
            viewer.renderer = {
                toggleVr: jest.fn(),
                vrEnabled: true,
            };

            viewer.skybox = {
                setAttribute: jest.fn(),
            };
        });

        afterEach(() => {
            viewer.renderer = null;
            viewer.skybox = null;
        });

        describe('vr is enabled', () => {
            test('should invoke .renderer.toggleVr()', () => {
                viewer.handleToggleVr();
                expect(viewer.renderer.toggleVr).toBeCalled();
            });

            test('should invoke .skybox.setAttribute() with "stereoEnabled" as false if vr is enabled', () => {
                viewer.handleToggleVr();
                expect(viewer.skybox.setAttribute).toBeCalledWith('stereoEnabled', false);
            });
        });

        describe('vr is disabled', () => {
            beforeEach(() => {
                viewer.renderer.vrEnabled = false;
                viewer.mediaEl = {
                    play: jest.fn(),
                    paused: false,
                };
            });

            afterEach(() => {
                viewer.mediaEl = null;
            });

            test('should not invoke .mediaEl.play() if is i playing', () => {
                viewer.handleToggleVr();
                expect(viewer.mediaEl.play).not.toBeCalled();
            });

            test('should invoke .mediaEl.play() if it is currently paused', () => {
                viewer.mediaEl.paused = true;
                viewer.handleToggleVr();
                expect(viewer.mediaEl.play).toBeCalled();
            });

            test('should invoke .skybox.setAttribute() with "stereoEnabled" as true', () => {
                viewer.handleToggleVr();
                expect(viewer.skybox.setAttribute).toBeCalledWith('stereoEnabled', true);
            });
        });
    });

    describe('handleShowVrButton()', () => {
        test('should invoke .controls.showVrButton()', () => {
            viewer.controls = {
                showVrButton: jest.fn(),
            };
            viewer.handleShowVrButton();
            expect(viewer.controls.showVrButton).toBeCalled();

            viewer.controls = null;
        });
    });

    describe('onCanvasMouseDown()', () => {
        test('should add a single use "mouseUp" event listener via .renderer.getBox3D().once()', () => {
            const box3d = {
                once: jest.fn(),
            };

            viewer.renderer = {
                getBox3D: jest.fn().mockReturnValue(box3d),
            };

            viewer.onCanvasMouseDown();
            expect(box3d.once).toBeCalledWith('mouseUp', viewer.onCanvasMouseUp);

            viewer.renderer = null;
        });
    });

    describe('onCanvasMouseUp()', () => {
        let input;
        beforeEach(() => {
            input = {
                getPreviousMouseDragState: jest.fn(),
                getPreviousTouchDragState: jest.fn(),
            };

            viewer.renderer = {
                getInputController: jest.fn().mockReturnValue(input),
            };

            jest.spyOn(viewer, 'togglePlay').mockImplementation();
        });

        afterEach(() => {
            viewer.renderer = null;
            input = null;
        });

        test('should invoke .renderer.getInputController() to get the input component', () => {
            viewer.onCanvasMouseUp();
            expect(viewer.renderer.getInputController).toBeCalled();
        });

        test('should invoke .togglePlay() if the mouse/touch has not moved since the previous mouse/touch down event', () => {
            input.getPreviousMouseDragState.mockReturnValue(false);
            input.getPreviousTouchDragState.mockReturnValue(false);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).toBeCalled();
        });

        test('should not invoke .togglePlay() if there was a touch move event since the last touch down', () => {
            input.getPreviousMouseDragState.mockReturnValue(false);
            input.getPreviousTouchDragState.mockReturnValue(true);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).not.toBeCalled();
        });

        test('should not invoke .togglePlay() if there was a mouse move event since the last mouse down', () => {
            input.getPreviousMouseDragState = jest.fn().mockReturnValue(true);
            input.getPreviousTouchDragState = jest.fn().mockReturnValue(false);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).not.toBeCalled();
        });
    });
});
