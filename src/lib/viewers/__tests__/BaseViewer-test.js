/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import RepStatus from '../../RepStatus';
import PreviewError from '../../PreviewError';
import fullscreen from '../../Fullscreen';
import intl from '../../i18n';
import * as util from '../../util';
import * as icons from '../../icons/icons';
import * as constants from '../../constants';
import { AnnotationInput } from '../../AnnotationControlsFSM';
import { AnnotationMode } from '../../AnnotationControls';
import { EXCLUDED_EXTENSIONS } from '../../extensions';
import { VIEWER_EVENT, LOAD_METRIC, ERROR_CODE } from '../../events';
import Timer from '../../Timer';
import Api from '../../api';

let base;
let containerEl;
let stubs = {};
const sandbox = sinon.sandbox.create();
const { ANNOTATOR_EVENT, CLASS_ANNOTATIONS_CREATE_REGION, CLASS_ANNOTATIONS_DISCOVERABLE } = constants;

describe('lib/viewers/BaseViewer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/__tests__/BaseViewer-test.html');

        containerEl = document.querySelector('.bp-container');
        stubs.browser = sandbox.stub(Browser, 'isMobile').returns(false);
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
            replaceHeader: sandbox.stub(),
            notification: {
                show: sandbox.stub(),
                hide: sandbox.stub(),
            },
        };
    });

    afterEach(() => {
        if (base && typeof base.destroy === 'function' && !base.destroyed) {
            base.destroy();
        }

        sandbox.verifyAndRestore();
    });

    describe('setup()', () => {
        it('should set options, a container, bind event listeners, and set timeout', () => {
            const getIconFromExtensionStub = sandbox.stub(icons, 'getIconFromExtension');
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'finishLoadingSetup');
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            base.options.showAnnotations = true;
            base.options.enableAnnotationsDiscoverability = true;

            base.setup();

            expect(base.options).to.deep.equal({
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
            });

            expect(base.containerEl).to.have.class(constants.CLASS_BOX_PREVIEW_CONTENT);
            expect(base.containerEl).to.have.class(CLASS_ANNOTATIONS_DISCOVERABLE);
            expect(base.addCommonListeners).to.be.called;
            expect(getIconFromExtensionStub).to.be.called;
            expect(base.loadTimeout).to.be.a('number');
            expect(base.annotatorPromise).to.not.be.undefined;
            expect(base.annotatorPromiseResolver).to.not.be.undefined;
        });

        it('should add a mobile class to the container if on mobile', () => {
            base.isMobile = true;
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);

            base.setup();

            const container = document.querySelector(constants.SELECTOR_BOX_PREVIEW);
            expect(container).to.have.class('bp-is-mobile');
        });

        it('should not load annotations assets if global preview showAnnotations option is false', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(false);
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.showAnnotations = false;

            base.setup();

            expect(base.loadBoxAnnotations).to.not.be.called;
        });

        it('should not load annotations assets if expiring embed is a shared link', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.sharedLink = 'url';

            base.setup();

            expect(base.loadBoxAnnotations).to.not.be.called;
        });
    });

    describe('finishLoadingSetup()', () => {
        it('should hide the crawler and set the file icon into the icon element', () => {
            const container = {
                classList: {
                    add: sandbox.stub(),
                },
                innerHTML: '',
                removeEventListener: sandbox.stub(),
            };
            base.fileLoadingIcon = 'icon';

            sandbox.stub(containerEl, 'querySelector').returns(container);

            base.finishLoadingSetup();
            expect(container.innerHTML).to.equal('icon');
            expect(container.classList.add).to.be.called;
            base.options.container = null;
        });
    });

    describe('getResizeHandler()', () => {
        it('should return a resize handler', () => {
            expect(base.getResizeHandler()).to.be.a('function');
        });
    });

    describe('load()', () => {
        it('should call resetLoadTimeout', () => {
            sandbox.stub(base, 'resetLoadTimeout');

            base.load();
            expect(base.resetLoadTimeout).to.be.called;
        });
    });

    describe('resetLoadTimeout()', () => {
        it('should clear timeout and set a new timeout handler', () => {
            sandbox.stub(window, 'clearTimeout');
            sandbox.spy(window, 'setTimeout');

            base.resetLoadTimeout();
            base.loaded = true;

            expect(window.clearTimeout).to.be.called;
            expect(window.setTimeout).to.be.called;
            expect(base.loadTimeoutId).to.be.a('number');

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });

        it('should trigger an error if the viewer times out', () => {
            const triggerStub = sandbox.stub(base, 'triggerError');
            sandbox.stub(window, 'setTimeout').callsFake(func => func());

            base.loaded = false;
            base.destroyed = false;

            base.resetLoadTimeout();
            const [error] = triggerStub.getCall(0).args;
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal(ERROR_CODE.VIEWER_LOAD_TIMEOUT);

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });
    });

    describe('startLoadTimer()', () => {
        it('should start a timer for the contentLoadTime metric', () => {
            base.options.file.id = '1234';
            base.startLoadTimer();

            const tag = Timer.createTag(base.options.file.id, LOAD_METRIC.contentLoadTime);
            expect(Timer.get(tag)).to.exist;
        });
    });

    describe('handleAssetError()', () => {
        it('should trigger error and set destroyed to true', () => {
            sandbox.stub(base, 'triggerError');
            base.handleAssetError(new Error('test'));
            expect(base.triggerError).to.be.called;
            expect(base.destroyed).to.be.true;
        });

        it('should use the original error if it is a PreviewError', () => {
            sandbox.stub(base, 'triggerError');
            const originalError = new PreviewError('foo', 'bar');
            base.handleAssetError(originalError);
            expect(base.triggerError).to.be.calledWith(originalError);
        });

        it('should pass along the error if provided', () => {
            const stub = sandbox.stub(base, 'triggerError');

            base.handleAssetError(new Error('test'));

            const error = stub.getCall(0).args[0];
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal('error_load_asset');
            expect(error.message).to.equal('test');
        });
    });

    describe('handleDownloadError()', () => {
        beforeEach(() => {
            sandbox.stub(base, 'triggerError');
            sandbox.stub(stubs.api.reachability.constructor, 'isCustomDownloadHost');
            sandbox.stub(stubs.api.reachability, 'setDownloadReachability');
            sandbox.stub(base, 'load');
            sandbox.stub(base, 'emitMetric');
        });

        it('should trigger an error if we have already retried', () => {
            base.hasRetriedContentDownload = true;
            base.handleDownloadError('error', 'https://dl.boxcloud.com');
            expect(base.triggerError).to.be.called;
            expect(base.load).to.not.be.called;
        });

        it('should trigger an error if the rep was deleted', () => {
            base.hasRetriedContentDownload = false;
            base.handleDownloadError(
                {
                    details: {
                        isRepDeleted: true,
                    },
                },
                'https://dl.boxcloud.com',
            );

            expect(base.triggerError).to.be.called;
            expect(base.load).to.not.be.called;
        });

        it('should retry load, and check download reachability if we are on a custom host', () => {
            base.hasRetriedContentDownload = false;
            stubs.api.reachability.constructor.isCustomDownloadHost.returns(false);
            base.api = stubs.api;
            base.handleDownloadError('error', 'https://dl.boxcloud.com');
            expect(base.load).to.be.called;
            expect(stubs.api.reachability.setDownloadReachability).to.be.not.called;

            base.hasRetriedContentDownload = false;
            // Now try on a custom host
            stubs.api.reachability.constructor.isCustomDownloadHost.returns(true);
            stubs.api.reachability.setDownloadReachability.returns(Promise.resolve(true));
            base.handleDownloadError('error', 'https://dl3.boxcloud.com');
            expect(stubs.api.reachability.setDownloadReachability).to.be.called;
        });
    });

    describe('triggerError()', () => {
        it('should emit PreviewError event', () => {
            const stub = sandbox.stub(base, 'emit');

            const err = new Error('blah');
            base.triggerError(err);

            expect(base.emit).to.be.called;
            const [event, error] = stub.getCall(0).args;
            expect(event).to.equal('error');
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal('error_load_viewer');
            expect(error.message).to.equal('blah');
            expect(base.emit).to.be.calledWith('error', error);
        });

        it('should emit a load viewer error if no error provided', () => {
            const stub = sandbox.stub(base, 'emit');
            base.triggerError();

            expect(base.emit).to.be.called;
            const [event, error] = stub.getCall(0).args;
            expect(event).to.equal('error');
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal('error_load_viewer');
        });

        it('should pass through the error if it is a PreviewError', () => {
            const code = 'my_special_error';
            const displayMessage = 'Such a special error!';
            const message = 'Bad things have happened';
            const details = {
                what: 'what?!',
            };
            const err = new PreviewError(code, displayMessage, details, message);
            const stub = sandbox.stub(base, 'emit');
            base.triggerError(err);

            expect(base.emit).to.be.called;
            const [event, error] = stub.getCall(0).args;
            expect(event).to.equal('error');
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal(code);
            expect(error.displayMessage).to.equal(displayMessage);
            expect(error.details).to.equal(details);
            expect(error.message).to.equal(message);
        });
    });

    describe('isLoaded()', () => {
        it('should return loaded property', () => {
            expect(base.isLoaded()).to.equal(base.loaded);
        });
    });

    describe('isDestroyed()', () => {
        it('should return loaded property', () => {
            expect(base.isDestroyed()).to.equal(base.destroyed);
        });
    });

    describe('appendAuthParams()', () => {
        it('should return content url with auth options appended', () => {
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
            sandbox.stub(util, 'appendAuthParams').returns(url);

            const result = base.appendAuthParams('');
            expect(result).to.equal(url);
            expect(util.appendAuthParams).to.be.calledWith('', token, sharedLink, sharedLinkPassword);
        });
    });

    describe('createContentUrl()', () => {
        it('should return content url with no asset path', () => {
            const url = 'url{+asset_path}';
            sandbox.spy(util, 'createContentUrl');

            const result = base.createContentUrl(url, '');
            expect(result).to.equal('url');
            expect(util.createContentUrl).to.be.calledWith(url, '');
        });

        it('should return content url with asset path from args', () => {
            const url = 'url{+asset_path}';

            base = new BaseViewer({
                viewer: { ASSET: 'foo' },
                container: containerEl,
                file: {
                    id: '0',
                },
            });

            sandbox.spy(util, 'createContentUrl');
            const result = base.createContentUrl(url, 'bar');
            expect(result).to.equal('urlbar');
            expect(util.createContentUrl).to.be.calledWith(url, 'bar');
        });

        it('should fallback to the default host if we have retried', () => {
            base.hasRetriedContentDownload = true;
            sandbox.stub(stubs.api.reachability.constructor, 'replaceDownloadHostWithDefault');
            sandbox.stub(util, 'createContentUrl');
            base.api = stubs.api;
            base.createContentUrl('https://dl3.boxcloud.com', '');
            expect(stubs.api.reachability.constructor.replaceDownloadHostWithDefault).to.be.called;
        });
    });

    describe('createContentUrlWithAuthParams()', () => {
        it('should return content url with no asset path', () => {
            sandbox.stub(util, 'createContentUrl').returns('foo');
            sandbox.stub(base, 'appendAuthParams').returns('bar');
            const result = base.createContentUrlWithAuthParams('boo', 'hoo');
            expect(result).to.equal('bar');
            expect(util.createContentUrl).to.be.calledWith('boo', 'hoo');
            expect(base.appendAuthParams).to.be.calledWith('foo');
        });
    });

    describe('appendAuthHeader()', () => {
        it('should return fetch headers', () => {
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
            sandbox.stub(util, 'getHeaders').returns(headers);

            const result = base.appendAuthHeader(headers);
            expect(result).to.equal(headers);
            expect(util.getHeaders).to.be.calledWith(headers, token, sharedLink, sharedLinkPassword);
        });
    });

    describe('addCommonListeners()', () => {
        beforeEach(() => {
            stubs.fullscreenAddListener = sandbox.stub(fullscreen, 'addListener');
            stubs.baseAddListener = sandbox.spy(base, 'addListener');
            stubs.documentAddEventListener = sandbox.stub(document.defaultView, 'addEventListener');
            base.containerEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub(),
                classList: {
                    remove: sandbox.stub(),
                },
            };
        });

        it('should append common event listeners', () => {
            base.addCommonListeners();

            expect(stubs.fullscreenAddListener).to.be.calledWith('enter', sinon.match.func);
            expect(stubs.fullscreenAddListener).to.be.calledWith('exit', sinon.match.func);
            expect(stubs.documentAddEventListener).to.be.calledWith('resize', sinon.match.func);
            expect(stubs.baseAddListener).to.be.calledWith(VIEWER_EVENT.load, sinon.match.func);
        });

        it('should prevent the context menu if preview only permissions', () => {
            base.options.file.permissions = {
                can_download: false,
            };

            base.addCommonListeners();

            expect(base.containerEl.addEventListener).to.be.calledWith('contextmenu', sinon.match.func);
        });

        it('should handle annotations load', () => {
            base.addCommonListeners();
            expect(stubs.baseAddListener).to.be.calledWith(VIEWER_EVENT.load, sinon.match.func);
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
            stubs.getDownloadNotificationToShow = sandbox
                .stub(stubs.api.reachability.constructor, 'getDownloadNotificationToShow')
                .returns(undefined);
            sandbox.stub(base, 'initAnnotations');
        });

        it('should show the notification if downloads are degraded and we have not shown the notification yet', () => {
            stubs.getDownloadNotificationToShow.returns('dl3.boxcloud.com');
            sandbox.stub(stubs.api.reachability.constructor, 'setDownloadHostNotificationShown');
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.previewUI.notification.show).to.be.called;
            expect(stubs.api.reachability.constructor.setDownloadHostNotificationShown).to.be.called;
        });

        it('should set the scale if it exists', () => {
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.scale).to.equal(1.5);
        });

        it('should show annotations if annotatorPromise exists', done => {
            base.annotatorPromise = new Promise(resolve => {
                resolve();
                done();
            });
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.initAnnotations).to.be.called;
        });

        it('should show annotations if annotatorPromise does not exist', () => {
            base.annotatorPromise = null;
            base.viewerLoadHandler({ scale: 1.5 });
            expect(base.initAnnotations).to.not.be.called;
        });
    });

    describe('toggleFullscreen()', () => {
        it('should toggle fullscreen', () => {
            sandbox.stub(fullscreen, 'toggle');
            base.toggleFullscreen();
            expect(fullscreen.toggle).to.be.calledWith(base.containerEl);
        });
    });

    describe('handleFullscreenEnter()', () => {
        it('should resize the viewer', () => {
            sandbox.stub(base, 'resize');

            base.handleFullscreenEnter();

            expect(base.resize).to.be.called;
        });

        it('should hide annotations and toggle annotations mode', () => {
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'disableAnnotationControls');
            base.annotator = {
                emit: sandbox.mock(),
                toggleAnnotationMode: sandbox.mock(),
            };
            base.annotationControls = {
                destroy: sandbox.mock(),
            };

            base.handleFullscreenEnter();

            expect(base.annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.setVisibility, false);
            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.NONE);
            expect(base.disableAnnotationControls).to.be.called;
        });
    });

    describe('handleFullscreenExit()', () => {
        it('should resize the viewer', () => {
            sandbox.stub(base, 'resize');

            base.handleFullscreenExit();

            expect(base.resize).to.be.called;
        });

        it('should show annotations', () => {
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'enableAnnotationControls');
            base.annotator = {
                emit: sandbox.mock(),
            };
            base.annotationControls = {
                destroy: sandbox.mock(),
            };

            base.handleFullscreenExit();

            expect(base.annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.setVisibility, true);
            expect(base.enableAnnotationControls).to.be.called;
        });

        it(`should show annotations and toggle annotations mode to REGION if enableAnnotationsDiscoverability is true`, () => {
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'enableAnnotationControls');
            base.annotator = {
                emit: sandbox.mock(),
                toggleAnnotationMode: sandbox.mock(),
            };
            base.annotationControls = {
                destroy: sandbox.mock(),
            };
            base.options.enableAnnotationsDiscoverability = true;

            base.handleFullscreenExit();

            expect(base.annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.setVisibility, true);
            expect(base.enableAnnotationControls).to.be.called;
            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.REGION);
        });
    });

    describe('resize()', () => {
        it('should broadcast resize event', () => {
            sandbox.stub(base, 'emit');
            base.resize();
            expect(base.emit).to.be.calledWith('resize');
        });
    });

    describe('allowNavigationArrows()', () => {
        it('should return true for base viewer', () => {
            expect(base.allowNavigationArrows()).to.be.true;
        });
    });

    describe('destroy()', () => {
        it('should clean up rep statuses', () => {
            const destroyMock = sandbox.mock().twice();
            const removeListenerMock = sandbox.mock().twice();
            base.repStatuses = [
                {
                    removeListener: removeListenerMock,
                    destroy: destroyMock,
                },
                {
                    removeListener: removeListenerMock,
                    destroy: destroyMock,
                },
            ];

            base.destroy();
        });

        it('should cleanup the base viewer', () => {
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
            base.setup();

            sandbox.mock(fullscreen).expects('removeAllListeners');
            sandbox.stub(base, 'removeAllListeners');
            sandbox.stub(base, 'emit');

            base.destroy();

            expect(base.removeAllListeners).to.be.called;
            expect(base.containerEl.innerHTML).to.equal('');
            expect(base.containerEl).to.not.have.class(CLASS_ANNOTATIONS_DISCOVERABLE);
            expect(base.destroyed).to.be.true;
            expect(base.emit).to.be.calledWith('destroy');
        });

        it('should clean up the annotation controls', () => {
            base.annotationControls = {
                destroy: sandbox.stub(),
            };
            base.destroy();
            expect(base.annotationControls.destroy).to.be.called;
        });

        it('should clean up annotator', () => {
            base.annotator = {
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub(),
            };
            base.destroy();
            expect(base.annotator.removeAllListeners).to.be.called;
            expect(base.annotator.destroy).to.be.called;
        });

        it('should remove the context listener if its callback exists', () => {
            base.preventDefault = sandbox.stub();
            base.containerEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub(),
                classList: {
                    remove: sandbox.stub(),
                },
            };

            base.destroy();

            expect(base.containerEl.removeEventListener).to.be.calledWith('contextmenu', sinon.match.func);
        });
    });

    describe('emit()', () => {
        const emitFunc = EventEmitter.prototype.emit;

        afterEach(() => {
            Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitFunc });
        });

        it('should pass through the event as well as broadcast it as a viewer event', () => {
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

            const emitStub = sandbox.stub();
            Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitStub });

            base.emit(event, data);

            expect(emitStub).to.be.calledWith(event, data);
            expect(emitStub).to.be.calledWithMatch(VIEWER_EVENT.default, {
                event,
                data,
                viewerName,
                fileId,
            });
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
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'areAnnotationsEnabled').returns(false);
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
            base.setup();
            event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub(),
                touches: [0, 0],
            };
            stubs.isIOS = sandbox.stub(Browser, 'isIOS');
            stubs.sqrt = sandbox.stub(Math, 'sqrt');
            base.zoomIn = sandbox.stub();
            base.zoomOut = sandbox.stub();
        });

        afterEach(() => {
            stubs = {};
            event = {};
            base._scaling = false;
            base._pincScale = undefined;
            base.destroy();
        });

        describe('mobileZoomStartHandler', () => {
            it('should turn on scaling and prevent default behavior if on iOS', () => {
                stubs.isIOS.returns(true);

                base.mobileZoomStartHandler(event);
                expect(base._scaling).to.be.true;
                expect(event.stopPropagation).to.be.called;
                expect(event.preventDefault).to.be.called;
            });

            it('should store the event details if two touches are detected and not on iOS', () => {
                stubs.isIOS.returns(false);

                base.mobileZoomStartHandler(event);
                expect(base._scaling).to.be.true;
                expect(base._pinchScale).to.not.equal(undefined);
                expect(event.stopPropagation).to.be.called;
                expect(event.preventDefault).to.be.called;
            });

            it('should do nothing if event did not record two touches and not on iOS', () => {
                stubs.isIOS.returns(false);
                event.touches = [0];

                base.mobileZoomStartHandler(event);
                expect(base._scaling).to.be.false;
                expect(base._pinchScale).to.equal(undefined);
                expect(event.stopPropagation).to.not.be.called;
                expect(event.preventDefault).to.not.be.called;
            });
        });

        describe('mobileZoomChangeHandler', () => {
            it('should update the end touch and prevent default if two touches are detected', () => {
                base.mobileZoomStartHandler(event);

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale.end).to.not.equal(undefined);
            });

            it('should not do anything if two touches are not recorded', () => {
                event.touches = [0];
                base.mobileZoomStartHandler(event);

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale).to.equal(undefined);
            });

            it('should not do anything if scaling is not happening', () => {
                event.touches = [0];
                base.mobileZoomStartHandler(event);

                event.touches = [0, 0];

                base.mobileZoomChangeHandler(event);
                expect(base._pinchScale).to.equal(undefined);
            });
        });

        describe('mobileZoomEndHandler', () => {
            it('should zoom in if on iOS and event scale is > 1', () => {
                event.scale = 1.5;
                stubs.isIOS.returns(true);
                base.mobileZoomStartHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomIn).to.be.called;
            });

            it('should zoom out if on iOS and event scale is < 1', () => {
                event.scale = 0.75;
                stubs.isIOS.returns(true);
                base.mobileZoomStartHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomOut).to.be.called;
            });

            it('should zoom in if not on iOS and the scale is > 0', () => {
                stubs.sqrt
                    .onCall(0)
                    .returns(0)
                    .onCall(1)
                    .returns(0.5);
                stubs.isIOS.returns(false);
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
                expect(base.zoomIn).to.be.called;
                expect(base._scaling).to.be.false;
                expect(base._pincScale).to.equal(undefined);
            });

            it('should zoom out if not on iOS and the scale is < 0', () => {
                stubs.sqrt
                    .onCall(0)
                    .returns(0.5)
                    .onCall(1)
                    .returns(0);
                stubs.isIOS.returns(false);
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
                expect(base.zoomOut).to.be.called;
                expect(base.zoomIn).to.not.be.called;
                expect(base._scaling).to.be.false;
                expect(base._pincScale).to.equal(undefined);
            });
        });
    });

    describe('getViewerOption', () => {
        it('should return the user-defined viewer option with the specified key if it exists', () => {
            const baz = 'captain-america';
            base.options.viewers = {
                Base: {
                    fooBar: baz,
                },
            };
            base.options.viewer = { NAME: 'Base' };

            expect(base.getViewerOption('fooBar')).to.equal(baz);
        });

        it('should return undefined if no matching user-defined viewer option is found', () => {
            expect(base.getViewerOption('fooBar')).to.equal(undefined);
        });
    });

    describe('loadAssets()', () => {
        beforeEach(() => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'loadStylesheets');
            sandbox.stub(util, 'loadScripts').returns(Promise.resolve());
            sandbox.stub(base, 'emit');
            base.options.location = {};
            base.options.viewer = {
                pauseRequireJS: true,
            };
        });

        it('should create an asset URL and load the relevant stylesheets and scripts', () => {
            base.loadAssets();

            expect(util.createAssetUrlCreator).to.be.calledWith(base.options.location);
            expect(util.loadStylesheets).to.be.called;
            expect(util.loadScripts).to.be.called;
        });

        it('should emit "assetsloaded" if requireJS is paused and the asset is third party', () => {
            return base.loadAssets().then(() => {
                expect(base.emit).to.be.calledWith('assetsloaded');
            });
        });

        it('should not emit "assetsloaded" if we load one of our own assets', () => {
            return base.loadAssets([], [], false).then(() => {
                expect(base.emit).to.not.be.called;
            });
        });
    });

    describe('prefetchAssets()', () => {
        it('should create an asset URL and prefetch the relevant stylesheets and scripts', () => {
            base.options.location = {};

            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'prefetchAssets');

            base.prefetchAssets();
            expect(util.createAssetUrlCreator).to.be.calledWith(base.options.location);
            expect(util.prefetchAssets).to.be.calledTwice;
        });

        it('should create an asset URL and preload the relevant stylesheets and scripts if preload is true', () => {
            base.options.location = {};

            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'prefetchAssets');

            base.prefetchAssets([], [], true);
            expect(util.prefetchAssets).to.be.calledWith(sinon.match.any, true);
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

        it('should create a new rep status, save, and return it', () => {
            const repStatus = base.getRepStatus();
            expect(base.repStatuses.find(status => status === repStatus)).to.not.be.undefined;
            expect(repStatus).to.be.instanceof(RepStatus);
        });

        it('should use the passed in representation', () => {
            const representation = {
                info: {
                    url: 'someOtherUrl',
                },
            };
            const repStatus = base.getRepStatus(representation);
            expect(repStatus.representation).to.equal(representation);
        });
    });

    describe('getLoadStatus()', () => {
        it('should return the correct string based on load status and viewer type', () => {
            base.loaded = false;
            expect(base.getLoadStatus()).to.equal('loading');

            base.loaded = true;
            base.options.viewer = {
                NAME: 'Error',
            };

            expect(base.getLoadStatus()).to.equal('error');

            base.options.viewer.NAME = 'Dash';
            expect(base.getLoadStatus()).to.equal('loaded');
        });
    });

    describe('isRepresentationReady()', () => {
        it('should return whether the representation has a successful status', () => {
            const representation = {
                status: {
                    state: 'success',
                },
            };
            expect(base.isRepresentationReady(representation)).to.be.true;

            representation.status.state = 'viewable';
            expect(base.isRepresentationReady(representation)).to.be.true;

            representation.status.state = 'error';
            expect(base.isRepresentationReady(representation)).to.be.false;
        });
    });

    describe('disableViewerControls()', () => {
        it('should disable viewer controls', () => {
            base.controls = {
                disable: sandbox.stub(),
            };
            base.disableViewerControls();
            expect(base.controls.disable).to.be.called;
        });
    });

    describe('enableViewerControls()', () => {
        it('should enable viewer controls', () => {
            base.controls = {
                enable: sandbox.stub(),
            };
            base.enableViewerControls();
            expect(base.controls.enable).to.be.called;
        });
    });

    describe('getRepresentation()', () => {
        it('should return the representation the viewer is/will use to preview', () => {
            base.options.representation = { some: 'stuff' };
            expect(base.getRepresentation()).to.equal(base.options.representation);
        });
    });

    describe('getAssetPath()', () => {
        it('should return the asset path the viewer is/will use for preview representation content', () => {
            base.options.viewer = {
                ASSET: '1.jpg',
            };
            expect(base.getAssetPath()).to.equal(base.options.viewer.ASSET);
        });

        it('should return empty string if viewer does not have a special asset path', () => {
            base.options.viewer = {};
            expect(base.getAssetPath()).to.equal('');
        });
    });

    describe('disableAnnotationControls()', () => {
        it('should hide annotations and toggle annotations mode', () => {
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
            base.annotator = {
                toggleAnnotationMode: sandbox.stub(),
            };
            base.annotationControls = {
                destroy: sandbox.stub(),
                resetControls: sandbox.stub(),
                toggle: sandbox.stub(),
            };

            base.disableAnnotationControls();

            expect(base.annotationControls.resetControls).to.be.called;
            expect(base.annotationControls.toggle).to.be.calledWith(false);
        });
    });

    describe('enableAnnotationControls()', () => {
        it('should show annotations and the controls', () => {
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
            base.annotationControls = {
                destroy: sandbox.stub(),
                toggle: sandbox.stub(),
            };

            base.enableAnnotationControls();

            expect(base.annotationControls.toggle).to.be.calledWith(true);
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
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            window.BoxAnnotations = function BoxAnnotations() {
                this.determineAnnotator = sandbox.stub().returns(conf);
            };
        });

        it('should resolve the promise if a BoxAnnotations instance was passed into Preview', () => {
            base.options.boxAnnotations = new window.BoxAnnotations({});

            base.loadBoxAnnotations();
            expect(base.loadAssets).to.not.be.calledWith(['annotations.js']);
        });

        it('should load the annotations assets if annotations are enabled true', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            base.loadBoxAnnotations();
            expect(base.loadAssets).to.be.calledWith(['annotations.js'], ['annotations.css'], false);
        });

        it('should not load the annotations assets if annotations are not enabled', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(false);
            base.loadBoxAnnotations();
            expect(base.loadAssets).to.not.be.called;
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
            CONSTRUCTOR: sandbox.stub().returns(annotatorMock),
        };

        beforeEach(() => {
            base.options.viewer = { NAME: 'viewerName' };
            base.options.location = { locale: 'en-US' };
            base.options.showAnnotations = true;
            window.BoxAnnotations = function BoxAnnotations() {
                this.determineAnnotator = sandbox.stub().returns(conf);
                this.getAnnotationsOptions = sandbox.stub().returns(annotationsOptions);
            };

            sandbox.stub(base, 'initAnnotations');
            sandbox.stub(base, 'emit');
            sandbox.stub(base, 'triggerError');
        });

        it('should not create the annotator if annotations are not enabled', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(false);
            base.createAnnotator();
            expect(base.annotatorConf).to.be.undefined;
            expect(base.annotator).to.be.undefined;
        });

        it('should determine and instantiate the annotator', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            base.createAnnotator();
            expect(base.annotatorConf).to.equal(conf);
            expect(base.annotator).to.equal(annotatorMock);
        });

        it('should not instantiate an instance of BoxAnnotations if one is already passed in', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            base.options.boxAnnotations = {
                determineAnnotator: sandbox.stub().returns(conf),
            };
            base.createAnnotator();
            expect(base.options.boxAnnotations.determineAnnotator).to.be.called;
        });

        it('should call createAnnotatorOptions with locale, language, and messages from options', () => {
            const createOptionsArg = {
                ...annotationsOptions,
                features: {
                    enabledFeature: true,
                },
            };
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'createAnnotatorOptions');

            base.options.boxAnnotations = {
                determineAnnotator: sandbox.stub().returns(conf),
                getOptions: sandbox.stub().returns(createOptionsArg),
            };

            base.createAnnotator();

            expect(base.options.boxAnnotations.getOptions).to.be.called;
            expect(base.createAnnotatorOptions).to.be.calledWith(sinon.match(createOptionsArg));
        });

        it('should use default intl lib if annotator options not present ', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'createAnnotatorOptions');
            sandbox.stub(intl, 'createAnnotatorIntl').returns(annotationsOptions.intl);

            base.options.boxAnnotations = {
                determineAnnotator: sandbox.stub().returns(conf),
                getOptions: sandbox.stub().returns(undefined),
            };

            base.createAnnotator();

            expect(base.options.boxAnnotations.getOptions).to.be.called;
            expect(intl.createAnnotatorIntl).to.be.called;
            expect(base.createAnnotatorOptions).to.be.calledWith(sinon.match(annotationsOptions));
        });

        it('should create annotator with initial mode region if discoverability is enabled', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'createAnnotatorOptions');

            base.options.boxAnnotations = {
                determineAnnotator: sandbox.stub().returns(conf),
            };
            base.options.enableAnnotationsDiscoverability = true;

            base.createAnnotator();

            expect(base.createAnnotatorOptions).to.be.calledWith(sinon.match({ initialMode: AnnotationMode.REGION }));
        });

        it('should emit annotator_create event', () => {
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);

            base.createAnnotator();

            expect(base.emit).to.be.calledWith('annotator_create', annotatorMock);
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
                init: sandbox.stub(),
                addListener: sandbox.stub(),
            };
            base.annotatorConf = {
                CONSTRUCTOR: sandbox.stub().returns(base.annotator),
            };
            base.annotationControls = {
                destroy: sandbox.stub(),
                resetControls: sandbox.stub(),
            };
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(true);
        });

        it('should initialize the annotator', () => {
            sandbox.stub(base, 'emit');
            base.addListener = sandbox.stub();
            base.initAnnotations();

            expect(base.annotator.init).to.be.calledWith(1.5);
            expect(base.addListener).to.be.calledWith('toggleannotationmode', sinon.match.func);
            expect(base.addListener).to.be.calledWith('scale', sinon.match.func);
            expect(base.addListener).to.be.calledWith('scrolltoannotation', base.handleScrollToAnnotation);
            expect(base.annotator.addListener).to.be.calledWith('annotatorevent', sinon.match.func);
            expect(base.annotator.addListener).to.be.calledWith('annotations_create', base.handleAnnotationCreateEvent);
            expect(base.annotator.addListener).to.be.calledWith(
                'annotations_initialized',
                base.handleAnnotationsInitialized,
            );
            expect(base.annotator.addListener).to.be.calledWith(
                'creator_staged_change',
                base.handleAnnotationCreatorChangeEvent,
            );
            expect(base.annotator.addListener).to.be.calledWith(
                'creator_status_change',
                base.handleAnnotationCreatorChangeEvent,
            );
            expect(base.emit).to.be.calledWith('annotator', base.annotator);
        });

        it('should call the correct handler to toggle annotation modes', () => {
            base.initAnnotations();
            base.annotator.toggleAnnotationMode = sandbox.stub();

            base.emit('toggleannotationmode', 'mode');
            expect(base.annotator.toggleAnnotationMode).to.be.called;
        });
    });

    describe('hasAnnotationCreatePermission()', () => {
        let permissions = {};
        beforeEach(() => {
            permissions = {
                can_create_annotations: false,
            };
        });

        it('should return false if it does not receive permissions', () => {
            expect(base.hasAnnotationCreatePermission(null)).to.be.false;
            expect(base.hasAnnotationCreatePermission(undefined)).to.be.false;
        });

        it('should return false if it receives new create permissions that are false', () => {
            expect(base.hasAnnotationCreatePermission(permissions)).to.be.false;
        });

        it('should return true if it receives new create permissions that are true', () => {
            permissions.can_create_annotations = true;
            expect(base.hasAnnotationCreatePermission(permissions)).to.be.true;
        });
    });

    describe('hasAnnotationViewPermission()', () => {
        let permissions = {};
        beforeEach(() => {
            permissions = {
                can_view_annotations: false,
            };
        });

        it('should return false if it does not receive permissions', () => {
            expect(base.hasAnnotationViewPermission(null)).to.be.false;
            expect(base.hasAnnotationViewPermission(undefined)).to.be.false;
        });

        it('should return false if it receives new view permissions that are false', () => {
            expect(base.hasAnnotationViewPermission(permissions)).to.be.false;
        });

        it('should return true if it receives new view permissions that are true', () => {
            permissions.can_view_annotations = true;
            expect(base.hasAnnotationViewPermission(permissions)).to.be.true;
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

        it('does nothing if file permissions are undefined', () => {
            expect(base.hasAnnotationPermissions()).to.be.false;
        });

        it('should return false if the user can neither annotate nor view all or their own annotations', () => {
            expect(base.hasAnnotationPermissions(permissions)).to.be.false;
        });

        it('should return true if the user can at least create annotations', () => {
            permissions.can_create_annotations = true;
            expect(base.hasAnnotationPermissions(permissions)).to.be.true;
        });

        it('should return true if the user can at least view annotations', () => {
            permissions.can_view_annotations = true;
            expect(base.hasAnnotationPermissions(permissions)).to.be.true;
        });

        it('should return true if the user can at least view all annotations', () => {
            permissions.can_view_annotations_all = true;
            expect(base.hasAnnotationPermissions(permissions)).to.be.true;
        });

        it('should return true if the user can at least view their own annotations', () => {
            permissions.can_view_annotations_all = false;
            permissions.can_view_annotations_self = true;
            expect(base.hasAnnotationPermissions(permissions)).to.be.true;
        });
    });

    describe('handleScrollToAnnotation', () => {
        it('should call the annotators scrollToAnnotation method if object provided', () => {
            const scrollToAnnotationStub = sandbox.stub();

            base.annotator = {
                addListener: sandbox.stub(),
                init: sandbox.stub(),
                scrollToAnnotation: scrollToAnnotationStub,
            };

            base.handleScrollToAnnotation({ id: '123' });

            expect(scrollToAnnotationStub).to.be.calledWith('123');
        });

        it('should call the annotators scrollToAnnotation if string provided', () => {
            const scrollToAnnotationStub = sandbox.stub();

            base.annotator = {
                addListener: sandbox.stub(),
                init: sandbox.stub(),
                scrollToAnnotation: scrollToAnnotationStub,
            };

            base.handleScrollToAnnotation('123');

            expect(scrollToAnnotationStub).to.be.calledWith('123');
        });
    });

    describe('handleAnnotationsInitialized()', () => {
        let scrollToAnnotationStub;

        beforeEach(() => {
            scrollToAnnotationStub = sandbox.stub();

            base.annotator = {
                init: sandbox.stub(),
                scrollToAnnotation: scrollToAnnotationStub,
            };
        });

        it('should not call handleScrollToAnnotation if there is not an active annotation', () => {
            base.options.fileOptions = {
                '0': {
                    annotations: {},
                },
            };

            base.handleAnnotationsInitialized({ annotations: [{ id: '123' }] });

            expect(scrollToAnnotationStub).not.to.be.called;
        });
        it('should call scroll to annotation if active annotation is set', () => {
            base.options.fileOptions = {
                '0': {
                    annotations: {
                        activeId: 'ABC',
                    },
                },
            };

            base.handleAnnotationsInitialized({ annotations: [{ id: 'ABC' }] });

            expect(scrollToAnnotationStub).to.be.calledWith('ABC');
        });
    });

    describe('areAnnotationsEnabled()', () => {
        beforeEach(() => {
            stubs.getViewerOption = sandbox
                .stub(base, 'getViewerOption')
                .withArgs('annotations')
                .returns(false);
            stubs.hasPermissions = sandbox.stub(base, 'hasAnnotationPermissions').returns(true);
            base.options.file = {
                permissions: {
                    can_annotate: true,
                },
            };
        });

        it('should return false if the user cannot create/view annotations', () => {
            stubs.hasPermissions.returns(false);
            expect(base.areAnnotationsEnabled()).to.be.false;
        });

        it('should return false if new annotations is not enabled', () => {
            base.options.showAnnotationsControls = true;
            sandbox.stub(base, 'areNewAnnotationsEnabled').returns(false);

            expect(base.areAnnotationsEnabled()).to.be.false;
        });

        it('should return true if viewer option is set to true', () => {
            expect(base.areAnnotationsEnabled()).to.be.false;

            stubs.getViewerOption.returns(true);
            expect(base.areAnnotationsEnabled()).to.be.true;
        });

        it('should use the global showAnnotations boolean if the viewer param is not specified', () => {
            stubs.getViewerOption.withArgs('annotations').returns(null);
            base.options.showAnnotations = true;
            expect(base.areAnnotationsEnabled()).to.be.true;

            base.options.showAnnotations = false;
            expect(base.areAnnotationsEnabled()).to.be.false;
        });

        it('should use BoxAnnotations options if an instance of BoxAnnotations is passed into Preview', () => {
            stubs.getViewerOption.withArgs('annotations').returns(null);
            base.options.showAnnotations = false;
            base.options.boxAnnotations = undefined;
            expect(base.areAnnotationsEnabled()).to.be.false;

            base.options.viewer = { NAME: 'viewerName' };
            base.options.boxAnnotations = sinon.createStubInstance(window.BoxAnnotations);
            const { boxAnnotations } = base.options;

            // No enabled annotators in options
            boxAnnotations.options = { nope: 'wrong options type' };
            boxAnnotations.viewerOptions = undefined;
            expect(base.areAnnotationsEnabled()).to.be.false;

            // All default types enabled
            boxAnnotations.viewerOptions = {
                viewerName: { enabled: true },
            };
            expect(base.areAnnotationsEnabled()).to.be.true;

            // No specified enabled types
            boxAnnotations.viewerOptions = {
                viewerName: { enabledTypes: [] },
            };
            expect(base.areAnnotationsEnabled()).to.be.false;

            // Specified types enabled
            boxAnnotations.viewerOptions = {
                viewerName: { enabledTypes: ['point'] },
            };
            expect(base.areAnnotationsEnabled()).to.be.true;

            // No passed in version of BoxAnnotations
            window.BoxAnnotations = undefined;
            expect(base.areAnnotationsEnabled()).to.be.false;
        });
    });

    describe('areNewAnnotationsEnabled()', () => {
        beforeEach(() => {
            stubs.hasCreatePermissions = sandbox.stub(base, 'hasAnnotationCreatePermission').returns(true);
            stubs.hasViewPermissions = sandbox.stub(base, 'hasAnnotationViewPermission').returns(true);
        });

        it('should return false if the user cannot create/view annotations', () => {
            stubs.hasCreatePermissions.returns(false);
            stubs.hasViewPermissions.returns(false);
            expect(base.areNewAnnotationsEnabled()).to.be.false;
        });

        EXCLUDED_EXTENSIONS.forEach(extension => {
            it(`should return false if the file is ${extension} format`, () => {
                base.options.file.extension = extension;
                base.options.showAnnotationsControls = true;
                expect(base.areNewAnnotationsEnabled()).to.be.false;
            });
        });

        it('should return showAnnotationsControls if file is not excel nor iWork formats', () => {
            base.options.file.extension = 'pdf';
            base.options.showAnnotationsControls = true;
            expect(base.areNewAnnotationsEnabled()).to.be.true;

            base.options.showAnnotationsControls = false;
            expect(base.areNewAnnotationsEnabled()).to.be.false;
        });
    });

    describe('getViewerAnnotationsConfig()', () => {
        it('should return an empty object if none options available', () => {
            sandbox.stub(base, 'getViewerOption').returns(undefined);
            const config = base.getViewerAnnotationsConfig();
            expect(config).to.deep.equal({});
        });

        it('should create an object with an "enabled" flag if using legacy boolean value', () => {
            sandbox.stub(base, 'getViewerOption').returns(false);
            const config = base.getViewerAnnotationsConfig();
            expect(config).to.deep.equal({ enabled: false });
        });

        it('should pass through the annotations object if an object', () => {
            const annConfig = {
                enabled: true,
                disabledTypes: ['drawing'],
            };
            sandbox.stub(base, 'getViewerOption').returns(annConfig);
            const config = base.getViewerAnnotationsConfig();
            expect(config).to.deep.equal(annConfig);
        });
    });

    describe('handleAnnotatorEvents()', () => {
        const ANNOTATION_TYPE_DRAW = 'draw';
        const ANNOTATION_TYPE_POINT = 'point';

        beforeEach(() => {
            sandbox.stub(base, 'emit');
            base.annotator = {
                isInAnnotationMode: sandbox.stub(),
            };
            sandbox.stub(base, 'disableViewerControls');
            sandbox.stub(base, 'enableViewerControls');
        });

        it('should disable controls and show point mode notification on annotationmodeenter', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data: { mode: ANNOTATION_TYPE_POINT },
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.be.called;
            expect(base.previewUI.notification.show).to.be.called;
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should disable controls and enter drawing anontation mode with notification', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                    headerSelector: '.bp-header',
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.be.called;
            expect(base.previewUI.notification.show).to.be.called;
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should enable controls and hide notification on annotationmodeexit', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).to.be.called;
            expect(base.previewUI.notification.hide).to.be.called;
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should enable controls and exit draw annotation mode', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW,
                },
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).to.be.called;
            expect(base.previewUI.notification.hide).to.be.called;
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should show a notification on annotationerror', () => {
            const data = {
                event: ANNOTATOR_EVENT.error,
                data: 'message',
            };
            base.handleAnnotatorEvents(data);
            expect(base.previewUI.notification.show).to.be.called;
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should scale annotations on annotationsfetched', () => {
            base.scale = 1;
            base.rotationAngle = 90;
            const data = {
                event: ANNOTATOR_EVENT.fetch,
            };
            base.handleAnnotatorEvents(data);
            expect(base.emit).to.be.calledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle,
            });
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should only emit annotatorevent when event does not match', () => {
            const data = {
                event: 'no match',
                data: 'message',
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.not.be.called;
            expect(base.enableViewerControls).to.not.be.called;
            expect(base.emit).to.not.be.calledWith(VIEWER_EVENT.notificationShow, data.data);
            expect(base.emit).to.not.be.calledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle,
            });
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });
    });

    describe('createAnnotatorOptions()', () => {
        it('should return combined options to give to the annotator', () => {
            base.options = {
                file: { id: 1 },
                location: { locale: 'en-US' },
            };
            base.isMobile = true;
            base.hasTouch = false;

            const combinedOptions = base.createAnnotatorOptions({ randomOption: 'derp' });
            expect(combinedOptions.file).to.deep.equal({ id: 1 });
            expect(combinedOptions.isMobile).to.be.true;
            expect(combinedOptions.hasTouch).to.be.false;
            expect(combinedOptions.locale).to.equal('en-US');
            expect(combinedOptions.location).to.deep.equal({ locale: 'en-US' });
            expect(combinedOptions.randomOption).to.equal('derp');
            expect(combinedOptions.localizedStrings).to.not.be.undefined;
        });
    });

    describe('handleAssetAndRepLoad()', () => {
        it('should load annotations and create the annotator', done => {
            sandbox.stub(base, 'loadBoxAnnotations').returns(Promise.resolve());
            sandbox.stub(base, 'createAnnotator').returns(
                new Promise(resolve => {
                    resolve();
                    done();
                }),
            );

            base.handleAssetAndRepLoad();

            expect(base.loadBoxAnnotations).to.be.called;
            expect(base.createAnnotator).to.be.called;
        });
    });

    describe('createViewer()', () => {
        it('should return null if no element is provided', () => {
            expect(base.createViewer()).to.be.null;
        });

        it('should append the element if containerEl has no first child', () => {
            base.containerEl = document.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTENT);
            const newDiv = document.createElement('div');
            sandbox.stub(base.containerEl, 'appendChild');
            base.createViewer(newDiv);
            expect(base.containerEl.appendChild).to.be.called;
        });

        it('should insert the provided element before the other children', () => {
            base.containerEl = document.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTENT);
            const existingChild = document.createElement('div');
            existingChild.className = 'existing-child';
            base.containerEl.appendChild(existingChild);

            sandbox.stub(base.containerEl, 'insertBefore');
            const newDiv = document.createElement('div');
            newDiv.className = 'new-div';
            base.createViewer(newDiv);
            expect(base.containerEl.insertBefore).to.be.called;
        });
    });

    describe('emitMetric()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(EventEmitter.prototype, 'emit');
            stubs.getMetricsWhitelist = sandbox.stub(base, 'getMetricsWhitelist');
        });

        it('should update the emittedMetrics object when called the first time', () => {
            base.emittedMetrics = {};
            stubs.getMetricsWhitelist.returns([]);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).to.be.true;
            expect(stubs.emit).to.be.called;
        });

        it('should be emitted even if not the first time and not whitelisted', () => {
            base.emittedMetrics = { foo: true };
            stubs.getMetricsWhitelist.returns([]);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).to.be.true;
            expect(stubs.emit).to.be.called;
        });

        it('should not do anything if it has been emitted before and is whitelisted', () => {
            base.emittedMetrics = { foo: true };
            stubs.getMetricsWhitelist.returns(['foo']);

            base.emitMetric('foo', 'bar');

            expect(base.emittedMetrics.foo).to.be.true;
            expect(stubs.emit).not.to.be.called;
        });
    });

    describe('handleAnnotationCreateEvent()', () => {
        beforeEach(() => {
            base.annotator = {
                emit: sandbox.stub(),
            };
            base.annotationControls = {
                destroy: sandbox.stub(),
                setMode: sandbox.stub(),
            };
            base.processAnnotationModeChange = sandbox.stub();
        });

        const createEvent = status => ({
            annotation: { id: '123' },
            meta: {
                status,
            },
        });

        ['error', 'pending'].forEach(status => {
            it(`should not do anything if status is ${status}`, () => {
                const event = createEvent(status);
                base.handleAnnotationCreateEvent(event);

                expect(base.annotator.emit).not.to.be.called;
            });
        });

        it('should reset controls if status is success', () => {
            const event = createEvent('success');
            base.handleAnnotationCreateEvent(event);

            expect(base.annotator.emit).to.be.calledWith('annotations_active_set', '123');
            expect(base.processAnnotationModeChange).to.be.calledWith(AnnotationMode.NONE);
        });
    });

    describe('handleAnnotationCreatorChangeEvent()', () => {
        it('should set mode', () => {
            base.annotationControls = {
                destroy: sandbox.stub(),
                setMode: sandbox.stub(),
            };
            base.processAnnotationModeChange = sandbox.stub();
            base.handleAnnotationCreatorChangeEvent({ status: AnnotationInput.CREATE, type: AnnotationMode.HIGHLIGHT });

            expect(base.processAnnotationModeChange).to.be.calledWith(AnnotationMode.HIGHLIGHT);
        });
    });

    describe('handleAnnotationControlsEscape()', () => {
        it('should call toggleAnnotationMode', () => {
            base.annotator = {
                toggleAnnotationMode: sandbox.stub(),
            };

            base.handleAnnotationControlsEscape();

            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.NONE);
        });
    });

    describe('handleAnnotationControlsClick', () => {
        beforeEach(() => {
            base.annotator = {
                toggleAnnotationMode: sandbox.stub(),
            };
            base.processAnnotationModeChange = sandbox.stub();
        });

        it('should call toggleAnnotationMode and processAnnotationModeChange', () => {
            base.handleAnnotationControlsClick({ mode: AnnotationMode.REGION });

            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.REGION);
            expect(base.processAnnotationModeChange).to.be.calledWith(AnnotationMode.REGION);
        });

        it('should call toggleAnnotationMode with appropriate mode if discoverability is enabled', () => {
            base.options.enableAnnotationsDiscoverability = false;
            base.handleAnnotationControlsClick({ mode: AnnotationMode.NONE });
            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.NONE);

            base.options.enableAnnotationsDiscoverability = true;
            base.handleAnnotationControlsClick({ mode: AnnotationMode.NONE });
            expect(base.annotator.toggleAnnotationMode).to.be.calledWith(AnnotationMode.REGION);
        });
    });

    describe('processAnnotationModeChange()', () => {
        beforeEach(() => {
            base.annotationControls = {
                destroy: sandbox.stub(),
                setMode: sandbox.stub(),
            };
            base.containerEl = document.createElement('div');
        });

        it('should do nothing if no annotationControls', () => {
            base.annotationControls = undefined;
            sandbox.spy(base.containerEl.classList, 'add');
            sandbox.spy(base.containerEl.classList, 'remove');
            base.processAnnotationModeChange(AnnotationMode.REGION);

            expect(base.containerEl.classList.add).to.not.be.called;
            expect(base.containerEl.classList.remove).to.not.be.called;
        });

        it('should call annotationControls setMode', () => {
            base.processAnnotationModeChange(AnnotationMode.REGION);

            expect(base.annotationControls.setMode).to.be.calledWith(AnnotationMode.REGION);
        });

        it('should add create region class if discoverability is enabled and mode is REGION', () => {
            base.options.enableAnnotationsDiscoverability = true;
            base.processAnnotationModeChange(AnnotationMode.REGION);

            expect(base.containerEl).to.have.class(CLASS_ANNOTATIONS_CREATE_REGION);
        });

        [AnnotationMode.NONE, AnnotationMode.HIGHLIGHT].forEach(mode => {
            it(`should remove create region class if discoverability is enabled and mode is ${mode}`, () => {
                base.options.enableAnnotationsDiscoverability = true;
                base.processAnnotationModeChange(mode);

                expect(base.containerEl).to.not.have.class(CLASS_ANNOTATIONS_CREATE_REGION);
            });
        });
    });
});
