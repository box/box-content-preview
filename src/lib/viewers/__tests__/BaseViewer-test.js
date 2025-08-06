/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import * as constants from '../../constants';
import * as util from '../../util';
import Api from '../../api';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import FocusTrap from '../../FocusTrap';
import fullscreen from '../../Fullscreen';
import intl from '../../i18n';
import PreviewError from '../../PreviewError';
import RepStatus from '../../RepStatus';
import Timer from '../../Timer';
import { AnnotationMode } from '../../types';
import { ERROR_CODE, LOAD_METRIC, VIEWER_EVENT } from '../../events';
import { EXCLUDED_EXTENSIONS } from '../../extensions';

let base;
let containerEl;
let stubs = {};
const { ANNOTATOR_EVENT } = constants;

jest.mock('../../FocusTrap');

describe('lib/viewers/BaseViewer', () => {
    beforeEach(() => {
        fixture.load('viewers/__tests__/BaseViewer-test.html');

        containerEl = document.querySelector('.bp-container');
        stubs.browser = jest.spyOn(Browser, 'isMobile').mockReturnValue(false);
        stubs.api = new Api();
        base = new BaseViewer({
            api: stubs.api,
            container: containerEl,
            file: {
                id: '0',
                permissions: {
                    can_annotate: false,
                },
            },
        });
        base.previewUI = {
            notification: {
                show: jest.fn(),
                hide: jest.fn(),
            },
            replaceHeader: jest.fn(),
            showLoadingIcon: jest.fn(),
        };
    });

    afterEach(() => {
        if (base && typeof base.destroy === 'function' && !base.destroyed) {
            base.destroy();
        }
    });

    describe('setup()', () => {
        test('should set options, a container, bind event listeners, and set timeout', () => {
            jest.spyOn(base, 'addCommonListeners');
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            base.options.showAnnotations = true;
            base.options.enableAnnotationsDiscoverability = true;
            base.options.enableAnnotationsOnlyControls = true;

            base.setup();

            expect(base.options).toEqual({
                api: stubs.api,
                container: containerEl,
                file: {
                    id: '0',
                    permissions: {
                        can_annotate: false,
                    },
                },
                showAnnotations: true,
                enableAnnotationsDiscoverability: true,
                enableAnnotationsOnlyControls: true,
            });

            expect(base.containerEl).toHaveClass(constants.CLASS_BOX_PREVIEW_CONTENT);
            expect(base.containerEl).toHaveClass(constants.CLASS_ANNOTATIONS_DISCOVERABLE);
            expect(base.containerEl).toHaveClass(constants.CLASS_ANNOTATIONS_ONLY_CONTROLS);
            expect(base.addCommonListeners).toBeCalled();
            expect(typeof base.loadTimeout).toBe('number');
            expect(base.annotatorPromise).toBeDefined();
            expect(base.annotatorPromiseResolver).toBeDefined();
        });

        test('should add a mobile class to the container if on mobile', () => {
            base.isMobile = true;
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);

            base.setup();

            const container = document.querySelector(constants.SELECTOR_BOX_PREVIEW);
            expect(container).toHaveClass('bp-is-mobile');
        });

        test('should not load annotations assets if global preview showAnnotations option is false', () => {
            jest.spyOn(base, 'addCommonListeners');
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(false);
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            base.options.showAnnotations = false;

            base.setup();

            expect(base.loadBoxAnnotations).not.toBeCalled();
        });

        test('should not load annotations assets if expiring embed is a shared link', () => {
            jest.spyOn(base, 'addCommonListeners');
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            base.options.sharedLink = 'url';

            base.setup();

            expect(base.loadBoxAnnotations).not.toBeCalled();
        });
    });

    describe('setupLoading()', () => {
        test('should hide the crawler and set the file-specific loading icon', () => {
            base.options.file = { extension: 'pdf' };

            base.setupLoading();

            expect(base.previewUI.showLoadingIcon).toBeCalledWith('pdf');
        });
    });

    describe('getResizeHandler()', () => {
        test('should return a resize handler', () => {
            expect(typeof base.getResizeHandler()).toBe('function');
        });
    });

    describe('load()', () => {
        test('should call resetLoadTimeout', () => {
            jest.spyOn(base, 'resetLoadTimeout');

            base.load();
            expect(base.resetLoadTimeout).toBeCalled();
        });
    });

    describe('resetLoadTimeout()', () => {
        test('should clear timeout and set a new timeout handler', () => {
            jest.spyOn(window, 'clearTimeout');
            jest.spyOn(window, 'setTimeout');

            base.resetLoadTimeout();
            base.loaded = true;

            expect(window.clearTimeout).toBeCalled();
            expect(window.setTimeout).toBeCalled();
            expect(typeof base.loadTimeoutId).toBe('number');

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });

        test('should trigger an error if the viewer times out', () => {
            const triggerStub = jest.spyOn(base, 'triggerError').mockImplementation();
            jest.spyOn(window, 'setTimeout').mockImplementation(func => func());

            base.loaded = false;
            base.destroyed = false;

            base.resetLoadTimeout();
            const [error] = triggerStub.mock.calls[0];
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe(ERROR_CODE.VIEWER_LOAD_TIMEOUT);

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });
    });

    describe('startLoadTimer()', () => {
        test('should start a timer for the contentLoadTime metric', () => {
            base.options.file.id = '1234';
            base.startLoadTimer();

            const tag = Timer.createTag(base.options.file.id, LOAD_METRIC.contentLoadTime);
            expect(Timer.get(tag)).toBeDefined();
        });
    });

    describe('handleAssetError()', () => {
        test('should trigger error and set destroyed to true', () => {
            jest.spyOn(base, 'triggerError').mockImplementation();
            base.handleAssetError(new Error('test'));
            expect(base.triggerError).toBeCalled();
            expect(base.destroyed).toBe(true);
        });

        test('should use the original error if it is a PreviewError', () => {
            jest.spyOn(base, 'triggerError').mockImplementation();
            const originalError = new PreviewError('foo', 'bar');
            base.handleAssetError(originalError);
            expect(base.triggerError).toBeCalledWith(originalError);
        });

        test('should pass along the error if provided', () => {
            const stub = jest.spyOn(base, 'triggerError').mockImplementation();

            base.handleAssetError(new Error('test'));

            const error = stub.mock.calls[0][0];
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe('error_load_asset');
            expect(error.message).toBe('test');
        });
    });

    describe('handleDownloadError()', () => {
        beforeEach(() => {
            jest.spyOn(base, 'triggerError').mockImplementation();
            jest.spyOn(stubs.api.reachability.constructor, 'isCustomDownloadHost').mockImplementation();
            jest.spyOn(stubs.api.reachability, 'setDownloadReachability').mockImplementation();
            jest.spyOn(base, 'load').mockImplementation();
            jest.spyOn(base, 'emitMetric').mockImplementation();
        });

        test('should trigger an error if we have already retried', () => {
            base.hasRetriedContentDownload = true;
            base.handleDownloadError('error', 'https://dl.boxcloud.com');
            expect(base.triggerError).toBeCalled();
            expect(base.load).not.toBeCalled();
        });

        test('should trigger an error if the rep was deleted', () => {
            base.hasRetriedContentDownload = false;
            base.handleDownloadError(
                {
                    details: {
                        isRepDeleted: true,
                    },
                },
                'https://dl.boxcloud.com',
            );

            expect(base.triggerError).toBeCalled();
            expect(base.load).not.toBeCalled();
        });

        test('should retry load, and check download reachability if we are on a custom host', () => {
            base.hasRetriedContentDownload = false;
            stubs.api.reachability.constructor.isCustomDownloadHost.mockReturnValue(false);
            base.api = stubs.api;
            base.handleDownloadError('error', 'https://dl.boxcloud.com');
            expect(base.load).toBeCalled();
            expect(stubs.api.reachability.setDownloadReachability).not.toBeCalled();

            base.hasRetriedContentDownload = false;
            // Now try on a custom host
            stubs.api.reachability.constructor.isCustomDownloadHost.mockReturnValue(true);
            stubs.api.reachability.setDownloadReachability.mockReturnValue(Promise.resolve(true));
            base.handleDownloadError('error', 'https://dl3.boxcloud.com');
            expect(stubs.api.reachability.setDownloadReachability).toBeCalled();
        });
    });

    describe('triggerError()', () => {
        test('should emit PreviewError event', () => {
            const stub = jest.spyOn(base, 'emit').mockImplementation();

            const err = new Error('blah');
            base.triggerError(err);

            expect(base.emit).toBeCalled();
            const [event, error] = stub.mock.calls[0];
            expect(event).toBe('error');
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe('error_load_viewer');
            expect(error.message).toBe('blah');
            expect(base.emit).toBeCalledWith('error', error);
        });

        test('should emit a load viewer error if no error provided', () => {
            const stub = jest.spyOn(base, 'emit').mockImplementation();
            base.triggerError();

            expect(base.emit).toBeCalled();
            const [event, error] = stub.mock.calls[0];
            expect(event).toBe('error');
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe('error_load_viewer');
        });

        test('should pass through the error if it is a PreviewError', () => {
            const code = 'my_special_error';
            const displayMessage = 'Such a special error!';
            const message = 'Bad things have happened';
            const details = {
                what: 'what?!',
            };
            const err = new PreviewError(code, displayMessage, details, message);
            const stub = jest.spyOn(base, 'emit').mockImplementation();
            base.triggerError(err);

            expect(base.emit).toBeCalled();
            const [event, error] = stub.mock.calls[0];
            expect(event).toBe('error');
            expect(error).toBeInstanceOf(PreviewError);
            expect(error.code).toBe(code);
            expect(error.displayMessage).toBe(displayMessage);
            expect(error.details).toBe(details);
            expect(error.message).toBe(message);
        });
    });

    describe('isLoaded()', () => {
        test('should return loaded property', () => {
            expect(base.isLoaded()).toBe(base.loaded);
        });
    });

    describe('isDestroyed()', () => {
        test('should return loaded property', () => {
            expect(base.isDestroyed()).toBe(base.destroyed);
        });
    });

    describe('appendAuthParams()', () => {
        test('should return content url with auth options appended', () => {
            const token = 'TOKEN';
            const sharedLink = 'https://app.box.com/s/HASH';
            const sharedLinkPassword = 'pass';
            const url = 'url';

            base = new BaseViewer({
                token,
                sharedLink,
                sharedLinkPassword,
                container: containerEl,
                file: {
                    id: '0',
                },
            });
            jest.spyOn(util, 'appendAuthParams').mockReturnValue(url);

            const result = base.appendAuthParams('');
            expect(result).toBe(url);
            expect(util.appendAuthParams).toBeCalledWith('', token, sharedLink, sharedLinkPassword);
        });
    });

    describe('createContentUrl()', () => {
        test('should return content url with no asset path', () => {
            const url = 'url{+asset_path}';
            jest.spyOn(util, 'createContentUrl');

            const result = base.createContentUrl(url, '');
            expect(result).toBe('url');
            expect(util.createContentUrl).toBeCalledWith(url, '');
        });

        test('should return content url with asset path from args', () => {
            const url = 'url{+asset_path}';

            base = new BaseViewer({
                viewer: { ASSET: 'foo' },
                container: containerEl,
                file: {
                    id: '0',
                },
            });

            jest.spyOn(util, 'createContentUrl');
            const result = base.createContentUrl(url, 'bar');
            expect(result).toBe('urlbar');
            expect(util.createContentUrl).toBeCalledWith(url, 'bar');
        });

        test('should fallback to the default host if we have retried', () => {
            base.hasRetriedContentDownload = true;
            jest.spyOn(stubs.api.reachability.constructor, 'replaceDownloadHostWithDefault');
            jest.spyOn(util, 'createContentUrl');
            base.api = stubs.api;
            base.createContentUrl('https://dl3.boxcloud.com', '');
            expect(stubs.api.reachability.constructor.replaceDownloadHostWithDefault).toBeCalled();
        });
    });

    describe('createContentUrlWithAuthParams()', () => {
        test('should return content url with no asset path', () => {
            jest.spyOn(util, 'createContentUrl').mockReturnValue('foo');
            jest.spyOn(base, 'appendAuthParams').mockReturnValue('bar');
            const result = base.createContentUrlWithAuthParams('boo', 'hoo');
            expect(result).toBe('bar');
            expect(util.createContentUrl).toBeCalledWith('boo', 'hoo');
            expect(base.appendAuthParams).toBeCalledWith('foo');
        });
    });

    describe('appendAuthHeader()', () => {
        test('should return fetch headers', () => {
            const token = 'TOKEN';
            const sharedLink = 'https://app.box.com/s/HASH';
            const sharedLinkPassword = 'pass';
            const headers = {};

            base = new BaseViewer({
                token,
                sharedLink,
                sharedLinkPassword,
                container: containerEl,
                file: {
                    id: '0',
                },
            });
            jest.spyOn(util, 'getHeaders').mockReturnValue(headers);

            const result = base.appendAuthHeader(headers);
            expect(result).toBe(headers);
            expect(util.getHeaders).toBeCalledWith(headers, token, sharedLink, sharedLinkPassword);
        });
    });

    describe('addCommonListeners()', () => {
        beforeEach(() => {
            stubs.fullscreenAddListener = jest.spyOn(fullscreen, 'addListener');
            stubs.baseAddListener = jest.spyOn(base, 'addListener');
            stubs.documentAddEventListener = jest.spyOn(document.defaultView, 'addEventListener');
            base.containerEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
            };
        });

        test('should append common event listeners', () => {
            base.addCommonListeners();

            expect(stubs.fullscreenAddListener).toBeCalledWith('enter', expect.any(Function));
            expect(stubs.fullscreenAddListener).toBeCalledWith('exit', expect.any(Function));
            expect(stubs.documentAddEventListener).toBeCalledWith('resize', expect.any(Function));
            expect(stubs.baseAddListener).toBeCalledWith(VIEWER_EVENT.load, expect.any(Function));
        });

        test('should prevent the context menu if preview only permissions', () => {
            base.options.file.permissions = {
                can_download: false,
            };

            base.addCommonListeners();

            expect(base.containerEl.addEventListener).toBeCalledWith('contextmenu', expect.any(Function));
        });

        test('should handle annotations load', () => {
            base.addCommonListeners();
            expect(stubs.baseAddListener).toBeCalledWith(VIEWER_EVENT.load, expect.any(Function));
        });
    });

    describe('viewerLoadHandler()', () => {
        beforeEach(() => {
            base.options.representation = {
                content: {
                    url_template: 'dl.boxcloud.com',
                },
            };
            base.api = stubs.api;
            stubs.getDownloadNotificationToShow = jest
                .spyOn(stubs.api.reachability.constructor, 'getDownloadNotificationToShow')
                .mockReturnValue(undefined);
            jest.spyOn(base, 'initAnnotations');
        });

        test('should show the notification if downloads are degraded and we have not shown the notification yet', () => {
            stubs.getDownloadNotificationToShow.mockReturnValueOnce('dl3.boxcloud.com');
            jest.spyOn(stubs.api.reachability.constructor, 'setDownloadHostNotificationShown');
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.previewUI.notification.show).toBeCalled();
            expect(stubs.api.reachability.constructor.setDownloadHostNotificationShown).toBeCalled();
        });

        test('should set the scale if it exists', () => {
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.scale).toBe(1.5);
        });

        test('should show annotations if annotatorPromise does not exist', () => {
            base.annotatorPromise = null;
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.initAnnotations).not.toBeCalled();
        });
    });

    describe('toggleFullscreen()', () => {
        test('should toggle fullscreen', () => {
            jest.spyOn(fullscreen, 'toggle');
            base.toggleFullscreen();
            expect(fullscreen.toggle).toBeCalledWith(base.containerEl);
        });
    });

    describe('handleFullscreenEnter()', () => {
        beforeEach(() => {
            base.containerEl = document.querySelector('.bp-content');
        });
        test('should resize the viewer', () => {
            jest.spyOn(base, 'resize');

            base.handleFullscreenEnter();

            expect(base.resize).toBeCalled();
        });

        test('should hide annotations and toggle annotations mode', () => {
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'disableAnnotationControls');
            jest.spyOn(base, 'processAnnotationModeChange');

            base.annotationControls = {
                destroy: jest.fn(),
                resetControls: jest.fn(),
                setMode: jest.fn(),
                toggle: jest.fn(),
            };
            base.annotationModule.cache = {
                get: jest.fn().mockReturnValue('#000'),
            };
            base.annotator = {
                emit: jest.fn(),
                toggleAnnotationMode: jest.fn(),
            };

            base.handleFullscreenEnter();

            expect(base.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setVisibility, false);
            expect(base.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.NONE);
            expect(base.disableAnnotationControls).toBeCalled();
            expect(base.processAnnotationModeChange).toBeCalledWith(AnnotationMode.NONE);
        });

        test('should enable the focus trap', () => {
            jest.spyOn(FocusTrap.prototype, 'constructor');
            jest.spyOn(FocusTrap.prototype, 'enable');

            base.handleFullscreenEnter();

            expect(FocusTrap.prototype.constructor).toBeCalledWith(base.containerEl);
            expect(FocusTrap.prototype.enable).toBeCalled();
        });

        test('should reuse any existing focus trap', () => {
            jest.spyOn(FocusTrap.prototype, 'constructor');

            const mockFocusTrap = { destroy: jest.fn(), enable: jest.fn() };
            base.focusTrap = mockFocusTrap;

            base.handleFullscreenEnter();

            expect(FocusTrap.prototype.constructor).not.toBeCalledWith(base.containerEl);
            expect(mockFocusTrap.enable).toBeCalled();
        });
    });

    describe('handleFullscreenExit()', () => {
        test('should resize the viewer', () => {
            jest.spyOn(base, 'resize');

            base.handleFullscreenExit();

            expect(base.resize).toBeCalled();
        });

        test('should show annotations', () => {
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'enableAnnotationControls').mockImplementation();

            base.annotator = {
                emit: jest.fn(),
            };
            base.annotationControls = {
                destroy: jest.fn(),
                resetControls: jest.fn(),
                toggle: jest.fn(),
            };

            base.handleFullscreenExit();

            expect(base.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setVisibility, true);
            expect(base.enableAnnotationControls).toBeCalled();
        });

        test('should disable any existing focus trap', () => {
            const mockFocusTrap = { destroy: jest.fn(), disable: jest.fn() };
            base.focusTrap = mockFocusTrap;

            base.handleFullscreenExit();

            expect(mockFocusTrap.disable).toBeCalled();
        });
    });

    describe('resize()', () => {
        test('should broadcast resize event', () => {
            jest.spyOn(base, 'emit');
            base.resize();
            expect(base.emit).toBeCalledWith('resize', { height: 0, width: 0 });
        });
    });

    describe('allowNavigationArrows()', () => {
        test('should return true for base viewer', () => {
            expect(base.allowNavigationArrows()).toBe(true);
        });
    });

    describe('destroy()', () => {
        test('should clean up rep statuses', () => {
            const destroyMock = jest.fn();
            const removeListenerMock = jest.fn();

            base.repStatuses = [
                {
                    destroy: destroyMock,
                    removeListener: removeListenerMock,
                },
                {
                    destroy: destroyMock,
                    removeListener: removeListenerMock,
                },
            ];

            base.destroy();

            expect(destroyMock).toBeCalledTimes(2);
            expect(removeListenerMock).toBeCalledTimes(2);
        });

        test('should cleanup the base viewer', () => {
            jest.spyOn(base, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            base.setup();

            jest.spyOn(fullscreen, 'removeAllListeners').mockImplementation();
            jest.spyOn(base, 'removeAllListeners');
            jest.spyOn(base, 'emit');

            base.destroy();

            expect(fullscreen.removeAllListeners).toBeCalled();
            expect(base.removeAllListeners).toBeCalled();
            expect(base.containerEl.innerHTML).toBe('');
            expect(base.containerEl.classList.contains(constants.CLASS_ANNOTATIONS_DISCOVERABLE)).toBe(false);
            expect(base.containerEl.classList.contains(constants.CLASS_ANNOTATIONS_ONLY_CONTROLS)).toBe(false);
            expect(base.destroyed).toBe(true);
            expect(base.emit).toBeCalledWith('destroy');
        });

        test('should clean up the annotation controls', () => {
            base.annotationControls = {
                destroy: jest.fn(),
            };
            base.destroy();
            expect(base.annotationControls.destroy).toBeCalled();
        });

        test('should clean up annotator', () => {
            base.annotator = {
                removeAllListeners: jest.fn(),
                destroy: jest.fn(),
            };
            base.destroy();
            expect(base.annotator.removeAllListeners).toBeCalled();
            expect(base.annotator.destroy).toBeCalled();
        });

        test('should remove the context listener if its callback exists', () => {
            base.preventDefault = jest.fn();
            base.containerEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                classList: {
                    remove: jest.fn(),
                },
            };

            base.destroy();

            expect(base.containerEl.removeEventListener).toBeCalledWith('contextmenu', expect.any(Function));
        });

        test('should clean up any focus trap', () => {
            const mockFocusTrap = { destroy: jest.fn() };

            base.focusTrap = mockFocusTrap;
            base.destroy();

            expect(mockFocusTrap.destroy).toBeCalled();
        });
    });

    describe('emit()', () => {
        const emitFunc = EventEmitter.prototype.emit;

        afterEach(() => {
            Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitFunc });
        });

        test('should pass through the event as well as broadcast it as a viewer event', () => {
            const fileId = '1';
            const event = 'someEvent';
            const data = {};
            const viewerName = 'name';

            base = new BaseViewer({
                viewer: { NAME: viewerName },
                file: {
                    id: fileId,
                },
                container: containerEl,
            });

            const emitStub = jest.fn();
            Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitStub });

            base.emit(event, data);

            expect(emitStub).toBeCalledWith(event, data);
            expect(emitStub).toBeCalledWith(
                VIEWER_EVENT.default,
                expect.objectContaining({
                    event,
                    data,
                    viewerName,
                    fileId,
                }),
            );
        });
    });

    describe('Pinch to Zoom Handlers', () => {
        let event = {};

        beforeEach(() => {
            base = new BaseViewer({
                container: containerEl,
                file: {
                    id: '123',
                },
            });
            jest.spyOn(base, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(false);
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue(undefined);
            base.setup();
            event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                touches: [0, 0],
            };
            stubs.isIOS = jest.spyOn(Browser, 'isIOS');
            stubs.sqrt = jest.spyOn(Math, 'sqrt');
            base.zoomIn = jest.fn();
            base.zoomOut = jest.fn();
        });

        afterEach(() => {
            stubs = {};
            event = {};
            base._scaling = false;
            base._pincScale = undefined;
            base.destroy();
        });

        describe('mobileZoomStartHandler', () => {
            test('should turn on scaling and prevent default behavior if on iOS', () => {
                stubs.isIOS.mockReturnValue(true);

                base.mobileZoomStartHandler(event);
                expect(base._scaling).toBe(true);
                expect(event.stopPropagation).toBeCalled();
                expect(event.preventDefault).toBeCalled();
            });

            test('should store the event details if two touches are detected and not on iOS', () => {
                stubs.isIOS.mockReturnValue(false);

                base.mobileZoomStartHandler(event);
                expect(base._scaling).toBe(true);
                expect(base._pinchScale).toBeDefined();
                expect(event.stopPropagation).toBeCalled();
                expect(event.preventDefault).toBeCalled();
            });

            test('should do nothing if event did not record two touches and not on iOS', () => {
                stubs.isIOS.mockReturnValue(false);
                event.touches = [0];

                base.mobileZoomStartHandler(event);
                expect(base._scaling).toBe(false);
                expect(base._pinchScale).toBeUndefined();
                expect(event.stopPropagation).not.toBeCalled();
                expect(event.preventDefault).not.toBeCalled();
            });
        });

        describe('mobileZoomChangeHandler', () => {
            test('should update the end touch and prevent default if two touches are detected', () => {
                base.mobileZoomStartHandler(event);

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale.end).toBeDefined();
            });

            test('should not do anything if two touches are not recorded', () => {
                event.touches = [0];
                base.mobileZoomStartHandler(event);

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale).toBeUndefined();
            });

            test('should not do anything if scaling is not happening', () => {
                event.touches = [0];
                base.mobileZoomStartHandler(event);

                event.touches = [0, 0];

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale).toBeUndefined();
            });
        });

        describe('mobileZoomEndHandler', () => {
            test('should zoom in if on iOS and event scale is > 1', () => {
                event.scale = 1.5;
                stubs.isIOS.mockReturnValue(true);
                base.mobileZoomStartHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomIn).toBeCalled();
            });

            test('should zoom out if on iOS and event scale is < 1', () => {
                event.scale = 0.75;
                stubs.isIOS.mockReturnValue(true);
                base.mobileZoomStartHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomOut).toBeCalled();
            });

            test('should zoom in if not on iOS and the scale is > 0', () => {
                stubs.sqrt.mockReturnValueOnce(0).mockReturnValueOnce(0.5);
                stubs.isIOS.mockReturnValue(false);
                base.mobileZoomStartHandler(event);

                event.touches = [
                    {
                        clientX: 0,
                        clientY: 0,
                    },
                    {
                        clientX: 0,
                        clientY: 0,
                    },
                ];
                base.mobileZoomChangeHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomIn).toBeCalled();
                expect(base._scaling).toBe(false);
                expect(base._pincScale).toBeUndefined();
            });

            test('should zoom out if not on iOS and the scale is < 0', () => {
                stubs.sqrt.mockReturnValueOnce(0.5).mockReturnValueOnce(0);
                stubs.isIOS.mockReturnValue(false);
                base.mobileZoomStartHandler(event);

                event.touches = [
                    {
                        clientX: 0,
                        clientY: 0,
                    },
                    {
                        clientX: 0,
                        clientY: 0,
                    },
                ];
                base.mobileZoomChangeHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomOut).toBeCalled();
                expect(base.zoomIn).not.toBeCalled();
                expect(base._scaling).toBe(false);
                expect(base._pincScale).toBeUndefined();
            });
        });
    });

    describe('getViewerOption', () => {
        test('should return the user-defined viewer option with the specified key if it exists', () => {
            const baz = 'captain-america';
            base.options.viewers = {
                Base: {
                    fooBar: baz,
                },
            };
            base.options.viewer = { NAME: 'Base' };

            expect(base.getViewerOption('fooBar')).toBe(baz);
        });

        test('should return undefined if no matching user-defined viewer option is found', () => {
            expect(base.getViewerOption('fooBar')).toBeUndefined();
        });
    });

    describe('loadAssets()', () => {
        beforeEach(() => {
            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(() => {});
            jest.spyOn(util, 'loadStylesheets');
            jest.spyOn(util, 'loadScripts').mockResolvedValue(undefined);
            jest.spyOn(base, 'emit');
            base.options.location = {};
            base.options.viewer = {
                pauseRequireJS: true,
            };
        });

        test('should create an asset URL and load the relevant stylesheets and scripts', () => {
            base.loadAssets();

            expect(util.createAssetUrlCreator).toBeCalledWith(base.options.location);
            expect(util.loadStylesheets).toBeCalled();
            expect(util.loadScripts).toBeCalled();
        });

        test('should emit "assetsloaded" if requireJS is paused and the asset is third party', () => {
            return base.loadAssets().then(() => {
                expect(base.emit).toBeCalledWith('assetsloaded');
            });
        });

        test('should not emit "assetsloaded" if we load one of our own assets', () => {
            return base.loadAssets([], [], false).then(() => {
                expect(base.emit).not.toBeCalled();
            });
        });
    });

    describe('prefetchAssets()', () => {
        test('should create an asset URL and prefetch the relevant stylesheets and scripts', () => {
            base.options.location = {};

            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(() => {});
            jest.spyOn(util, 'prefetchAssets');

            base.prefetchAssets();
            expect(util.createAssetUrlCreator).toBeCalledWith(base.options.location);
            expect(util.prefetchAssets).toBeCalledTimes(2);
        });

        test('should create an asset URL and preload the relevant stylesheets and scripts if preload is true', () => {
            base.options.location = {};

            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(() => {});
            jest.spyOn(util, 'prefetchAssets');

            base.prefetchAssets([], [], true);
            expect(util.prefetchAssets).toBeCalledWith(expect.anything(), true);
        });
    });

    describe('getRepStatus()', () => {
        beforeEach(() => {
            base.options.representation = {
                info: {
                    url: 'someurl',
                },
            };
        });

        test('should create a new rep status, save, and return it', () => {
            const repStatus = base.getRepStatus();
            expect(base.repStatuses.find(status => status === repStatus)).toBeDefined();
            expect(repStatus).toBeInstanceOf(RepStatus);
        });

        test('should use the passed in representation', () => {
            const representation = {
                info: {
                    url: 'someOtherUrl',
                },
            };
            const repStatus = base.getRepStatus(representation);
            expect(repStatus.representation).toBe(representation);
        });
    });

    describe('getLoadStatus()', () => {
        test('should return the correct string based on load status and viewer type', () => {
            base.loaded = false;
            expect(base.getLoadStatus()).toBe('loading');

            base.loaded = true;
            base.options.viewer = {
                NAME: 'Error',
            };

            expect(base.getLoadStatus()).toBe('error');

            base.options.viewer.NAME = 'Dash';
            expect(base.getLoadStatus()).toBe('loaded');
        });
    });

    describe('isRepresentationReady()', () => {
        test('should return whether the representation has a successful status', () => {
            const representation = {
                status: {
                    state: 'success',
                },
            };
            expect(base.isRepresentationReady(representation)).toBe(true);

            representation.status.state = 'viewable';
            expect(base.isRepresentationReady(representation)).toBe(true);

            representation.status.state = 'error';
            expect(base.isRepresentationReady(representation)).toBe(false);
        });
    });

    describe('disableViewerControls()', () => {
        test('should disable viewer controls', () => {
            base.controls = {
                disable: jest.fn(),
            };
            base.disableViewerControls();
            expect(base.controls.disable).toBeCalled();
        });
    });

    describe('enableViewerControls()', () => {
        test('should enable viewer controls', () => {
            base.controls = {
                enable: jest.fn(),
            };
            base.enableViewerControls();
            expect(base.controls.enable).toBeCalled();
        });
    });

    describe('getRepresentation()', () => {
        test('should return the representation the viewer is/will use to preview', () => {
            base.options.representation = { some: 'stuff' };
            expect(base.getRepresentation()).toBe(base.options.representation);
        });
    });

    describe('getAssetPath()', () => {
        test('should return the asset path the viewer is/will use for preview representation content', () => {
            base.options.viewer = {
                ASSET: '1.jpg',
            };
            expect(base.getAssetPath()).toBe(base.options.viewer.ASSET);
        });

        test('should return empty string if viewer does not have a special asset path', () => {
            base.options.viewer = {};
            expect(base.getAssetPath()).toBe('');
        });
    });

    describe('disableAnnotationControls()', () => {
        test('should hide annotations and toggle annotations mode', () => {
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'processAnnotationModeChange');

            base.annotationControls = {
                destroy: jest.fn(),
                resetControls: jest.fn(),
                setMode: jest.fn(),
                toggle: jest.fn(),
            };
            base.annotationModule.cache = {
                get: jest.fn().mockReturnValue('#000'),
            };
            base.annotator = {
                emit: jest.fn(),
                toggleAnnotationMode: jest.fn(),
            };

            base.disableAnnotationControls();

            expect(base.annotationControls.toggle).toBeCalledWith(false);
            expect(base.processAnnotationModeChange).toBeCalledWith(AnnotationMode.NONE);
        });
    });

    describe('enableAnnotationControls()', () => {
        test('should show annotations and the controls', () => {
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);

            base.annotationControls = {
                destroy: jest.fn(),
                toggle: jest.fn(),
            };

            base.enableAnnotationControls();

            expect(base.annotationControls.toggle).toBeCalledWith(true);
        });
    });

    describe('loadBoxAnnotations()', () => {
        const conf = {
            annotationsEnabled: true,
            types: {
                point: true,
                highlight: false,
            },
        };

        beforeEach(() => {
            jest.spyOn(base, 'loadAssets').mockResolvedValue(undefined);
            window.BoxAnnotations = function BoxAnnotations() {
                this.determineAnnotator = jest.fn(() => conf);
            };
        });

        test('should resolve the promise if a BoxAnnotations instance was passed into Preview', () => {
            base.options.boxAnnotations = new window.BoxAnnotations({});

            base.loadBoxAnnotations();
            expect(base.loadAssets).not.toBeCalledWith(['annotations.js']);
        });

        test('should load the annotations assets if annotations are enabled true', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            base.loadBoxAnnotations();
            expect(base.loadAssets).toBeCalledWith(['annotations.js'], ['annotations.css'], false);
        });

        test('should not load the annotations assets if annotations are not enabled', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(false);
            base.loadBoxAnnotations();
            expect(base.loadAssets).not.toBeCalled();
        });
    });

    describe('createAnnotator()', () => {
        const annotatorMock = {};
        const annotationsOptions = {
            initialMode: AnnotationMode.NONE,
            intl: {
                language: 'en-US',
                locale: 'en-US',
                messages: { test: 'Test Message' },
            },
        };
        const conf = {
            annotationsEnabled: true,
            types: {
                point: true,
                highlight: false,
            },
            CONSTRUCTOR: jest.fn(() => annotatorMock),
        };

        beforeEach(() => {
            base.annotationModule.cache = {
                get: jest.fn().mockReturnValue('#000'),
            };
            base.options.viewer = { NAME: 'viewerName' };
            base.options.location = { locale: 'en-US' };
            base.options.showAnnotations = true;
            window.BoxAnnotations = function BoxAnnotations() {
                this.determineAnnotator = jest.fn(() => conf);
                this.getAnnotationsOptions = jest.fn(() => annotationsOptions);
            };

            jest.spyOn(base, 'initAnnotations');
            jest.spyOn(base, 'emit');
            jest.spyOn(base, 'triggerError');
        });

        test('should not create the annotator if annotations are not enabled', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(false);
            base.createAnnotator();
            expect(base.annotatorConf).toBeUndefined();
            expect(base.annotator).toBeUndefined();
        });

        test('should determine and instantiate the annotator', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            base.createAnnotator();
            expect(base.annotatorConf).toBe(conf);
            expect(base.annotator).toBe(annotatorMock);
        });

        test('should not instantiate an instance of BoxAnnotations if one is already passed in', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            base.options.boxAnnotations = {
                determineAnnotator: jest.fn(() => conf),
            };
            base.createAnnotator();
            expect(base.options.boxAnnotations.determineAnnotator).toBeCalled();
        });

        test('should call createAnnotatorOptions with locale, language, and messages from options', () => {
            const createOptionsArg = {
                ...annotationsOptions,
                features: {
                    enabledFeature: true,
                },
                initialColor: '#000',
            };
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'createAnnotatorOptions');

            base.options.boxAnnotations = {
                determineAnnotator: jest.fn().mockReturnValue(conf),
                getOptions: jest.fn().mockReturnValue(createOptionsArg),
            };

            base.createAnnotator();

            expect(base.options.boxAnnotations.getOptions).toBeCalled();
            expect(base.createAnnotatorOptions).toBeCalledWith(expect.objectContaining(createOptionsArg));
        });

        test('should use default intl lib if annotator options not present ', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);
            jest.spyOn(base, 'createAnnotatorOptions');
            jest.spyOn(intl, 'createAnnotatorIntl').mockReturnValue(annotationsOptions.intl);

            base.options.boxAnnotations = {
                determineAnnotator: jest.fn().mockReturnValue(conf),
                getOptions: jest.fn().mockReturnValue(undefined),
            };

            base.createAnnotator();

            expect(base.options.boxAnnotations.getOptions).toBeCalled();
            expect(intl.createAnnotatorIntl).toBeCalled();
            expect(base.createAnnotatorOptions).toBeCalledWith(expect.objectContaining(annotationsOptions));
        });

        test('should emit annotator_create event', () => {
            jest.spyOn(base, 'areAnnotationsEnabled').mockReturnValue(true);

            base.createAnnotator();

            expect(base.emit).toBeCalledWith('annotator_create', annotatorMock);
        });
    });

    describe('initAnnotations()', () => {
        beforeEach(() => {
            base.options = {
                container: document,
                file: {
                    file_version: {
                        id: 123,
                    },
                },
                location: {
                    locale: 'en-US',
                },
            };
            base.scale = 1.5;
            base.annotator = {
                init: jest.fn(),
                addListener: jest.fn(),
            };
            base.annotatorConf = {
                CONSTRUCTOR: jest.fn(() => base.annotator),
            };
            base.annotationControls = {
                destroy: jest.fn(),
                resetControls: jest.fn(),
            };

            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);
        });

        test('should initialize the annotator', () => {
            jest.spyOn(base, 'emit');
            base.addListener = jest.fn();
            base.initAnnotations();

            expect(base.annotator.init).toBeCalledWith(1.5);
            expect(base.addListener).toBeCalledWith('toggleannotationmode', expect.any(Function));
            expect(base.addListener).toBeCalledWith('scale', expect.any(Function));
            expect(base.addListener).toBeCalledWith('scrolltoannotation', base.handleScrollToAnnotation);
            expect(base.annotator.addListener).toBeCalledWith('annotatorevent', expect.any(Function));
        });

        test('should call the correct handler to toggle annotation modes', () => {
            base.initAnnotations();
            base.annotator.toggleAnnotationMode = jest.fn();

            base.emit('toggleannotationmode', 'mode');
            expect(base.annotator.toggleAnnotationMode).toBeCalled();
        });
    });

    describe('hasAnnotationCreatePermission()', () => {
        let permissions = {};
        beforeEach(() => {
            permissions = {
                can_create_annotations: false,
            };
        });

        test('should return false if it does not receive permissions', () => {
            expect(base.hasAnnotationCreatePermission(null)).toBe(false);
            expect(base.hasAnnotationCreatePermission(undefined)).toBe(false);
        });

        test('should return false if it receives new create permissions that are false', () => {
            expect(base.hasAnnotationCreatePermission(permissions)).toBe(false);
        });

        test('should return true if it receives new create permissions that are true', () => {
            permissions.can_create_annotations = true;
            expect(base.hasAnnotationCreatePermission(permissions)).toBe(true);
        });
    });

    describe('hasAnnotationViewPermission()', () => {
        let permissions = {};
        beforeEach(() => {
            permissions = {
                can_view_annotations: false,
            };
        });

        test('should return false if it does not receive permissions', () => {
            expect(base.hasAnnotationViewPermission(null)).toBe(false);
            expect(base.hasAnnotationViewPermission(undefined)).toBe(false);
        });

        test('should return false if it receives new view permissions that are false', () => {
            expect(base.hasAnnotationViewPermission(permissions)).toBe(false);
        });

        test('should return true if it receives new view permissions that are true', () => {
            permissions.can_view_annotations = true;
            expect(base.hasAnnotationViewPermission(permissions)).toBe(true);
        });
    });

    describe('hasAnnotationPermissions()', () => {
        const permissions = {
            can_annotate: false, // Old
            can_create_annotations: false, // New
            can_view_annotations: false, // New
            can_view_annotations_all: false, // Old
            can_view_annotations_self: false, // Old
        };

        test('does nothing if file permissions are undefined', () => {
            expect(base.hasAnnotationPermissions()).toBe(false);
        });

        test('should return false if the user can neither annotate nor view all or their own annotations', () => {
            expect(base.hasAnnotationPermissions(permissions)).toBe(false);
        });

        test('should return true if the user can at least create annotations', () => {
            permissions.can_create_annotations = true;
            expect(base.hasAnnotationPermissions(permissions)).toBe(true);
        });

        test('should return true if the user can at least view annotations', () => {
            permissions.can_view_annotations = true;
            expect(base.hasAnnotationPermissions(permissions)).toBe(true);
        });
    });

    describe('handleScrollToAnnotation', () => {
        test('should call the annotators scrollToAnnotation method if object provided', () => {
            const scrollToAnnotationStub = jest.fn();

            base.annotator = {
                addListener: jest.fn(),
                init: jest.fn(),
                scrollToAnnotation: scrollToAnnotationStub,
            };

            base.handleScrollToAnnotation({ id: '123' });

            expect(scrollToAnnotationStub).toBeCalledWith('123');
        });

        test('should call the annotators scrollToAnnotation if string provided', () => {
            const scrollToAnnotationStub = jest.fn();

            base.annotator = {
                addListener: jest.fn(),
                init: jest.fn(),
                scrollToAnnotation: scrollToAnnotationStub,
            };

            base.handleScrollToAnnotation('123');

            expect(scrollToAnnotationStub).toBeCalledWith('123');
        });
    });

    describe('handleAnnotationsInitialized()', () => {
        let scrollToAnnotationStub;

        beforeEach(() => {
            scrollToAnnotationStub = jest.fn();

            base.annotator = {
                init: jest.fn(),
                scrollToAnnotation: scrollToAnnotationStub,
            };
        });

        test('should not call handleScrollToAnnotation if there is not an active annotation', () => {
            base.options.fileOptions = {
                '0': {
                    annotations: {},
                },
            };

            base.handleAnnotationsInitialized({ annotations: [{ id: '123' }] });

            expect(scrollToAnnotationStub).not.toBeCalled();
        });
        test('should call scroll to annotation if active annotation is set', () => {
            base.options.fileOptions = {
                '0': {
                    annotations: {
                        activeId: 'ABC',
                    },
                },
            };

            base.handleAnnotationsInitialized({ annotations: [{ id: 'ABC' }] });

            expect(scrollToAnnotationStub).toBeCalledWith('ABC');
        });
    });

    describe('areAnnotationsEnabled()', () => {
        beforeEach(() => {
            stubs.getViewerOption = jest.spyOn(base, 'getViewerOption').mockReturnValue(false);
            stubs.hasPermissions = jest.spyOn(base, 'hasAnnotationPermissions').mockReturnValue(true);

            base.options.file = {
                permissions: {
                    can_annotate: true,
                },
            };
        });

        test('should return false if the user cannot create/view annotations', () => {
            stubs.hasPermissions.mockReturnValue(false);
            expect(base.areAnnotationsEnabled()).toBe(false);
        });

        test('should return false if new annotations is not enabled', () => {
            base.options.showAnnotationsControls = true;
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(false);

            expect(base.areAnnotationsEnabled()).toBe(false);
        });

        test('should return true if viewer option is set to true', () => {
            expect(base.areAnnotationsEnabled()).toBe(false);

            stubs.getViewerOption.mockReturnValue(true);
            expect(base.areAnnotationsEnabled()).toBe(true);
        });

        test('should use the global showAnnotations boolean if the viewer param is not specified', () => {
            stubs.getViewerOption.mockReturnValue(null);
            base.options.showAnnotations = true;
            expect(base.areAnnotationsEnabled()).toBe(true);

            base.options.showAnnotations = false;
            expect(base.areAnnotationsEnabled()).toBe(false);
        });

        test('should use BoxAnnotations options if an instance of BoxAnnotations is passed into Preview', () => {
            window.BoxAnnotations = function BoxAnnotations() {
                this.determineAnnotator = jest.fn();
                this.getAnnotationsOptions = jest.fn();
            };

            stubs.getViewerOption.mockReturnValue(null);
            base.options.showAnnotations = false;
            base.options.boxAnnotations = undefined;
            expect(base.areAnnotationsEnabled()).toBe(false);

            base.options.viewer = { NAME: 'viewerName' };
            base.options.boxAnnotations = new window.BoxAnnotations();
            const { boxAnnotations } = base.options;

            // No enabled annotators in options
            boxAnnotations.options = { nope: 'wrong options type' };
            boxAnnotations.viewerOptions = undefined;
            expect(base.areAnnotationsEnabled()).toBe(false);

            // All default types enabled
            boxAnnotations.viewerOptions = {
                viewerName: { enabled: true },
            };
            expect(base.areAnnotationsEnabled()).toBe(true);

            // No specified enabled types
            boxAnnotations.viewerOptions = {
                viewerName: { enabledTypes: [] },
            };
            expect(base.areAnnotationsEnabled()).toBe(false);

            // Specified types enabled
            boxAnnotations.viewerOptions = {
                viewerName: { enabledTypes: ['point'] },
            };
            expect(base.areAnnotationsEnabled()).toBe(true);

            // No passed in version of BoxAnnotations
            window.BoxAnnotations = undefined;
            expect(base.areAnnotationsEnabled()).toBe(false);
        });
    });

    describe('areNewAnnotationsEnabled()', () => {
        beforeEach(() => {
            stubs.hasCreatePermissions = jest.spyOn(base, 'hasAnnotationCreatePermission').mockReturnValue(true);
            stubs.hasViewPermissions = jest.spyOn(base, 'hasAnnotationViewPermission').mockReturnValue(true);
        });

        test('should return false if the user cannot create/view annotations', () => {
            stubs.hasCreatePermissions.mockReturnValue(false);
            stubs.hasViewPermissions.mockReturnValue(false);
            expect(base.areNewAnnotationsEnabled()).toBe(false);
        });

        EXCLUDED_EXTENSIONS.forEach(extension => {
            test(`should return false if the file is ${extension} format`, () => {
                base.options.file.extension = extension;
                base.options.showAnnotationsControls = true;
                expect(base.areNewAnnotationsEnabled()).toBe(false);
            });
        });

        test('should return showAnnotationsControls if file is not excel nor iWork formats', () => {
            base.options.file.extension = 'pdf';
            base.options.showAnnotationsControls = true;
            expect(base.areNewAnnotationsEnabled()).toBe(true);

            base.options.showAnnotationsControls = false;
            expect(base.areNewAnnotationsEnabled()).toBe(false);
        });
    });

    describe('getViewerAnnotationsConfig()', () => {
        test('should return an empty object if none options available', () => {
            jest.spyOn(base, 'getViewerOption').mockReturnValue(undefined);
            const config = base.getViewerAnnotationsConfig();
            expect(config).toEqual({});
        });

        test('should create an object with an "enabled" flag if using legacy boolean value', () => {
            jest.spyOn(base, 'getViewerOption').mockReturnValue(false);
            const config = base.getViewerAnnotationsConfig();
            expect(config).toEqual({ enabled: false });
        });

        test('should pass through the annotations object if an object', () => {
            const annConfig = {
                enabled: true,
                disabledTypes: ['drawing'],
            };
            jest.spyOn(base, 'getViewerOption').mockReturnValue(annConfig);
            const config = base.getViewerAnnotationsConfig();
            expect(config).toEqual(annConfig);
        });
    });

    describe('handleAnnotatorEvents()', () => {
        const ANNOTATION_TYPE_DRAW = 'draw';
        const ANNOTATION_TYPE_POINT = 'point';

        beforeEach(() => {
            jest.spyOn(base, 'emit');
            base.annotator = {
                isInAnnotationMode: jest.fn(),
            };
            jest.spyOn(base, 'disableViewerControls');
            jest.spyOn(base, 'enableViewerControls');
        });

        test('should disable controls and show point mode notification on annotationmodeenter', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data: { mode: ANNOTATION_TYPE_POINT },
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).toBeCalled();
            expect(base.previewUI.notification.show).toBeCalled();
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should disable controls and enter drawing anontation mode with notification', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                    headerSelector: '.bp-header',
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).toBeCalled();
            expect(base.previewUI.notification.show).toBeCalled();
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should enable controls and hide notification on annotationmodeexit', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).toBeCalled();
            expect(base.previewUI.notification.hide).toBeCalled();
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should enable controls and exit draw annotation mode', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).toBeCalled();
            expect(base.previewUI.notification.hide).toBeCalled();
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should show a notification on annotationerror', () => {
            const data = {
                event: ANNOTATOR_EVENT.error,
                data: 'message',
            };
            base.handleAnnotatorEvents(data);
            expect(base.previewUI.notification.show).toBeCalled();
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should scale annotations on annotationsfetched', () => {
            base.scale = 1;
            base.rotationAngle = 90;
            const data = {
                event: ANNOTATOR_EVENT.fetch,
            };
            base.handleAnnotatorEvents(data);
            expect(base.emit).toBeCalledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle,
            });
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });

        test('should only emit annotatorevent when event does not match', () => {
            const data = {
                event: 'no match',
                data: 'message',
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).not.toBeCalled();
            expect(base.enableViewerControls).not.toBeCalled();
            expect(base.emit).not.toBeCalledWith(VIEWER_EVENT.notificationShow, data.data);
            expect(base.emit).not.toBeCalledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle,
            });
            expect(base.emit).toBeCalledWith(data.event, data.data);
            expect(base.emit).toBeCalledWith('annotatorevent', data);
        });
    });

    describe('createAnnotatorOptions()', () => {
        test('should return combined options to give to the annotator', () => {
            base.options = {
                file: { id: 1 },
                location: { locale: 'en-US' },
            };
            base.isMobile = true;
            base.hasTouch = false;

            const combinedOptions = base.createAnnotatorOptions({ randomOption: 'derp' });
            expect(combinedOptions.file).toEqual({ id: 1 });
            expect(combinedOptions.isMobile).toBe(true);
            expect(combinedOptions.hasTouch).toBe(false);
            expect(combinedOptions.locale).toBe('en-US');
            expect(combinedOptions.location).toEqual({ locale: 'en-US' });
            expect(combinedOptions.randomOption).toBe('derp');
            expect(combinedOptions.localizedStrings).toBeDefined();
        });
    });

    describe('handleAssetAndRepLoad()', () => {
        test('should load annotations and create the annotator', done => {
            jest.spyOn(base, 'loadBoxAnnotations').mockResolvedValue();
            jest.spyOn(base, 'createAnnotator').mockImplementation(() => {
                expect(base.loadBoxAnnotations).toBeCalled();
                expect(base.createAnnotator).toBeCalled();
                done();
            });

            base.handleAssetAndRepLoad();
        });
    });

    describe('createViewer()', () => {
        test('should return null if no element is provided', () => {
            expect(base.createViewer()).toBeNull();
        });

        test('should append the element if containerEl has no first child', () => {
            base.containerEl = document.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTENT);
            const newDiv = document.createElement('div');
            jest.spyOn(base.containerEl, 'appendChild');
            base.createViewer(newDiv);
            expect(base.containerEl.appendChild).toBeCalled();
        });

        test('should insert the provided element before the other children', () => {
            base.containerEl = document.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTENT);
            const existingChild = document.createElement('div');
            existingChild.className = 'existing-child';
            base.containerEl.appendChild(existingChild);

            jest.spyOn(base.containerEl, 'insertBefore');
            const newDiv = document.createElement('div');
            newDiv.className = 'new-div';
            base.createViewer(newDiv);
            expect(base.containerEl.insertBefore).toBeCalled();
        });
    });

    describe('emitMetric()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(EventEmitter.prototype, 'emit');
            stubs.getMetricsWhitelist = jest.spyOn(base, 'getMetricsWhitelist');
        });

        test('should update the emittedMetrics object when called the first time', () => {
            base.emittedMetrics = {};
            stubs.getMetricsWhitelist.mockReturnValue([]);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).toBe(true);
            expect(stubs.emit).toBeCalled();
        });

        test('should be emitted even if not the first time and not whitelisted', () => {
            base.emittedMetrics = { foo: true };
            stubs.getMetricsWhitelist.mockReturnValue([]);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).toBe(true);
            expect(stubs.emit).toBeCalled();
        });

        test('should not do anything if it has been emitted before and is whitelisted', () => {
            base.emittedMetrics = { foo: true };
            stubs.getMetricsWhitelist.mockReturnValue(['foo']);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).toBe(true);
            expect(stubs.emit).not.toBeCalled();
        });
    });

    describe('handleAnnotationControlsEscape()', () => {
        test('should call toggleAnnotationMode with AnnotationMode.NONE', () => {
            base.annotator = {
                toggleAnnotationMode: jest.fn(),
            };

            base.handleAnnotationControlsEscape();

            expect(base.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.NONE);
        });
    });

    describe('processAnnotationModeChange()', () => {
        beforeEach(() => {
            base.annotationControls = {
                destroy: jest.fn(),
                setMode: jest.fn(),
            };
            base.annotationModule.cache = {
                get: jest.fn().mockReturnValue('#000'),
            };
            base.annotator = {
                emit: jest.fn(),
            };
            base.containerEl = document.createElement('div');
            base.areNewAnnotationsEnabled = jest.fn().mockReturnValue(true);
        });

        test('should do nothing if new annotations are not enabled', () => {
            jest.spyOn(base.containerEl.classList, 'add');
            jest.spyOn(base.containerEl.classList, 'remove');

            base.areNewAnnotationsEnabled.mockReturnValue(false);
            base.processAnnotationModeChange(AnnotationMode.REGION);

            expect(base.containerEl.classList.add).not.toBeCalled();
            expect(base.containerEl.classList.remove).not.toBeCalled();
        });

        test('should call annotationControls setMode', () => {
            base.processAnnotationModeChange(AnnotationMode.REGION);

            expect(base.annotationControls.setMode).toBeCalledWith(AnnotationMode.REGION);
        });

        [
            [AnnotationMode.DRAWING, constants.CLASS_ANNOTATIONS_CREATE_DRAWING],
            [AnnotationMode.REGION, constants.CLASS_ANNOTATIONS_CREATE_REGION],
            [AnnotationMode.HIGHLIGHT, constants.CLASS_ANNOTATIONS_CREATE_HIGHLIGHT],
        ].forEach(([mode, className]) => {
            test(`should add the appropriate create class when mode is ${mode}`, () => {
                base.processAnnotationModeChange(mode);

                expect(base.containerEl).toHaveClass(className);
            });
        });

        [AnnotationMode.NONE, AnnotationMode.HIGHLIGHT, AnnotationMode.DRAWING].forEach(mode => {
            test(`should remove create region class if discoverability is enabled and mode is ${mode}`, () => {
                base.options.enableAnnotationsDiscoverability = true;
                base.processAnnotationModeChange(mode);

                expect(base.containerEl).not.toHaveClass(constants.CLASS_ANNOTATIONS_CREATE_REGION);
            });
        });

        test('should call emit', () => {
            jest.spyOn(base, 'areNewAnnotationsEnabled').mockReturnValue(true);

            base.processAnnotationModeChange(AnnotationMode.DRAWING);

            expect(base.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setColor, '#000');
        });
    });

    describe('getInitialAnnotationMode()', () => {
        test('should return none as initial mode', () => {
            expect(base.getInitialAnnotationMode()).toBe(AnnotationMode.NONE);
        });
    });
});
