/* eslint-disable no-unused-expressions */
import Model3DControls from '../Model3DControls';
import Model3DAnimationClipsPullup from '../Model3DAnimationClipsPullup';
import Model3DSettingsPullup from '../Model3DSettingsPullup';

import {
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

import { ICON_3D_RESET, ICON_ANIMATION, ICON_GEAR, ICON_PAUSE, ICON_PLAY } from '../../../../icons';

import { CSS_CLASS_HIDDEN } from '../../box3DConstants';

describe('lib/viewers/box3d/model3d/Model3DControls', () => {
    let containerEl;
    let controls;
    const sandbox = sinon.createSandbox();

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
        test('should create and store a reference to the animation pullup', () => {
            expect(controls.animationClipsPullup).toBeInstanceOf(Model3DAnimationClipsPullup);
        });

        test('should create and store a reference to the settings pullup', () => {
            expect(controls.settingsPullup).toBeInstanceOf(Model3DSettingsPullup);
        });

        describe('addUi()', () => {
            let addStub;

            beforeEach(() => {
                const emptyDivEl = document.createElement('div').appendChild(document.createElement('div'));
                addStub = jest.spyOn(controls.controls, 'add').mockReturnValue(emptyDivEl);
            });

            afterEach(() => {
                addStub = undefined;
            });

            test('should add a reset button to the control bar', () => {
                controls.addUi();
                expect(addStub).toBeCalledWith(__('box3d_reset'), controls.handleReset, '', ICON_3D_RESET);
            });

            describe('Animation controls', () => {
                let animationListenStub;

                beforeEach(() => {
                    animationListenStub = jest.spyOn(controls.animationClipsPullup, 'addListener');

                    controls.addUi();
                });

                afterEach(() => {
                    animationListenStub = undefined;
                });

                test('should add an event listener to the animationClipsPullup reference for animation clip selection', () => {
                    expect(animationListenStub).toBeCalledWith(
                        EVENT_SELECT_ANIMATION_CLIP,
                        controls.handleSelectAnimationClip,
                    );
                });

                test('should add an animation playback toggle to the control bar', () => {
                    expect(addStub).toBeCalledWith(
                        __('box3d_toggle_animation'),
                        controls.handleToggleAnimation,
                        '',
                        ICON_PLAY,
                    );
                });

                test('should add a toggle to hide/show the animation clip pullup to the control bar', () => {
                    expect(addStub).toBeCalledWith(
                        __('box3d_animation_clips'),
                        controls.handleToggleAnimationClips,
                        '',
                        ICON_ANIMATION,
                    );
                });

                test('should append the pullup of the animationClipsPullup to the parent element of the hide/show toggle', () => {
                    expect(controls.animationClipButtonEl.parentNode).toContainElement(
                        controls.animationClipsPullup.pullupEl,
                    );
                });
            });

            describe('Settings panel', () => {
                describe('settings panel event listeners', () => {
                    const events = [
                        {
                            event: EVENT_SET_RENDER_MODE,
                            callback: 'handleSetRenderMode',
                        },
                        {
                            event: EVENT_SET_SKELETONS_VISIBLE,
                            callback: 'handleSetSkeletonsVisible',
                        },
                        {
                            event: EVENT_SET_WIREFRAMES_VISIBLE,
                            callback: 'handleSetWireframesVisible',
                        },
                        {
                            event: EVENT_SET_GRID_VISIBLE,
                            callback: 'handleSetGridVisible',
                        },
                        {
                            event: EVENT_SET_CAMERA_PROJECTION,
                            callback: 'handleSetCameraProjection',
                        },
                        {
                            event: EVENT_ROTATE_ON_AXIS,
                            callback: 'handleAxisRotation',
                        },
                    ];

                    events.forEach(e => {
                        test(`should add an event listener for ${e.event} events`, () => {
                            const settingsListenStub = jest.spyOn(controls.settingsPullup, 'addListener');
                            controls.addUi();
                            expect(settingsListenStub).toBeCalledWith(e.event, controls[e.callback]);
                        });
                    });
                });

                test('should add a toggle for the settings panel, in the control bar', () => {
                    controls.addUi();
                    expect(addStub).toBeCalledWith(__('box3d_settings'), controls.handleToggleSettings, '', ICON_GEAR);
                });

                test('should and the settings panel element to the parent element of the settings panel toggle', () => {
                    controls.addUi();
                    expect(controls.settingsButtonEl.parentNode).toContainElement(controls.settingsPullup.pullupEl);
                });
            });

            test('should hide all animation UI after creating it', () => {
                const hideStub = jest.spyOn(controls, 'hideAnimationControls');
                controls.addUi();
                expect(hideStub).toBeCalled();
            });

            test('should add the fullscreen button to the control bar', () => {
                const fsStub = jest.spyOn(controls, 'addFullscreenButton');
                controls.addUi();
                expect(fsStub).toBeCalled();
            });

            test('should add the VR button to the control bar', () => {
                const addVrStub = jest.spyOn(controls, 'addVrButton');
                controls.addUi();
                expect(addVrStub).toBeCalled();
            });

            test('should hide the VR button after adding it', () => {
                const hideVrStub = jest.spyOn(controls, 'hideVrButton');
                controls.addUi();
                expect(hideVrStub).toBeCalled();
            });
        });
    });

    describe('hidePullups()', () => {
        test('should hide animation clip pullup', () => {
            const hideStub = jest.spyOn(controls.animationClipsPullup, 'hide');
            controls.hidePullups();
            expect(hideStub).toBeCalled();
        });

        test('should hide the settings pullup', () => {
            const hideStub = jest.spyOn(controls.settingsPullup, 'hide');
            controls.hidePullups();
            expect(hideStub).toBeCalled();
        });

        test('should emit an event to hide 3D scene helpers', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_TOGGLE_HELPERS, false);
            controls.hidePullups();
        });
    });

    describe('handleToggleSettings()', () => {
        test('should hide the animation clip pullup', () => {
            const hideStub = jest.spyOn(controls.animationClipsPullup, 'hide');
            controls.handleToggleSettings();
            expect(hideStub).toBeCalled();
        });

        test('should toggle the settings pullup visibility', () => {
            const toggleStub = jest.spyOn(controls.settingsPullup, 'toggle');
            controls.handleToggleSettings();
            expect(toggleStub).toBeCalled();
        });

        test('should emit an event to toggle the 3D scene helpers', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_TOGGLE_HELPERS);
            controls.handleToggleSettings();
        });
    });

    describe('handleSetRenderMode()', () => {
        test('should fire the "render mode set" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_RENDER_MODE);
            controls.handleSetRenderMode();
        });

        test('should fire the "render mode set" event with the new render mode', () => {
            const renderMode = 'normals';
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_RENDER_MODE, renderMode);
            controls.handleSetRenderMode(renderMode);
        });

        test('should set the current render mode of the settings pullup', () => {
            const stub = jest.spyOn(controls.settingsPullup, 'setCurrentRenderMode');
            const renderMode = 'normals';
            controls.handleSetRenderMode(renderMode);
            expect(stub).toBeCalledWith(renderMode);
        });
    });

    describe('handleSetSkeletonsVisible()', () => {
        test('should fire a "set skeleton visiblity" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_SKELETONS_VISIBLE);
            controls.handleSetSkeletonsVisible();
        });

        test('should fire a "set skeleton visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_SKELETONS_VISIBLE, true);
            controls.handleSetSkeletonsVisible(true);
        });
    });

    describe('handleSetWireframesVisible()', () => {
        test('should fire a "set wireframe visiblity" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_WIREFRAMES_VISIBLE);
            controls.handleSetWireframesVisible();
        });

        test('should fire a "set wireframe visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_WIREFRAMES_VISIBLE, true);
            controls.handleSetWireframesVisible(true);
        });
    });

    describe('handleSetGridVisible()', () => {
        test('should fire a "set grid visiblity" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_GRID_VISIBLE);
            controls.handleSetGridVisible();
        });

        test('should fire a "set grid visiblity" event with a flag to turn them on and off explicitly', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_GRID_VISIBLE, true);
            controls.handleSetGridVisible(true);
        });
    });

    describe('handleSetCameraProjection()', () => {
        test('should fire a "set camera visibility" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_CAMERA_PROJECTION);
            controls.handleSetCameraProjection();
        });

        test('should fire a "set camera visibility" event with a projection mode', () => {
            const projection = 'orthographic';
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_SET_CAMERA_PROJECTION, projection);
            controls.handleSetCameraProjection(projection);
        });
    });

    describe('handleAxisRotation()', () => {
        test('should fire a "rotate on axis" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_ROTATE_ON_AXIS);
            controls.handleAxisRotation();
        });

        test('should fire a "rotate on axis" event with an axis to rotate on', () => {
            const axis = '-x';
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_ROTATE_ON_AXIS, axis);
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
                    remove: () => {},
                },
            };
            controls.animationClipButtonEl = {
                classList: {
                    add: () => {},
                    remove: () => {},
                },
            };

            clipMock = sandbox.mock(controls.animationToggleEl.classList);
            toggleMock = sandbox.mock(controls.animationClipButtonEl.classList);
        });

        describe('show controls', () => {
            test('should do nothing if no animation toggle', () => {
                clipMock.expects('remove').never();
                controls.animationToggleEl = undefined;
                controls.showAnimationControls();
            });

            test('should do nothing if no animation clip button', () => {
                toggleMock.expects('remove').never();
                controls.animationClipButtonEl = undefined;
                controls.showAnimationControls();
            });

            test('should remove hidden class from the animation toggle element', () => {
                toggleMock.expects('remove').withArgs(CSS_CLASS_HIDDEN);
                controls.showAnimationControls();
            });

            test('should remove the hidden class from the animation clip button', () => {
                clipMock.expects('remove').withArgs(CSS_CLASS_HIDDEN);
                controls.showAnimationControls();
            });
        });

        describe('hide controls', () => {
            test('should do nothing if no animation toggle', () => {
                clipMock.expects('remove').never();
                controls.animationToggleEl = undefined;
                controls.hideAnimationControls();
            });

            test('should do nothing if no animation clip button', () => {
                toggleMock.expects('remove').never();
                controls.animationClipButtonEl = undefined;
                controls.hideAnimationControls();
            });

            test('should add hidden class to the animation toggle element', () => {
                toggleMock.expects('add').withArgs(CSS_CLASS_HIDDEN);
                controls.hideAnimationControls();
            });

            test('should add the hidden class to the animation clip button', () => {
                clipMock.expects('add').withArgs(CSS_CLASS_HIDDEN);
                controls.hideAnimationControls();
            });
        });
    });

    describe('handleSelectAnimationClip()', () => {
        test('should invoke setAnimationPlaying() to stop animation playback', () => {
            const stub = jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            controls.handleSelectAnimationClip();
            expect(stub).toBeCalledWith(false);
        });

        test('should emit a "select animation clip" event', () => {
            jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            const stub = jest.spyOn(controls, 'emit');
            controls.handleSelectAnimationClip();
            expect(stub).toBeCalledWith(EVENT_SELECT_ANIMATION_CLIP, undefined);
        });

        test('should emit a "select animation clip" event, with the clip selected', () => {
            jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            const stub = jest.spyOn(controls, 'emit');
            const id = 'p1p1p1p1';
            controls.handleSelectAnimationClip(id);
            expect(stub).toBeCalledWith(EVENT_SELECT_ANIMATION_CLIP, id);
        });
    });

    describe('handleToggleAnimationClips()', () => {
        test('should hide the settings pullup', () => {
            sandbox.mock(controls.settingsPullup).expects('hide');
            controls.handleToggleAnimationClips();
        });

        test('should hide the animation clip selection pullup', () => {
            sandbox.mock(controls.animationClipsPullup).expects('toggle');
            controls.handleToggleAnimationClips();
        });
    });

    describe('handleToggleAnimation()', () => {
        test('should invoke hidePullups()', () => {
            const hidePullupsStub = jest.spyOn(controls, 'hidePullups');
            jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            controls.handleToggleAnimation();
            expect(hidePullupsStub).toBeCalled();
        });

        test('should toggle playback of the current animation via setAnimationPlaying()', () => {
            const playStub = jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            controls.handleToggleAnimation();
            expect(playStub).toBeCalled();
        });

        test('should set toggle animation playback by inverting playback state (.isAnimationPlaying)', () => {
            const playStub = jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            controls.isAnimationPlaying = true;
            controls.handleToggleAnimation();
            expect(playStub).toBeCalledWith(false);
        });
    });

    describe('setAnimationPlaying()', () => {
        beforeEach(() => {
            controls.animationToggleEl = {
                innerHTML: '',
            };
        });

        test('should set isAnimationPlaying to value provided', () => {
            controls.isAnimationPlaying = false;
            controls.setAnimationPlaying(true);
            expect(controls.isAnimationPlaying).toBe(true);
        });

        test('should replace the toggle icon to pause, if animation is playing', () => {
            controls.setAnimationPlaying(true);
            expect(controls.animationToggleEl.innerHTML).toBe(ICON_PAUSE);
        });

        test('should replace the toggle icon to play, if animation is paused', () => {
            controls.setAnimationPlaying(false);
            expect(controls.animationToggleEl.innerHTML).toBe(ICON_PLAY);
        });

        test('should emit an "animation toggled" event', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_TOGGLE_ANIMATION);
            controls.setAnimationPlaying(false);
        });

        test('should emit an "animation toggled" event with the current state of animation playback', () => {
            sandbox
                .mock(controls)
                .expects('emit')
                .withArgs(EVENT_TOGGLE_ANIMATION, false);
            controls.setAnimationPlaying(false);
        });
    });

    describe('animation clip ui', () => {
        test('should invoke animationClipsPullup.addClip() with data for a clip, via addAnimationClip()', () => {
            const id = '1234';
            const name = 'my_clip';
            const duration = 10;
            sandbox
                .mock(controls.animationClipsPullup)
                .expects('addClip')
                .withExactArgs(id, name, duration);
            controls.addAnimationClip(id, name, duration);
        });

        test('should invoke animationClipsPullup.selectClip(), via selectAnimationClip()', () => {
            const id = '1234';
            sandbox
                .mock(controls.animationClipsPullup)
                .expects('selectClip')
                .withExactArgs(id);
            controls.selectAnimationClip(id);
        });
    });

    describe('handleToggleFullscreen()', () => {
        test('should hide all pullups', () => {
            const stub = jest.spyOn(controls, 'hidePullups');
            controls.handleToggleFullscreen();
            expect(stub).toBeCalled();
        });
    });

    describe('setCurrentProjectionMode()', () => {
        test('should invoke settingsPullup.onProjectionSelected()', () => {
            sandbox.mock(controls.settingsPullup).expects('onProjectionSelected');
            controls.setCurrentProjectionMode();
        });

        test('should invoke settingsPullup.onProjectionSelected() with the new projection mode', () => {
            const mode = 'orthographic';
            sandbox
                .mock(controls.settingsPullup)
                .expects('onProjectionSelected')
                .withArgs(mode);
            controls.setCurrentProjectionMode(mode);
        });

        test('should invoke settingsPullup.setCurrentProjectionMode()', () => {
            sandbox.mock(controls.settingsPullup).expects('setCurrentProjectionMode');
            controls.setCurrentProjectionMode();
        });

        test('should invoke settingsPullup.setCurrentProjectionMode() with the new projection mode', () => {
            const mode = 'orthographic';
            sandbox
                .mock(controls.settingsPullup)
                .expects('setCurrentProjectionMode')
                .withArgs(mode);
            controls.setCurrentProjectionMode(mode);
        });
    });

    describe('handleReset()', () => {
        test('should hide all pullups', () => {
            jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            const stub = jest.spyOn(controls, 'hidePullups');
            controls.handleReset();
            expect(stub).toBeCalled();
        });

        test('should reset the settings pullup', () => {
            jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            sandbox.mock(controls.settingsPullup).expects('reset');
            controls.handleReset();
        });

        test('should pause animation playback', () => {
            const stub = jest.spyOn(controls, 'setAnimationPlaying').mockImplementation();
            controls.handleReset();
            expect(stub).toBeCalledWith(false);
        });
    });
});
