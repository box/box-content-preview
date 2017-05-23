/* eslint-disable no-unused-expressions */
import Model3DControls from '../Model3DControls';
import Model3DAnimationClipsPullup from '../Model3DAnimationClipsPullup';
import Model3DSettingsPullup from '../Model3DSettingsPullup';

import {
    EVENT_ROTATE_ON_AXIS,
    EVENT_SELECT_ANIMATION_CLIP,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_QUALITY_LEVEL,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_SET_GRID_VISIBLE,
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS
} from '../model3DConstants';

import {
    ICON_3D_RESET,
    ICON_ANIMATION,
    ICON_GEAR,
    ICON_PAUSE,
    ICON_PLAY
} from '../../../../icons/icons';

import { CSS_CLASS_HIDDEN } from '../../box3DConstants';

describe('lib/viewers/box3d/model3d/Model3DControls', () => {
    let containerEl;
    let controls;
    const sandbox = sinon.sandbox.create();

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/model3d/__tests__/Model3DControls-test.html');
        containerEl = document.querySelector('.container');
        controls = new Model3DControls(containerEl);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy();
        }

        controls = null;
        fixture.cleanup();
    });

    describe('Settings panel ui creation', () => {
        it('should create and store a reference to the animation pullup', () => {
            expect(controls.animationClipsPullup).to.be.an.instanceof(Model3DAnimationClipsPullup);
        });

        it('should create and store a reference to the settings pullup', () => {
            expect(controls.settingsPullup).to.be.an.instanceof(Model3DSettingsPullup);
        });

        describe('addUi()', () => {
            let addStub;

            beforeEach(() => {
                const emptyDivEl = document.createElement('div').appendChild(document.createElement('div'));
                addStub = sandbox.stub(controls.controls, 'add').returns(emptyDivEl);
            });

            afterEach(() => {
                addStub = undefined;
            });

            it('should add a reset button to the control bar', () => {
                controls.addUi();
                expect(addStub).to.be.calledWith(__('box3d_reset'), controls.handleReset, '', ICON_3D_RESET);
            });

            describe('Animation controls', () => {
                let animationListenStub;

                beforeEach(() => {
                    animationListenStub = sandbox.stub(controls.animationClipsPullup, 'addListener');

                    controls.addUi();
                });

                afterEach(() => {
                    animationListenStub = undefined;
                });

                it('should add an event listener to the animationClipsPullup reference for animation clip selection', () => {
                    expect(animationListenStub).to.be.calledWith(EVENT_SELECT_ANIMATION_CLIP, controls.handleSelectAnimationClip);
                });

                it('should add an animation playback toggle to the control bar', () => {
                    expect(addStub).to.be.calledWith(__('box3d_toggle_animation'), controls.handleToggleAnimation, '', ICON_PLAY);
                });

                it('should add a toggle to hide/show the animation clip pullup to the control bar', () => {
                    expect(addStub).to.be.calledWith(__('box3d_animation_clips'), controls.handleToggleAnimationClips, '', ICON_ANIMATION);
                });

                it('should append the pullup of the animationClipsPullup to the parent element of the hide/show toggle', () => {
                    expect(controls.animationClipButtonEl.parentNode).to.contain(controls.animationClipsPullup.pullupEl);
                });
            });

            describe('Settings panel', () => {
                describe('settings panel event listeners', () => {
                    const events = [
                        {
                            event: EVENT_SET_RENDER_MODE,
                            callback: 'handleSetRenderMode'
                        },
                        {
                            event: EVENT_SET_SKELETONS_VISIBLE,
                            callback: 'handleSetSkeletonsVisible'
                        },
                        {
                            event: EVENT_SET_WIREFRAMES_VISIBLE,
                            callback: 'handleSetWireframesVisible'
                        },
                        {
                            event: EVENT_SET_GRID_VISIBLE,
                            callback: 'handleSetGridVisible'
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
                            event: EVENT_ROTATE_ON_AXIS,
                            callback: 'handleAxisRotation'
                        }
                    ];

                    events.forEach((e) => {
                        it(`should add an event listener for ${e.event} events`, () => {
                            const settingsListenStub = sandbox.stub(controls.settingsPullup, 'addListener');
                            controls.addUi();
                            expect(settingsListenStub).to.be.calledWith(e.event, controls[e.callback]);
                        });
                    });
                });

                it('should add a toggle for the settings panel, in the control bar', () => {
                    controls.addUi();
                    expect(addStub).to.be.calledWith(__('box3d_settings'), controls.handleToggleSettings, '', ICON_GEAR);
                });

                it('should and the settings panel element to the parent element of the settings panel toggle', () => {
                    controls.addUi();
                    expect(controls.settingsButtonEl.parentNode).to.contain(controls.settingsPullup.pullupEl);
                });
            });

            it('should hide all animation UI after creating it', () => {
                const hideStub = sandbox.stub(controls, 'hideAnimationControls');
                controls.addUi();
                expect(hideStub).to.be.called;
            });

            it('should add the fullscreen button to the control bar', () => {
                const fsStub = sandbox.stub(controls, 'addFullscreenButton');
                controls.addUi();
                expect(fsStub).to.be.called;
            });

            it('should add the VR button to the control bar', () => {
                const addVrStub = sandbox.stub(controls, 'addVrButton');
                controls.addUi();
                expect(addVrStub).to.be.called;
            });

            it('should hide the VR button after adding it', () => {
                const hideVrStub = sandbox.stub(controls, 'hideVrButton');
                controls.addUi();
                expect(hideVrStub).to.be.called;
            });
        });
    });

    describe('hidePullups()', () => {
        it('should hide animation clip pullup', () => {
            const hideStub = sandbox.stub(controls.animationClipsPullup, 'hide');
            controls.hidePullups();
            expect(hideStub).to.be.called;
        });

        it('should hide the settings pullup', () => {
            const hideStub = sandbox.stub(controls.settingsPullup, 'hide');
            controls.hidePullups();
            expect(hideStub).to.be.called;
        });

        it('should emit an event to hide 3D scene helpers', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_TOGGLE_HELPERS, false);
            controls.hidePullups();
        });
    });

    describe('handleToggleSettings()', () => {
        it('should hide the animation clip pullup', () => {
            const hideStub = sandbox.stub(controls.animationClipsPullup, 'hide');
            controls.handleToggleSettings();
            expect(hideStub).to.be.called;
        });

        it('should toggle the settings pullup visibility', () => {
            const toggleStub = sandbox.stub(controls.settingsPullup, 'toggle');
            controls.handleToggleSettings();
            expect(toggleStub).to.be.called;
        });

        it('should emit an event to toggle the 3D scene helpers', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_TOGGLE_HELPERS);
            controls.handleToggleSettings();
        });
    });

    describe('handleSetRenderMode()', () => {
        it('should fire the "render mode set" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_RENDER_MODE);
            controls.handleSetRenderMode();
        });

        it('should fire the "render mode set" event with the new render mode', () => {
            const renderMode = 'normals';
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_RENDER_MODE, renderMode);
            controls.handleSetRenderMode(renderMode);
        });

        it('should set the current render mode of the settings pullup', () => {
            const stub = sandbox.stub(controls.settingsPullup, 'setCurrentRenderMode');
            const renderMode = 'normals';
            controls.handleSetRenderMode(renderMode);
            expect(stub).to.be.calledWith(renderMode);
        });
    });

    describe('handleSetSkeletonsVisible()', () => {
        it('should fire a "set skeleton visiblity" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_SKELETONS_VISIBLE);
            controls.handleSetSkeletonsVisible();
        });

        it('should fire a "set skeleton visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_SKELETONS_VISIBLE, true);
            controls.handleSetSkeletonsVisible(true);
        });
    });

    describe('handleSetWireframesVisible()', () => {
        it('should fire a "set wireframe visiblity" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_WIREFRAMES_VISIBLE);
            controls.handleSetWireframesVisible();
        });

        it('should fire a "set wireframe visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_WIREFRAMES_VISIBLE, true);
            controls.handleSetWireframesVisible(true);
        });
    });

    describe('handleSetGridVisible()', () => {
        it('should fire a "set grid visiblity" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_GRID_VISIBLE);
            controls.handleSetGridVisible();
        });

        it('should fire a "set grid visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_GRID_VISIBLE, true);
            controls.handleSetGridVisible(true);
        });
    });

    describe('handleSetCameraProjection()', () => {
        it('should fire a "set camera visibility" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_CAMERA_PROJECTION);
            controls.handleSetCameraProjection();
        });

        it('should fire a "set camera visibility" event with a projection mode', () => {
            const projection = 'orthographic';
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_CAMERA_PROJECTION, projection);
            controls.handleSetCameraProjection(projection);
        });
    });

    describe('handleSetQualityLevel()', () => {
        it('should fire a "set render quality" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_QUALITY_LEVEL);
            controls.handleSetQualityLevel();
        });

        it('should fire a "set render quality" event with a level of quality', () => {
            const level = 'high';
            sandbox.mock(controls).expects('emit').withArgs(EVENT_SET_QUALITY_LEVEL, level);
            controls.handleSetQualityLevel(level);
        });
    });

    describe('handleAxisRotation()', () => {
        it('should fire a "rotate on axis" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_ROTATE_ON_AXIS);
            controls.handleAxisRotation();
        });

        it('should fire a "rotate on axis" event with an axis to rotate on', () => {
            const axis = '-x';
            sandbox.mock(controls).expects('emit').withArgs(EVENT_ROTATE_ON_AXIS, axis);
            controls.handleAxisRotation(axis);
        });
    });

    describe('hide/show animation controls', () => {
        let toggleMock;
        let clipMock;

        beforeEach(() => {
            controls.animationToggleEl = {
                classList: {
                    add: () => {},
                    remove: () => {}
                }
            };
            controls.animationClipButtonEl = {
                classList: {
                    add: () => {},
                    remove: () => {}
                }
            };

            clipMock = sandbox.mock(controls.animationToggleEl.classList);
            toggleMock = sandbox.mock(controls.animationClipButtonEl.classList);
        });

        describe('show controls', () => {
            it('should do nothing if no animation toggle', () => {
                clipMock.expects('remove').never();
                controls.animationToggleEl = undefined;
                controls.showAnimationControls();
            });

            it('should do nothing if no animation clip button', () => {
                toggleMock.expects('remove').never();
                controls.animationClipButtonEl = undefined;
                controls.showAnimationControls();
            });

            it('should remove hidden class from the animation toggle element', () => {
                toggleMock.expects('remove').withArgs(CSS_CLASS_HIDDEN);
                controls.showAnimationControls();
            });

            it('should remove the hidden class from the animation clip button', () => {
                clipMock.expects('remove').withArgs(CSS_CLASS_HIDDEN);
                controls.showAnimationControls();
            });
        });

        describe('hide controls', () => {
            it('should do nothing if no animation toggle', () => {
                clipMock.expects('remove').never();
                controls.animationToggleEl = undefined;
                controls.hideAnimationControls();
            });

            it('should do nothing if no animation clip button', () => {
                toggleMock.expects('remove').never();
                controls.animationClipButtonEl = undefined;
                controls.hideAnimationControls();
            });

            it('should add hidden class to the animation toggle element', () => {
                toggleMock.expects('add').withArgs(CSS_CLASS_HIDDEN);
                controls.hideAnimationControls();
            });

            it('should add the hidden class to the animation clip button', () => {
                clipMock.expects('add').withArgs(CSS_CLASS_HIDDEN);
                controls.hideAnimationControls();
            });
        });
    });

    describe('handleSelectAnimationClip()', () => {
        it('should invoke setAnimationPlaying() to stop animation playback', () => {
            const stub = sandbox.stub(controls, 'setAnimationPlaying');
            controls.handleSelectAnimationClip();
            expect(stub).to.be.calledWith(false);
        });

        it('should emit a "select animation clip" event', () => {
            sandbox.stub(controls, 'setAnimationPlaying');
            const stub = sandbox.stub(controls, 'emit');
            controls.handleSelectAnimationClip();
            expect(stub).to.be.calledWith(EVENT_SELECT_ANIMATION_CLIP);
        });

        it('should emit a "select animation clip" event, with the clip selected', () => {
            sandbox.stub(controls, 'setAnimationPlaying');
            const stub = sandbox.stub(controls, 'emit');
            const id = 'p1p1p1p1';
            controls.handleSelectAnimationClip(id);
            expect(stub).to.be.calledWith(EVENT_SELECT_ANIMATION_CLIP, id);
        });
    });

    describe('handleToggleAnimationClips()', () => {
        it('should hide the settings pullup', () => {
            sandbox.mock(controls.settingsPullup).expects('hide');
            controls.handleToggleAnimationClips();
        });

        it('should hide the animation clip selection pullup', () => {
            sandbox.mock(controls.animationClipsPullup).expects('toggle');
            controls.handleToggleAnimationClips();
        });
    });

    describe('handleToggleAnimation()', () => {
        it('should invoke hidePullups()', () => {
            const hidePullupsStub = sandbox.stub(controls, 'hidePullups');
            sandbox.stub(controls, 'setAnimationPlaying');
            controls.handleToggleAnimation();
            expect(hidePullupsStub).to.be.called;
        });

        it('should toggle playback of the current animation via setAnimationPlaying()', () => {
            const playStub = sandbox.stub(controls, 'setAnimationPlaying');
            controls.handleToggleAnimation();
            expect(playStub).to.be.called;
        });

        it('should set toggle animation playback by inverting playback state (.isAnimationPlaying)', () => {
            const playStub = sandbox.stub(controls, 'setAnimationPlaying');
            controls.isAnimationPlaying = true;
            controls.handleToggleAnimation();
            expect(playStub).to.be.calledWith(false);
        });
    });

    describe('setAnimationPlaying()', () => {
        beforeEach(() => {
            controls.animationToggleEl = {
                innerHTML: ''
            };
        });

        it('should set isAnimationPlaying to value provided', () => {
            controls.isAnimationPlaying = false;
            controls.setAnimationPlaying(true);
            expect(controls.isAnimationPlaying).to.be.true;
        });

        it('should replace the toggle icon to pause, if animation is playing', () => {
            controls.setAnimationPlaying(true);
            expect(controls.animationToggleEl.innerHTML).to.equal(ICON_PAUSE);
        });

        it('should replace the toggle icon to play, if animation is paused', () => {
            controls.setAnimationPlaying(false);
            expect(controls.animationToggleEl.innerHTML).to.equal(ICON_PLAY);
        });

        it('should emit an "animation toggled" event', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_TOGGLE_ANIMATION);
            controls.setAnimationPlaying(false);
        });

        it('should emit an "animation toggled" event with the current state of animation playback', () => {
            sandbox.mock(controls).expects('emit').withArgs(EVENT_TOGGLE_ANIMATION, false);
            controls.setAnimationPlaying(false);
        });
    });

    describe('animation clip ui', () => {
        it('should invoke animationClipsPullup.addClip() with data for a clip, via addAnimationClip()', () => {
            const id = '1234';
            const name = 'my_clip';
            const duration = 10;
            sandbox.mock(controls.animationClipsPullup).expects('addClip').withExactArgs(id, name, duration);
            controls.addAnimationClip(id, name, duration);
        });

        it('should invoke animationClipsPullup.selectClip(), via selectAnimationClip()', () => {
            const id = '1234';
            sandbox.mock(controls.animationClipsPullup).expects('selectClip').withExactArgs(id);
            controls.selectAnimationClip(id);
        });
    });

    describe('handleToggleFullscreen()', () => {
        it('should hide all pullups', () => {
            const stub = sandbox.stub(controls, 'hidePullups');
            controls.handleToggleFullscreen();
            expect(stub).to.be.called;
        });
    });

    describe('setCurrentProjectionMode()', () => {
        it('should invoke settingsPullup.onProjectionSelected()', () => {
            sandbox.mock(controls.settingsPullup).expects('onProjectionSelected');
            controls.setCurrentProjectionMode();
        });

        it('should invoke settingsPullup.onProjectionSelected() with the new projection mode', () => {
            const mode = 'orthographic';
            sandbox.mock(controls.settingsPullup).expects('onProjectionSelected').withArgs(mode);
            controls.setCurrentProjectionMode(mode);
        });

        it('should invoke settingsPullup.setCurrentProjectionMode()', () => {
            sandbox.mock(controls.settingsPullup).expects('setCurrentProjectionMode');
            controls.setCurrentProjectionMode();
        });

        it('should invoke settingsPullup.setCurrentProjectionMode() with the new projection mode', () => {
            const mode = 'orthographic';
            sandbox.mock(controls.settingsPullup).expects('setCurrentProjectionMode').withArgs(mode);
            controls.setCurrentProjectionMode(mode);
        });
    });

    describe('handleReset()', () => {
        it('should hide all pullups', () => {
            sandbox.stub(controls, 'setAnimationPlaying');
            const stub = sandbox.stub(controls, 'hidePullups');
            controls.handleReset();
            expect(stub).to.be.called;
        });

        it('should reset the settings pullup', () => {
            sandbox.stub(controls, 'setAnimationPlaying');
            sandbox.mock(controls.settingsPullup).expects('reset');
            controls.handleReset();
        });

        it('should pause animation playback', () => {
            const stub = sandbox.stub(controls, 'setAnimationPlaying');
            controls.handleReset();
            expect(stub).to.be.calledWith(false);
        });
    });
});
