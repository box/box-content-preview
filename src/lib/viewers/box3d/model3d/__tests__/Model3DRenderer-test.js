/* global Box3D */
/* eslint-disable no-unused-expressions */
import Box3DRenderer from '../../Box3DRenderer';
import Box3DRuntime, { THREE } from '../../__mocks__/Box3DRuntime';
import Model3DRenderer from '../Model3DRenderer';
import Model3dVrControls from '../Model3DVrControls';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    EVENT_CANVAS_CLICK,
    EVENT_RESET_SKELETONS,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
} from '../model3DConstants';

describe('lib/viewers/box3d/model3d/Model3DRenderer', () => {
    const sandbox = sinon.createSandbox();
    let containerEl;
    let renderer;
    let stubs = {};
    let renderMock;
    let scene;
    let app;
    let instance;
    let animation;
    let animationComp;

    beforeAll(() => {
        global.Box3D = Box3DRuntime;
        global.THREE = THREE;
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/model3d/__tests__/Model3DRenderer-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = sandbox.stub(window, 'BoxSDK');
        renderer = new Model3DRenderer(containerEl, {});
        app = {
            getComponentByScriptId: () => {},
        };
        animationComp = {
            setAsset: () => null,
            setLoop: () => null,
        };
        instance = {
            trigger: () => null,
            once: (name, fn) => fn(),
            id: 'INSTANCE_ID',
            addComponent: () => null,
            getComponentByScriptId: id => (id === 'animation' ? animationComp : {}),
        };
        scene = {
            addChild: () => {},
            removeChild: () => {},
            when: () => {},
            runtimeData: {
                add: () => {},
                remove: () => {},
            },
            getDescendantByName: () => instance,
        };
        animation = {
            id: 'my_animation',
            isLoading: () => true,
            when: () => {},
        };
        renderer.box3d = {
            importEntitiesFromUrl: () => Promise.resolve(),
            canvas: {
                addEventListener: () => {},
                removeEventListener: () => {},
            },
            createNode: () => {},
            destroy: () => {},
            getApplication: () => app,
            getAssetsByType: () => [],
            getAssetsByClass: () => [animation],
            getAssetById: () => {},
            getEntityById: id => {
                return id === 'SCENE_ID' ? scene : undefined;
            },
            getEntitiesByType: () => [],
            getObjectByClass: classType => {
                return classType === Box3D.SceneObject ? scene : undefined;
            },
            getVrDisplay: () => {},
            off: () => {},
            on: () => {},
            trigger: () => {},
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
        test('should remove event listener from the engine instance canvas', () => {
            const removeListener = jest.spyOn(renderer.box3d.canvas, 'removeEventListener').mockImplementation();
            renderer.destroy();
            expect(removeListener).toBeCalled();
        });

        test('should do nothing if there is not box3d runtime instance', () => {
            renderMock.expects('cleanupScene').never();
            renderer.box3d = undefined;
            renderer.destroy();
        });
    });

    describe('handleCanvasClick()', () => {
        test('should emit a "canvas click" event', () => {
            renderMock.expects('emit').withArgs(EVENT_CANVAS_CLICK);
            renderer.handleCanvasClick();
        });

        test('should emit a "canvas click event" with the DOM event', () => {
            const event = { type: 'an_event' };
            renderMock.expects('emit').withArgs(EVENT_CANVAS_CLICK, event);
            renderer.handleCanvasClick(event);
        });
    });

    describe('load()', () => {
        test('should do nothing with scene entities if location is not present in options', done => {
            const options = { file: { id: 'dummyId' } };
            sandbox.stub(renderer, 'initBox3d').callsFake(opts => {
                expect(opts.sceneEntities).toBeUndefined();
                done();
                return Promise.resolve();
            });
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        test('should assign sceneEntities to the passed in options object', done => {
            const options = {
                location: {
                    staticBaseURI: '',
                },
                file: {
                    id: '',
                },
            };
            sandbox.stub(renderer, 'initBox3d').callsFake(opts => {
                expect(opts.sceneEntities).toBeDefined();
                done();
                return Promise.resolve();
            });
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        test('should initialize the box3d runtime', () => {
            const options = {
                location: {
                    staticBaseURI: '',
                },
                file: {
                    id: '',
                },
            };
            renderMock.expects('initBox3d').returns(Promise.resolve());
            sandbox.stub(renderer, 'loadBox3dFile');
            renderer.load('', options);
        });

        test('should load the box3d file after initializing the runtime', done => {
            const options = { file: { id: '' } };
            renderMock.expects('initBox3d').returns(Promise.resolve());
            renderMock.expects('loadBox3dFile').returns(Promise.resolve());
            renderer.load('http://derpy.net', options).then(() => {
                done();
            });
        });

        test('should setup the scene via onUnsupportedRepresentation() if it cannot load the model', done => {
            const options = { file: { id: '' } };
            renderMock.expects('onUnsupportedRepresentation');
            sandbox.stub(renderer, 'loadBox3dFile').callsFake(() => Promise.reject());
            renderer.load('', options).then(() => done());
        });
    });

    describe('loadBox3dFile', () => {
        let renderMode;
        beforeEach(() => {
            renderMode = {
                setAttribute: () => {},
            };
            sandbox
                .mock(app)
                .expects('getComponentByScriptId')
                .withArgs('render_modes')
                .returns(renderMode);
        });

        test('should add event listener to the canvas for click events', () => {
            sandbox
                .mock(renderer.box3d.canvas)
                .expects('addEventListener')
                .withArgs('click', renderer.handleCanvasClick);
            renderer.loadBox3dFile('');
        });

        test('should set the shape texture ID for the Shape render mode', () => {
            sandbox
                .mock(renderMode)
                .expects('setAttribute')
                .withArgs('shapeTexture', 'MAT_CAP_TEX');
            renderer.loadBox3dFile('');
        });

        test('should setup the scene via setupScene() if it can successfully load the model', done => {
            sandbox.mock(renderer.box3d, 'setupScene', () => {});
            renderMock.expects('setupScene').called;
            renderer.loadBox3dFile('').then(() => done());
        });
    });

    describe('setupScene()', () => {
        beforeEach(() => {
            sandbox.stub(renderer.box3d, 'getAssetsByType').returns([]);
        });

        test('should do nothing if no scene instance is present', () => {
            renderMock.expects('getScene').returns(undefined);
            renderer.setupScene();
        });

        test('should invoke addHelpersToScene() to add the scene grid and axis colour lines to the scene', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderMock.expects('addHelpersToScene').once();
            renderer.setupScene();
        });

        test('should invoke onSceneLoad when the scene has been loaded', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox.stub(scene, 'when').callsFake((event, cb) => cb());
            const stub = jest.spyOn(renderer, 'onSceneLoad').mockImplementation();
            renderer.setupScene();
            expect(stub).toBeCalled();
        });

        test('should add a listener on the scene instance for it to be loaded', () => {
            renderer.instance = instance;
            sandbox.stub(renderer, 'getScene').returns(scene);
            sandbox
                .mock(scene)
                .expects('when')
                .withArgs('load');
            renderer.setupScene();
        });

        test('should add the axis rotation component to the instance', () => {
            renderer.instance = instance;
            jest.spyOn(instance, 'addComponent').mockImplementation();
            renderer.setupScene();
            expect(instance.addComponent).toBeCalledWith('axis_rotation', {}, 'axis_rotation_INSTANCE_ID');
        });

        test('should add the animation component to the instance', () => {
            renderer.instance = instance;
            jest.spyOn(instance, 'addComponent').mockImplementation();
            renderer.setupScene();
            expect(instance.addComponent).toBeCalledWith('animation', {}, 'animation_INSTANCE_ID');
        });

        test('should set the current animation to the first animation asset', () => {
            renderer.instance = instance;
            renderMock.expects('setAnimationAsset').withArgs(animation);
            renderer.setupScene();
        });
    });

    describe('reset()', () => {
        test('should invoke resetModel()', () => {
            const stub = jest.spyOn(renderer, 'resetModel').mockImplementation();
            jest.spyOn(Box3DRenderer.prototype, 'reset').mockImplementation();
            renderer.reset();
            expect(stub).toBeCalled();
        });

        test("should invoke parent's reset()", () => {
            jest.spyOn(renderer, 'resetModel').mockImplementation();
            const stub = jest.spyOn(Box3DRenderer.prototype, 'reset').mockImplementation();
            renderer.reset();
            expect(stub).toBeCalled();
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
                runtimeData: {},
            };
        });

        test('should do nothing if there is no runtime data on the instanced model', () => {
            sandbox
                .mock(renderer.instance)
                .expects('getChildren')
                .never();
            renderer.instance = undefined;
            renderer.resetModel();
        });

        test('should set the position of each child model instance to the origin', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {},
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox
                .mock(child)
                .expects('setPosition')
                .withArgs(0, 0, 0);
            renderer.resetModel();
        });

        test('should set the orientation of each child model to the identity transform', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {},
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox
                .mock(child)
                .expects('setQuaternion')
                .withArgs(0, 0, 0, 1);
            renderer.resetModel();
        });

        test('should set the scale of each child model to unity', () => {
            const child = {
                setPosition: () => {},
                setQuaternion: () => {},
                setScale: () => {},
                unsetProperty: () => {},
            };
            sandbox.stub(renderer.instance, 'getChildren').returns([child]);
            sandbox
                .mock(child)
                .expects('setScale')
                .withArgs(1, 1, 1);
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
                reset: () => {},
            };
            camera = {
                getComponentByScriptId: () => {},
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
                    updateMatrixWorld: () => {},
                },
            };
            sandbox.stub(renderer, 'getCamera').callsFake(() => camera);
        });

        test('should do nothing if there is no camera', () => {
            sandbox
                .mock(camera)
                .expects('getComponentByScriptId')
                .never();
            camera = undefined;
            renderer.resetView();
        });

        test('should get the orbit camera component on the camera', () => {
            sandbox.mock(camera).expects('getComponentByScriptId');
            renderer.resetView();
        });

        test('should do nothing if the orbit camera component does not exist', () => {
            sandbox
                .mock(renderer.instance)
                .expects('computeBounds')
                .never();
            sandbox.stub(camera, 'getComponentByScriptId').returns(undefined);
            renderer.resetView();
        });

        test('should set the origin point of the orbitController component to the center of the model', () => {
            const center = new THREE.Vector3(9, 9, 9);
            sandbox
                .mock(camera)
                .expects('getComponentByScriptId')
                .returns(orbitComp);
            sandbox
                .mock(renderer.instance)
                .expects('getCenter')
                .returns(center);
            sandbox.mock(orbitComp).expects('setPivotPosition');
            renderer.resetView();
        });

        test('should call the reset method of the orbitController component', () => {
            sandbox
                .mock(camera)
                .expects('getComponentByScriptId')
                .returns(orbitComp);
            sandbox.mock(orbitComp).expects('reset');
            renderer.resetView();
        });

        test('should set the orbit distance of the orbitController component', () => {
            const center = new THREE.Vector3(9, 9, 9);
            sandbox.mock(orbitComp).expects('setOrbitDistance');
            sandbox
                .mock(camera)
                .expects('getComponentByScriptId')
                .returns(orbitComp);
            sandbox
                .mock(renderer.instance)
                .expects('getCenter')
                .returns(center);
            renderer.resetView();
        });
    });

    describe('onSceneLoad()', () => {
        const animations = [];
        const videos = [];

        beforeEach(() => {
            sandbox.stub(renderer.box3d, 'getEntitiesByType').callsFake(type => {
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

        test('should play all videos once they are loaded', () => {
            const vid1 = {
                isLoading: () => false,
                when: () => {},
                play: jest.fn(),
            };
            const vid2 = {
                isLoading: () => false,
                when: () => {},
                play: jest.fn(),
            };
            videos.push(vid1, vid2);
            renderer.onSceneLoad();

            expect(vid1.play).toBeCalled();
            expect(vid2.play).toBeCalled();
        });
    });

    describe('animation behaviour', () => {
        let animComp;
        let animAsset;
        beforeEach(() => {
            animAsset = {
                when: () => {},
            };
            animComp = {
                asset: animAsset,
                onUpdate: () => {},
                pause: () => {},
                play: () => {},
                setAsset: () => {},
                setClipId: () => {},
                setLoop: () => {},
                stop: () => {},
            };
            renderer.instance = {
                alignToPosition: () => {},
                destroy: () => {},
                getComponentByScriptId: () => animComp,
                scaleToSize: () => {},
                when: () => {},
            };
        });

        describe('setAnimationAsset()', () => {
            test('should do nothing if no model instance is present', () => {
                renderer.instance = undefined;
                sandbox
                    .mock(animComp)
                    .expects('setAsset')
                    .never();
                renderer.setAnimationAsset({});
            });

            test('should get the animation component on the model instance', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .returns(animComp);
                renderer.setAnimationAsset({});
            });

            test('should set the current animation being used by the component to the one passed in', () => {
                const asset = {
                    id: 'my_animation',
                };
                sandbox
                    .mock(animComp)
                    .expects('setAsset')
                    .withArgs(asset);
                renderer.setAnimationAsset(asset);
            });

            test('should enable animation looping on the component', () => {
                sandbox
                    .mock(animComp)
                    .expects('setLoop')
                    .withArgs(true);
                renderer.setAnimationAsset({});
            });
        });

        describe('setAnimationClip()', () => {
            test('should do nothing if no model instance is present', () => {
                renderer.instance = undefined;
                sandbox
                    .mock(animComp)
                    .expects('setClipId')
                    .never();
                renderer.setAnimationClip('');
            });

            test('should get the animation component on the model instance', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .returns(animComp);
                renderer.setAnimationClip('');
            });

            test('should set the clip id of the component', () => {
                const id = 'my_clip_id';
                sandbox
                    .mock(animComp)
                    .expects('setClipId')
                    .withArgs(id);
                renderer.setAnimationClip(id);
            });
        });

        describe('toggleAnimation()', () => {
            test('should do nothing if no model instance is present', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .never();
                renderer.instance = undefined;
                renderer.toggleAnimation();
            });

            test('should get the animation component on the model', () => {
                sandbox.mock(renderer.instance).expects('getComponentByScriptId');
                renderer.toggleAnimation();
            });

            test('should do nothing if the animation component is missing', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .returns(undefined);
                sandbox
                    .mock(animAsset)
                    .expects('when')
                    .never();
                renderer.toggleAnimation();
            });

            test('should do nothing if the animation component does not have an asset assigned to it', () => {
                animComp.asset = undefined;
                sandbox
                    .mock(animAsset)
                    .expects('when')
                    .never();
                renderer.toggleAnimation();
            });

            test('should add an event listener for the animation asset to load', () => {
                sandbox
                    .mock(animAsset)
                    .expects('when')
                    .withArgs('load');
                renderer.toggleAnimation();
            });

            test('should add an event listener for the instance to load, after animation asset loads', () => {
                sandbox.stub(animAsset, 'when').callsFake((event, cb) => cb());
                sandbox
                    .mock(renderer.instance)
                    .expects('when')
                    .withArgs('load');
                renderer.toggleAnimation();
            });

            describe('after instance and animation asset loaded', () => {
                beforeEach(() => {
                    sandbox.stub(animAsset, 'when').callsFake((event, cb) => cb());
                    sandbox.stub(renderer.instance, 'when').callsFake((event, cb) => cb());
                });

                test('should pause the animation, by default', () => {
                    sandbox.mock(animComp).expects('pause');
                    renderer.toggleAnimation();
                });

                test('should invoke play() on the component, to start the animation', () => {
                    sandbox.mock(animComp).expects('play');
                    renderer.toggleAnimation(true);
                });
            });
        });

        describe('stopAnimation()', () => {
            test('should do nothing if no model instance is present', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .never();
                renderer.instance = undefined;
                renderer.stopAnimation();
            });

            test('should get the animation component on the model', () => {
                sandbox
                    .mock(renderer.instance)
                    .expects('getComponentByScriptId')
                    .returns(animComp);
                renderer.stopAnimation();
            });

            test('should invoke stop() on the animation and stop it from playing', () => {
                sandbox.mock(animComp).expects('stop');
                renderer.stopAnimation();
            });
        });
    });

    describe('onUnsupportedRepresentation()', () => {
        test('should emit an error event', () => {
            sandbox
                .mock(renderer)
                .expects('emit')
                .withArgs('error');
            renderer.onUnsupportedRepresentation();
        });
    });

    describe('addHelpersToScene()', () => {
        test('should do nothing if no scene present', () => {
            sandbox
                .mock(renderer)
                .expects('getScene')
                .returns(undefined);
            renderer.addHelpersToScene();
            expect(renderer.grid).toBeUndefined();
        });

        test('should create a GridHelper object', () => {
            renderer.addHelpersToScene();
            expect(renderer.grid).toBeInstanceOf(THREE.GridHelper);
        });

        test('should create an AxisHelper object', () => {
            renderer.addHelpersToScene();
            expect(renderer.axisDisplay).toBeInstanceOf(THREE.AxisHelper);
        });

        test('should add the GridHelper object and axis helper to the scene', () => {
            sandbox
                .mock(scene.runtimeData)
                .expects('add')
                .twice();
            renderer.addHelpersToScene();
        });
    });

    describe('cleanupHelpers()', () => {
        let grid;
        let axis;
        beforeEach(() => {
            grid = {
                material: {
                    dispose: jest.fn(),
                },
                geometry: {
                    dispose: jest.fn(),
                },
            };
            renderer.grid = grid;
            axis = {
                material: {
                    dispose: jest.fn(),
                },
                geometry: {
                    dispose: jest.fn(),
                },
            };
            renderer.axisDisplay = axis;
        });

        test('should do nothing if there is no scene present', () => {
            sandbox
                .mock(renderer)
                .expects('getScene')
                .returns(undefined);
            renderer.cleanupHelpers();
            expect(renderer.grid.material.dispose).not.toBeCalled();
        });

        test('should not remove the grid if there is none', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderer.grid = undefined;
            renderer.axisDisplay = undefined;
            sandbox
                .mock(scene.runtimeData)
                .expects('remove')
                .withArgs(grid)
                .never();
            renderer.cleanupHelpers();
        });

        test('should remove the grid from the scene', () => {
            sandbox.stub(renderer, 'getScene').returns(scene);
            renderer.axisDisplay = undefined;
            sandbox
                .mock(scene.runtimeData)
                .expects('remove')
                .withArgs(grid);
            renderer.cleanupHelpers();
        });

        test('should dispose of the grid geometry and material', () => {
            renderer.cleanupHelpers();
            expect(grid.geometry.dispose).toBeCalled();
            expect(grid.material.dispose).toBeCalled();
        });

        test('should not remove the axis helper if there is none', () => {
            renderer.grid = undefined;
            renderer.axisDisplay = undefined;
            sandbox
                .mock(scene.runtimeData)
                .expects('remove')
                .withArgs(axis)
                .never();
            renderer.cleanupHelpers();
        });

        test('should remove the axis helper from the scene', () => {
            renderer.grid = undefined;
            sandbox
                .mock(scene.runtimeData)
                .expects('remove')
                .withArgs(axis);
            renderer.cleanupHelpers();
        });

        test('should dispose of the axis helper geometry and material', () => {
            renderer.cleanupHelpers();
            expect(axis.geometry.dispose).toBeCalled();
            expect(axis.material.dispose).toBeCalled();
        });
    });

    describe('toggleHelpers()', () => {
        afterEach(() => {
            // nuke out axis display to prevent dispose calls
            renderer.axisDisplay = undefined;
        });

        test('should toggle axis display visiblity', () => {
            renderer.axisDisplay = {
                visible: true,
            };
            renderer.toggleHelpers();
            expect(renderer.axisDisplay.visible).toBe(false);
        });

        test('should set the axis display to flag passed in', () => {
            renderer.axisDisplay = {
                visible: undefined,
            };
            renderer.toggleHelpers(true);
            expect(renderer.axisDisplay.visible).toBe(true);
        });

        test('should tell the runtime to re-render', () => {
            renderer.axisDisplay = {
                visible: true,
            };
            renderer.toggleHelpers();
            expect(renderer.box3d.needsRender).toBe(true);
        });
    });

    describe('cleanupScene()', () => {
        test('should invoke cleanupHelpers()', () => {
            sandbox.mock(renderer).expects('cleanupHelpers');
            renderer.cleanupScene();
        });

        test('should invoke resetSkeletons()', () => {
            sandbox.mock(renderer).expects('resetSkeletons');
            renderer.cleanupScene();
        });
    });

    describe('resetSkeletons()', () => {
        test('should do nothing if no box3d reference', () => {
            renderer.box3d = undefined;
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_RESET_SKELETONS)
                .never();
            renderer.resetSkeletons();
        });

        test('should fire a global render mode change event', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_RESET_SKELETONS)
                .once();
            renderer.resetSkeletons();
        });
    });

    describe('setRenderMode()', () => {
        test('should do nothing if no box3d reference', () => {
            renderer.box3d = undefined;
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_SET_RENDER_MODE)
                .never();
            renderer.setRenderMode('test');
        });

        test('should fire a global render mode change event', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_SET_RENDER_MODE)
                .once();
            renderer.setRenderMode('test');
        });
    });

    describe.skip('setCameraProjection()', () => {
        let camera;
        beforeEach(() => {
            camera = {
                setProperty: () => {},
                getProperty: () => {
                    return 'perspective';
                },
            };
        });

        test('should not throw error if no camera is present', () => {
            jest.spyOn(renderer, 'getCamera').mockReturnValue(undefined);

            expect(renderer.setCameraProjection(CAMERA_PROJECTION_PERSPECTIVE)).not.toThrow();
        });

        test('should set the perspective properties of the camera if perspective mode is selected', done => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(camera, 'setProperty').callsFake((prop, value) => {
                expect(prop).toBe('cameraType');
                expect(value).toBe('perspective');
                done();
            });
            renderer.setCameraProjection(CAMERA_PROJECTION_PERSPECTIVE);
        });

        test('should set the orthographic properties of the camera if ortho mode is selected', done => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(camera, 'setProperty').callsFake((prop, value) => {
                expect(prop).toBe('cameraType');
                expect(value).toBe('orthographic');
                done();
            });
            renderer.setCameraProjection(CAMERA_PROJECTION_ORTHOGRAPHIC);
        });

        test('should do nothing for unrecognized projection type', () => {
            sandbox.stub(renderer, 'getCamera').returns(camera);
            sandbox.stub(renderer, 'resetView');
            sandbox
                .mock(camera)
                .expects('setProperty')
                .never();
            renderer.setCameraProjection('weak_perspective_projection');
        });
    });

    describe('rotateOnAxis()', () => {
        let center;
        beforeEach(() => {
            center = new THREE.Vector3();
            renderer.instance = {
                trigger: () => {},
                getCenter: sandbox.stub().returns(center),
                destroy: () => {},
            };
        });

        test('should do nothing if there is no model instance reference', () => {
            sandbox
                .mock(renderer.box3d)
                .expects('trigger')
                .withArgs('rotate_on_axis')
                .never();
            renderer.instance = undefined;
            renderer.rotateOnAxis({ x: -1 });
        });

        test('should do nothing if there is no Box3D runtime reference', () => {
            sandbox
                .mock(renderer.instance)
                .expects('trigger')
                .withArgs('rotate_on_axis')
                .never();
            renderer.box3d = undefined;
            renderer.rotateOnAxis({ x: -1 });
        });

        test('should trigger a "rotate_on_axis" event on the runtime', () => {
            const axis = { x: -1, y: 0 };
            sandbox
                .mock(renderer.instance)
                .expects('trigger')
                .withArgs('rotate_on_axis', axis);
            renderer.rotateOnAxis(axis);
        });
    });

    describe.skip('setAxisRotation()', () => {
        test('should do nothing if no instance available', () => {
            jest.spyOn(renderer, 'setAxisRotation');
            renderer.instance = undefined;
            sandbox.stub(renderer.box3d, 'trigger');
            expect(renderer.setAxisRotation('-x', '-y', false)).not.toThrow();
        });

        test('should trigger a "set_axes_orientation" event on the runtime instance', () => {
            renderer.instance = { trigger: () => {} };
            sandbox
                .mock(renderer.instance)
                .expects('trigger')
                .withArgs('set_axes_orientation', '-x', '-y', true);
            renderer.setAxisRotation('-x', '-y', true);
        });
    });

    describe('setSkeletonsVisible()', () => {
        test('should do nothing if no box3d reference', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .never();
            renderer.box3d = undefined;
            renderer.setSkeletonsVisible(false);
        });

        test('should fire a global Box3D event for skeleton visibility', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_SET_SKELETONS_VISIBLE, true);
            renderer.setSkeletonsVisible(true);
        });
    });

    describe('setWireframesVisible()', () => {
        test('should do nothing if no box3d reference', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .never();
            renderer.box3d = undefined;
            renderer.setWireframesVisible(false);
        });

        test('should trigger a global Box3D event for wireframe visibility change', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .withArgs(EVENT_SET_WIREFRAMES_VISIBLE, true);
            renderer.setWireframesVisible(true);
        });
    });

    describe('setGridVisible()', () => {
        test('should do nothing if no box3d reference', () => {
            sandbox
                .mock(Box3D.globalEvents)
                .expects('trigger')
                .never();
            renderer.box3d = undefined;
            renderer.setGridVisible(false);
        });

        test('should cause a change in grid visibility', () => {
            renderer.grid = {
                visible: false,
            };
            renderer.setGridVisible(true);
            expect(renderer.grid.visible).toBe(true);
            // Get rid of grid to prevent dispose calls during shutdown.
            renderer.grid = undefined;
        });
    });

    describe('enableVr()', () => {
        test('should do nothing if vr is already enabled', () => {
            sandbox
                .mock(renderer.box3d)
                .expects('getVrDisplay')
                .never();
            renderer.vrEnabled = true;
            renderer.enableVr();
        });

        // For devices like cardboard
        test('should add listener to runtime update event, if no positional tracking capabilities on vr device', () => {
            sandbox
                .mock(renderer.box3d)
                .expects('on')
                .withArgs('update', renderer.updateNonPositionalVrControls, renderer);
            renderer.enableVr();
        });

        // For devices like Oculus Rift and HTC Vive
        test('should enable the grid to be visible if the vr device has positional tracking capabilities', () => {
            const device = {
                capabilities: {
                    hasPosition: true,
                },
            };
            renderer.grid = {
                visible: false,
            };
            sandbox.stub(renderer.box3d, 'getVrDisplay').returns(device);
            renderer.enableVr();
            expect(renderer.grid.visible).toBe(true);
            renderer.grid = undefined;
        });
    });

    describe('onDisableVr()', () => {
        beforeEach(() => {
            sandbox.stub(Box3DRenderer.prototype, 'onDisableVr');
        });

        test('should stop listening to engine updates if no device position available', () => {
            renderer.vrDeviceHasPosition = false;
            sandbox
                .mock(renderer.box3d)
                .expects('off')
                .withArgs('update', renderer.updateNonPositionalVrControls, renderer);
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
                add: () => {},
            };
            position = sandbox.mock(pos);
            quaternion = { x: 1, y: 2, z: 3, w: 1 };
            orbitCam = {
                getOrbitDistance: () => orbitDist,
                pivotPoint: { position: pos },
            };
            camera = {
                runtimeData: {
                    quaternion,
                    position: pos,
                },
                getComponentByScriptId: () => orbitCam,
            };
            sandbox
                .mock(renderer)
                .expects('getCamera')
                .returns(camera);
        });

        test('should do nothing if there is no orbit camera component available', () => {
            sandbox.stub(camera, 'getComponentByScriptId').returns(undefined);
            position.expects('set').never();
            renderer.updateNonPositionalVrControls();
        });

        test('should set the position of the camera to slightly away from the origin', () => {
            position.expects('set').withArgs(0, 0, orbitDist);
            renderer.updateNonPositionalVrControls();
        });

        test('should rotate the camera to match the camera orientation', () => {
            position.expects('applyQuaternion').withArgs(quaternion);
            renderer.updateNonPositionalVrControls();
        });
    });

    describe('initVrGamepadControls()', () => {
        test('should create a new instance of Model3DVrControls', () => {
            renderer.initVrGamepadControls();
            expect(renderer.vrControls).toBeInstanceOf(Model3dVrControls);
        });
    });
});
