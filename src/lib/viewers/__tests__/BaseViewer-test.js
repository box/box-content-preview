/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import RepStatus from '../../RepStatus';
import fullscreen from '../../Fullscreen';
import * as util from '../../util';
import * as file from '../../file';
import * as constants from '../../constants';

let base;
let containerEl;
let stubs = {};
const sandbox = sinon.sandbox.create();

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
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');
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
            expect(base.loadTimeout).to.be.a.number;
            expect(base.loadAssets).to.be.called;
        });

        it('should add a mobile class to the container if on mobile', () => {
            base.isMobile = true;
            sandbox.stub(base, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(base, 'finishLoadingSetup');

            base.setup();

            const container = document.querySelector('.bp');
            expect(container).to.have.class('bp-is-mobile');
        });

        it('should not load annotations assets if global preview showAnnotations option is false', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'loadAssets');
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.showAnnotations = false;

            base.setup();

            expect(base.loadAssets).to.not.be.called;
        });

        it('should not load annotations assets if expiring embed is a shared link', () => {
            sandbox.stub(base, 'addCommonListeners');
            sandbox.stub(base, 'loadAssets');
            sandbox.stub(base, 'finishLoadingSetup');
            base.options.sharedLink = 'url';

            base.setup();

            expect(base.loadAssets).to.not.be.called;
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

    describe('debouncedResizeHandler()', () => {
        it('should return a resize handler', () => {
            expect(base.debouncedResizeHandler()).to.be.a.function;
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
            const url = 'url{asset_path}';
            sandbox.spy(util, 'createContentUrl');

            const result = base.createContentUrl(url, '');
            expect(result).to.equal('url');
            expect(util.createContentUrl).to.be.calledWith(url, '');
        });

        it('should return content url with asset path from args', () => {
            const url = 'url{asset_path}';

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
            sandbox.stub(base, 'createContentUrl').returns('foo');
            sandbox.stub(base, 'appendAuthParams').returns('bar');
            const result = base.createContentUrlWithAuthParams('boo', 'hoo');
            expect(result).to.equal('bar');
            expect(base.createContentUrl).to.be.calledWith('boo', 'hoo');
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
        it('should append common event listeners', () => {
            sandbox.stub(fullscreen, 'addListener');
            sandbox.stub(base, 'addListener');
            sandbox.stub(document.defaultView, 'addEventListener');

            base.addCommonListeners();

            expect(fullscreen.addListener).to.be.calledWith('enter', sinon.match.func);
            expect(fullscreen.addListener).to.be.calledWith('exit', sinon.match.func);
            expect(document.defaultView.addEventListener).to.be.calledWith('resize', base.debouncedResizeHandler);
            expect(base.addListener).to.be.calledWith('load', sinon.match.func);
        });

        it('should load the annotator when load is emitted with scale', (done) => {
            sandbox.stub(fullscreen, 'addListener');
            sandbox.stub(document.defaultView, 'addEventListener');
            sandbox.stub(base, 'loadAnnotator');
            base.containerEl = containerEl;
            base.annotationsPromise = {
                then: (arg) => {
                    expect(base.scale).to.equal(1.5);
                    expect(arg).to.equal(base.loadAnnotator);
                    done();
                }
            };

            base.addCommonListeners();
            expect(base.scale).to.equal(1);
            base.emit('load', {
                scale: 1.5
            });
        });

        it('should load the annotator when load is emitted without an event', (done) => {
            sandbox.stub(fullscreen, 'addListener');
            sandbox.stub(document.defaultView, 'addEventListener');
            sandbox.stub(base, 'loadAnnotator');
            base.containerEl = containerEl;
            base.annotationsPromise = {
                then: (arg) => {
                    expect(arg).to.equal(base.loadAnnotator);
                    done();
                }
            };

            base.addCommonListeners();
            base.emit('load');
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
                    id: '123'
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

    describe('loadAnnotator()', () => {
        beforeEach(() => {
            base.options.viewer = {
                NAME: Document
            };

            stubs.annotatorConf = {
                TYPE: ['point', 'highlight']
            };
            stubs.isAnnotatable = sandbox.stub(base, 'isAnnotatable').returns(true);
            sandbox.stub(base, 'initAnnotations');
            sandbox.stub(base, 'showModeAnnotateButton');
            stubs.checkPermission = sandbox.stub(file, 'checkPermission').returns(false);
        });

        it('should load the appropriate annotator for the current viewer', () => {
            class BoxAnnotations {
                determineAnnotator() {
                    return stubs.annotatorConf;
                }
            }
            stubs.checkPermission.returns(true);

            window.BoxAnnotations = BoxAnnotations;
            base.loadAnnotator();
            expect(base.initAnnotations).to.be.called;
            expect(base.showModeAnnotateButton).to.be.called;
        });

        it('should not display the point or draw annotation button if the user does not have the appropriate permissions', () => {
            class BoxAnnotations {
                determineAnnotator() {}
            }
            window.BoxAnnotations = BoxAnnotations;

            base.loadAnnotator();
            expect(base.initAnnotations).to.not.be.called;
            expect(base.showModeAnnotateButton).to.not.be.called;
        });

        it('should not load an annotator if no loader was found', () => {
            class BoxAnnotations {
                determineAnnotator() {}
            }
            window.BoxAnnotations = BoxAnnotations;
            base.loadAnnotator();
            expect(base.initAnnotations).to.not.be.called;
            expect(base.showModeAnnotateButton).to.not.be.called;
        });

        it('should not load an annotator if the viewer is not annotatable', () => {
            class BoxAnnotations {
                determineAnnotator() {
                    return stubs.annotatorConf;
                }
            }
            window.BoxAnnotations = BoxAnnotations;
            stubs.isAnnotatable.returns(false);
            base.loadAnnotator();
            expect(base.initAnnotations).to.not.be.called;
            expect(base.showModeAnnotateButton).to.not.be.called;
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
            base.addListener = sandbox.stub();
            base.scale = 1.5;
            base.annotator = {
                init: sandbox.stub(),
                addListener: sandbox.stub(),
                setScale: sandbox.stub()
            };
            base.annotatorConf = {
                CONSTRUCTOR: sandbox.stub().returns(base.annotator)
            };
            base.initAnnotations();
        });

        it('should initialize the annotator', () => {
            expect(base.annotator.init).to.be.calledWith(1.5);
            expect(base.addListener).to.be.calledWith('togglepointannotationmode', sinon.match.func);
            expect(base.addListener).to.be.calledWith('toggledrawannotationmode', sinon.match.func);
            expect(base.addListener).to.be.calledWith('scale', sinon.match.func);
            expect(base.annotator.addListener).to.be.calledWith('annotatorevent', sinon.match.func);
        });
    });

    describe('isAnnotatable()', () => {
        beforeEach(() => {
            base.annotatorConf = {
                TYPE: ['point', 'highlight']
            };
            sandbox.stub(base, 'areAnnotationsEnabled').returns(true);
        });

        it('should return false if annotations are not allowed on the current viewer', () => {
            base.annotatorConf = undefined;
            expect(base.isAnnotatable('point')).to.equal(false);
        })

        it('should return true if the type is supported by the viewer', () => {
            expect(base.isAnnotatable('point')).to.equal(true);
        });

        it('should return false if the type is not supported by the viewer', () => {
            expect(base.isAnnotatable('drawing')).to.equal(false);
        });
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

    describe('showModeAnnotateButton()', () => {
        const modes = {
            point: {
                title: 'Point Annotation Mode',
                selector: constants.SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT
            },
            draw: {
                title: 'Draw Annotation Mode',
                selector: constants.SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW
            }
        };

        it('should do nothing if the mode does not require a button', () => {
            sandbox.stub(base, 'getAnnotationModeClickHandler');
            sandbox.stub(base, 'isAnnotatable').returns(true);
            base.showModeAnnotateButton('highlight', modes);
            expect(base.getAnnotationModeClickHandler).to.not.be.called;
        });

        it('should do nothing if the annotation type is not supported ', () => {
            sandbox.stub(base, 'getAnnotationModeClickHandler');
            sandbox.stub(base, 'isAnnotatable').returns(false);
            base.showModeAnnotateButton('bleh', modes);
            expect(base.getAnnotationModeClickHandler).to.not.be.called;
        });

        it('should do nothing if the button is not in the container', () => {
            sandbox.stub(base, 'isAnnotatable').returns(true);
            sandbox.stub(base, 'getAnnotationModeClickHandler');
            base.showModeAnnotateButton('point', modes);
            expect(base.getAnnotationModeClickHandler).to.not.be.called;
        });

        it('should set up and show an annotate button', () => {
            const buttonEl = document.createElement('div');
            buttonEl.classList.add('bp-btn-annotate-point');
            buttonEl.classList.add(constants.CLASS_HIDDEN);
            base.options = {
                container: document,
                file: {
                    id: 123
                }
            };
            containerEl.appendChild(buttonEl);
            sandbox.stub(base, 'isAnnotatable').returns(true);
            sandbox.stub(base, 'getAnnotationModeClickHandler');
            sandbox.mock(buttonEl).expects('addEventListener').withArgs('click');

            base.showModeAnnotateButton('point', modes);
            expect(buttonEl.title).to.equal('Point Annotation Mode');
            expect(base.getAnnotationModeClickHandler).to.be.called;
        });
    });

    describe('getAnnotationModeClickHandler()', () => {
        beforeEach(() => {
            stubs.isAnnotatable = sandbox.stub(base, 'isAnnotatable').returns(false);
        });

        it('should return null if you cannot annotate', () => {
            const handler = base.getAnnotationModeClickHandler('point');
            expect(stubs.isAnnotatable).to.be.called;
            expect(handler).to.equal(null);
        });

        it('should return the toggle point mode handler', () => {
            stubs.isAnnotatable.returns(true);
            sandbox.stub(base, 'emit');
            base.annotator = {
                togglePointAnnotationHandler: () => {}
            };

            const handler = base.getAnnotationModeClickHandler('point');
            expect(stubs.isAnnotatable).to.be.called;
            expect(handler).to.be.a('function');

            handler(event);
            expect(base.emit).to.have.been.calledWith('togglepointannotationmode');
        });
    });

    describe('handleAnnotatorNotifications()', () => {
        const ANNOTATION_TYPE_DRAW = 'draw';
        const ANNOTATION_TYPE_POINT = 'point';

        beforeEach(() => {
            sandbox.stub(base, 'emit');
        });

        it('should disable controls and show point mode notification on annotationmodeenter', () => {
            sandbox.stub(base, 'disableViewerControls');
            base.handleAnnotatorNotifications({
                event: 'annotationmodeenter',
                data: ANNOTATION_TYPE_POINT
            });
            expect(base.disableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationshow', sinon.match.string);
        });

        it('should disable controls and show draw mode notification on annotationmodeenter', () => {
            sandbox.stub(base, 'disableViewerControls');
            base.handleAnnotatorNotifications({
                event: 'annotationmodeenter',
                data: ANNOTATION_TYPE_DRAW
            });
            expect(base.disableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationshow', sinon.match.string);
        });

        it('should enable controls and hide notification on annotationmodeexit', () => {
            sandbox.stub(base, 'enableViewerControls');
            base.handleAnnotatorNotifications({
                event: 'annotationmodeexit'
            });
            expect(base.enableViewerControls).to.be.called;
            expect(base.emit).to.be.calledWith('notificationhide');
        });

        it('should show a notification on annotationerror', () => {
            const data = {
                event: 'annotationerror',
                data: 'message'
            };
            base.handleAnnotatorNotifications(data);
            expect(base.emit).to.be.calledWith('notificationshow', data.data);
        });

        it('should scale annotations on annotationsfetched', () => {
            base.scale = 1;
            base.rotationAngle = 90;
            base.handleAnnotatorNotifications({
                event: 'annotationsfetched'
            });
            expect(base.emit).to.be.calledWith('scale', {
                scale: base.scale,
                rotationAngle: base.rotationAngle
            });
        });

        it('should emit annotatorevent when event does not match', () => {
            const data = {
                event: 'no match',
                data: 'message'
            };
            base.handleAnnotatorNotifications(data);
            expect(base.emit).to.be.calledWith(data.event, data.data);
            expect(base.emit).to.be.calledWith('annotatorevent', data);
        });
    });
});
