/* eslint-disable no-unused-expressions */
import BaseViewer from '../../../BaseViewer';
import Box3DRuntime from '../../__mocks__/Box3DRuntime';
import ControlsRoot from '../../../controls/controls-root';
import Model3DControls from '../Model3DControls';
import Model3DRenderer from '../Model3DRenderer';
import Model3DViewer from '../Model3DViewer';
import {
    EVENT_CANVAS_CLICK,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SELECT_ANIMATION_CLIP,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_SET_GRID_VISIBLE,
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS,
} from '../model3DConstants';

const sandbox = sinon.createSandbox();
let containerEl;
let model3d;
let stubs = {};

describe('lib/viewers/box3d/model3d/Model3DViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeAll(() => {
        global.Box3D = Box3DRuntime;
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/model3d/__tests__/Model3DViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = jest.spyOn(window, 'BoxSDK').mockImplementation();
        model3d = new Model3DViewer({
            file: {
                id: 0,
                file_version: {
                    id: 1,
                },
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo',
                },
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        model3d.containerEl = containerEl;
        model3d.setup();

        jest.spyOn(model3d, 'createSubModules').mockImplementation();
        model3d.controls = {
            addAnimationClip: () => {},
            addUi: () => {},
            setCurrentProjectionMode: () => {},
            handleSetRenderMode: () => {},
            handleSetSkeletonsVisible: () => {},
            handleSetWireframesVisible: () => {},
            handleSetGridVisible: () => {},
            on: () => {},
            selectAnimationClip: () => {},
            showAnimationControls: () => {},
            hidePullups: () => {},
            removeListener: () => {},
            removeAllListeners: () => {},
            destroy: () => {},
        };
        model3d.renderer = {
            destroy: () => {},
            toggleAnimation: () => {},
            load: () => Promise.resolve(),
            initVr: () => {},
            getCamera: () => {},
            initVrGamepadControls: () => {},
            on: () => {},
            removeListener: () => {},
            removeAllListeners: () => {},
            reset: () => {},
            resetView: () => {},
            rotateOnAxis: () => {},
            setAnimationClip: () => {},
            setAxisRotation: () => {},
            stopAnimation: () => {},
            setRenderMode: () => {},
            setSkeletonsVisible: () => {},
            setCameraProjection: () => {},
            toggleHelpers: () => {},
            setWireframesVisible: () => {},
            setGridVisible: () => {},
        };

        model3d.postLoad();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (model3d && typeof model3d.destroy === 'function') {
            model3d.destroy();
        }

        model3d = null;
    });

    describe('createSubModules()', () => {
        test('should create and save references to Model controls and Model renderer', () => {
            const m3d = new Model3DViewer({
                file: {
                    id: 0,
                    file_version: {
                        id: 1,
                    },
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
            m3d.containerEl = containerEl;
            m3d.setup();

            m3d.createSubModules();

            expect(m3d.controls).toBeInstanceOf(Model3DControls);
            expect(m3d.renderer).toBeInstanceOf(Model3DRenderer);
        });

        test('should create ControlsRoot if using react controls', () => {
            const m3d = new Model3DViewer({
                file: {
                    id: 0,
                    file_version: {
                        id: 1,
                    },
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
            });
            jest.spyOn(m3d, 'getViewerOption').mockImplementation(() => true);
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
            m3d.containerEl = containerEl;
            m3d.setup();

            m3d.createSubModules();

            expect(m3d.controls).toBeInstanceOf(ControlsRoot);
            expect(m3d.renderer).toBeInstanceOf(Model3DRenderer);
        });
    });

    describe('event handlers', () => {
        let m3d;
        beforeEach(() => {
            m3d = new Model3DViewer({
                file: {
                    id: 0,
                    file_version: {
                        id: 1,
                    },
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
            });
            m3d.controls = {
                on: () => {},
                hidePullups: () => {},
                removeListener: () => {},
                removeAllListeners: () => {},
                destroy: () => {},
            };
            m3d.renderer = {
                load: () => Promise.resolve(),
                on: () => {},
                removeListener: () => {},
                removeAllListeners: () => {},
                destroy: () => {},
            };
        });

        afterEach(() => {
            m3d.destroy();
        });

        const eventBindings = [
            {
                event: EVENT_ROTATE_ON_AXIS,
                callback: 'handleRotateOnAxis',
            },
            {
                event: EVENT_SELECT_ANIMATION_CLIP,
                callback: 'handleSelectAnimationClip',
            },
            {
                event: EVENT_SET_CAMERA_PROJECTION,
                callback: 'handleSetCameraProjection',
            },
            {
                event: EVENT_SET_RENDER_MODE,
                callback: 'handleSetRenderMode',
            },
            {
                event: EVENT_SET_SKELETONS_VISIBLE,
                callback: 'handleShowSkeletons',
            },
            {
                event: EVENT_SET_WIREFRAMES_VISIBLE,
                callback: 'handleShowWireframes',
            },
            {
                event: EVENT_SET_GRID_VISIBLE,
                callback: 'handleShowGrid',
            },
            {
                event: EVENT_TOGGLE_ANIMATION,
                callback: 'handleToggleAnimation',
            },
            {
                event: EVENT_TOGGLE_HELPERS,
                callback: 'handleToggleHelpers',
            },
        ];

        describe('attachEventHandlers()', () => {
            test('should create an event listener for canvas clicks', () => {
                const onStub = jest.spyOn(m3d.renderer, 'on');
                m3d.attachEventHandlers();
                expect(onStub).toBeCalledWith(EVENT_CANVAS_CLICK, m3d.handleCanvasClick);
            });

            describe('with controls enabled', () => {
                eventBindings.forEach(binding => {
                    test(`should create an event listener for ${binding.event} events`, () => {
                        const onStub = jest.spyOn(m3d.controls, 'on');
                        m3d.attachEventHandlers();
                        expect(onStub).toBeCalledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });

            describe('with react controls enabled', () => {
                eventBindings.forEach(binding => {
                    test(`should not create an event listener for ${binding.event} events`, () => {
                        jest.spyOn(m3d, 'getViewerOption').mockImplementation(() => true);
                        const onStub = jest.spyOn(m3d.controls, 'on');
                        m3d.attachEventHandlers();
                        expect(onStub).not.toBeCalledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });
        });

        describe('detachEventHandlers()', () => {
            test('should remove an event listener for canvas clicks', () => {
                const removeStub = jest.spyOn(m3d.renderer, 'removeListener');
                m3d.detachEventHandlers();
                expect(removeStub).toBeCalledWith(EVENT_CANVAS_CLICK, m3d.handleCanvasClick);
            });

            describe('with controls enabled', () => {
                eventBindings.forEach(binding => {
                    test(`should remove an event listener for ${binding.event} events`, () => {
                        const removeStub = jest.spyOn(m3d.controls, 'removeListener');
                        m3d.detachEventHandlers();
                        expect(removeStub).toBeCalledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });

            describe('with react controls enabled', () => {
                eventBindings.forEach(binding => {
                    test(`should not remove an event listener for ${binding.event} events`, () => {
                        jest.spyOn(m3d, 'getViewerOption').mockImplementation(() => true);
                        const removeStub = jest.spyOn(m3d.controls, 'removeListener');
                        m3d.detachEventHandlers();
                        expect(removeStub).not.toBeCalledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });
        });
    });

    describe('animation behavior', () => {
        test('should invoke renderer.setAnimationClip() via .handleSelectAnimationClip()', () => {
            const clipId = 'anim_12389765';
            sandbox
                .mock(model3d.renderer)
                .expects('setAnimationClip')
                .withArgs(clipId);
            model3d.handleSelectAnimationClip(clipId);
        });

        test('should invoke renderer.toggleAnimation() via .handleToggleAnimation()', () => {
            const play = true;
            sandbox
                .mock(model3d.renderer)
                .expects('toggleAnimation')
                .withArgs(play);
            model3d.handleToggleAnimation(play);
        });

        test('should invoke renderer.stopAnimation() when resetting', () => {
            sandbox.mock(model3d.renderer).expects('stopAnimation');
            model3d.handleReset();
        });

        test('should populate animation controls after the scene has been loaded', done => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: {} }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            const stub = jest.spyOn(model3d, 'populateAnimationControls').mockImplementation();
            model3d.handleSceneLoaded().then(() => {
                expect(stub).toBeCalled();
                done();
            });
        });

        describe('populateAnimationControls()', () => {
            let b3dMock;
            let controlMock;
            let controls;

            beforeEach(() => {
                controls = model3d.controls; // eslint-disable-line prefer-destructuring
                model3d.renderer.box3d = {
                    getEntitiesByType: () => {},
                };
                b3dMock = sandbox.mock(model3d.renderer.box3d);
                controlMock = sandbox.mock(model3d.controls);
                jest.spyOn(model3d.renderer, 'setAnimationClip').mockImplementation(() => {});
                jest.spyOn(model3d, 'renderUI').mockImplementation(() => {});
            });

            afterEach(() => {
                model3d.controls = controls;
            });

            test('should do nothing if there are no controls to populate', () => {
                b3dMock.expects('getEntitiesByType').never();
                model3d.controls = undefined;
                model3d.populateAnimationControls();
            });

            test('should get the list of animations loaded', () => {
                b3dMock
                    .expects('getEntitiesByType')
                    .once()
                    .returns([]);
                model3d.populateAnimationControls();
            });

            test('should get animation clip data for the first animation loaded', () => {
                const animation = {
                    getClipIds: () => [],
                };
                b3dMock
                    .expects('getEntitiesByType')
                    .once()
                    .returns([animation]);
                model3d.populateAnimationControls();
            });

            test('should add animation clip data for the first animation loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {},
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one',
                };
                const clipTwo = {
                    start: 0,
                    stop: 2,
                    name: 'two',
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1', '2']);
                animMock
                    .expects('getClip')
                    .withArgs('1')
                    .returns(clipOne);
                animMock
                    .expects('getClip')
                    .withArgs('2')
                    .returns(clipTwo);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock.expects('addAnimationClip').twice();
                model3d.populateAnimationControls();
            });

            test('should not show animation controls if no animation clips loaded', () => {
                const animation = {
                    getClipIds: () => [],
                };
                b3dMock
                    .expects('getEntitiesByType')
                    .once()
                    .returns([animation]);
                controlMock.expects('showAnimationControls').never();

                model3d.populateAnimationControls();
            });

            test('should not select the first animation clip if no clips loaded', () => {
                const animation = {
                    getClipIds: () => [],
                };
                b3dMock
                    .expects('getEntitiesByType')
                    .once()
                    .returns([animation]);
                controlMock.expects('selectAnimationClip').never();

                model3d.populateAnimationControls();
            });

            test('should show animation controls when animation is loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {},
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one',
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1']);
                animMock
                    .expects('getClip')
                    .withArgs('1')
                    .returns(clipOne);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock.expects('showAnimationControls').once();

                model3d.populateAnimationControls();
            });

            test('should select the first available animation clip, when loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {},
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one',
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1']);
                animMock
                    .expects('getClip')
                    .withArgs('1')
                    .returns(clipOne);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock
                    .expects('selectAnimationClip')
                    .once()
                    .withArgs('1');

                model3d.populateAnimationControls();
            });

            describe('with react controls enabled', () => {
                beforeEach(() => {
                    const animation = {
                        getClipIds: () => {},
                        getClip: () => {},
                    };
                    const clipOne = {
                        start: 0,
                        stop: 1,
                        name: 'one',
                    };
                    const animMock = sandbox.mock(animation);
                    animMock.expects('getClipIds').returns(['1']);
                    animMock
                        .expects('getClip')
                        .withArgs('1')
                        .returns(clipOne);
                    b3dMock.expects('getEntitiesByType').returns([animation]);

                    jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true);
                });

                test('should call renderUI', () => {
                    model3d.populateAnimationControls();

                    expect(model3d.renderUI).toBeCalled();
                });

                test('should set animationClips', () => {
                    model3d.populateAnimationControls();

                    expect(model3d.animationClips).toEqual([{ duration: 1, id: '1', name: 'one' }]);
                });

                test('should set first animation clip to the renderer', () => {
                    model3d.populateAnimationControls();

                    expect(model3d.renderer.setAnimationClip).toBeCalledWith('1');
                });
            });
        });
    });

    describe('axis rotation behavior', () => {
        test('should invoke renderer.rotateOnAxis() via .handleRotateOnAxis()', () => {
            const axis = '+x';
            sandbox
                .mock(model3d.renderer)
                .expects('rotateOnAxis')
                .withArgs(axis);
            model3d.handleRotateOnAxis(axis);
        });

        test('should invoke renderer.setAxisRotation() via .handleRotationAxisSet()', () => {
            const up = '-y';
            const forward = '+z';
            sandbox
                .mock(model3d.renderer)
                .expects('setAxisRotation')
                .withArgs(up, forward, true);
            model3d.handleRotationAxisSet(up, forward);
        });

        test('should rotate the object to the values saved in metadata, if different than defaults', done => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: { upAxis: '-z' } }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            jest.spyOn(model3d, 'handleReset').mockImplementation();
            jest.spyOn(model3d, 'populateAnimationControls').mockImplementation();
            jest.spyOn(model3d, 'showWrapper').mockImplementation();
            const axisSetStub = jest.spyOn(model3d, 'handleRotationAxisSet');

            model3d.handleSceneLoaded().then(() => {
                expect(axisSetStub).toBeCalled();
                done();
            });
        });

        test('should not rotate the object if metadata matches defaults', done => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: {} }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            jest.spyOn(model3d, 'handleReset').mockImplementation();
            jest.spyOn(model3d, 'populateAnimationControls').mockImplementation();
            jest.spyOn(model3d, 'showWrapper').mockImplementation();
            const axisSetStub = jest.spyOn(model3d, 'handleRotationAxisSet');

            model3d.handleSceneLoaded().then(() => {
                expect(axisSetStub).not.toBeCalled();
                done();
            });
        });
    });

    describe('rendering behaviour', () => {
        test('should invoke renderer.setRenderMode() when calling handleSetRenderMode(), with default value', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('setRenderMode')
                .withArgs('Lit');
            model3d.handleSetRenderMode();
        });

        test('should invoke renderer.setRenderMode() when calling handleSetRenderMode(), with parameter provided', () => {
            const renderMode = 'unlit';
            sandbox
                .mock(model3d.renderer)
                .expects('setRenderMode')
                .withArgs(renderMode);
            model3d.handleSetRenderMode(renderMode);
        });

        test('should invoke renderer.toggleHelpers() when calling handleToggleHelpers()', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('toggleHelpers')
                .withArgs();
            model3d.handleToggleHelpers();
        });

        test('should invoke renderer.toggleHelpers() when calling handleToggleHelpers(), with parameter provided', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('toggleHelpers')
                .withArgs(true);
            model3d.handleToggleHelpers(true);
        });

        test('should invoke renderer.setCameraProjection() when calling handleSetCameraProjection()', () => {
            sandbox.mock(model3d.renderer).expects('setCameraProjection');
            model3d.handleSetCameraProjection();
        });

        test('should invoke renderer.setCameraProjection() when calling handleSetCameraProjection(), with parameter provided', () => {
            const proj = 'Orthogonal';
            sandbox
                .mock(model3d.renderer)
                .expects('setCameraProjection')
                .withArgs(proj);
            model3d.handleSetCameraProjection(proj);
        });

        test('should invoke renderer.setSkeletonsVisible() when calling handleShowSkeletons()', () => {
            sandbox.mock(model3d.renderer).expects('setSkeletonsVisible');
            model3d.handleShowSkeletons();
        });

        test('should invoke renderer.setSkeletonsVisible() when calling handleShowSkeletons(), with parameter provided', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('setSkeletonsVisible')
                .withArgs(true);
            model3d.handleShowSkeletons(true);
        });

        test('should invoke renderer.setWireframesVisible() when calling handleShowWireframes()', () => {
            sandbox.mock(model3d.renderer).expects('setWireframesVisible');
            model3d.handleShowWireframes();
        });

        test('should invoke renderer.setWireframesVisible() when calling handleShowWireframes(), with parameter provided', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('setWireframesVisible')
                .withArgs(true);
            model3d.handleShowWireframes(true);
        });

        test('should invoke renderer.setGridVisible() when calling handleShowGrid()', () => {
            sandbox.mock(model3d.renderer).expects('setGridVisible');
            model3d.handleShowGrid();
        });

        test('should invoke renderer.setGridVisible() when calling handleShowGrid(), with parameter provided', () => {
            sandbox
                .mock(model3d.renderer)
                .expects('setGridVisible')
                .withArgs(true);
            model3d.handleShowGrid(true);
        });
    });

    describe('scene load errors', () => {
        test('should throw an error when metadata response code != 200', done => {
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            const onErrorStub = jest.spyOn(model3d, 'onMetadataError').mockImplementation();

            model3d.handleSceneLoaded().catch(() => {
                expect(onErrorStub).toBeCalled();
                done();
            });
        });

        test('should should invoke onMetadataError() when issues loading metadata', done => {
            const errStub = jest.spyOn(model3d, 'onMetadataError').mockImplementation();
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            model3d.handleSceneLoaded().catch(() => {
                expect(errStub).toBeCalled();
                done();
            });
        });

        test('should still advance the promise chain for ui setup after failed metadata load', done => {
            jest.spyOn(model3d, 'onMetadataError').mockImplementation();
            const addUi = jest.spyOn(model3d.controls, 'addUi');
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } }),
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta,
            };

            model3d.handleSceneLoaded().catch(() => {
                expect(addUi).toBeCalled();
                done();
            });
        });
    });

    describe('handleCanvasClick()', () => {
        test('should invoke controls.hidePullups() if the canvas has been clicked', () => {
            sandbox.mock(model3d.controls).expects('hidePullups');
            model3d.handleCanvasClick();
        });

        test('should not invoke controls.hidePullups() if using react controls', () => {
            jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true);
            jest.spyOn(model3d.controls, 'hidePullups');

            model3d.handleCanvasClick();

            expect(model3d.controls.hidePullups).not.toBeCalled();
        });
    });

    describe('handleReset()', () => {
        test('should reset control settings', () => {
            sandbox.mock(model3d.controls).expects('handleSetRenderMode');
            sandbox.mock(model3d.controls).expects('setCurrentProjectionMode');
            sandbox.mock(model3d.controls).expects('handleSetSkeletonsVisible');
            sandbox.mock(model3d.controls).expects('handleSetWireframesVisible');
            sandbox.mock(model3d.controls).expects('handleSetGridVisible');
            const renderMock = sandbox.mock(model3d.renderer);
            renderMock.expects('stopAnimation').once();
            model3d.handleReset();
        });

        describe('with react controls enabled', () => {
            beforeEach(() => {
                jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true);
                jest.spyOn(model3d, 'renderUI').mockImplementation(() => {});
            });

            test('should not reset control settings', () => {
                jest.spyOn(model3d.controls, 'handleSetRenderMode');
                jest.spyOn(model3d.controls, 'setCurrentProjectionMode');
                jest.spyOn(model3d.controls, 'handleSetSkeletonsVisible');
                jest.spyOn(model3d.controls, 'handleSetWireframesVisible');
                jest.spyOn(model3d.controls, 'handleSetGridVisible');

                model3d.handleReset();

                expect(model3d.controls.handleSetRenderMode).not.toBeCalled();
                expect(model3d.controls.setCurrentProjectionMode).not.toBeCalled();
                expect(model3d.controls.handleSetSkeletonsVisible).not.toBeCalled();
                expect(model3d.controls.handleSetWireframesVisible).not.toBeCalled();
                expect(model3d.controls.handleSetGridVisible).not.toBeCalled();
            });

            test('should reset controls state and call renderUI', () => {
                model3d.isAnimationPlaying = true;

                model3d.handleReset();

                expect(model3d.isAnimationPlaying).toBe(false);
                expect(model3d.renderUI).toBeCalled();
            });
        });
    });

    describe('initViewer()', () => {
        let addUISpy;
        let renderUISpy;
        beforeEach(() => {
            jest.spyOn(model3d, 'handleReset').mockImplementation(() => {});
            jest.spyOn(model3d, 'handleRotationAxisSet').mockImplementation(() => {});
            jest.spyOn(model3d, 'populateAnimationControls').mockImplementation(() => {});
            jest.spyOn(model3d, 'showWrapper').mockImplementation(() => {});

            renderUISpy = jest.spyOn(model3d, 'renderUI').mockImplementation(() => {});
            addUISpy = jest.spyOn(model3d.controls, 'addUi').mockImplementation(() => {});
        });

        test('should add the controls UI', () => {
            model3d.initViewer({});

            expect(addUISpy).toBeCalled();
        });

        test('should initialize viewer settings to defaults if meta is empty', () => {
            model3d.initViewer({});

            expect(model3d.axes.up).toBe('+Y');
            expect(model3d.axes.forward).toBe('+Z');
            expect(model3d.renderMode).toBe('Lit');
            expect(model3d.projection).toBe('Perspective');
            expect(model3d.renderGrid).toBe(true);
            expect(model3d.handleRotationAxisSet).not.toBeCalled();
        });

        test('should initialize viewer settings to provided defaults', () => {
            const defaults = {
                cameraProjection: 'Orthographic',
                defaultRenderMode: 'Unlit',
                forwardAxis: 'forward',
                renderGrid: 'false',
                upAxis: 'up',
            };
            model3d.initViewer(defaults);

            expect(model3d.axes.up).toBe(defaults.upAxis);
            expect(model3d.axes.forward).toBe(defaults.forwardAxis);
            expect(model3d.renderMode).toBe(defaults.defaultRenderMode);
            expect(model3d.projection).toBe(defaults.cameraProjection);
            expect(model3d.renderGrid).toBe(false);
            expect(model3d.handleRotationAxisSet).toBeCalledWith(defaults.upAxis, defaults.forwardAxis, false);
        });

        describe('with react controls enabled', () => {
            beforeEach(() => jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true));

            test('should call renderUI if using react controls', () => {
                model3d.initViewer({});

                expect(renderUISpy).toBeCalled();
                expect(addUISpy).not.toBeCalled();
            });
        });
    });

    describe('handleToggleAnimation()', () => {
        beforeEach(() => {
            jest.spyOn(model3d.renderer, 'toggleAnimation');
            jest.spyOn(model3d, 'renderUI').mockImplementation(() => {});
        });

        test.each([true, false])('should toggle the animation for the renderer as %s', play => {
            model3d.handleToggleAnimation(play);

            expect(model3d.renderer.toggleAnimation).toBeCalledWith(play);
        });

        describe('with react controls enabled', () => {
            beforeEach(() => {
                jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true);
            });

            test.each([true, false])('should toggle the animation when initially %s', isPlaying => {
                const nextIsPlaying = !isPlaying;
                model3d.isAnimationPlaying = isPlaying;

                model3d.handleToggleAnimation();

                expect(model3d.isAnimationPlaying).toBe(nextIsPlaying);
                expect(model3d.renderer.toggleAnimation).toBeCalledWith(nextIsPlaying);
                expect(model3d.renderUI).toBeCalled();
            });
        });
    });

    describe('renderUI()', () => {
        const getProps = instance => instance.controls.render.mock.calls[0][0].props;

        beforeEach(() => {
            jest.spyOn(model3d, 'getViewerOption').mockImplementation(() => true);
            model3d.controls = {
                destroy: jest.fn(),
                render: jest.fn(),
            };
        });

        test('should render react controls with the correct props', () => {
            model3d.renderUI();

            expect(getProps(model3d)).toMatchObject({
                animationClips: [],
                isPlaying: false,
                onAnimationClipSelect: model3d.handleSelectAnimationClip,
                onFullscreenToggle: model3d.toggleFullscreen,
                onPlayPause: model3d.handleToggleAnimation,
                onReset: model3d.handleReset,
            });
        });
    });
});
