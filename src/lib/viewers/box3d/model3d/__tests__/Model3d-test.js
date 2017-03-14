/* eslint-disable no-unused-expressions */
import Model3d from '../Model3d';
import Model3dControls from '../Model3dControls';
import Model3dRenderer from '../Model3dRenderer';
import {
    EVENT_CANVAS_CLICK,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SELECT_ANIMATION_CLIP,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_QUALITY_LEVEL,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS
} from '../Model3dConstants';

const sandbox = sinon.sandbox.create();
let containerEl;
let model3d;
let stubs = {};

describe('lib/viewers/box3d/model3d/Model3d', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/model3d/__tests__/Model3d-test.html');
        containerEl = document.querySelector('.container');
        stubs.BoxSDK = sandbox.stub(window, 'BoxSDK');
        model3d = new Model3d({
            file: {
                id: 0,
                file_version: {
                    id: 1
                }
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo'
                }
            }
        });
        model3d.setup();

        sandbox.stub(model3d, 'createSubModules');
        model3d.controls = {
            addAnimationClip: () => {},
            addUi: () => {},
            setCurrentProjectionMode: () => {},
            handleSetRenderMode: () => {},
            handleSetSkeletonsVisible: () => {},
            handleSetWireframesVisible: () => {},
            on: () => {},
            selectAnimationClip: () => {},
            showAnimationControls: () => {},
            hidePullups: () => {},
            removeListener: () => {},
            removeAllListeners: () => {},
            destroy: () => {}
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
            rotateOnAxis: () => {},
            setAnimationClip: () => {},
            setAxisRotation: () => {},
            stopAnimation: () => {},
            setRenderMode: () => {},
            setSkeletonsVisible: () => {},
            setQualityLevel: () => {},
            setCameraProjection: () => {},
            toggleHelpers: () => {},
            setWireframesVisible: () => {}
        };

        model3d.postLoad();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};

        if (model3d && typeof model3d.destroy === 'function') {
            model3d.destroy();
        }

        model3d = null;
    });

    describe('createSubModules()', () => {
        it('should create and save references to Model controls and Model renderer', () => {
            const m3d = new Model3d({
                file: {
                    id: 0,
                    file_version: {
                        id: 1
                    }
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo'
                    }
                }
            });
            m3d.setup();

            m3d.createSubModules();

            expect(m3d.controls).to.be.instanceof(Model3dControls);
            expect(m3d.renderer).to.be.instanceof(Model3dRenderer);
        });
    });

    describe('event handlers', () => {
        let m3d;
        beforeEach(() => {
            m3d = new Model3d({
                file: {
                    id: 0,
                    file_version: {
                        id: 1
                    }
                },
                container: containerEl,
                representation: {
                    content: {
                        url_template: 'foo'
                    }
                }
            });
            m3d.controls = {
                on: () => {},
                hidePullups: () => {},
                removeListener: () => {},
                removeAllListeners: () => {},
                destroy: () => {}
            };
            m3d.renderer = {
                load: () => Promise.resolve(),
                on: () => {},
                removeListener: () => {},
                removeAllListeners: () => {},
                destroy: () => {}
            };
        });

        afterEach(() => {
            m3d.destroy();
        });

        const eventBindings = [
            {
                event: EVENT_ROTATE_ON_AXIS,
                callback: 'handleRotateOnAxis'
            },
            {
                event: EVENT_SELECT_ANIMATION_CLIP,
                callback: 'handleSelectAnimationClip'
            },
            {
                event: EVENT_SET_CAMERA_PROJECTION,
                callback: 'handleSetCameraProjection'
            },
            {
                event: EVENT_SET_QUALITY_LEVEL,
                callback: 'handleSetQualityLevel'
            },
            {
                event: EVENT_SET_RENDER_MODE,
                callback: 'handleSetRenderMode'
            },
            {
                event: EVENT_SET_SKELETONS_VISIBLE,
                callback: 'handleShowSkeletons'
            },
            {
                event: EVENT_SET_WIREFRAMES_VISIBLE,
                callback: 'handleShowWireframes'
            },
            {
                event: EVENT_TOGGLE_ANIMATION,
                callback: 'handleToggleAnimation'
            },
            {
                event: EVENT_TOGGLE_HELPERS,
                callback: 'handleToggleHelpers'
            }
        ];

        describe('attachEventHandlers()', () => {
            it('should create an event listener for canvas clicks', () => {
                const onStub = sandbox.stub(m3d.renderer, 'on');
                m3d.attachEventHandlers();
                expect(onStub).to.be.calledWith(EVENT_CANVAS_CLICK, m3d.handleCanvasClick);
            });

            describe('with controls enabled', () => {
                eventBindings.forEach((binding) => {
                    it(`should create an event listener for ${binding.event} events`, () => {
                        const onStub = sandbox.stub(m3d.controls, 'on');
                        m3d.attachEventHandlers();
                        expect(onStub).to.be.calledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });
        });

        describe('detachEventHandlers()', () => {
            it('should remove an event listener for canvas clicks', () => {
                const removeStub = sandbox.stub(m3d.renderer, 'removeListener');
                m3d.detachEventHandlers();
                expect(removeStub).to.be.calledWith(EVENT_CANVAS_CLICK, m3d.handleCanvasClick);
            });

            describe('with controls enabled', () => {
                eventBindings.forEach((binding) => {
                    it(`should remove an event listener for ${binding.event} events`, () => {
                        const removeStub = sandbox.stub(m3d.controls, 'removeListener');
                        m3d.detachEventHandlers();
                        expect(removeStub).to.be.calledWith(binding.event, m3d[binding.callback]);
                    });
                });
            });
        });
    });

    describe('animation behavior', () => {
        it('should invoke renderer.setAnimationClip() via .handleSelectAnimationClip()', () => {
            const clipId = 'anim_12389765';
            sandbox.mock(model3d.renderer).expects('setAnimationClip').withArgs(clipId);
            model3d.handleSelectAnimationClip(clipId);
        });

        it('should invoke renderer.toggleAnimation() via .handleToggleAnimation()', () => {
            const play = true;
            sandbox.mock(model3d.renderer).expects('toggleAnimation').withArgs(play);
            model3d.handleToggleAnimation(play);
        });

        it('should invoke renderer.stopAnimation() when resetting', () => {
            sandbox.mock(model3d.renderer).expects('stopAnimation');
            model3d.handleReset();
        });

        it('should populate animation controls after the scene has been loaded', (done) => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: {} })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            const stub = sandbox.stub(model3d, 'populateAnimationControls');
            model3d.handleSceneLoaded().then(() => {
                expect(stub).to.be.called;
                done();
            });
        });

        describe('populateAnimationControls()', () => {
            let b3dMock;
            let controlMock;
            let controls;

            beforeEach(() => {
                controls = model3d.controls;
                model3d.renderer.box3d = {
                    getEntitiesByType: () => {}
                };
                b3dMock = sandbox.mock(model3d.renderer.box3d);
                controlMock = sandbox.mock(model3d.controls);
            });

            afterEach(() => {
                model3d.controls = controls;
            });

            it('should do nothing if there are no controls to populate', () => {
                b3dMock.expects('getEntitiesByType').never();
                model3d.controls = undefined;
                model3d.populateAnimationControls();
            });

            it('should get the list of animations loaded', () => {
                b3dMock.expects('getEntitiesByType').once().returns([]);
                model3d.populateAnimationControls();
            });

            it('should get animation clip data for the first animation loaded', () => {
                const animation = {
                    getClipIds: () => []
                };
                b3dMock.expects('getEntitiesByType').once().returns([animation]);
                model3d.populateAnimationControls();
            });

            it('should add animation clip data for the first animation loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {}
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one'
                };
                const clipTwo = {
                    start: 0,
                    stop: 2,
                    name: 'two'
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1', '2']);
                animMock.expects('getClip').withArgs('1').returns(clipOne);
                animMock.expects('getClip').withArgs('2').returns(clipTwo);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock.expects('addAnimationClip').twice();
                model3d.populateAnimationControls();
            });

            it('should not show animation controls if no animation clips loaded', () => {
                const animation = {
                    getClipIds: () => []
                };
                b3dMock.expects('getEntitiesByType').once().returns([animation]);
                controlMock.expects('showAnimationControls').never();

                model3d.populateAnimationControls();
            });

            it('should not select the first animation clip if no clips loaded', () => {
                const animation = {
                    getClipIds: () => []
                };
                b3dMock.expects('getEntitiesByType').once().returns([animation]);
                controlMock.expects('selectAnimationClip').never();

                model3d.populateAnimationControls();
            });

            it('should show animation controls when animation is loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {}
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one'
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1']);
                animMock.expects('getClip').withArgs('1').returns(clipOne);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock.expects('showAnimationControls').once();

                model3d.populateAnimationControls();
            });

            it('should select the first available animation clip, when loaded', () => {
                const animation = {
                    getClipIds: () => {},
                    getClip: () => {}
                };
                const clipOne = {
                    start: 0,
                    stop: 1,
                    name: 'one'
                };
                const animMock = sandbox.mock(animation);
                animMock.expects('getClipIds').returns(['1']);
                animMock.expects('getClip').withArgs('1').returns(clipOne);
                b3dMock.expects('getEntitiesByType').returns([animation]);
                controlMock.expects('selectAnimationClip').once().withArgs('1');

                model3d.populateAnimationControls();
            });
        });
    });

    describe('axis rotation behavior', () => {
        it('should invoke renderer.rotateOnAxis() via .handleRotateOnAxis()', () => {
            const axis = '+x';
            sandbox.mock(model3d.renderer).expects('rotateOnAxis').withArgs(axis);
            model3d.handleRotateOnAxis(axis);
        });

        it('should invoke renderer.setAxisRotation() via .handleRotationAxisSet()', () => {
            const up = '-y';
            const forward = '+z';
            sandbox.mock(model3d.renderer).expects('setAxisRotation').withArgs(up, forward, true);
            model3d.handleRotationAxisSet(up, forward);
        });

        it('should rotate the object to the values saved in metadata, if different than defaults', (done) => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: { upAxis: '-z' } })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            sandbox.stub(model3d, 'handleReset');
            sandbox.stub(model3d, 'populateAnimationControls');
            sandbox.stub(model3d, 'showWrapper');
            const axisSetStub = sandbox.stub(model3d, 'handleRotationAxisSet');

            model3d.handleSceneLoaded().then(() => {
                expect(axisSetStub).to.be.called;
                done();
            });
        });

        it('should not rotate the object if metadata matches defaults', (done) => {
            const meta = {
                get: () => Promise.resolve({ status: 200, response: {} })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            sandbox.stub(model3d, 'handleReset');
            sandbox.stub(model3d, 'populateAnimationControls');
            sandbox.stub(model3d, 'showWrapper');
            const axisSetStub = sandbox.stub(model3d, 'handleRotationAxisSet');

            model3d.handleSceneLoaded().then(() => {
                expect(axisSetStub).to.not.be.called;
                done();
            });
        });
    });

    describe('rendering behaviour', () => {
        it('should invoke renderer.setRenderMode() when calling handleSetRenderMode(), with default value', () => {
            sandbox.mock(model3d.renderer).expects('setRenderMode').withArgs('Lit');
            model3d.handleSetRenderMode();
        });

        it('should invoke renderer.setRenderMode() when calling handleSetRenderMode(), with parameter provided', () => {
            const renderMode = 'unlit';
            sandbox.mock(model3d.renderer).expects('setRenderMode').withArgs(renderMode);
            model3d.handleSetRenderMode(renderMode);
        });

        it('should invoke renderer.toggleHelpers() when calling handleToggleHelpers()', () => {
            sandbox.mock(model3d.renderer).expects('toggleHelpers').withArgs();
            model3d.handleToggleHelpers();
        });

        it('should invoke renderer.toggleHelpers() when calling handleToggleHelpers(), with parameter provided', () => {
            sandbox.mock(model3d.renderer).expects('toggleHelpers').withArgs(true);
            model3d.handleToggleHelpers(true);
        });

        it('should invoke renderer.setCameraProjection() when calling handleSetCameraProjection()', () => {
            sandbox.mock(model3d.renderer).expects('setCameraProjection');
            model3d.handleSetCameraProjection();
        });

        it('should invoke renderer.setCameraProjection() when calling handleSetCameraProjection(), with parameter provided', () => {
            const proj = 'Orthogonal';
            sandbox.mock(model3d.renderer).expects('setCameraProjection').withArgs(proj);
            model3d.handleSetCameraProjection(proj);
        });

        it('should invoke renderer.setQualityLevel() when calling handleSetQualityLevel()', () => {
            sandbox.mock(model3d.renderer).expects('setQualityLevel');
            model3d.handleSetQualityLevel();
        });

        it('should invoke renderer.setQualityLevel() when calling handleSetQualityLevel(), with parameter provided', () => {
            const quality = 'super_duper';
            sandbox.mock(model3d.renderer).expects('setQualityLevel').withArgs(quality);
            model3d.handleSetQualityLevel(quality);
        });

        it('should invoke renderer.setSkeletonsVisible() when calling handleShowSkeletons()', () => {
            sandbox.mock(model3d.renderer).expects('setSkeletonsVisible');
            model3d.handleShowSkeletons();
        });

        it('should invoke renderer.setSkeletonsVisible() when calling handleShowSkeletons(), with parameter provided', () => {
            sandbox.mock(model3d.renderer).expects('setSkeletonsVisible').withArgs(true);
            model3d.handleShowSkeletons(true);
        });

        it('should invoke renderer.setWireframesVisible() when calling handleShowWireframes()', () => {
            sandbox.mock(model3d.renderer).expects('setWireframesVisible');
            model3d.handleShowWireframes();
        });

        it('should invoke renderer.setWireframesVisible() when calling handleShowWireframes(), with parameter provided', () => {
            sandbox.mock(model3d.renderer).expects('setWireframesVisible').withArgs(true);
            model3d.handleShowWireframes(true);
        });
    });

    describe('scene load errors', () => {
        it('should throw an error when metadata response code != 200', (done) => {
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            const onErrorStub = sandbox.stub(model3d, 'onMetadataError');

            model3d.handleSceneLoaded().catch(() => {
                expect(onErrorStub).to.be.called;
                done();
            });
        });

        it('should should invoke console.error() when issues loading metadata', (done) => {
            const errStub = sandbox.stub(console, 'error');
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            model3d.handleSceneLoaded().catch(() => {
                expect(errStub).to.be.called;
                done();
            });
        });

        it('should still advance the promise chain for ui setup after failed metadata load', (done) => {
            const addUi = sandbox.stub(model3d.controls, 'addUi');
            const meta = {
                get: () => Promise.resolve({ status: 404, response: { status: 'metadata not found' } })
            };
            model3d.boxSdk = {
                getMetadataClient: () => meta
            };

            model3d.handleSceneLoaded().catch(() => {
                expect(addUi).to.be.called;
                done();
            });
        });
    });

    describe('handleCanvasClick()', () => {
        it('should invoke controls.hidePullups() if the canvas has been clicked', () => {
            sandbox.mock(model3d.controls).expects('hidePullups');
            model3d.handleCanvasClick();
        });
    });

    describe('handleReset()', () => {
        it('should reset control settings', () => {
            sandbox.mock(model3d.controls).expects('handleSetRenderMode');
            sandbox.mock(model3d.controls).expects('setCurrentProjectionMode');
            sandbox.mock(model3d.controls).expects('handleSetSkeletonsVisible');
            sandbox.mock(model3d.controls).expects('handleSetWireframesVisible');
            const renderMock = sandbox.mock(model3d.renderer);
            renderMock.expects('stopAnimation').once();
            model3d.handleReset();
        });
    });
});
