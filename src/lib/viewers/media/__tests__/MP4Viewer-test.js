/* eslint-disable no-unused-expressions */
import noop from 'lodash/noop';
import MP4Viewer from '../MP4Viewer';
import BaseViewer from '../../BaseViewer';
import { VIEWER_EVENT } from '../../../events';

const sandbox = sinon.createSandbox();
let mp4;

describe('lib/viewers/media/MP4Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP4Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp4 = new MP4Viewer({
            container: containerEl,
            file: {
                id: 1,
            },
            cache: {
                has: jest.fn(),
                get: jest.fn(),
                set: jest.fn(),
                unset: jest.fn(),
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        mp4.containerEl = containerEl;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp4 && typeof mp4.destroy === 'function') {
            mp4.destroy();
        }

        mp4 = null;
    });

    describe('setup()', () => {
        test('should have proper class added to wrapper', () => {
            mp4.setup();
            expect(mp4.wrapperEl).toHaveClass('bp-media-mp4');
        });
    });

    describe('loadeddataHandler()', () => {
        test('should do nothing if the player is destroyed', () => {
            jest.spyOn(mp4, 'isDestroyed').mockReturnValue(true);
            jest.spyOn(mp4, 'showMedia');
            mp4.loadeddataHandler();
            expect(mp4.showMedia).not.toBeCalled();
        });

        test('should load the metadata for the media element, show the media/play button, load subs, check for autoplay, and set focus', () => {
            // Set up required properties first
            mp4.mediaEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                paused: false,
                volume: 1,
                buffered: {},
                currentTime: 0,
                duration: 0,
            };
            mp4.mediaContainerEl = {
                clientWidth: 100,
                clientHeight: 100,
                focus: jest.fn(),
            };
            mp4.annotationControlsFSM = {
                subscribe: jest.fn(),
                getMode: jest.fn(() => 'none'),
            };

            jest.spyOn(mp4, 'isDestroyed').mockReturnValue(false);
            jest.spyOn(mp4, 'showMedia').mockImplementation();
            jest.spyOn(mp4, 'isAutoplayEnabled').mockReturnValue(true);
            jest.spyOn(mp4, 'autoplay').mockImplementation();
            jest.spyOn(mp4, 'resize').mockImplementation();
            jest.spyOn(mp4, 'handleVolume').mockImplementation();
            jest.spyOn(mp4, 'showPlayButton').mockImplementation();
            jest.spyOn(mp4, 'calculateVideoDimensions').mockImplementation();
            jest.spyOn(mp4, 'addEventListenersForMediaElement').mockImplementation();
            jest.spyOn(mp4, 'loadUIReact').mockImplementation();
            jest.spyOn(mp4, 'emit').mockImplementation();

            mp4.options.autoFocus = true;
            mp4.loadeddataHandler();
            expect(mp4.autoplay).toBeCalled();
            expect(mp4.showMedia).toBeCalled();
            expect(mp4.showPlayButton).toBeCalled();
            expect(mp4.calculateVideoDimensions).toBeCalled();
            expect(mp4.emit).toBeCalledWith(VIEWER_EVENT.load);
            expect(mp4.loaded).toBe(true);
            expect(mp4.mediaContainerEl.focus).toBeCalled();
            expect(mp4.loadUIReact).toBeCalled();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                // Set up required properties
                mp4.mediaEl = {
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    paused: false,
                    volume: 1,
                    buffered: {},
                    currentTime: 0,
                    duration: 0,
                };
                mp4.mediaContainerEl = {
                    clientWidth: 100,
                    clientHeight: 100,
                    focus: jest.fn(),
                };
                mp4.annotationControlsFSM = {
                    subscribe: jest.fn(),
                    getMode: jest.fn(() => 'none'),
                };

                jest.spyOn(mp4, 'calculateVideoDimensions').mockImplementation();
                jest.spyOn(mp4, 'getViewerOption').mockImplementation(() => true);
                jest.spyOn(mp4, 'loadUIReact').mockImplementation();
                jest.spyOn(mp4, 'loadUI').mockImplementation();
                jest.spyOn(mp4, 'resize').mockImplementation();
                jest.spyOn(mp4, 'isDestroyed').mockReturnValue(false);
                jest.spyOn(mp4, 'showMedia').mockImplementation();
                jest.spyOn(mp4, 'handleVolume').mockImplementation();
                jest.spyOn(mp4, 'showPlayButton').mockImplementation();
                jest.spyOn(mp4, 'emit').mockImplementation();
            });

            test('should call loadUIReact', () => {
                mp4.loadeddataHandler();

                expect(mp4.loadUIReact).toBeCalled();
                expect(mp4.loadUI).not.toBeCalled();
            });

            test('should retry showAndHideReactControls 10 times if show === noop', () => {
                jest.spyOn(mp4, 'showAndHideReactControls');

                jest.useFakeTimers();

                mp4.controls = {
                    controlsLayer: {
                        hide: jest.fn(),
                        show: noop,
                    },
                };

                mp4.loadeddataHandler();

                jest.runAllTimers();

                expect(mp4.showAndHideReactControls).toHaveBeenCalledTimes(11);
                jest.useRealTimers();
            });
        });
    });

    describe('calculateVideoDimensions()', () => {
        test('should calculate video dimensions', () => {
            mp4.mediaContainerEl = {
                clientWidth: 100,
                clientHeight: 100,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(100);
            expect(mp4.videoHeight).toBe(100);
            expect(mp4.aspect).toBe(1);
        });

        test('should calculate video dimensions when video is stretched horizontally', () => {
            mp4.mediaContainerEl = {
                clientWidth: 200,
                clientHeight: 100,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(200);
            expect(mp4.videoHeight).toBe(100);
            expect(mp4.aspect).toBe(2);
        });

        test('should calculate video dimensions when video is stretched vertically', () => {
            mp4.mediaContainerEl = {
                clientWidth: 100,
                clientHeight: 200,
            };
            mp4.calculateVideoDimensions();
            expect(mp4.videoWidth).toBe(100);
            expect(mp4.videoHeight).toBe(200);
            expect(mp4.aspect).toBe(0.5);
        });
    });
});
