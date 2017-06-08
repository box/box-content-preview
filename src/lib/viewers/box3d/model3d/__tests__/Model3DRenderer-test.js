/* global THREE Box3D */
/* eslint-disable no-unused-expressions */
import Model3DRenderer from '../Model3DRenderer';
import Box3DRenderer from '../../Box3DRenderer';
import Model3dVrControls from '../Model3DVrControls';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    EVENT_CANVAS_CLICK,
    EVENT_RESET_SKELETONS,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    QUALITY_LEVEL_FULL
} from '../model3DConstants';
import Browser from '../../../../Browser';

// Optimizer thresholds
const OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR = 30; // 20 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE = 66.6; // 15 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR_VR = 20.0; // 50 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE_VR = 66.6; // 15 FPS

describe('lib/viewers/box3d/model3d/Model3DRenderer', () => {
    const sandbox = sinon.sandbox.create();
    let containerEl;
    let renderer;
    let stubs = {};
    let renderMock;
    let scene;
    let app;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/model3d/__tests__/Model3DRenderer-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = sandbox.stub(window, 'BoxSDK');
        renderer = new Model3DRenderer(containerEl, {});
        app = {
            getComponentByScriptId: () => {}
        };
        scene = {
            addChild: () => {},
            removeChild: () => {},
            when: () => {},
            runtimeData: {
                add: () => {},
                remove: () => {}
            }
        };
        renderer.box3d = {
            addRemoteEntities: () => Promise.resolve(),
            canvas: {
                addEventListener: () => {},
                removeEventListener: () => {}
            },
            createNode: () => {},
            destroy: () => {},
            getApplication: () => app,
            getAssetsByType: () => {},
            getAssetById: () => {},
            getEntityById: (id) => {
                return id === 'SCENE_ID' ? scene : undefined;
            },
            getEntitiesByType: () => {},
            getObjectById: () => {},
            getVrDisplay: () => {},
            off: () => {},
            on: () => {},
            trigger: () => {}
        };
        renderMock = sandbox.mock(renderer);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = undefined;
        app = undefined;
    });

    describe('destroy()', () => {
        it('should remove event listener from the engine instance canvas', () => {
            const removeListener = sandbox.stub(renderer.box3d.canvas, 'removeEventListener');
            renderer.destroy();
            expect(removeListener).to.be.called;
        });

        it('should do nothing if there is not box3d runtime instance', () => {
            renderMock.expects('cleanupScene').never();
            renderer.box3d = undefined;
            renderer.destroy();
        });
    });

    describe('handleCanvasClick()', () => {
        it('should emit a "canvas click" event', () => {
            renderMock.expects('emit').withArgs(EVENT_CANVAS_CLICK);
            renderer.handleCanvasClick();
        });

        it('should emit a "canvas click event" with the DOM event', () => {
            const event = { type: 'an_event' };
            renderMock.expects('emit').withArgs(EVENT_CANVAS_CLICK, event);
            renderer.handleCanvasClick(event);
        });
    });

    describe('load()', () => {
        it('should do nothing with scene entities if location is not present in options', (done) => {
            const options = {};
            sandbox.stub(renderer, 'initBox3d', (opts) => {
                expect(opts.sceneEntities).to.not.exist;
                done();
                return Promise.resolve();
            });
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        it('should assign sceneEntities to the passed in options object', (done) => {
            const options = {
                location: {
                    staticBaseURI: ''
                }
            };
            sandbox.stub(renderer, 'initBox3d', (opts) => {
                expect(opts.sceneEntities).to.exist;
                done();
                return Promise.resolve();
            });
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        it('should initialize the box3d runtime', () => {
            const options = {
                location: {
                    staticBaseURI: ''
                }
            };
            renderMock.expects('initBox3d').returns(Promise.resolve());
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        it('should load the box3d file after initializing the runtime', (done) => {
            const options = {};
            renderMock.expects('initBox3d').returns(Promise.resolve());
            renderMock.expects('loadBox3dFile').returns(Promise.resolve());
            renderer.load('http://derpy.net', options).then(() => {
                done();
            });
        });
    });

    describe('loadBox3dFile', () => {
        let renderMode;
        beforeEach(() => {
            renderMode = {
                setAttribute: () => {}
            };
            sandbox.mock(app).expects('getComponentByScriptId').withArgs('render_modes').returns(renderMode);
        });

        it('should add event listener to the canvas for click events', () => {
            sandbox
                .mock(renderer.box3d.canvas)
                .expects('addEventListener')
                .withArgs('click', renderer.handleCanvasClick);
            renderer.loadBox3dFile('');
        });

        it('should set the shape texture ID for the Shape render mode', () => {
            sandbox.mock(renderMode).expects('setAttribute').withArgs('shapeTexture', 'MAT_CAP_TEX');
            renderer.loadBox3dFile('');
        });

        it('should invoke box3d.addRemoteEntities() to add the model to the scene', () => {
            const url = 'www.derp.box.com';
            sandbox.mock(renderer.box3d).expects('addRemoteEntities').withArgs(url).returns(Promise.resolve());
            renderer.loadBox3dFile(url);
        });

        it('should setup the scene via setupScene() if it can successfully load the model', (done) => {
            renderMock.expects('setupScene').called;
            sandbox.mock(renderer.box3d).expects('addRemoteEntities').returns(Promise.resolve());
            renderer.loadBox3dFile('').then(() => done());
        });

        it('should setup the scene via onUnsupportedRepresentation() if it cannot load the model', (done) => {
            const entities = [];
            renderMock.expects('onUnsupportedRepresentation');
            sandbox.mock(renderer.box3d).expects('addRemoteEntities').returns(Promise.reject(entities));
            renderer.loadBox3dFile('').then(() => done());
        });
    });

    describe('setupScene()', () => {
        beforeEach(() => {
            sandbox.stub(renderer.box3d, 'getAssetsByType').returns([]);
        });

        it('should do nothing if no scene instance is present', () => {
            renderMock.expects('getScene').returns(undefined);
            renderer.setupScene();
        });

        it('should invoke createPrefabInstances() to add the model to the scene', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderMock.expects('createPrefabInstances').once();
            renderer.setupScene([]);
        });

        it('should invoke addHelpersToScene() to add the scene grid and axis colour lines to the scene', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderMock.expects('addHelpersToScene').once();
            renderer.setupScene([]);
        });

        it('should invoke onSceneLoad when the scene has been loaded', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox.stub(scene, 'when', (event, cb) => cb());
            const stub = sandbox.stub(renderer, 'onSceneLoad');
            renderer.setupScene([]);
            expect(stub).to.be.called;
        });

        it('should add a listener on the scene instance for it to be loaded', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox.mock(scene).expects('when').withArgs('load');
            renderer.setupScene([]);
        });
    });

    describe('createPrefabInstances()', () => {
        let b3dMock;
        beforeEach(() => {
            b3dMock = sandbox.mock(renderer.box3d);
        });

        it('should do nothing if there are no prefabs', () => {
            b3dMock.expects('createNode').never();
            b3dMock.expects('getAssetsByType').withArgs('prefab').returns([]);
            renderer.createPrefabInstances();
        });

        describe('when prefabs available', () => {
            let parent;
            let prefab;
            let instance;
            let adjustStub;
            beforeEach(() => {
                instance = {
                    id: '123456789'
                };
                prefab = {
                    createInstance: sandbox.stub().returns(instance)
                };
                parent = {
                    addChild: sandbox.stub(),
                    destroy: () => {}
                };
                b3dMock.expects('createNode').returns(parent);
                b3dMock.expects('getAssetsByType').withArgs('prefab').returns([prefab]);
                adjustStub = sandbox.stub(renderer, 'adjustModelForScene');
            });

            // Checks expectations in beforeEach()
            it('should create a node for nesting prefab instances in', () => {
                renderer.createPrefabInstances();
            });

            it('should add an instanced prefab to the node for each prefab created', () => {
                renderer.createPrefabInstances();
                expect(prefab.createInstance).to.be.called;
                expect(parent.addChild).to.be.calledWith(instance);
            });

            it('should add the created node to the scene', () => {
                sandbox.mock(scene).expects('addChild').withArgs(parent);
                renderer.createPrefabInstances();
            });

            it('should scale and orient the model to fit the scene scale by invoking adjustModelForScene()', () => {
                renderer.createPrefabInstances();
                expect(adjustStub).to.be.calledWith(parent);
            });

            it('should store a reference to the new node', () => {
                renderer.createPrefabInstances();
                expect(renderer.instance).to.deep.equal(parent);
            });
        });
    });

    describe('adjustModelForScene()', () => {
        let instance;
        beforeEach(() => {
            instance = {
                id: 'INSTANCE_ID',
                scaleToSize: sandbox.stub(),
                alignToPosition: sandbox.stub(),
                addComponent: sandbox.stub()
            };
        });

        it('should scale the model to modelSize via scaleToSize()', () => {
            const scale = 22;
            renderer.modelSize = scale;
            renderer.adjustModelForScene(instance);
            expect(instance.scaleToSize).to.be.calledWith(scale);
        });

        it('should orient the model via alignToPosition()', () => {
            const pos = { x: 0, y: 1, z: 10 };
            renderer.modelAlignmentPosition = pos;
            const alignment = { x: 0, y: 0, z: 0 };
            renderer.modelAlignmentVector = alignment;
            renderer.adjustModelForScene(instance);
            expect(instance.alignToPosition).to.be.calledWith(pos, alignment);
        });

        it('should add the axis rotation component to the instance', () => {
            renderer.adjustModelForScene(instance);
            expect(instance.addComponent).to.be.calledWith('preview_axis_rotation', {}, 'axis_rotation_INSTANCE_ID');
        });

        it('should add the animation component to the instance', () => {
            renderer.adjustModelForScene(instance);
            expect(instance.addComponent).to.be.calledWith('animation', {}, 'animation_INSTANCE_ID');
        });
    });

    describe('getAxes()', () => {
        it('should return a Promise', () => {
            const prom = renderer.getAxes();
            expect(prom).to.be.a('Promise');
        });

        it('should trigger a "get_axes" event', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('get_axes');
            renderer.getAxes();
        });

        it('should trigger a "get_axes" event with a callback function', (done) => {
            sandbox.stub(renderer.box3d, 'trigger', (eventName, callback) => {
                expect(callback).to.be.a('function');
                done();
            });
            renderer.getAxes();
        });

        it('should resolve the Promise after "get_axes" event has been processed', (done) => {
            sandbox.stub(renderer.box3d, 'trigger', (eventName, callback) => {
                callback();
            });
            renderer.getAxes().then(done);
        });
    });

    describe('reset()', () => {
        it('should invoke resetModel()', () => {
            const stub = sandbox.stub(renderer, 'resetModel');
            sandbox.stub(Box3DRenderer.prototype, 'reset');
            renderer.reset();
            expect(stub).to.be.called;
        });

        it('should invoke parent\'s reset()', () => {
            sandbox.stub(renderer, 'resetModel');
            const stub = sandbox.stub(Box3DRenderer.prototype, 'reset');
            renderer.reset();
            expect(stub).to.be.called;
        });
    });

    describe('resetModel()', () => {
        beforeEach(() => {
            renderer.instance = {
                alignToPosition: () => {},
                computeBounds: () => {},
                destroy: () => {},
                getChildren: () => [],
                scaleToSize: () => {},
                runtimeData: {}
            };
        });

        it('should do nothing if there is no runtime data on the instanced model', () => {
            sandbox.mock(renderer.instance).expects('computeBounds').never();
            renderer.instance = undefined;
            renderer.resetModel();
        });

        it('should set the position of each child model instance to the origin', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {}
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox.mock(child).expects('setPosition').withArgs(0, 0, 0);
            renderer.resetModel();
        });

        it('should set the orientation of the mode to be that of the origin', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {}
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox.mock(child).expects('setQuaternion').withArgs(0, 0, 0, 1);
            renderer.resetModel();
        });

        it('should invoke computeBounds() on the instance', () => {
            sandbox.mock(renderer.instance).expects('computeBounds');
            renderer.resetModel();
        });

        it('should invoke scaleToSize() on the instance', () => {
            sandbox.mock(renderer.instance).expects('scaleToSize').withArgs(renderer.modelSize);
            renderer.resetModel();
        });

        it('should invoke alignToPosition() on the instance', () => {
            sandbox
                .mock(renderer.instance)
                .expects('alignToPosition')
                .withArgs(renderer.modelAlignmentPosition, renderer.modelAlignmentVector);
            renderer.resetModel();
        });
    });

    describe('resetView()', () => {
        let camera;
        let orbitComp;
        beforeEach(() => {
            sandbox.stub(Box3DRenderer.prototype, 'resetView');
            sandbox.stub(THREE.Vector3.prototype, 'subVectors');
            sandbox.stub(THREE.Vector3.prototype, 'applyMatrix4');
            orbitComp = {
                originPoint: new THREE.Vector3(),
                setOrbitDistance: () => {},
                reset: () => {}
            };
            camera = {
                getComponentByScriptId: () => {}
            };
            renderer.instance = {
                getCenter: () => {
                    return new THREE.Vector3();
                },
                computeBounds: () => {},
                getBounds: () => {
                    return { min: new THREE.Vector3(2, 2, 2), max: new THREE.Vector3(3, 3, 3) };
                },
                destroy: () => {},
                runtimeData: {
                    matrixWorld: {},
                    updateMatrixWorld: () => {}
                }
            };
            sandbox.stub(renderer, 'getCamera', () => camera);
        });

        it('should do nothing if there is no camera', () => {
            sandbox.mock(camera).expects('getComponentByScriptId').never();
            camera = undefined;
            renderer.resetView();
        });

        it('should get the orbit camera component on the camera', () => {
            sandbox.mock(camera).expects('getComponentByScriptId');
            renderer.resetView();
        });

        it('should do nothing if the orbit camera component does not exist', () => {
            sandbox.mock(renderer.instance).expects('computeBounds').never();
            sandbox.stub(camera, 'getComponentByScriptId').returns(undefined);
            renderer.resetView();
        });

        it('should invoke instance.computeBounds() before operating on bounds', () => {
            sandbox.mock(camera).expects('getComponentByScriptId').returns(orbitComp);
            sandbox.mock(renderer.instance).expects('computeBounds');
            renderer.resetView();
        });

        it('should set the origin point of the orbitController component to the center of the model', () => {
            const center = new THREE.Vector3(9, 9, 9);
            sandbox.mock(camera).expects('getComponentByScriptId').returns(orbitComp);
            sandbox.mock(renderer.instance).expects('getCenter').returns(center);
            sandbox.mock(orbitComp.originPoint).expects('copy').withArgs(center);
            renderer.resetView();
        });

        it('should call the reset method of the orbitController component', () => {
            sandbox.mock(camera).expects('getComponentByScriptId').returns(orbitComp);
            sandbox.mock(orbitComp).expects('reset');
            renderer.resetView();
        });

        it('should set the orbit distance of the orbitController component', () => {
            const center = new THREE.Vector3(9, 9, 9);
            sandbox.mock(orbitComp).expects('setOrbitDistance');
            sandbox.mock(camera).expects('getComponentByScriptId').returns(orbitComp);
            sandbox.mock(renderer.instance).expects('getCenter').returns(center);
            renderer.resetView();
        });
    });

    describe('onSceneLoad()', () => {
        const animations = [];
        const images = [];
        const videos = [];
        let startOptimizerStub;

        beforeEach(() => {
            sandbox.stub(renderer.box3d, 'getEntitiesByType', (type) => {
                switch (type) {
                    case 'animation':
                        return animations;
                    case 'image':
                        return images;
                    case 'video':
                        return videos;
                    default:
                        return [];
                }
            });
            startOptimizerStub = sandbox.stub(renderer, 'startOptimizer');
        });

        afterEach(() => {
            animations.length = 0;
            images.length = 0;
            videos.length = 0;
        });

        it('should collect all assets that are loading', () => {
            sandbox.stub(Promise, 'all').returns({ then: () => {} });
            const anim = {
                isLoading: sandbox.stub().returns(true),
                when: sandbox.stub()
            };
            animations.push(anim);
            const image = {
                isLoading: sandbox.stub().returns(false),
                when: sandbox.stub()
            };
            images.push(image);
            const video = {
                isLoading: sandbox.stub().returns(false),
                when: sandbox.stub()
            };
            videos.push(video);
            sandbox
                .mock(animations)
                .expects('concat')
                .withArgs(images, videos)
                .returns([...animations, ...images, ...videos]);
            renderer.onSceneLoad();

            expect(anim.isLoading).to.be.called;
            expect(image.isLoading).to.be.called;
            expect(video.isLoading).to.be.called;
        });

        it('should add listeners for filtered assets to load', () => {
            sandbox.stub(Promise, 'all').returns({ then: () => {} });
            const anim = {
                isLoading: sandbox.stub().returns(true),
                when: sandbox.stub()
            };
            animations.push(anim);
            sandbox.mock(animations).expects('concat').withArgs(images, videos).returns([...animations]);
            renderer.onSceneLoad();

            expect(anim.when).to.be.calledWith('load');
        });

        it('should invoke resize', () => {
            sandbox.stub(Promise, 'all').returns({ then: () => {} });
            renderMock.expects('resize');
            renderer.onSceneLoad();
        });

        describe('when assets fully loaded', () => {
            beforeEach(() => {
                sandbox.stub(Promise, 'all').returns({
                    then: (callback) => callback()
                });
            });

            it('should invoke startOptimizer()', () => {
                renderer.onSceneLoad();
                expect(startOptimizerStub).to.be.called;
            });

            it('should set the current animation to the first animation asset', () => {
                const anim = {
                    id: 'my_animation',
                    isLoading: () => true,
                    when: () => {}
                };
                animations.push(anim);
                renderMock.expects('setAnimationAsset').withArgs(anim);
                renderer.onSceneLoad();
            });

            it('should play all videos once they are loaded', () => {
                const vid1 = {
                    isLoading: () => false,
                    when: () => {},
                    play: sandbox.stub()
                };
                const vid2 = {
                    isLoading: () => false,
                    when: () => {},
                    play: sandbox.stub()
                };
                videos.push(vid1, vid2);
                renderer.onSceneLoad();

                expect(vid1.play).to.be.called;
                expect(vid2.play).to.be.called;
            });
        });
    });

    describe('animation behaviour', () => {
        let animComp;
        let animAsset;
        beforeEach(() => {
            animAsset = {
                when: () => {}
            };
            animComp = {
                asset: animAsset,
                onUpdate: () => {},
                pause: () => {},
                play: () => {},
                setAsset: () => {},
                setClipId: () => {},
                setLoop: () => {},
                stop: () => {}
            };
            renderer.instance = {
                alignToPosition: () => {},
                destroy: () => {},
                getComponentByScriptId: () => animComp,
                scaleToSize: () => {},
                when: () => {}
            };
        });

        describe('setAnimationAsset()', () => {
            it('should do nothing if no model instance is present', () => {
                renderer.instance = undefined;
                sandbox.mock(animComp).expects('setAsset').never();
                renderer.setAnimationAsset({});
            });

            it('should get the animation component on the model instance', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').returns(animComp);
                renderer.setAnimationAsset({});
            });

            it('should set the current animation being used by the component to the one passed in', () => {
                const asset = {
                    id: 'my_animation'
                };
                sandbox.mock(animComp).expects('setAsset').withArgs(asset);
                renderer.setAnimationAsset(asset);
            });

            it('should enable animation looping on the component', () => {
                sandbox.mock(animComp).expects('setLoop').withArgs(true);
                renderer.setAnimationAsset({});
            });
        });

        describe('setAnimationClip()', () => {
            it('should do nothing if no model instance is present', () => {
                renderer.instance = undefined;
                sandbox.mock(animComp).expects('setClipId').never();
                renderer.setAnimationClip('');
            });

            it('should get the animation component on the model instance', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').returns(animComp);
                renderer.setAnimationClip('');
            });

            it('should set the clip id of the component', () => {
                const id = 'my_clip_id';
                sandbox.mock(animComp).expects('setClipId').withArgs(id);
                renderer.setAnimationClip(id);
            });
        });

        describe('toggleAnimation()', () => {
            it('should do nothing if no model instance is present', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').never();
                renderer.instance = undefined;
                renderer.toggleAnimation();
            });

            it('should get the animation component on the model', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId');
                renderer.toggleAnimation();
            });

            it('should do nothing if the animation component is missing', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').returns(undefined);
                sandbox.mock(animAsset).expects('when').never();
                renderer.toggleAnimation();
            });

            it('should do nothing if the animation component does not have an asset assigned to it', () => {
                animComp.asset = undefined;
                sandbox.mock(animAsset).expects('when').never();
                renderer.toggleAnimation();
            });

            it('should add an event listener for the animation asset to load', () => {
                sandbox.mock(animAsset).expects('when').withArgs('load');
                renderer.toggleAnimation();
            });

            it('should add an event listener for the instance to load, after animation asset loads', () => {
                sandbox.stub(animAsset, 'when', (event, cb) => cb());
                sandbox.mock(renderer.instance).expects('when').withArgs('load');
                renderer.toggleAnimation();
            });

            describe('after instance and animation asset loaded', () => {
                beforeEach(() => {
                    sandbox.stub(animAsset, 'when', (event, cb) => cb());
                    sandbox.stub(renderer.instance, 'when', (event, cb) => cb());
                });

                it('should pause the animation, by default', () => {
                    sandbox.mock(animComp).expects('pause');
                    renderer.toggleAnimation();
                });

                it('should invoke play() on the component, to start the animation', () => {
                    sandbox.mock(animComp).expects('play');
                    renderer.toggleAnimation(true);
                });

                it('should invoke a single onUpdate() for the component', () => {
                    sandbox.mock(animComp).expects('onUpdate').withArgs(0);
                    renderer.toggleAnimation(true);
                });

                it('should scale the model to a size that fits the scene via scaleToSize()', () => {
                    const size = 2.5;
                    renderer.modelSize = size;
                    sandbox.mock(renderer.instance).expects('scaleToSize').withArgs(size);
                    renderer.toggleAnimation(true);
                });

                it('should align the model to an orientation that fits the scene via alignToPosition()', () => {
                    const pos = { x: 0, y: 1, z: 90 };
                    renderer.modelAlignmentPosition = pos;
                    const vec = { x: 80, y: 1, z: 0 };
                    renderer.modelAlignmentVector = vec;
                    sandbox.mock(renderer.instance).expects('alignToPosition').withArgs(pos, vec);
                    renderer.toggleAnimation(true);
                });
            });
        });

        describe('stopAnimation()', () => {
            it('should do nothing if no model instance is present', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').never();
                renderer.instance = undefined;
                renderer.stopAnimation();
            });

            it('should get the animation component on the model', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId').returns(animComp);
                renderer.stopAnimation();
            });

            it('should invoke stop() on the animation and stop it from playing', () => {
                sandbox.mock(animComp).expects('stop');
                renderer.stopAnimation();
            });
        });
    });

    describe('startOptimizer()', () => {
        let optimizer;
        let regularChangeStub;
        let vrChangeStub;
        beforeEach(() => {
            optimizer = {
                test: {},
                disable: () => {},
                enable: () => {},
                setFrameTimeThreshold: () => {},
                setQualityChangeLevels: () => {}
            };
            regularChangeStub = sandbox.stub(renderer, 'createRegularQualityChangeLevels');
            vrChangeStub = sandbox.stub(renderer, 'createVrQualityChangeLevels');
        });

        it('should do nothing if no optimizer is present on the application', () => {
            sandbox.mock(app).expects('getComponentByScriptId').withArgs('dynamic_optimizer').returns(undefined);
            renderer.startOptimizer();
            expect(regularChangeStub).to.not.be.called;
        });

        describe('with a dynamic optimizer component', () => {
            beforeEach(() => {
                sandbox.mock(app).expects('getComponentByScriptId').withArgs('dynamic_optimizer').returns(optimizer);
            });

            it('should invoke createRegularQualityChangeLevels()', () => {
                renderer.startOptimizer();
                expect(regularChangeStub).to.be.called;
            });

            it('should invoke createRegularQualityChangeLevels()', () => {
                renderer.startOptimizer();
                expect(vrChangeStub).to.be.called;
            });

            it('should enable the optimizer if it is set to be enabled', () => {
                renderer.dynamicOptimizerEnabled = true;
                sandbox.mock(optimizer).expects('enable');
                renderer.startOptimizer();
            });

            it('should disable the optimizer if it is set to be disabled', () => {
                renderer.dynamicOptimizerEnabled = false;
                sandbox.mock(optimizer).expects('disable');
                renderer.startOptimizer();
            });

            it('should set the initial set of regular mode quality levels to the ones created at startup', () => {
                const qualitySteps = [];
                renderer.regularQualityChangeLevels = qualitySteps;
                sandbox.mock(optimizer).expects('setQualityChangeLevels').withArgs(qualitySteps);
                renderer.startOptimizer();
            });

            it('should set the frame time threshold to regular mode when on a non-mobile device', () => {
                const threshold = 30; // 20 FPS
                sandbox.stub(Browser, 'isMobile').returns(false);
                sandbox.mock(optimizer).expects('setFrameTimeThreshold').withArgs(threshold);
                renderer.startOptimizer();
            });

            it('should set the frame time threshold to mobile mode when on a mobile device', () => {
                const threshold = 66.6; // 15 FPS
                sandbox.stub(Browser, 'isMobile').returns(true);
                sandbox.mock(optimizer).expects('setFrameTimeThreshold').withArgs(threshold);
                renderer.startOptimizer();
            });
        });
    });

    describe('onUnsupportedRepresentation()', () => {
        it('should emit an error event', () => {
            sandbox.mock(renderer).expects('emit').withArgs('error');
            renderer.onUnsupportedRepresentation();
        });
    });

    describe('addHelpersToScene()', () => {
        it('should do nothing if no scene present', () => {
            sandbox.mock(renderer).expects('getScene').returns(undefined);
            renderer.addHelpersToScene();
            expect(renderer.grid).to.not.exist;
        });

        it('should create a GridHelper object', () => {
            renderer.addHelpersToScene();
            expect(renderer.grid).to.be.an.instanceof(THREE.GridHelper);
        });

        it('should create an AxisHelper object', () => {
            renderer.addHelpersToScene();
            expect(renderer.axisDisplay).to.be.an.instanceof(THREE.AxisHelper);
        });

        it('should add the GridHelper object and axis helper to the scene', () => {
            sandbox.mock(scene.runtimeData).expects('add').twice();
            renderer.addHelpersToScene();
        });
    });

    describe('cleanupHelpers()', () => {
        let grid;
        let axis;
        beforeEach(() => {
            grid = {
                material: {
                    dispose: sandbox.stub()
                },
                geometry: {
                    dispose: sandbox.stub()
                }
            };
            renderer.grid = grid;
            axis = {
                material: {
                    dispose: sandbox.stub()
                },
                geometry: {
                    dispose: sandbox.stub()
                }
            };
            renderer.axisDisplay = axis;
        });

        it('should do nothing if there is no scene present', () => {
            sandbox.mock(renderer).expects('getScene').returns(undefined);
            renderer.cleanupHelpers();
            expect(renderer.grid.material.dispose).to.not.be.called;
        });

        it('should not remove the grid if there is none', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderer.grid = undefined;
            renderer.axisDisplay = undefined;
            sandbox.mock(scene.runtimeData).expects('remove').withArgs(grid).never();
            renderer.cleanupHelpers();
        });

        it('should remove the grid from the scene', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderer.axisDisplay = undefined;
            sandbox.mock(scene.runtimeData).expects('remove').withArgs(grid);
            renderer.cleanupHelpers();
        });

        it('should dispose of the grid geometry and material', () => {
            renderer.cleanupHelpers();
            expect(grid.geometry.dispose).to.be.called;
            expect(grid.material.dispose).to.be.called;
        });

        it('should not remove the axis helper if there is none', () => {
            renderer.grid = undefined;
            renderer.axisDisplay = undefined;
            sandbox.mock(scene.runtimeData).expects('remove').withArgs(axis).never();
            renderer.cleanupHelpers();
        });

        it('should remove the axis helper from the scene', () => {
            renderer.grid = undefined;
            sandbox.mock(scene.runtimeData).expects('remove').withArgs(axis);
            renderer.cleanupHelpers();
        });

        it('should dispose of the axis helper geometry and material', () => {
            renderer.cleanupHelpers();
            expect(axis.geometry.dispose).to.be.called;
            expect(axis.material.dispose).to.be.called;
        });
    });

    describe('toggleHelpers()', () => {
        afterEach(() => {
            // nuke out axis display to prevent dispose calls
            renderer.axisDisplay = undefined;
        });

        it('should toggle axis display visiblity', () => {
            renderer.axisDisplay = {
                visible: true
            };
            renderer.toggleHelpers();
            expect(renderer.axisDisplay.visible).to.be.false;
        });

        it('should set the axis display to flag passed in', () => {
            renderer.axisDisplay = {
                visible: undefined
            };
            renderer.toggleHelpers(true);
            expect(renderer.axisDisplay.visible).to.be.true;
        });

        it('should tell the runtime to re-render', () => {
            renderer.axisDisplay = {
                visible: true
            };
            renderer.toggleHelpers();
            expect(renderer.box3d.needsRender).to.be.true;
        });
    });

    describe('cleanupScene()', () => {
        it('should invoke cleanupHelpers()', () => {
            sandbox.mock(renderer).expects('cleanupHelpers');
            renderer.cleanupScene();
        });

        it('should invoke resetSkeletons()', () => {
            sandbox.mock(renderer).expects('resetSkeletons');
            renderer.cleanupScene();
        });
    });

    describe('resetSkeletons()', () => {
        it('should do nothing if no box3d reference', () => {
            renderer.box3d = undefined;
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_RESET_SKELETONS).never();
            renderer.resetSkeletons();
        });

        it('should fire a global render mode change event', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_RESET_SKELETONS).once();
            renderer.resetSkeletons();
        });
    });

    describe('setRenderMode()', () => {
        it('should do nothing if no box3d reference', () => {
            renderer.box3d = undefined;
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_SET_RENDER_MODE).never();
            renderer.setRenderMode('test');
        });

        it('should fire a global render mode change event', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_SET_RENDER_MODE).once();
            renderer.setRenderMode('test');
        });
    });

    describe('setCameraProjection()', () => {
        let camera;
        beforeEach(() => {
            camera = {
                setProperty: () => {},
                getProperty: () => {
                    return 'perspective';
                }
            };
        });

        it('should not throw error if no camera is present', () => {
            const mock = sandbox.mock(renderer);
            mock.expects('getCamera').returns(undefined);
            expect(renderer.setCameraProjection(CAMERA_PROJECTION_PERSPECTIVE)).to.not.throw;
        });

        it('should set the perspective properties of the camera if perspective mode is selected', (done) => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(camera, 'setProperty', (prop, value) => {
                expect(prop).to.equal('cameraType');
                expect(value).to.equal('perspective');
                done();
            });
            renderer.setCameraProjection(CAMERA_PROJECTION_PERSPECTIVE);
        });

        it('should set the orthographic properties of the camera if ortho mode is selected', (done) => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(camera, 'setProperty', (prop, value) => {
                expect(prop).to.equal('cameraType');
                expect(value).to.equal('orthographic');
                done();
            });
            renderer.setCameraProjection(CAMERA_PROJECTION_ORTHOGRAPHIC);
        });

        it('should do nothing for unrecognized projection type', () => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(renderer, 'resetView');
            sandbox.mock(camera).expects('setProperty').never();
            renderer.setCameraProjection('weak_perspective_projection');
        });
    });

    describe('setQualityLevel()', () => {
        beforeEach(() => {
            renderer.dynamicOptimizer = {
                disable: () => {},
                enable: () => {}
            };
        });

        it('should do nothing if there is no runtime instance', () => {
            const mock = sandbox.mock(renderer.dynamicOptimizer);
            mock.expects('disable').never();
            mock.expects('enable').never();
            renderer.box3d = undefined;
            renderer.setQualityLevel(QUALITY_LEVEL_FULL);
        });

        it('should disable the optimizer if full quality is specified', () => {
            const mock = sandbox.mock(renderer.dynamicOptimizer);
            mock.expects('disable').once();
            renderer.setQualityLevel(QUALITY_LEVEL_FULL);
            expect(renderer.dynamicOptimizerEnabled).to.be.false;
        });

        it('should enable the optimizer if anything but full quality is specified', () => {
            const mock = sandbox.mock(renderer.dynamicOptimizer);
            mock.expects('enable').once();
            renderer.setQualityLevel('really_low_resolution_and_bad');
            expect(renderer.dynamicOptimizerEnabled).to.be.true;
        });
    });

    describe('listenToRotateComplete()', () => {
        beforeEach(() => {
            renderer.instance = {
                once: () => {},
                destroy: () => {},
                alignToPosition: () => {}
            };
        });
        it('should set the isRotating flag to true, to prevent other listeners from being added', () => {
            renderer.listenToRotateComplete({}, {});
            expect(renderer.isRotating).to.be.true;
        });

        it('should bind to the postUpdate event on the runtime', () => {
            sandbox.mock(renderer.box3d).expects('on').withArgs('postUpdate');
            renderer.listenToRotateComplete();
        });

        it('should invoke instance.alignToPosition on the runtime postUpdate event', () => {
            let onPostUpdate;
            sandbox.stub(renderer.box3d, 'on', (event, cb) => {
                onPostUpdate = cb;
            });
            const pos = { name: 'position' };
            const align = { name: 'alignment' };
            sandbox.mock(renderer.instance).expects('alignToPosition').withArgs(pos, align).twice();
            renderer.listenToRotateComplete(pos, align);
            // Now that we have the onPostUpdate callback, fire it twice!
            onPostUpdate();
            onPostUpdate();
        });

        it('should not invoke instance.alignToPosition on the runtime postUpdate event, if no model instance', () => {
            let onPostUpdate;
            sandbox.stub(renderer.box3d, 'on', (event, cb) => {
                onPostUpdate = cb;
            });
            sandbox.mock(renderer.instance).expects('alignToPosition').never();
            renderer.listenToRotateComplete();

            renderer.instance = undefined;
            onPostUpdate();
        });

        it('should listen for the axis_transition_complete event on the runtime', () => {
            sandbox.mock(renderer.instance).expects('once').withArgs('axis_transition_complete');
            renderer.listenToRotateComplete();
        });

        it('should fire one post update and then unbind on axis_transition_complete', () => {
            sandbox.stub(renderer.instance, 'once', (event, cb) => cb());
            // The post update callback
            sandbox.mock(renderer.instance).expects('alignToPosition');
            sandbox.mock(renderer.box3d).expects('off').withArgs('postUpdate');
            renderer.listenToRotateComplete();
        });

        it('should disable the isRotating flag on axis_transition_complete', () => {
            sandbox.stub(renderer.instance, 'once', (event, cb) => cb());
            renderer.listenToRotateComplete();
            expect(renderer.isRotating).to.be.false;
        });
    });

    describe('rotateOnAxis()', () => {
        let center;
        let listenToRotate;
        beforeEach(() => {
            center = new THREE.Vector3();
            renderer.instance = {
                getCenter: sandbox.stub().returns(center),
                destroy: () => {}
            };
            listenToRotate = sandbox.stub(renderer, 'listenToRotateComplete');
        });

        it('should do nothing if there is no model instance reference', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.instance = undefined;
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should do nothing if there is no Box3D runtime reference', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.box3d = undefined;
            renderer.instance = {};
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should do nothing if there is no Box3D runtime reference', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.box3d = undefined;
            renderer.instance = {
                destroy: () => {}
            };
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should do nothing if there is already a rotation transition occurring', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.isRotating = true;
            renderer.instance = {
                destroy: () => {}
            };
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should trigger a "rotate_on_axis" event on the runtime', () => {
            const axis = { x: -1, y: 0 };
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis', axis);
            renderer.rotateOnAxis(axis);
        });

        it('should get the center of the model', () => {
            renderer.rotateOnAxis({ x: 1 });
            expect(renderer.instance.getCenter).to.be.called;
        });

        it('should apply world treansforms to the center vector if the instance has runtime data available', () => {
            const alignStub = sandbox.stub(center, 'applyMatrix4');
            renderer.instance.runtimeData = {
                matrixWorld: []
            };
            renderer.rotateOnAxis({ x: 1 });
            expect(alignStub).to.be.called;
        });

        it('should invoke listenToRotateComplete() with the new position and alignment', () => {
            renderer.rotateOnAxis({ z: 1 });
            expect(listenToRotate).to.be.called;
        });
    });

    describe('setAxisRotation()', () => {
        let listenToRotate;
        beforeEach(() => {
            listenToRotate = sandbox.stub(renderer, 'listenToRotateComplete');
        });

        it('should do nothing if no instance available', () => {
            renderer.instance = undefined;
            renderer.setAxisRotation('-x', '-y', false);
            expect(listenToRotate).to.not.be.called;
        });

        it('should invoke to listenToRotateComplete()', () => {
            renderer.instance = { destroy: () => {} };
            renderer.setAxisRotation('-x', '-y', true);
            expect(listenToRotate).to.be.called;
        });

        it('should trigger a "set_axes" event on the runtime instance', () => {
            renderer.instance = { destroy: () => {} };
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('set_axes', '-x', '-y', true);
            renderer.setAxisRotation('-x', '-y', true);
        });
    });

    describe('setSkeletonsVisible()', () => {
        it('should do nothing if no box3d reference', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').never();
            renderer.box3d = undefined;
            renderer.setSkeletonsVisible(false);
        });

        it('should fire a global Box3D event for skeleton visibility', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_SET_SKELETONS_VISIBLE, true);
            renderer.setSkeletonsVisible(true);
        });
    });

    describe('setWireframesVisible()', () => {
        it('should do nothing if no box3d reference', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').never();
            renderer.box3d = undefined;
            renderer.setWireframesVisible(false);
        });

        it('should trigger a global Box3D event for wireframe visibility change', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').withArgs(EVENT_SET_WIREFRAMES_VISIBLE, true);
            renderer.setWireframesVisible(true);
        });
    });

    describe('setGridVisible()', () => {
        it('should do nothing if no box3d reference', () => {
            sandbox.mock(Box3D.globalEvents).expects('trigger').never();
            renderer.box3d = undefined;
            renderer.setGridVisible(false);
        });

        it('should cause a change in grid visibility', () => {
            renderer.grid = {
                visible: false
            };
            renderer.setGridVisible(true);
            expect(renderer.grid.visible).to.equal(true);
            // Get rid of grid to prevent dispose calls during shutdown.
            renderer.grid = undefined;
        });
    });

    describe('enableVr()', () => {
        it('should do nothing if vr is already enabled', () => {
            sandbox.mock(renderer.box3d).expects('getVrDisplay').never();
            renderer.vrEnabled = true;
            renderer.enableVr();
        });

        it('should set the optimizer quality steps to VR quality, if an optimizer is present', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            const qualityLevels = [{ name: 'vrhd' }];
            renderer.vrQualityChangeLevels = qualityLevels;
            sandbox.mock(renderer.dynamicOptimizer).expects('setQualityChangeLevels').withArgs(qualityLevels);
            renderer.enableVr();
        });

        it('should set the threshold for frame timing, in the optimizer, to mobile threshold if on a mobile device', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            sandbox.stub(Browser, 'isMobile').returns(true);
            sandbox
                .mock(renderer.dynamicOptimizer)
                .expects('setFrameTimeThreshold')
                .withArgs(OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE_VR);
            renderer.enableVr();
        });

        it('should set the threshold for frame timing, in the optimizer, to regular threshold if on a non mobile device', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            sandbox.stub(Browser, 'isMobile').returns(false);
            sandbox
                .mock(renderer.dynamicOptimizer)
                .expects('setFrameTimeThreshold')
                .withArgs(OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR_VR);
            renderer.enableVr();
        });

        // For devices like cardboad
        it('should add listener to runtime update event, if no positional tracking cabilities on vr device', () => {
            sandbox.mock(renderer.box3d).expects('on').withArgs('update', renderer.updateModel3dVrControls, renderer);
            renderer.enableVr();
        });

        // For devices like Oculus Rift and HTC Vive
        it('should enable the grid to be visible if the vr device has positional tracking capabilities', () => {
            const device = {
                capabilities: {
                    hasPosition: true
                }
            };
            renderer.grid = {
                visible: false
            };
            sandbox.stub(renderer.box3d, 'getVrDisplay').returns(device);
            renderer.enableVr();
            expect(renderer.grid.visible).to.be.true;
            renderer.grid = undefined;
        });
    });

    describe('onDisableVr()', () => {
        beforeEach(() => {
            sandbox.stub(Box3DRenderer.prototype, 'onDisableVr');
        });

        it('should set the optimizer quality steps to regular quality, if an optimizer is present', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            const qualityLevels = [{ name: 'vrhd' }];
            renderer.regularQualityChangeLevels = qualityLevels;
            sandbox.mock(renderer.dynamicOptimizer).expects('setQualityChangeLevels').withArgs(qualityLevels);
            renderer.onDisableVr();
        });

        it('should set the threshold for frame timing, in the optimizer, to mobile threshold if on a mobile device', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            sandbox.stub(Browser, 'isMobile').returns(true);
            sandbox
                .mock(renderer.dynamicOptimizer)
                .expects('setFrameTimeThreshold')
                .withArgs(OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE);
            renderer.onDisableVr();
        });

        it('should set the threshold for frame timing, in the optimizer, to regular threshold if on a non mobile device', () => {
            renderer.dynamicOptimizer = {
                setQualityChangeLevels: () => {},
                setFrameTimeThreshold: () => {}
            };
            sandbox.stub(Browser, 'isMobile').returns(false);
            sandbox
                .mock(renderer.dynamicOptimizer)
                .expects('setFrameTimeThreshold')
                .withArgs(OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR);
            renderer.onDisableVr();
        });

        it('should stop listening to engine updates if no device position available', () => {
            renderer.vrDeviceHasPosition = false;
            sandbox.mock(renderer.box3d).expects('off').withArgs('update', renderer.updateModel3dVrControls, renderer);
            renderer.onDisableVr();
        });
    });

    describe('updateModel3dVrControls()', () => {
        let position;
        let quaternion;
        let orbitCam;
        const orbitDist = 10;
        let camera;
        beforeEach(() => {
            const pos = {
                set: () => {},
                applyQuaternion: () => {},
                add: () => {}
            };
            position = sandbox.mock(pos);
            quaternion = { x: 1, y: 2, z: 3, w: 1 };
            orbitCam = {
                getOrbitDistance: () => orbitDist
            };
            camera = {
                runtimeData: {
                    quaternion,
                    position: pos
                },
                getComponentByScriptId: () => orbitCam
            };
            sandbox.mock(renderer).expects('getCamera').returns(camera);
        });

        it('should do nothing if there is no orbit camera component available', () => {
            sandbox.stub(camera, 'getComponentByScriptId').returns(undefined);
            position.expects('set').never();
            renderer.updateModel3dVrControls();
        });

        it('should set the position of the camera to slightly away from the origin', () => {
            position.expects('set').withArgs(0, 0, orbitDist);
            renderer.updateModel3dVrControls();
        });

        it('should rotate the camera to match the camera orientation', () => {
            position.expects('applyQuaternion').withArgs(quaternion);
            renderer.updateModel3dVrControls();
        });
    });

    describe('initVrGamepadControls()', () => {
        it('should create a new instance of Model3DVrControls', () => {
            renderer.initVrGamepadControls();
            expect(renderer.vrControls).to.be.an.instanceof(Model3dVrControls);
        });
    });

    describe('createRegularQualityChangeLevels()', () => {
        let spy;
        beforeEach(() => {
            spy = sandbox.spy();
            renderer.dynamicOptimizer = {
                QualityChangeLevel: spy
            };
            renderer.createRegularQualityChangeLevels();
        });

        it('should create three quality levels for regular optimization mode', () => {
            expect(spy.calledWithNew()).to.be.true;
            expect(spy.calledThrice).to.be.true;
        });

        it('should create one level for 0.5 dvp', () => {
            expect(spy.calledWith('application', 'Renderer', 'devicePixelRatio', 0.5)).to.be.true;
        });

        it('should create one level for 0.75 dvp', () => {
            expect(spy.calledWith('application', 'Renderer', 'devicePixelRatio', 0.75)).to.be.true;
        });

        it('should create one level for 1.0 dvp', () => {
            expect(spy.calledWith('application', 'Renderer', 'devicePixelRatio', 1.0)).to.be.true;
        });
    });

    describe('createVrQualityChangeLevels()', () => {
        let spy;
        beforeEach(() => {
            spy = sandbox.spy();
            renderer.dynamicOptimizer = {
                QualityChangeLevel: spy
            };
            renderer.createVrQualityChangeLevels();
        });

        it('should create eight quality levels for vr optimization mode', () => {
            expect(spy.calledWithNew()).to.be.true;
            expect(spy.callCount).to.equal(8);
        });

        it('should create a level for AO map to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'aoMap', null)).to.be.true;
        });

        it('should create a level for environment irradiance map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'envMapIrradiance', null)).to.be.true;
        });

        it('should create a level for unlit mode', () => {
            expect(spy.calledWith('light', null, 'color', { r: 1, g: 1, b: 1 })).to.be.true;
        });

        it('should create a level for AO map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'aoMap', null)).to.be.true;
        });

        it('should create a level for normal map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'normalMap', null)).to.be.true;
        });

        it('should create a level for gloss map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'glossMap', null)).to.be.true;
        });

        it('should create a level for environment gloss map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'envMapGlossVariance', false)).to.be.true;
        });

        it('should create a level for half gloss map feature to be disabled on materials', () => {
            expect(spy.calledWith('material', null, 'envMapRadianceHalfGloss', null)).to.be.true;
        });
    });
});
