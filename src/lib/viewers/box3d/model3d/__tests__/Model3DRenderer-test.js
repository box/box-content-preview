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
    EVENT_SET_WIREFRAMES_VISIBLE
} from '../model3DConstants';
import Browser from '../../../../Browser';

describe('lib/viewers/box3d/model3d/Model3DRenderer', () => {
    const sandbox = sinon.sandbox.create();
    let containerEl;
    let renderer;
    let stubs = {};
    let renderMock;
    let scene;
    let app;
    let instance;
    let animation;
    let animationComp;

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
        animationComp = {
            setAsset: () => null,
            setLoop: () => null
        }
        instance = {
            trigger: () => null,
            once: (name, fn) => fn(),
            id: 'INSTANCE_ID',
            addComponent: () => null,
            getComponentByScriptId: (id) => id === 'animation' ? animationComp : {}
        }
        scene = {
            addChild: () => {},
            removeChild: () => {},
            when: () => {},
            runtimeData: {
                add: () => {},
                remove: () => {}
            },
            getDescendantByName: () => instance
        };
        animation = {
            id: 'my_animation',
            isLoading: () => true,
            when: () => {}
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
            getAssetsByType: () => [],
            getAssetsByClass: () => [animation],
            getAssetById: () => {},
            getEntityById: (id) => {
                return id === 'SCENE_ID' ? scene : undefined;
            },
            getEntitiesByType: () => [],
            getObjectByClass: (classType) => {
                return classType === Box3D.SceneObject ? scene : undefined;
            },
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
            const options = { file: {id: 'dummyId'}};
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
                },
                file: {
                    id: ''
                }
            };
            renderMock.expects('initBox3d').returns(Promise.resolve());
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        it('should load the box3d file after initializing the runtime', (done) => {
            const options = { file: { id: ''}};
            renderMock.expects('initBox3d').returns(Promise.resolve());
            renderMock.expects('loadBox3dFile').returns(Promise.resolve());
            renderer.load('http://derpy.net', options).then(() => {
                done();
            });
        });

        it('should setup the scene via onUnsupportedRepresentation() if it cannot load the model', (done) => {
            const options = { file: { id: ''}};
            renderMock.expects('onUnsupportedRepresentation');
            sandbox.stub(renderer, 'loadBox3dFile', () => Promise.reject());
            renderer.load('', options).then(() => done());
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

        it('should setup the scene via setupScene() if it can successfully load the model', (done) => {
            sandbox.mock(renderer.box3d, 'setupScene', () => {});
            renderMock.expects('setupScene').called;
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

        it('should invoke addHelpersToScene() to add the scene grid and axis colour lines to the scene', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderMock.expects('addHelpersToScene').once();
            renderer.setupScene();
        });

        it('should invoke onSceneLoad when the scene has been loaded', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox.stub(scene, 'when', (event, cb) => cb());
            const stub = sandbox.stub(renderer, 'onSceneLoad');
            renderer.setupScene();
            expect(stub).to.be.called;
        });

        it('should add a listener on the scene instance for it to be loaded', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox.mock(scene).expects('when').withArgs('load');
            renderer.setupScene();
        });

        it('should add the axis rotation component to the instance', () => {
            renderer.instance = instance;
            sandbox.stub(instance, 'addComponent');
            renderer.setupScene();
            expect(instance.addComponent).to.be.calledWith('axis_rotation', {}, 'axis_rotation_INSTANCE_ID');
        });

        it('should add the animation component to the instance', () => {
            renderer.instance = instance;
            sandbox.stub(instance, 'addComponent');
            renderer.setupScene();
            expect(instance.addComponent).to.be.calledWith('animation', {}, 'animation_INSTANCE_ID');
        });

        it('should set the current animation to the first animation asset', () => {
            renderer.instance = instance;
            renderMock.expects('setAnimationAsset').withArgs(animation);
            renderer.setupScene();
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
                unsetProperty: () => {},
                getComponentByScriptId: () => {},
                runtimeData: {}
            };
        });

        it('should do nothing if there is no runtime data on the instanced model', () => {
            sandbox.mock(renderer.instance).expects('getChildren').never();
            renderer.instance = undefined;
            renderer.resetModel();
        });

        it('should set the position of each child model instance to the origin', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {}
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox.mock(child).expects('setPosition').withArgs(0, 0, 0);
            renderer.resetModel();
        });

        it('should set the orientation of each child model to the identity transform', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {}
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox.mock(child).expects('setQuaternion').withArgs(0, 0, 0, 1);
            renderer.resetModel();
        });

        it('should set the scale of each child model to unity', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {}
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox.mock(child).expects('setScale').withArgs(1, 1, 1);
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
                setPivotPosition: () => {},
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

        it('should set the origin point of the orbitController component to the center of the model', () => {
            const center = new THREE.Vector3(9, 9, 9);
            sandbox.mock(camera).expects('getComponentByScriptId').returns(orbitComp);
            sandbox.mock(renderer.instance).expects('getCenter').returns(center);
            sandbox.mock(orbitComp).expects('setPivotPosition');
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
        const videos = [];

        beforeEach(() => {
            sandbox.stub(renderer.box3d, 'getEntitiesByType', (type) => {
                switch (type) {
                    case 'animation':
                        return animations;
                    case 'video':
                        return videos;
                    default:
                        return [];
                }
            });
        });

        afterEach(() => {
            animations.length = 0;
            videos.length = 0;
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

    describe('rotateOnAxis()', () => {
        let center;
        let listenToRotate;
        beforeEach(() => {
            center = new THREE.Vector3();
            renderer.instance = {
                trigger: () => {},
                getCenter: sandbox.stub().returns(center),
                destroy: () => {}
            };
        });

        it('should do nothing if there is no model instance reference', () => {
            sandbox.mock(renderer.box3d).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.instance = undefined;
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should do nothing if there is no Box3D runtime reference', () => {
            sandbox.mock(renderer.instance).expects('trigger').withArgs('rotate_on_axis').never();
            renderer.box3d = undefined;
            renderer.rotateOnAxis({ x: -1 });
        });

        it('should trigger a "rotate_on_axis" event on the runtime', () => {
            const axis = { x: -1, y: 0 };
            sandbox.mock(renderer.instance).expects('trigger').withArgs('rotate_on_axis', axis);
            renderer.rotateOnAxis(axis);
        });
    });

    describe('setAxisRotation()', () => {

        it('should do nothing if no instance available', () => {
            renderer.instance = undefined;
            sandbox.stub(renderer.box3d, 'trigger');
            expect(renderer.setAxisRotation('-x', '-y', false)).to.not.throw;
        });

        it('should trigger a "set_axes_orientation" event on the runtime instance', () => {
            renderer.instance = { trigger: () => {} };
            sandbox.mock(renderer.instance).expects('trigger').withArgs('set_axes_orientation', '-x', '-y', true);
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

        // For devices like cardboard
        it('should add listener to runtime update event, if no positional tracking capabilities on vr device', () => {
            sandbox.mock(renderer.box3d).expects('on').withArgs('update', renderer.updateNonPositionalVrControls, renderer);
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

        it('should stop listening to engine updates if no device position available', () => {
            renderer.vrDeviceHasPosition = false;
            sandbox.mock(renderer.box3d).expects('off').withArgs('update', renderer.updateNonPositionalVrControls, renderer);
            renderer.onDisableVr();
        });
    });

    describe('updateNonPositionalVrControls()', () => {
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
            renderer.updateNonPositionalVrControls();
        });

        it('should set the position of the camera to slightly away from the origin', () => {
            position.expects('set').withArgs(0, 0, orbitDist);
            renderer.updateNonPositionalVrControls();
        });

        it('should rotate the camera to match the camera orientation', () => {
            position.expects('applyQuaternion').withArgs(quaternion);
            renderer.updateNonPositionalVrControls();
        });
    });

    describe('initVrGamepadControls()', () => {
        it('should create a new instance of Model3DVrControls', () => {
            renderer.initVrGamepadControls();
            expect(renderer.vrControls).to.be.an.instanceof(Model3dVrControls);
        });
    });
});
