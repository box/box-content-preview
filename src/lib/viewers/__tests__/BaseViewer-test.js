/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import RepStatus from '../../RepStatus';
import fullscreen from '../../Fullscreen';
import * as util from '../../util';
import * as file from '../../file';
import * as icons from '../../icons/icons';
import * as constants from '../../constants';

let base;
let containerEl;
let stubs = {};
const sandbox = sinon.sandbox.create();
const ANNOTATOR_EVENT = {
    modeEnter: 'annotationmodeenter',
    modeExit: 'annotationmodeexit',
    fetch: 'annotationsfetched',
    error: 'annotationerror',
    scale: 'scaleannotations'
};

describe('lib/viewers/BaseViewer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/__tests__/BaseViewer-test.html');

        containerEl = document.querySelector('.bp-container');
        stubs.browser = sandbox.stub(Browser, 'isMobile').returns(false);
        base = new BaseViewer({
            container: containerEl,
            file: {
                id: '0'
            }
        });
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
            sandbox.stub(base, 'loadAnnotator');
            base.options.showAnnotations = true;

            base.setup();

            expect(base.options).to.deep.equal({
                container: containerEl,
                file: {
                    id: '0'
                },
                showAnnotations: true
            });

            expect(base.containerEl).to.have.class('bp');
            expect(base.addCommonListeners).to.be.called;
            expect(getIconFromExtensionStub).to.be.called;
            expect(base.loadTimeout).to.be.a.number;
            expect(base.loadAnnotator).to.be.called;
        });

        it('should add a mobile class to the container if on mobile', () => {
            base.isMobile = true;
            sandbox.stub(base, 'loadAnnotator');
            sandbox.stub(base, 'finishLoadingSetup');

            base.setup();

            const container = document.querySelector('.bp');
            expect(container).to.have.class('bp-is-mobile');
        });

        it('should not load annotations assets if global preview showAnnotations option is false', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(false);
            sandbox.stub(base, 'loadAnnotator');
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.showAnnotations = false;

            base.setup();

            expect(base.loadAnnotator).to.not.be.called;
        });

        it('should not load annotations assets if expiring embed is a shared link', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
            sandbox.stub(base, 'loadAnnotator');
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.sharedLink = 'url';

            base.setup();

            expect(base.loadAnnotator).to.not.be.called;
        });
    });

    describe('finishLoadingSetup()', () => {
        it('should hide the crawler and set the file icon into the icon element', () => {
            const container = {
                classList: {
                    add: sandbox.stub()
                },
                innerHTML: '',
                removeEventListener: sandbox.stub()
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
            expect(base.getResizeHandler()).to.be.a.function;
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
            expect(base.loadTimeoutId).to.be.a.number;

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });
    });

    describe('handleAssetError()', () => {
        it('should trigger error and set destroyed to true', () => {
            sandbox.stub(base, 'triggerError');
            base.handleAssetError();
            expect(base.triggerError).to.be.called;
            expect(base.destroyed).to.be.true;
        });

        it('should pass along the error if provided', () => {
            sandbox.stub(base, 'triggerError');
            base.handleAssetError('error');
            expect(base.triggerError).to.be.calledWith('error');
        });
    });

    describe('triggerError()', () => {
        it('should emit error event', () => {
            sandbox.stub(base, 'emit');

            const err = new Error('blah');
            base.triggerError(err);

            expect(base.emit).to.be.calledWith('error', err);
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
                    id: '0'
                }
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
                    id: '0'
                }
            });

            sandbox.spy(util, 'createContentUrl');
            const result = base.createContentUrl(url, 'bar');
            expect(result).to.equal('urlbar');
            expect(util.createContentUrl).to.be.calledWith(url, 'bar');
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
                    id: '0'
                }
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
        });

        it('should append common event listeners', () => {
            base.addCommonListeners();

            expect(stubs.fullscreenAddListener).to.be.calledWith('enter', sinon.match.func);
            expect(stubs.fullscreenAddListener).to.be.calledWith('exit', sinon.match.func);
            expect(stubs.documentAddEventListener).to.be.calledWith('resize', sinon.match.func);
            expect(stubs.baseAddListener).to.be.calledWith('load', sinon.match.func);
        });

        it('should prevent the context menu if preview only permissions', () => {
            base.options.file.permissions = {
                can_download: false
            };

            base.containerEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub()
            }

            base.addCommonListeners();

            expect(base.containerEl.addEventListener).to.be.calledWith('contextmenu', sinon.match.func);
        });

        it('should handle annotations load', () => {
            base.addCommonListeners();
            expect(stubs.baseAddListener).to.be.calledWith('load', sinon.match.func);
        });
    });

    describe('viewerLoadHandler()', () => {
        beforeEach(() => {
            base.annotationsLoadPromise = Promise.resolve();
            sandbox.stub(base, 'annotationsLoadHandler');
        });

        it('should set the scale if it exists', () => {
            base.viewerLoadHandler({
                scale: 1.5
            });

            expect(base.scale).to.equal(1.5);
        });

        it('should handle the annotations load promise', () => {
             base.viewerLoadHandler({
                scale: 1.5
            });

            base.annotationsLoadPromise.then(() => {
                expect(base.annotationsLoadHandler).to.be.called;
            });
        });
    });

    describe('toggleFullscreen()', () => {
        it('should toggle fullscreen', () => {
            sandbox.stub(fullscreen, 'toggle');
            base.toggleFullscreen();
            expect(fullscreen.toggle).to.be.calledWith(base.containerEl);
        });
    });

    describe('onFullscreenToggled()', () => {
        beforeEach(() => {
            base.containerEl = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(base, 'resize');

        });

        it('should toggle the fullscreen class', () => {
            base.onFullscreenToggled();
            expect(base.containerEl.classList.contains(constants.CLASS_FULLSCREEN)).to.be.true;

            base.onFullscreenToggled();
            expect(base.containerEl.classList.contains(constants.CLASS_FULLSCREEN)).to.be.false;
        });

        it('should toggle the unsupported class if the browser does not support the fullscreen API', () => {
            base.onFullscreenToggled();
            expect(base.containerEl.classList.contains(constants.CLASS_FULLSCREEN_UNSUPPORTED)).to.be.true;

            base.onFullscreenToggled();
            expect(base.containerEl.classList.contains(constants.CLASS_FULLSCREEN_UNSUPPORTED)).to.be.false;
        });

        it('should resize the viewer', () => {
            base.onFullscreenToggled();
            expect(base.resize).to.be.called;
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
                    destroy: destroyMock
                },
                {
                    removeListener: removeListenerMock,
                    destroy: destroyMock
                }
            ];

            base.destroy();
        });

        it('should cleanup the base viewer', () => {
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'loadAnnotator');
            sandbox.stub(base, 'finishLoadingSetup');
            base.setup();

            sandbox.mock(fullscreen).expects('removeAllListeners');
            sandbox.stub(base, 'removeAllListeners');
            sandbox.stub(base, 'emit');

            base.destroy();

            expect(base.removeAllListeners).to.be.called;
            expect(base.containerEl.innerHTML).to.equal('');
            expect(base.destroyed).to.be.true;
            expect(base.emit).to.be.calledWith('destroy');
        });

        it('should clean up annotator', () => {
            base.annotator = {
                removeAllListeners: sandbox.mock(),
                destroy: sandbox.mock()
            };
            base.destroy();
            expect(base.annotator.removeAllListeners).to.be.called;
            expect(base.annotator.destroy).to.be.called;
        });

        it('should remove the context listener if its callback exists', () => {
            base.preventDefault = sandbox.stub();
            base.containerEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub()
            }

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
                    id: fileId
                },
                container: containerEl
            });

            const emitStub = sandbox.stub();
            Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitStub });

            base.emit(event, data);

            expect(emitStub).to.be.calledWith(event, data);
            expect(emitStub).to.be.calledWithMatch('viewerevent', {
                event,
                data,
                viewerName,
                fileId
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
                }
            });
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'loadAnnotator');
            sandbox.stub(base, 'finishLoadingSetup');
            base.setup();
            event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub(),
                touches: [0, 0]
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
                expect(base._scaling).to.equal(true);
                expect(event.stopPropagation).to.be.called;
                expect(event.preventDefault).to.be.called;
            });

            it('should store the event details if two touches are detected and not on iOS', () => {
                stubs.isIOS.returns(false);

                base.mobileZoomStartHandler(event);
                expect(base._scaling).to.equal(true);
                expect(base._pinchScale).to.not.equal(undefined);
                expect(event.stopPropagation).to.be.called;
                expect(event.preventDefault).to.be.called;
            });

            it('should do nothing if event did not record two touches and not on iOS', () => {
                stubs.isIOS.returns(false);
                event.touches = [0];

                base.mobileZoomStartHandler(event);
                expect(base._scaling).to.equal(false);
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
                stubs.sqrt.onCall(0).returns(0).onCall(1).returns(0.5);
                stubs.isIOS.returns(false);
                base.mobileZoomStartHandler(event);

                event.touches = [
                    {
                        clientX: 0,
                        clientY: 0
                    },
                    {
                        clientX: 0,
                        clientY: 0
                    }
                ];
                base.mobileZoomChangeHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomIn).to.be.called;
                expect(base._scaling).to.equal(false);
                expect(base._pincScale).to.equal(undefined);
            });

            it('should zoom out if not on iOS and the scale is < 0', () => {
                stubs.sqrt.onCall(0).returns(0.5).onCall(1).returns(0);
                stubs.isIOS.returns(false);
                base.mobileZoomStartHandler(event);

                event.touches = [
                    {
                        clientX: 0,
                        clientY: 0
                    },
                    {
                        clientX: 0,
                        clientY: 0
                    }
                ];
                base.mobileZoomChangeHandler(event);

                base.mobileZoomEndHandler(event);
                expect(base.zoomOut).to.be.called;
                expect(base.zoomIn).to.not.be.called;
                expect(base._scaling).to.equal(false);
                expect(base._pincScale).to.equal(undefined);
            });
        });
    });

    describe('getViewerOption', () => {
        it('should return the user-defined viewer option with the specified key if it exists', () => {
            const baz = 'captain-america';
            base.options.viewers = {
                Base: {
                    fooBar: baz
                }
            };
            base.options.viewer = { NAME: 'Base' };

            expect(base.getViewerOption('fooBar')).to.equal(baz);
        });
    });

    describe('loadAssets()', () => {
        it('should create an asset URL and load the relevant stylesheets and scripts', () => {
            base.options.location = {};
            const promise = Promise.resolve();

            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'loadStylesheets');
            sandbox.stub(util, 'loadScripts').returns(promise);

            const result = base.loadAssets();
            expect(util.createAssetUrlCreator).to.be.calledWith(base.options.location);
            expect(util.loadStylesheets).to.be.called;
            expect(util.loadScripts).to.be.called;
            expect(result).to.equal(promise);
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
    });

    describe('getRepStatus()', () => {
        beforeEach(() => {
            base.options.representation = {
                info: {
                    url: 'someurl'
                }
            };
        });

        it('should create a new rep status, save, and return it', () => {
            const repStatus = base.getRepStatus();
            expect(base.repStatuses.find((status) => status === repStatus)).to.not.be.undefined;
            expect(repStatus).to.be.instanceof(RepStatus);
        });

        it('should use the passed in representation', () => {
            const representation = {
                info: {
                    url: 'someOtherUrl'
                }
            };
            const repStatus = base.getRepStatus(representation);
            expect(repStatus.representation).to.equal(representation);
        });
    });

    describe('isRepresentationReady()', () => {
        it('should return whether the representation has a successful status', () => {
            const representation = {
                status: {
                    state: 'success'
                }
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
                disable: sandbox.stub()
            };
            base.disableViewerControls();
            expect(base.controls.disable).to.be.called;
        });
    });

    describe('enableViewerControls()', () => {
        it('should enable viewer controls', () => {
            base.controls = {
                enable: sandbox.stub()
            };
            base.enableViewerControls();
            expect(base.controls.enable).to.be.called;
        });
    });

    describe('loadAnnotator()', () => {
        beforeEach(() => {
            sandbox.stub(base, 'areAnnotationsEnabled');
            sandbox.stub(base, 'loadAssets');
        });

        it('should do nothing if annotations are not enabled', () => {
            base.areAnnotationsEnabled.returns(false);
            base.loadAnnotator();
            expect(base.loadAssets).to.not.be.called;

        });

        it('should load the annotations assets', () => {
            base.areAnnotationsEnabled.returns(true);
            base.loadAnnotator();
            expect(base.loadAssets).to.be.calledWith(['annotations.js']);
        });
    });

    describe('initAnnotations()', () => {
        beforeEach(() => {
            base.options = {
                container: document,
                file: {
                    file_version: {
                        id: 123
                    }
                },
                location: {
                    locale: 'en-US'
                }
            };
            base.scale = 1.5;
            base.annotator = {
                init: sandbox.stub(),
                addListener: sandbox.stub()
            };
            base.annotatorConf = {
                CONSTRUCTOR: sandbox.stub().returns(base.annotator)
            };
        });

        it('should initialize the annotator', () => {
            sandbox.stub(base, 'emit');
            base.addListener = sandbox.stub();
            base.initAnnotations();

            expect(base.annotator.init).to.be.calledWith(1.5);
            expect(base.addListener).to.be.calledWith('toggleannotationmode', sinon.match.func);
            expect(base.addListener).to.be.calledWith('scale', sinon.match.func);
            expect(base.addListener).to.be.calledWith('scrolltoannotation', sinon.match.func);
            expect(base.annotator.addListener).to.be.calledWith('annotatorevent', sinon.match.func);
            expect(base.emit).to.be.calledWith('annotator', base.annotator);
        });

        it('should call the correct handler to toggle annotation modes', () => {
            base.initAnnotations();
            base.annotator.toggleAnnotationMode = sandbox.stub();

            base.emit('toggleannotationmode', 'mode');
            expect(base.annotator.toggleAnnotationMode).to.be.called;
        })
    });

    describe('areAnnotationsEnabled()', () => {
        beforeEach(() => {
            stubs.getViewerOption = sandbox.stub(base, 'getViewerOption').withArgs('annotations').returns(false);
        });

        it('should return true if viewer option is set to true', () => {
            expect(base.areAnnotationsEnabled()).to.equal(false);
            stubs.getViewerOption.returns(true);
            expect(base.areAnnotationsEnabled()).to.equal(true);
        });

        it('should use the global show annotationsBoolean if the viewer param is not specified', () => {
            stubs.getViewerOption.withArgs('annotations').returns(null);
            base.options.showAnnotations = true;
            expect(base.areAnnotationsEnabled()).to.equal(true);

            base.options.showAnnotations = false;
            expect(base.areAnnotationsEnabled()).to.equal(false);
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
                disabledTypes: ['drawing']
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
                isInAnnotationMode: sandbox.stub()
            };
            sandbox.stub(base, 'disableViewerControls');
            sandbox.stub(base, 'enableViewerControls');
            base.previewUI = {
                replaceHeader: () => {}
            }
        });

        it('should disable controls and show point mode notification on annotationmodeenter', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data: { mode: ANNOTATION_TYPE_POINT }
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationshow', sinon.match.string);
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should disable controls and enter draw anontation mode with notification', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeEnter,
                data:  {
                    mode: ANNOTATION_TYPE_DRAW,
                    headerSelector: '.bp-header'
                }
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationshow', sinon.match.string);
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should enable controls and hide notification on annotationmodeexit', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW
                }
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationhide');
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should enable controls and exit draw annotation mode', () => {
            const data = {
                event: ANNOTATOR_EVENT.modeExit,
                data: {
                    mode: ANNOTATION_TYPE_DRAW
                }
            };
            base.handleAnnotatorEvents(data);
            expect(base.enableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationhide');
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should show a notification on annotationerror', () => {
            const data = {
                event: ANNOTATOR_EVENT.error,
                data: 'message'
            };
            base.handleAnnotatorEvents(data);
            expect(base.emit).to.be.calledWith('notificationshow', data.data);
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should scale annotations on annotationsfetched', () => {
            base.scale = 1;
            base.rotationAngle = 90;
            const data = {
                event: ANNOTATOR_EVENT.fetch
            };
            base.handleAnnotatorEvents(data);
            expect(base.emit).to.be.calledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle
            });
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });

        it('should only emit annotatorevent when event does not match', () => {
            const data = {
                event: 'no match',
                data: 'message'
            };
            base.handleAnnotatorEvents(data);
            expect(base.disableViewerControls).to.not.be.called;
            expect(base.enableViewerControls).to.not.be.called;
            expect(base.emit).to.not.be.calledWith('notificationshow', data.data);
            expect(base.emit).to.not.be.calledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle
            });
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });
    });

    describe('createAnnotatorOptions()', () => {
        it('should return combined options to give to the annotator', () => {
            base.options = {
                file: { id: 1 },
                location: { locale: 'en-US' }
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
});
