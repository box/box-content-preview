/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import Base from '../base';
import Browser from '../../browser';
import RepStatus from '../../rep-status';
import fullscreen from '../../fullscreen';
import * as util from '../../util';

let base;
let containerEl;
const sandbox = sinon.sandbox.create();

describe('base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/__tests__/base-test.html');

        containerEl = document.querySelector('.bp-container');
        base = new Base({
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

            base.setup();

            expect(base.options).to.deep.equal({
                container: containerEl,
                file: {
                    id: '0'
                }
            });
            expect(base.containerEl).to.have.class('bp');
            expect(base.addCommonListeners).to.be.called;
            expect(base.loadTimeout).to.be.a.number;
        });

        it('should add a mobile class to the container if on mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);
            base.setup();

            const container = document.querySelector('.bp');
            expect(container).to.have.class('bp-is-mobile');
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

            base = new Base({
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

            base = new Base({
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

            base = new Base({
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
            sandbox.stub(document.defaultView, 'addEventListener');

            base.addCommonListeners();

            expect(fullscreen.addListener).to.be.calledWith('enter', sinon.match.func);
            expect(fullscreen.addListener).to.be.calledWith('exit', sinon.match.func);
            expect(document.defaultView.addEventListener).to.be.calledWith('resize', base.debouncedResizeHandler);
        });
    });

    describe('toggleFullscreen()', () => {
        it('should toggle fullscreen', () => {
            sandbox.stub(fullscreen, 'toggle');
            base.toggleFullscreen();
            expect(fullscreen.toggle).to.be.calledWith(base.containerEl);
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
            base.repStatuses = [{
                destroy: destroyMock
            }, {
                destroy: destroyMock
            }];

            base.destroy();
        });

        it('should cleanup the base viewer', () => {
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

            base = new Base({
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
        let stubs = {};
        let event = {};

        beforeEach(() => {
            base = new Base({
                container: containerEl,
                file: {
                    id: '123'
                }
            });
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
                stubs.sqrt.onCall(0).returns(0)
                .onCall(1).returns(0.5);
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
                stubs.sqrt.onCall(0).returns(0.5)
                .onCall(1).returns(0);
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
});
