/* eslint-disable no-unused-expressions */
import Video360Viewer from '../Video360Viewer';
import Video360Controls from '../Video360Controls';
import Video360Renderer from '../Video360Renderer';
import { EVENT_TOGGLE_VR, EVENT_SHOW_VR_BUTTON } from '../../box3DConstants';
import JS from '../../box3DAssets';
import sceneEntities from '../SceneEntities';
import fullscreen from '../../../../Fullscreen';

describe('lib/viewers/box3d/video360/Video360Viewer', () => {
    const sandbox = sinon.sandbox.create();
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

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/Video360Viewer-test.html');
        containerEl = document.querySelector('.container');
        options.container = containerEl;
        options.location = {};
        viewer = new Video360Viewer(options);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (viewer && typeof viewer.destroy === 'function') {
            viewer.destroy();
        }
        viewer = null;
    });

    describe('setup()', () => {
        beforeEach(() => {
            sandbox.stub(viewer, 'finishLoadingSetup');
            viewer.setup();
        });

        it('should create .destroyed property of false', () => {
            expect(viewer.destroyed).to.be.false;
        });

        it('should set "display" style of mediaEl to "none"', () => {
            expect(viewer.mediaEl.style.display).to.equal('none');
        });

        it('should set "width" style of mediaContainerEl to "100%"', () => {
            expect(viewer.mediaContainerEl.style.width).to.equal('100%');
        });

        it('should set "height" style of mediaContainerEl to "100%"', () => {
            expect(viewer.mediaContainerEl.style.height).to.equal('100%');
        });

        it('should add class bp-video-360 to the wrapperEl', () => {
            expect(viewer.wrapperEl).to.have.class('bp-video-360');
        });
    });

    describe('destroy()', () => {
        it('should invoke skybox.setAttribute() with params "skyboxTexture" and null, if .skybox exists', () => {
            const spy = sandbox.spy();
            const skybox = {
                setAttribute: spy,
            };

            viewer.skybox = skybox;
            viewer.destroy();

            expect(spy.getCall(0).args[0]).to.equal('skyboxTexture');
            expect(spy.getCall(0).args[1]).to.be.null;
        });

        it('should invoke textureAsset.destroy() if it exists', () => {
            const textureAsset = {
                destroy: sandbox.stub(),
            };

            viewer.textureAsset = textureAsset;
            viewer.destroy();

            expect(textureAsset.destroy).to.be.called;
        });

        it('should invoke videoAsset.destroy() if it exists', () => {
            const videoAsset = {
                destroy: sandbox.stub(),
            };

            viewer.videoAsset = videoAsset;
            viewer.destroy();

            expect(videoAsset.destroy).to.be.called;
        });

        it('should invoke .destroyControls() if it exists', () => {
            const destroyStub = sandbox.stub(viewer, 'destroyControls');

            viewer.controls = {};
            viewer.destroy();

            expect(destroyStub).to.be.called;
        });

        describe('if renderer exists', () => {
            let rendererMock;
            let b3dMock;
            beforeEach(() => {
                b3dMock = {
                    off: sandbox.stub(),
                };

                rendererMock = {
                    removeListener: sandbox.stub(),
                    destroy: sandbox.stub(),
                    getBox3D: sandbox.stub().returns(b3dMock),
                };

                viewer.renderer = rendererMock;
                viewer.destroy();
            });

            afterEach(() => {
                b3dMock = null;
                rendererMock = null;
            });

            it('should remove mouseDown event listener from renderer.box3d instance', () => {
                expect(b3dMock.off).to.be.calledWith('mouseDown', viewer.onCanvasMouseDown);
            });

            it('should remove mouseUp event listener from renderer.box3d instance', () => {
                expect(b3dMock.off).to.be.calledWith('mouseUp', viewer.onCanvasMouseUp);
            });

            it('should remove EVENT_SHOW_VR_BUTTON from renderer', () => {
                expect(rendererMock.removeListener).to.be.calledWith(EVENT_SHOW_VR_BUTTON, viewer.handleShowVrButton);
            });

            it('should invoke renderer.destroy', () => {
                expect(rendererMock.destroy).to.be.called;
            });
        });
    });

    describe('getJSAssets()', () => {
        it('return assets including box3d-specific and WebVR JS', () => {
            const assets = viewer.getJSAssets();
            JS.forEach(asset => {
                expect(assets.indexOf(asset) !== -1).to.be.true;
            });
        });
    });

    describe('loadeddataHandler()', () => {
        const stubs = {};
        let superLoadedData;
        before(() => {
            superLoadedData = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(Video360Viewer.prototype), 'loadeddataHandler', {
                value: superLoadedData,
            });
        });

        beforeEach(() => {
            stubs.on = sandbox.stub(Video360Renderer.prototype, 'on');
            stubs.initBox3d = sandbox.stub(Video360Renderer.prototype, 'initBox3d').returns(Promise.resolve());
            stubs.initVr = sandbox.stub(Video360Renderer.prototype, 'initVr');
            stubs.create360Environment = sandbox.stub(viewer, 'create360Environment').returns(Promise.resolve());
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

        it('should create a new Video360 renderer instance', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(done);
            viewer.loadeddataHandler();
            expect(viewer.renderer).to.be.an.instanceof(Video360Renderer);
        });

        it('should set .options.sceneEntities to the sceneEntities imported into Video360', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(done);
            viewer.loadeddataHandler();
            expect(viewer.options.sceneEntities).to.deep.equal(sceneEntities);
        });

        it('should add custom event handler for VR Toggle to .renderer via .renderer.on()', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(done);
            viewer.loadeddataHandler();
            expect(stubs.on).to.be.calledWith(EVENT_SHOW_VR_BUTTON, viewer.handleShowVrButton);
        });

        it('should invoke .renderer.initBox3d() with .options', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(done);
            viewer.loadeddataHandler();
            expect(stubs.initBox3d).to.be.calledWith(viewer.options);
        });

        it('should invoke .create360Environment() after successfully initializing renderer', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(() => {
                expect(stubs.create360Environment).to.be.called;
                done();
            });
            viewer.loadeddataHandler();
        });

        it('should invoke super.metadataloadedHandler() on successfully creating 360 environment', done => {
            stubs.createControls = sandbox.stub(viewer, 'createControls').callsFake(() => {
                expect(superLoadedData).to.be.called;
                done();
            });
            viewer.loadeddataHandler();
        });

        it('should invoke .createControls() on successfully creating 360 environment', done => {
            sandbox.stub(viewer, 'createControls').callsFake(done);
            viewer.loadeddataHandler();
        });

        it('should invoke .renderer.initVrIfPresent() on successfully creating 360 environment', done => {
            sandbox.stub(viewer, 'createControls');
            stubs.initVr.restore();
            stubs.initVr = sandbox.stub(Video360Renderer.prototype, 'initVr').callsFake(() => {
                expect(stubs.initVr).to.be.called;
                done();
            });
            viewer.loadeddataHandler();
        });
    });

    describe('createControls()', () => {
        let onStub;
        beforeEach(() => {
            onStub = sandbox.stub(Video360Controls.prototype, 'on');
            sandbox.stub(Video360Controls.prototype, 'addUi');
            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            viewer.renderer = {
                addListener: sandbox.stub(),
                removeListener: sandbox.stub(),
                destroy: sandbox.stub(),
                getBox3D: sandbox.stub().returns({
                    canvas: document.createElement('canvas'),
                    off: sandbox.stub(),
                }),
            };
        });

        afterEach(() => {
            viewer.controls = null;
        });

        it('should create and store an instance of Video360Controls', () => {
            viewer.createControls();
            expect(viewer.controls).to.be.an.instanceof(Video360Controls);
        });

        it('should attach event handler for vr toggle by invoking .controls.on() with EVENT_TOGGLE_VR and .handleToggleVr()', () => {
            viewer.createControls();
            expect(onStub).to.be.calledWith(EVENT_TOGGLE_VR, viewer.handleToggleVr);
        });

        it('should bind mousemove listener to display video player UI', () => {
            const addStub = sandbox.stub(viewer.renderer.getBox3D().canvas, 'addEventListener');
            viewer.createControls();

            expect(addStub).to.be.calledWith('mousemove');
        });

        it('should bind touchstart listener to display video player UI, if touch enabled', () => {
            const addStub = sandbox.stub(viewer.renderer.getBox3D().canvas, 'addEventListener');
            viewer.hasTouch = true;
            viewer.createControls();

            expect(addStub).to.be.calledWith('touchstart');
        });
    });

    describe('destroyControls()', () => {
        let controls;
        let canvas;
        beforeEach(() => {
            controls = {
                removeListener: sandbox.stub(),
                destroy: sandbox.stub(),
            };
            viewer.controls = controls;
            viewer.destroyControls();
            canvas = {
                removeEventListener: sandbox.stub(),
            };
            viewer.renderer = {
                addListener: sandbox.stub(),
                removeListener: sandbox.stub(),
                destroy: sandbox.stub(),
                getBox3D: sandbox.stub().returns({
                    canvas,
                    off: sandbox.stub(),
                }),
            };
        });

        afterEach(() => {
            viewer.controls = null;
        });

        it('should remove event handler for EVENT_TOGGLE_VR by invoking .controls.removeListener() with EVENT_TOGGLE_VR and .handleToggleVr()', () => {
            expect(controls.removeListener).to.be.calledWith(EVENT_TOGGLE_VR, viewer.handleToggleVr);
        });

        it('should invoke .controls.destroy()', () => {
            expect(controls.destroy).to.be.called;
        });

        it('should bind mousemove listener to display video player UI', () => {
            viewer.destroyControls();

            expect(canvas.removeEventListener).to.be.calledWith('mousemove');
        });

        it('should bind touchstart listener to display video player UI, if touch enabled', () => {
            viewer.hasTouch = true;
            viewer.destroyControls();

            expect(canvas.removeEventListener).to.be.calledWith('touchstart');
        });
    });

    describe('resize()', () => {
        it('should call resize on .renderer, if it exists', () => {
            Object.defineProperty(Object.getPrototypeOf(Video360Viewer.prototype), 'resize', {
                value: sandbox.stub(),
            });

            viewer.renderer = {
                resize: sandbox.stub(),
            };
            viewer.resize();

            expect(viewer.renderer.resize).to.be.called;
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
                setAttribute: sandbox.stub(),
                enable: sandbox.stub(),
            };

            scene = {
                getComponentByScriptId: sandbox.stub().returns(skybox),
            };

            box3d = {
                getEntityById: sandbox.stub().returns(scene),
                createVideo: sandbox.stub().returns({
                    setProperties: sandbox.stub(),
                }),
                createTexture2d: sandbox.stub().returns({
                    setProperties: sandbox.stub(),
                    load: sandbox.stub().callsArg(0),
                    id: '12345',
                }),
                on: sandbox.stub(),
            };

            renderer = {
                getBox3D: sandbox.stub().returns(box3d),
                getScene: sandbox.stub().returns(scene),
            };

            sandbox.stub(viewer, 'finishLoadingSetup');

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

        it('should return a promise', () => {
            expect(createPromise).to.be.instanceof(Promise);
        });

        it('should invoke .renderer.getScene() to get the root scene from the runtime', () => {
            expect(renderer.getScene).to.be.called;
        });

        it('should invoke scene.getComponentByScriptId() to get the skybox_renderer component', () => {
            expect(scene.getComponentByScriptId).to.be.calledWith('skybox_renderer');
            expect(viewer.skybox).to.deep.equal(skybox);
        });

        it('should create a new video asset via .renderer.getBox3D().createVideo()', () => {
            expect(box3d.createVideo).to.be.calledWith(VIDEO_PROPS, 'VIDEO_ID');
        });

        it('should create a new texture asset by invoking .renderer.getBox3D().createTexture2d()', () => {
            expect(box3d.createTexture2d).to.be.calledWith(VIDEO_TEXTURE_PROPS, 'VIDEO_TEX_ID');
        });

        describe('load texture asset', () => {
            it('should resolve the Promise returned after successfully loading .textureAsset', done => {
                createPromise.then(done);
            });

            it("should invoke the texture asset's load() via .textureAsset.load()", () => {
                expect(viewer.textureAsset.load).to.be.called;
            });

            it('should set the skyboxTexture attribute of the skybox component with the textureAsset via .skybox.setAttribute()', done => {
                createPromise.then(() => {
                    expect(skybox.setAttribute).to.be.calledWith('skyboxTexture', viewer.textureAsset.id);
                    done();
                });
            });

            it('should invoke .enable() on the skybox component', done => {
                createPromise.then(() => {
                    expect(skybox.enable).to.have.been;
                    done();
                });
            });

            it('should attach mouseDown event listener via .renderer.box3d.on()', done => {
                createPromise.then(() => {
                    expect(box3d.on).to.be.calledWith('mouseDown', viewer.onCanvasMouseDown);
                    done();
                });
            });
        });
    });

    describe('toggleFullscreen()', () => {
        it('should invoke fullscreen.toggle() with .wrapperEl', () => {
            sandbox.stub(fullscreen, 'toggle');
            viewer.toggleFullscreen();

            expect(fullscreen.toggle).to.be.calledWith(viewer.wrapperEl);
        });
    });

    describe('handleToggleVr()', () => {
        beforeEach(() => {
            viewer.renderer = {
                toggleVr: sandbox.stub(),
                vrEnabled: true,
            };

            viewer.skybox = {
                setAttribute: sandbox.stub(),
            };
        });

        afterEach(() => {
            viewer.renderer = null;
            viewer.skybox = null;
        });

        describe('vr is enabled', () => {
            it('should invoke .renderer.toggleVr()', () => {
                viewer.handleToggleVr();
                expect(viewer.renderer.toggleVr).to.be.called;
            });

            it('should invoke .skybox.setAttribute() with "stereoEnabled" as false if vr is enabled', () => {
                viewer.handleToggleVr();
                expect(viewer.skybox.setAttribute).to.be.calledWith('stereoEnabled', false);
            });
        });

        describe('vr is disabled', () => {
            beforeEach(() => {
                viewer.renderer.vrEnabled = false;
                viewer.mediaEl = {
                    play: sandbox.stub(),
                    paused: false,
                };
            });

            afterEach(() => {
                viewer.mediaEl = null;
            });

            it('should not invoke .mediaEl.play() if is i playing', () => {
                viewer.handleToggleVr();
                expect(viewer.mediaEl.play).to.not.be.called;
            });

            it('should invoke .mediaEl.play() if it is currently paused', () => {
                viewer.mediaEl.paused = true;
                viewer.handleToggleVr();
                expect(viewer.mediaEl.play).to.be.called;
            });

            it('should invoke .skybox.setAttribute() with "stereoEnabled" as true', () => {
                viewer.handleToggleVr();
                expect(viewer.skybox.setAttribute).to.be.calledWith('stereoEnabled', true);
            });
        });
    });

    describe('handleShowVrButton()', () => {
        it('should invoke .controls.showVrButton()', () => {
            viewer.controls = {
                showVrButton: sandbox.stub(),
            };
            viewer.handleShowVrButton();
            expect(viewer.controls.showVrButton).to.be.called;

            viewer.controls = null;
        });
    });

    describe('onCanvasMouseDown()', () => {
        it('should add a single use "mouseUp" event listener via .renderer.getBox3D().once()', () => {
            const box3d = {
                once: sandbox.stub(),
            };

            viewer.renderer = {
                getBox3D: sandbox.stub().returns(box3d),
            };

            viewer.onCanvasMouseDown();
            expect(box3d.once).to.be.calledWith('mouseUp', viewer.onCanvasMouseUp);

            viewer.renderer = null;
        });
    });

    describe('onCanvasMouseUp()', () => {
        let input;
        beforeEach(() => {
            input = {
                getPreviousMouseDragState: sandbox.stub(),
                getPreviousTouchDragState: sandbox.stub(),
            };

            viewer.renderer = {
                getInputController: sandbox.stub().returns(input),
            };

            sandbox.stub(viewer, 'togglePlay');
        });

        afterEach(() => {
            viewer.renderer = null;
            input = null;
        });

        it('should invoke .renderer.getInputController() to get the input component', () => {
            viewer.onCanvasMouseUp();
            expect(viewer.renderer.getInputController).to.be.called;
        });

        it('should invoke .togglePlay() if the mouse/touch has not moved since the previous mouse/touch down event', () => {
            input.getPreviousMouseDragState.returns(false);
            input.getPreviousTouchDragState.returns(false);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).to.be.called;
        });

        it('should not invoke .togglePlay() if there was a touch move event since the last touch down', () => {
            input.getPreviousMouseDragState.returns(false);
            input.getPreviousTouchDragState.returns(true);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).to.not.be.called;
        });

        it('should not invoke .togglePlay() if there was a mouse move event since the last mouse down', () => {
            input.getPreviousMouseDragState = sandbox.stub().returns(true);
            input.getPreviousTouchDragState = sandbox.stub().returns(false);
            viewer.onCanvasMouseUp();

            expect(viewer.togglePlay).to.not.be.called;
        });
    });
});
