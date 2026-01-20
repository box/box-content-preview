/* eslint-disable no-unused-expressions */
import noop from 'lodash/noop';
import BaseViewer from '../../BaseViewer';
import ControlsRoot from '../../controls';
import MediaBaseViewer from '../MediaBaseViewer';
import VideoBaseViewer from '../VideoBaseViewer';
import VideoPreloader from '../VideoPreloader';
import * as fileUtil from '../../../file';

let containerEl;
let rootEl;
let videoBase;

describe('lib/viewers/media/VideoBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/VideoBaseViewer-test.html');
        containerEl = document.querySelector('.container');
        rootEl = document.querySelector('.bp');

        videoBase = new VideoBaseViewer({
            cache: {
                set: () => {},
                has: () => {},
                get: () => {},
                unset: () => {},
            },
            file: {
                id: 1,
            },
            container: containerEl,
            content: {
                url_template: 'www.netflix.com',
            },
        });
        videoBase.mediaControls = {
            on: jest.fn(),
            addListener: jest.fn(),
            removeAllListeners: jest.fn(),
            destroy: jest.fn(),
            show: jest.fn(),
            toggle: jest.fn(),
            resizeTimeScrubber: jest.fn(),
        };

        videoBase.useReactControls = jest.fn().mockReturnValue(false);

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        videoBase.containerEl = containerEl;
        videoBase.rootEl = rootEl;
        videoBase.setup();
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (videoBase && typeof videoBase.destroy === 'function') {
            videoBase.destroy();
        }
        videoBase = null;
    });

    describe('setup()', () => {
        test('should set up media element, play button, and lower lights', () => {
            const { lowerLights } = VideoBaseViewer.prototype;

            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: jest.fn(),
            });

            videoBase = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            videoBase.useReactControls = jest.fn().mockReturnValue(false);
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
            videoBase.containerEl = containerEl;
            videoBase.setup();

            expect(videoBase.mediaEl.getAttribute('preload')).toBe('auto');
            expect(videoBase.mediaEl.getAttribute('playsinline')).toBe('');
            expect(videoBase.playButtonEl.className).toBe('bp-media-play-button bp-is-hidden');
            expect(videoBase.playButtonEl).toContainHTML('<path d="M0 0h24v24H0z" fill="none"');
            expect(VideoBaseViewer.prototype.lowerLights).toBeCalled();

            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: lowerLights,
            });
        });

        test('should not build play button with seek buttons if useReactControls is true', () => {
            const { lowerLights } = VideoBaseViewer.prototype;

            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: jest.fn(),
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
            videoBase = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            jest.spyOn(videoBase, 'getViewerOption').mockImplementation(option => option === 'useReactControls');
            videoBase.containerEl = containerEl;
            videoBase.setup();
            expect(videoBase.playButtonEl).toBeUndefined();
            expect(videoBase.seekForwardButtonEl).toBeUndefined();
            expect(videoBase.seekBackwardButtonEl).toBeUndefined();
            Object.defineProperty(VideoBaseViewer.prototype, 'lowerLights', {
                value: lowerLights,
            });
        });
    });

    describe('destroy()', () => {
        test('should remove event listeners on the media and play button', () => {
            jest.spyOn(videoBase.mediaEl, 'removeEventListener');
            jest.spyOn(videoBase.playButtonEl, 'removeEventListener');

            videoBase.destroy();

            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('click', videoBase.pointerHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('touchstart', videoBase.pointerHandler);
            expect(videoBase.mediaEl.removeEventListener).toBeCalledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.removeEventListener).toBeCalledWith('click', videoBase.togglePlay);
        });
    });

    describe('loadeddataHandler()', () => {
        const loadeddataHandlerFunc = MediaBaseViewer.prototype.loadeddataHandler;

        beforeEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: jest.fn() });
        });

        afterEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadeddataHandler', { value: loadeddataHandlerFunc });
        });

        test('should show the play button', () => {
            jest.spyOn(videoBase, 'showPlayButton');
            videoBase.loadeddataHandler();
            expect(videoBase.showPlayButton).toBeCalled();
        });

        test('should show the controls briefly', () => {
            videoBase.controls = {
                controlsLayer: {
                    hide: jest.fn(),
                    show: jest.fn(),
                },
            };
            videoBase.mediaControls = null;
            videoBase.loadeddataHandler();

            expect(videoBase.controls.controlsLayer.show).toBeCalled();
            expect(videoBase.controls.controlsLayer.hide).toBeCalled();
        });

        test('should retry showAndHideReactControls 10 times if show == noop', () => {
            jest.spyOn(videoBase, 'showAndHideReactControls');

            jest.useFakeTimers();

            videoBase.controls = {
                controlsLayer: {
                    hide: jest.fn(),
                    show: noop,
                },
            };
            videoBase.mediaControls = null;
            videoBase.loadeddataHandler();

            jest.runAllTimers();

            expect(videoBase.showAndHideReactControls).toBeCalledTimes(11);
        });
    });

    describe('showAndHideReactControls()', () => {
        test('should retry function 10 times if show === noop', () => {
            jest.spyOn(videoBase, 'showAndHideReactControls');

            jest.useFakeTimers();

            videoBase.controls = {
                controlsLayer: {
                    hide: jest.fn(),
                    show: noop,
                },
            };
            videoBase.mediaControls = null;
            videoBase.showAndHideReactControls();

            jest.runAllTimers();

            expect(videoBase.showAndHideReactControls).toBeCalledTimes(11);
        });
    });

    describe('loadUIReact()', () => {
        beforeEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUIReact', { value: jest.fn() });
            jest.spyOn(videoBase, 'renderUI').mockImplementation();
        });

        test('should create the controls root and render the controls', () => {
            videoBase.mediaContainerEl = document.createElement('div');
            videoBase.loadUIReact();

            expect(videoBase.controls).toBeInstanceOf(ControlsRoot);
            expect(videoBase.controls.handleHide).toEqual(videoBase.handleControlsHide);
            expect(videoBase.controls.handleShow).toEqual(videoBase.handleControlsShow);
            expect(videoBase.renderUI).toBeCalled();
        });
    });

    describe('pointerHandler()', () => {
        test('should prevent default, stop propagation, and toggle the controls on touchstart', () => {
            const event = {
                type: 'touchstart',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            videoBase.pointerHandler(event);
            expect(event.stopPropagation).toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(videoBase.mediaControls.toggle).toBeCalled();
        });

        test('should toggle play on click', () => {
            jest.spyOn(videoBase, 'togglePlay').mockImplementation();

            videoBase.pointerHandler({ type: 'click' });
            expect(videoBase.togglePlay).toBeCalled();
        });
    });

    describe('playingHandler()', () => {
        test('should hide the play button', () => {
            jest.spyOn(videoBase, 'handleRate').mockImplementation();
            jest.spyOn(videoBase, 'hidePlayButton').mockImplementation();

            videoBase.loadUI(); // load media controls UI
            videoBase.playingHandler();

            expect(videoBase.hidePlayButton).toBeCalled();
        });
    });

    describe('pauseHandler()', () => {
        test('should show the play button', () => {
            jest.spyOn(videoBase, 'showPlayButton');
            videoBase.loadUI(); // load media controls UI

            videoBase.pauseHandler();

            expect(videoBase.showPlayButton).toBeCalled();
        });

        test('should hide the loading icon', () => {
            jest.spyOn(videoBase, 'hideLoadingIcon');
            videoBase.loadUI(); // load media controls UI

            videoBase.pauseHandler();

            expect(videoBase.hideLoadingIcon).toBeCalled();
        });
    });

    describe('waitingHandler()', () => {
        test('should add the buffering class', () => {
            videoBase.waitingHandler();
            expect(videoBase.containerEl).toHaveClass('bp-is-buffering');
        });

        test('should hide the play button', () => {
            jest.spyOn(videoBase, 'hidePlayButton');

            videoBase.waitingHandler();
            expect(videoBase.hidePlayButton).toBeCalled();
        });
    });

    describe('addEventListenersForMediaControls()', () => {
        test('should add a handler for toggling fullscreen', () => {
            videoBase.addEventListenersForMediaControls();
            expect(videoBase.mediaControls.on).toBeCalledWith('togglefullscreen', expect.any(Function));
        });
    });

    describe('addEventListenersForMediaElement()', () => {
        test('should add a handler for toggling fullscreen', () => {
            jest.spyOn(videoBase.mediaEl, 'addEventListener');
            jest.spyOn(videoBase.playButtonEl, 'addEventListener');

            videoBase.hasTouch = true;
            videoBase.addEventListenersForMediaElement();

            expect(videoBase.mousemoveHandler).toBeInstanceOf(Function);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('mousemove', videoBase.mousemoveHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('click', videoBase.pointerHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('touchstart', videoBase.pointerHandler);
            expect(videoBase.mediaEl.addEventListener).toBeCalledWith('waiting', videoBase.waitingHandler);
            expect(videoBase.playButtonEl.addEventListener).toBeCalledWith('click', videoBase.togglePlay);
        });
    });

    describe('resize()', () => {
        beforeEach(() => {
            jest.spyOn(videoBase, 'scaleAnnotations').mockImplementation();
            jest.spyOn(videoBase, 'handleNarrowVideoUI').mockImplementation();
            jest.spyOn(videoBase, 'setVideoDimensions').mockImplementation();
            videoBase.mediaEl = document.createElement('video');
            videoBase.mediaEl.style.width = '100px';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should call proper functions if not using react controls', () => {
            jest.spyOn(videoBase, 'useReactControls').mockReturnValue(false);
            videoBase.resize();
            expect(videoBase.setVideoDimensions).toHaveBeenCalled();
            expect(videoBase.mediaControls.resizeTimeScrubber).toHaveBeenCalled();
            expect(videoBase.setVideoDimensions).toHaveBeenCalled();
            expect(videoBase.scaleAnnotations).not.toHaveBeenCalled();
            expect(videoBase.handleNarrowVideoUI).toHaveBeenCalled();
            expect(videoBase.mediaEl.style.width).toBe('');
        });

        test('should call proper functions if using react controls', () => {
            jest.spyOn(videoBase, 'getViewerOption').mockImplementation(option => option === 'useReactControls');
            videoBase.annotator = {};
            videoBase.resize();
            expect(videoBase.mediaControls.resizeTimeScrubber).toHaveBeenCalled();
            expect(videoBase.scaleAnnotations).toHaveBeenCalled();
            expect(videoBase.handleNarrowVideoUI).toHaveBeenCalled();
            expect(videoBase.mediaEl.style.width).toBe('');
            expect(videoBase.setVideoDimensions).toHaveBeenCalled();
        });
        test('should not scale annotations if annotator does not exist', () => {
            videoBase.annotator = null;
            videoBase.resize();
            expect(videoBase.scaleAnnotations).not.toHaveBeenCalled();
        });

        test('should not resize the time scrubber if mediaControls is not present', () => {
            videoBase.mediaControls = null;
            videoBase.resize();
        });
    });

    describe('handleNarrowVideoUI()', () => {
        let mockBuildPlayButtonWithSeekButtons;
        let mockRemovePlayButtonWithSeekButtons;
        let videoBaseViewer;
        let mockRenderUI;
        beforeEach(() => {
            videoBaseViewer = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            jest.spyOn(videoBaseViewer, 'getViewerOption').mockImplementation(option => option === 'useReactControls');
            mockRenderUI = jest.spyOn(videoBaseViewer, 'renderUI').mockImplementation();
            mockBuildPlayButtonWithSeekButtons = jest
                .spyOn(videoBaseViewer, 'buildPlayButtonWithSeekButtons')
                .mockImplementation();
            mockRemovePlayButtonWithSeekButtons = jest
                .spyOn(videoBaseViewer, 'removePlayButtonWithSeekButtons')
                .mockImplementation();
            jest.spyOn(videoBaseViewer, 'renderUI').mockImplementation();
            videoBaseViewer.containerEl = containerEl;
            videoBaseViewer.mediaEl = document.createElement('video');
            videoBaseViewer.isNarrowVideo = false;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should not call any functions if useReactControls is false', () => {
            videoBaseViewer.getViewerOption = jest.fn().mockReturnValue(false);
            videoBaseViewer.useReactControls = jest.fn().mockReturnValue(false);
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockBuildPlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(mockRemovePlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(videoBaseViewer.renderUI).not.toHaveBeenCalled();
            expect(mockRenderUI).not.toHaveBeenCalled();
        });

        test('should add play button controls if video width is less than 580px', () => {
            videoBaseViewer.mediaEl.style.width = '579px';
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockBuildPlayButtonWithSeekButtons).toHaveBeenCalled();
            expect(mockRenderUI).toHaveBeenCalled();
            expect(videoBaseViewer.isNarrowVideo).toBe(true);
        });

        test('should not add play button controls if video width is less than 580px and playContainerEl is present', () => {
            videoBaseViewer.mediaEl.style.width = '579px';
            videoBaseViewer.playContainerEl = document.createElement('div');
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockBuildPlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(mockRenderUI).not.toHaveBeenCalled();
            expect(videoBaseViewer.isNarrowVideo).toBe(false);
        });

        test('should remove play button with seek buttons if video width is greater than 580px and playContainerEl is present', () => {
            videoBaseViewer.mediaEl.style.width = '580px';
            videoBaseViewer.playContainerEl = document.createElement('div');
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockRemovePlayButtonWithSeekButtons).toHaveBeenCalled();
            expect(mockRenderUI).toHaveBeenCalled();
            expect(videoBaseViewer.isNarrowVideo).toBe(false);
        });

        test('should not call removePLayButtonWithSeekButtons if playContainerEl is not present', () => {
            videoBaseViewer.mediaEl.style.width = '580px';
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockRemovePlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(mockRenderUI).not.toHaveBeenCalled();
            expect(videoBaseViewer.isNarrowVideo).toBe(false);
        });

        test('should handle width not a number', () => {
            jest.spyOn(window, 'parseInt').mockReturnValue(NaN);
            videoBaseViewer.handleNarrowVideoUI();
            expect(mockBuildPlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(mockRemovePlayButtonWithSeekButtons).not.toHaveBeenCalled();
            expect(mockRenderUI).not.toHaveBeenCalled();
            expect(videoBaseViewer.isNarrowVideo).toBe(false);
        });
    });

    describe('setVideoDimensions()', () => {
        const clientHeight = {
            get() {
                return parseInt(this.style.height, 10);
            },
        };
        const clientWidth = {
            get() {
                return parseInt(this.style.width, 10);
            },
        };

        beforeEach(() => {
            videoBase.videoWidth = 500;
            videoBase.videoHeight = 500;
            videoBase.wrapperEl.style.width = '600px';
            videoBase.wrapperEl.style.height = '650px';
            Object.defineProperty(videoBase.wrapperEl, 'clientHeight', clientHeight);
            Object.defineProperty(videoBase.wrapperEl, 'clientWidth', clientWidth);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        test('should fit video to at least 420px wide for calculation', () => {
            videoBase.aspect = 0.5;
            videoBase.videoWidth = 0;
            videoBase.setVideoDimensions();
            expect(videoBase.mediaEl.style.width).toBe('325px');
        });

        describe('Video width adjusts to account for the control bar height', () => {
            test('Video width is affected by the control bar height if using react controls', () => {
                jest.spyOn(videoBase, 'useReactControls').mockReturnValue(true);
                videoBase.videoWidth = 800;
                videoBase.videoHeight = 480;
                videoBase.aspect = 1;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('600px');
            });

            test('Video width is unaffectd by the control bar height if not using react controls', () => {
                jest.spyOn(videoBase, 'useReactControls').mockReturnValue(false);
                videoBase.videoWidth = 600;
                videoBase.videoHeight = 400;
                videoBase.aspect = 1;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('600px');
            });
        });

        describe('Video fits in the viewport of preview', () => {
            test('should set mediaEl width to video width if aspect ratio is >= 1', () => {
                videoBase.aspect = 1;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('500px');
            });

            test('should set mediaEl width to adjusted video height if aspect ratio is < 1', () => {
                videoBase.aspect = 0.5;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('250px');
            });

            test('should not set mediaEl width to video width if fullscreen is active', () => {
                videoBase.aspect = 1;
                videoBase.containerEl.classList.add('bp-is-fullscreen');
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('600px');
            });
        });

        describe('Video overflows the viewport of preview', () => {
            test('should set mediaEl width to viewport width if video is stretched horizontally', () => {
                videoBase.videoWidth = 800;
                videoBase.aspect = 1;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('600px');
            });

            test('should set mediaEl width to adjusted viewport height if video is stretched vertically', () => {
                videoBase.videoHeight = 800;
                videoBase.aspect = 0.5;
                videoBase.setVideoDimensions();
                expect(videoBase.mediaEl.style.width).toBe('325px');
            });
        });
    });

    describe('allowNavigationArrows', () => {
        test('should return true if media controls are undefined or media controls do not have settings visible', () => {
            videoBase.mediaControls = undefined;
            expect(videoBase.allowNavigationArrows()).toBe(true);

            videoBase.mediaControls = {
                isSettingsVisible: jest.fn().mockReturnValue(false),
                removeAllListeners: jest.fn(),
                destroy: jest.fn(),
            };
            expect(videoBase.allowNavigationArrows()).toBe(true);

            videoBase.mediaControls.isSettingsVisible = jest.fn().mockReturnValue(true);
            expect(videoBase.allowNavigationArrows()).toBe(false);
        });
    });

    describe('lowerLights', () => {
        test('should add dark class to container', () => {
            videoBase.lowerLights();
            expect(videoBase.rootEl).toHaveClass('bp-dark');
        });
    });

    describe('handleAutoplayFail()', () => {
        test('should mute and play again', () => {
            jest.spyOn(videoBase, 'setVolume').mockImplementation();
            jest.spyOn(videoBase, 'play').mockResolvedValue('');

            videoBase.handleAutoplayFail();

            expect(videoBase.setVolume).toBeCalledWith(0);
            expect(videoBase.play).toBeCalled();
        });
    });

    describe('buildPlayButtonWithSeekButtons()', () => {
        let videoBaseViewer;
        beforeEach(() => {
            videoBaseViewer = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            videoBaseViewer.mediaContainerEl = document.createElement('div');
            jest.spyOn(videoBaseViewer, 'togglePlay').mockImplementation();
            jest.spyOn(videoBaseViewer, 'movePlayback').mockImplementation();
        });

        test('should build the play button with seek buttons', () => {
            videoBaseViewer.buildPlayButtonWithSeekButtons();
            expect(videoBaseViewer.playButtonEl).toBeDefined();
            expect(videoBaseViewer.seekForwardButtonEl).toBeDefined();
            expect(videoBaseViewer.seekBackwardButtonEl).toBeDefined();
            expect(videoBaseViewer.playContainerEl).toBeDefined();
            expect(videoBaseViewer.playContainerEl.classList).toContain('bp-media-overlay-play-container');
            expect(videoBaseViewer.playButtonEl.classList).toContain('bp-media-overlay-play-button');
            expect(videoBaseViewer.seekForwardButtonEl.classList).toContain('bp-media-overlay-seek-button');
            expect(videoBaseViewer.seekBackwardButtonEl.classList).toContain('bp-media-overlay-seek-button');
            videoBaseViewer.playButtonEl.click();
            expect(videoBaseViewer.togglePlay).toHaveBeenCalled();
            videoBaseViewer.seekForwardButtonEl.click();
            expect(videoBaseViewer.movePlayback).toHaveBeenCalledWith(true, 5);
            videoBaseViewer.seekBackwardButtonEl.click();
            expect(videoBaseViewer.movePlayback).toHaveBeenCalledWith(false, 5);
        });
    });

    describe('removePlayButtonWithSeekButtons()', () => {
        let videoBaseViewer;
        let mockRemoveListenerFromPlayButton;
        let mockRemoveListenerFromSeekForwardButton;
        let mockRemoveListenerFromSeekBackwardButton;

        beforeEach(() => {
            videoBaseViewer = new VideoBaseViewer({
                file: {
                    id: 1,
                },
                container: containerEl,
            });
            videoBaseViewer.mediaContainerEl = document.createElement('div');
            videoBaseViewer.buildPlayButtonWithSeekButtons();
            jest.spyOn(videoBaseViewer, 'togglePlay').mockImplementation();
            jest.spyOn(videoBaseViewer, 'movePlayback').mockImplementation();
            mockRemoveListenerFromPlayButton = jest
                .spyOn(videoBaseViewer.playButtonEl, 'removeEventListener')
                .mockImplementation();
            mockRemoveListenerFromSeekForwardButton = jest
                .spyOn(videoBaseViewer.seekForwardButtonEl, 'removeEventListener')
                .mockImplementation();
            mockRemoveListenerFromSeekBackwardButton = jest
                .spyOn(videoBaseViewer.seekBackwardButtonEl, 'removeEventListener')
                .mockImplementation();
        });
        test('should remove the play button with seek buttons', () => {
            videoBaseViewer.removePlayButtonWithSeekButtons();
            expect(videoBaseViewer.playContainerEl).toBeNull();
            expect(videoBaseViewer.playButtonEl).toBeNull();
            expect(videoBaseViewer.seekForwardButtonEl).toBeNull();
            expect(videoBaseViewer.seekBackwardButtonEl).toBeNull();
            expect(mockRemoveListenerFromSeekBackwardButton).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockRemoveListenerFromSeekForwardButton).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockRemoveListenerFromPlayButton).toHaveBeenCalledWith('click', videoBaseViewer.togglePlay);
        });
    });

    describe('handleControlsHide()', () => {
        test('should remove a class name to the media container element', () => {
            videoBase.handleControlsShow(); // Show the controls to set up the test
            videoBase.handleControlsHide();

            expect(videoBase.mediaContainerEl.classList).not.toContain('bp-media-controls-is-visible');
        });
    });

    describe('handleControlsShow()', () => {
        test('should add a class name to the media container element', () => {
            videoBase.handleControlsShow();

            expect(videoBase.mediaContainerEl.classList).toContain('bp-media-controls-is-visible');
        });
    });

    describe('scaleAnnotations()', () => {
        beforeEach(() => {
            videoBase.videoWidth = 1920;
            videoBase.videoHeight = 1080;
            videoBase.rotationAngle = 0;
            jest.spyOn(videoBase, 'emit');
        });

        test('should emit scale event with width-based scale', () => {
            const width = '960';
            const height = '540';

            videoBase.scaleAnnotations(width, height);

            expect(videoBase.emit).toHaveBeenCalledWith('scale', {
                scale: 0.5,
                rotationAngle: 0,
            });
        });
    });

    describe('initAnnotations', () => {
        beforeEach(() => {
            videoBase.annotator = {
                addListener: jest.fn(),
            };
            jest.spyOn(videoBase, 'areNewAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(BaseViewer.prototype, 'initAnnotations').mockImplementation();
        });

        test('should call super initAnnotations', () => {
            videoBase.initAnnotations();

            expect(BaseViewer.prototype.initAnnotations).toHaveBeenCalled();
        });

        test('should add annotations_create listener if new annotations are enabled', () => {
            videoBase.initAnnotations();

            expect(videoBase.annotator.addListener).toBeCalledWith(
                'annotations_create',
                videoBase.handleAnnotationCreateEvent,
            );
        });

        test('should not add annotations_create listener if new annotations are disabled', () => {
            jest.spyOn(videoBase, 'areNewAnnotationsEnabled').mockReturnValue(false);

            videoBase.initAnnotations();

            expect(videoBase.annotator.addListener).not.toHaveBeenCalled();
        });

        test('should not fail if annotator is missing', () => {
            videoBase.annotator = null;
            expect(() => videoBase.initAnnotations()).not.toThrow();
        });
    });

    describe('handleAnnotationColorChange', () => {
        beforeEach(() => {
            videoBase.annotationModule = {
                setColor: jest.fn(),
            };
            videoBase.annotator = {
                emit: jest.fn(),
            };
            videoBase.renderUI = jest.fn();
        });

        test('should call setColor and renderUI, and emit color', () => {
            const color = '#fff';
            videoBase.handleAnnotationColorChange(color);

            expect(videoBase.annotationModule.setColor).toBeCalledWith(color);
            expect(videoBase.annotator.emit).toBeCalledWith('annotations_color_set', color);
            expect(videoBase.renderUI).toHaveBeenCalled();
        });

        test('should not fail if annotator is missing', () => {
            videoBase.annotator = null;
            const color = '#fff';
            expect(() => videoBase.handleAnnotationColorChange(color)).not.toThrow();
        });
    });

    describe('handleAnnotationControlsClick', () => {
        beforeEach(() => {
            videoBase.mediaEl = {
                pause: jest.fn(),
                removeEventListener: jest.fn(),
            };
            videoBase.annotationControlsFSM = {
                transition: jest.fn(),
            };
            videoBase.annotator = {
                toggleAnnotationMode: jest.fn(),
            };
            videoBase.processAnnotationModeChange = jest.fn();
        });

        test('should pause media, transition FSM, toggle annotation mode, and process mode change', () => {
            const mode = 'region';
            const nextMode = 'none';
            videoBase.annotationControlsFSM.transition.mockReturnValue(nextMode);

            videoBase.handleAnnotationControlsClick({ mode });

            expect(videoBase.mediaEl.pause).toHaveBeenCalled();
            expect(videoBase.annotationControlsFSM.transition).toHaveBeenCalledWith('click', mode);
            expect(videoBase.annotator.toggleAnnotationMode).toHaveBeenCalledWith(nextMode);
            expect(videoBase.processAnnotationModeChange).toHaveBeenCalledWith(nextMode);
        });

        test('should not fail if annotator is missing', () => {
            videoBase.annotator = null;
            const mode = 'region';
            const nextMode = 'none';
            videoBase.annotationControlsFSM.transition.mockReturnValue(nextMode);

            expect(() => videoBase.handleAnnotationControlsClick({ mode })).not.toThrow();
        });
    });

    describe('handleAnnotationCreateEvent', () => {
        beforeEach(() => {
            videoBase.annotator = {
                emit: jest.fn(),
            };
        });

        test('should not emit if status is not success', () => {
            const event = {
                annotation: { id: '123' },
                meta: { status: 'error' },
            };

            videoBase.handleAnnotationCreateEvent(event);

            expect(videoBase.annotator.emit).not.toHaveBeenCalled();
        });

        test('should not emit if status is pending', () => {
            const event = {
                annotation: { id: '123' },
                meta: { status: 'pending' },
            };

            videoBase.handleAnnotationCreateEvent(event);

            expect(videoBase.annotator.emit).not.toHaveBeenCalled();
        });

        test('should emit annotations_active_set if status is success', () => {
            const event = {
                annotation: { id: '123' },
                meta: { status: 'success' },
            };

            videoBase.handleAnnotationCreateEvent(event);

            expect(videoBase.annotator.emit).toBeCalledWith('annotations_active_set', '123');
        });

        test('should handle missing annotation or meta gracefully', () => {
            const event = {};

            videoBase.handleAnnotationCreateEvent(event);

            expect(videoBase.annotator.emit).not.toHaveBeenCalled();
        });

        test('should not fail if annoator is missing', () => {
            videoBase.annotator = null;
            const event = {
                annotation: { id: '123' },
                meta: { status: 'success' },
            };

            expect(() => videoBase.handleAnnotationCreateEvent(event)).not.toThrow();
        });
    });

    describe('applyCursorFtux', () => {
        beforeEach(() => {
            videoBase.containerEl = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
                removeEventListener: jest.fn(),
            };
            videoBase.cache = {
                get: jest.fn(),
                set: jest.fn(),
            };
            videoBase.annotationControlsFSM = {
                getState: jest.fn(),
            };
        });

        test('should do nothing if containerEl does not exist', () => {
            videoBase.containerEl = null;

            videoBase.applyCursorFtux();

            expect(videoBase.cache.get).not.toHaveBeenCalled();
            expect(videoBase.cache.set).not.toHaveBeenCalled();
        });

        test('should do nothing if annotation state is not REGION', () => {
            videoBase.annotationControlsFSM.getState.mockReturnValue('drawing');

            videoBase.applyCursorFtux();

            expect(videoBase.cache.get).not.toHaveBeenCalled();
            expect(videoBase.cache.set).not.toHaveBeenCalled();
        });

        test('should add cursor seen class if cache contains VIDEO_FTUX_CURSOR_SEEN_KEY', () => {
            videoBase.annotationControlsFSM.getState.mockReturnValue('region');
            videoBase.cache.get.mockReturnValue(true);

            videoBase.applyCursorFtux();

            expect(videoBase.containerEl.classList.add).toBeCalledWith('bp-annotations-ftux-video-cursor-seen');
            expect(videoBase.cache.set).not.toHaveBeenCalled();
        });

        test('should set VIDEO_FTUX_CURSOR_SEEN_KEY in cache if not present', () => {
            videoBase.annotationControlsFSM.getState.mockReturnValue('region');
            videoBase.cache.get.mockReturnValue(false);

            videoBase.applyCursorFtux();

            expect(videoBase.cache.set).toBeCalledWith('ftux-cursor-seen-video', true, true);
            expect(videoBase.containerEl.classList.add).not.toHaveBeenCalled();
        });
    });

    describe('updateDiscoverabilityResinTag', () => {
        beforeEach(() => {
            videoBase.containerEl = {
                setAttribute: jest.fn(),
                removeEventListener: jest.fn(),
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
            };
            videoBase.annotationControlsFSM = {
                getState: jest.fn(),
            };
            videoBase.options = {
                enableAnnotationsDiscoverability: false,
            };
        });

        test('should do nothing if containerEl does not exist', () => {
            videoBase.containerEl = null;

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.annotationControlsFSM.getState).not.toHaveBeenCalled();
        });

        test('should set discoverability attribute to false if enableAnnotationsDiscoverability is false', () => {
            videoBase.annotationControlsFSM.getState.mockReturnValue('region_temp');

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.containerEl.setAttribute).toBeCalledWith('data-resin-discoverability', false);
        });

        test('should set discoverability attribute to false if state is not discoverable', () => {
            videoBase.options.enableAnnotationsDiscoverability = true;
            videoBase.annotationControlsFSM.getState.mockReturnValue('highlight');

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.containerEl.setAttribute).toBeCalledWith('data-resin-discoverability', false);
        });

        test('should set discoverability attribute to true if state is discoverable and enabled', () => {
            videoBase.options.enableAnnotationsDiscoverability = true;
            videoBase.annotationControlsFSM.getState.mockReturnValue('region_temp');

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.containerEl.setAttribute).toBeCalledWith('data-resin-discoverability', true);
        });

        test('should set discoverability attribute to true for drawing state', () => {
            videoBase.options.enableAnnotationsDiscoverability = true;
            videoBase.annotationControlsFSM.getState.mockReturnValue('drawing');

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.containerEl.setAttribute).toBeCalledWith('data-resin-discoverability', true);
        });

        test('should set discoverability attribute to true for none state', () => {
            videoBase.options.enableAnnotationsDiscoverability = true;
            videoBase.annotationControlsFSM.getState.mockReturnValue('none');

            videoBase.updateDiscoverabilityResinTag();

            expect(videoBase.containerEl.setAttribute).toBeCalledWith('data-resin-discoverability', true);
        });
    });

    describe('handleScrollToAnnotation', () => {
        beforeEach(() => {
            videoBase.annotator = {
                scrollToAnnotation: jest.fn(),
            };
        });

        test('should call scrollToAnnotation with the correct arguments', () => {
            const event = { id: '123' };
            videoBase.handleScrollToAnnotation(event);

            expect(videoBase.annotator.scrollToAnnotation).toHaveBeenCalledWith('123', undefined);
        });
        test('should call scrollToAnnotation with the correct arguments if target location is provided', () => {
            const event = { id: '123', target: { location: { value: 5 } } };
            videoBase.handleScrollToAnnotation(event);

            expect(videoBase.annotator.scrollToAnnotation).toHaveBeenCalledWith('123', 5);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            jest.spyOn(MediaBaseViewer.prototype, 'load').mockResolvedValue();
            jest.spyOn(videoBase, 'showPreload').mockImplementation();
        });

        test('should call showPreload() before super.load()', () => {
            videoBase.load();

            expect(videoBase.showPreload).toBeCalled();
            expect(MediaBaseViewer.prototype.load).toBeCalled();
            // Verify showPreload is called (it's called at the start of load())
        });
    });

    describe('showPreload()', () => {
        beforeEach(() => {
            videoBase.mediaContainerEl = document.createElement('div');
            videoBase.options.file = {
                id: '123',
                representations: {
                    entries: [
                        {
                            representation: 'jpg',
                            content: {
                                url_template: 'https://example.com/preview.jpg',
                            },
                            status: {
                                state: 'success',
                            },
                        },
                    ],
                },
            };
            jest.spyOn(videoBase, 'getViewerOption').mockReturnValue(true);
            jest.spyOn(videoBase, 'isRepresentationReady').mockReturnValue(true);
            jest.spyOn(videoBase, 'createContentUrlWithAuthParams').mockReturnValue(
                'https://example.com/preview.jpg?auth=token',
            );
        });

        test('should not show preload if file is watermarked', () => {
            jest.spyOn(fileUtil, 'isWatermarked').mockReturnValue(true);
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockImplementation();

            videoBase.showPreload();

            expect(VideoPreloader.prototype.showPreload).not.toBeCalled();
        });

        test('should not show preload if preload option is false', () => {
            videoBase.getViewerOption.mockReturnValue(false);
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockImplementation();

            videoBase.showPreload();

            expect(VideoPreloader.prototype.showPreload).not.toBeCalled();
        });

        test('should not show preload if JPG representation does not exist', () => {
            videoBase.options.file.representations.entries = [];
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockImplementation();

            videoBase.showPreload();

            expect(VideoPreloader.prototype.showPreload).not.toBeCalled();
        });

        test('should not show preload if representation is not ready', () => {
            videoBase.isRepresentationReady.mockReturnValue(false);
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockImplementation();

            videoBase.showPreload();

            expect(VideoPreloader.prototype.showPreload).not.toBeCalled();
        });

        test('should create VideoPreloader and call showPreload() when conditions are met', () => {
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockResolvedValue();

            videoBase.showPreload();

            expect(videoBase.preloader).toBeInstanceOf(VideoPreloader);
            expect(VideoPreloader.prototype.showPreload).toBeCalledWith(
                'https://example.com/preview.jpg?auth=token',
                videoBase.mediaContainerEl,
            );
        });

        test('should reuse existing VideoPreloader instance', () => {
            const existingPreloader = new VideoPreloader();
            videoBase.preloader = existingPreloader;
            jest.spyOn(VideoPreloader.prototype, 'showPreload').mockResolvedValue();

            videoBase.showPreload();

            expect(videoBase.preloader).toBe(existingPreloader);
            expect(VideoPreloader.prototype.showPreload).toBeCalled();
        });
    });

    describe('hidePreload()', () => {
        test('should call preloader.hidePreload() if preloader exists', () => {
            const mockPreloader = {
                hidePreload: jest.fn(),
            };
            videoBase.preloader = mockPreloader;

            videoBase.hidePreload();

            expect(mockPreloader.hidePreload).toBeCalled();
        });

        test('should not error if preloader does not exist', () => {
            videoBase.preloader = null;

            expect(() => {
                videoBase.hidePreload();
            }).not.toThrow();
        });
    });

    describe('loadeddataHandler()', () => {
        beforeEach(() => {
            jest.spyOn(MediaBaseViewer.prototype, 'loadeddataHandler').mockImplementation();
            jest.spyOn(videoBase, 'hidePreload').mockImplementation();
        });

        test('should call hidePreload() when video metadata loads', () => {
            videoBase.loadeddataHandler();

            expect(MediaBaseViewer.prototype.loadeddataHandler).toBeCalled();
            expect(videoBase.hidePreload).toBeCalled();
        });
    });
});
