/* eslint-disable no-unused-expressions */
import Base from '../base';
import Browser from '../../browser';
import EventEmitter from 'events';
import fullscreen from '../../fullscreen';
import * as util from '../../util';

const addCommonListeners = Base.prototype.addCommonListeners;
let base;
let containerEl;
const sandbox = sinon.sandbox.create();

describe('base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/__tests__/base-test.html');

        containerEl = document.querySelector('.box-preview-container');

        // Prevent constructor from adding too many listeners
        Object.defineProperty(Base.prototype, 'addCommonListeners', {
            value: sandbox.stub()
        });
    });

    afterEach(() => {
        // Test cleanup
        Object.defineProperty(Base.prototype, 'addCommonListeners', {
            value: addCommonListeners
        });

        sandbox.verifyAndRestore();
    });

    describe('Base()', () => {
        it('should set options, a container, bind event listeners, and set timeout', () => {
            const options = {};
            base = new Base(containerEl, options);

            expect(base.options).to.equal(options);
            expect(base.containerEl).to.equal(containerEl.querySelector('.box-preview'));
            expect(Base.prototype.addCommonListeners).to.have.been.called;
            expect(base.loadTimeout).to.be.a.number;
        });

        it('should add a mobile class to the container if on mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);

            base = new Base(containerEl);

            const container = document.querySelector('.box-preview');
            expect(container.classList.contains('box-preview-is-mobile')).to.be.true;
        });
    });

    describe('debouncedResizeHandler()', () => {
        it('should return a resize handler', () => {
            base = new Base(containerEl);
            expect(base.debouncedResizeHandler()).to.be.a.function;
        });
    });

    describe('load()', () => {
        it('should call resetLoadTimeout', () => {
            base = new Base(containerEl);
            sandbox.stub(base, 'resetLoadTimeout');

            base.load();
            expect(base.resetLoadTimeout).to.have.been.called;
        });
    });

    describe('resetLoadTimeout()', () => {
        it('should clear timeout and set a new timeout handler', () => {
            base = new Base(containerEl);
            sandbox.stub(window, 'clearTimeout');
            sandbox.spy(window, 'setTimeout');

            base.resetLoadTimeout();

            expect(window.clearTimeout).to.have.been.called;
            expect(window.setTimeout).to.have.been.called;
            expect(base.loadTimeoutId).to.be.a.number;

            // Test cleanup
            clearTimeout(base.loadTimeoutId);
        });
    });

    describe('isLoaded()', () => {
        it('should return loaded property', () => {
            base = new Base(containerEl);
            expect(base.isLoaded()).to.equal(base.loaded);
        });
    });

    describe('isDestroyed()', () => {
        it('should return loaded property', () => {
            base = new Base(containerEl);
            expect(base.isDestroyed()).to.equal(base.destroyed);
        });
    });

    describe('appendAuthParam()', () => {
        it('should return content url with auth options appended', () => {
            const token = 'TOKEN';
            const sharedLink = 'https://app.box.com/s/HASH';
            const sharedLinkPassword = 'pass';
            const url = 'url';

            base = new Base(containerEl, {
                token,
                sharedLink,
                sharedLinkPassword
            });
            sandbox.stub(util, 'createContentUrl').returns(url);

            const result = base.appendAuthParam('');
            expect(result).to.equal(url);
            expect(util.createContentUrl).to.have.been.calledWith('', token, sharedLink, sharedLinkPassword);
        });
    });

    describe('appendAuthHeader()', () => {
        it('should return fetch headers', () => {
            const token = 'TOKEN';
            const sharedLink = 'https://app.box.com/s/HASH';
            const sharedLinkPassword = 'pass';
            const headers = {};

            base = new Base(containerEl, {
                token,
                sharedLink,
                sharedLinkPassword
            });
            sandbox.stub(util, 'getHeaders').returns(headers);

            const result = base.appendAuthHeader(headers);
            expect(result).to.equal(headers);
            expect(util.getHeaders).to.have.been.calledWith(headers, token, sharedLink, sharedLinkPassword);
        });
    });

    describe('addCommonListeners()', () => {
        it('should append common event listeners', () => {
            sandbox.stub(fullscreen, 'addListener');
            sandbox.stub(document.defaultView, 'addEventListener');

            // Restore normal 'addCommonListeners' behavior
            Object.defineProperty(Base.prototype, 'addCommonListeners', {
                value: addCommonListeners
            });

            // Constructor calls 'addCommonListeners'
            base = new Base(containerEl);

            expect(fullscreen.addListener).to.have.been.calledWith('enter', sinon.match.func);
            expect(fullscreen.addListener).to.have.been.calledWith('exit', sinon.match.func);
            expect(document.defaultView.addEventListener).to.have.been.calledWith('resize', base.debouncedResizeHandler());
        });
    });

    describe('toggleFullscreen()', () => {
        it('should toggle fullscreen', () => {
            sandbox.stub(fullscreen, 'toggle');

            base = new Base(containerEl);
            base.toggleFullscreen();

            expect(fullscreen.toggle).to.have.been.calledWith(base.containerEl);
        });
    });

    describe('resize()', () => {
        it('should broadcast resize event', () => {
            base = new Base(containerEl);
            sandbox.stub(base, 'emit');

            base.resize();

            expect(base.emit).to.have.been.calledWith('resize');
        });
    });

    describe('allowNavigationArrows()', () => {
        it('should return true for base viewer', () => {
            base = new Base(containerEl);
            expect(base.allowNavigationArrows()).to.be.true;
        });
    });

    describe('destroy()', () => {
        it('should cleanup the base viewer', () => {
            base = new Base(containerEl);
            sandbox.stub(fullscreen, 'removeAllListeners');
            sandbox.stub(document.defaultView, 'removeEventListener');
            sandbox.stub(base, 'removeAllListeners');

            base.destroy();

            expect(fullscreen.removeAllListeners).to.have.been.called;
            expect(document.defaultView.removeEventListener).to.have.been.calledWith('resize', base.resizeHandler);
            expect(base.removeAllListeners).to.have.been.called;
            expect(base.containerEl.innerHTML).to.equal('');
            expect(base.destroyed).to.be.true;
        });
    });

    describe('emit', () => {
        it('should pass through the event as well as broadcast it as a viewer event', () => {
            const viewerName = 'base';
            const fileID = '1';
            const event = 'someEvent';
            const data = {};

            base = new Base(containerEl, {
                viewerName,
                file: {
                    id: fileID
                }
            });

            // This stubs out the parent 'emit' method
            Object.defineProperty(Object.getPrototypeOf(Base.prototype), 'emit', {
                value: sandbox.stub()
            });

            base.emit(event, data);

            expect(EventEmitter.prototype.emit).to.have.been.calledWith(event, data);
            expect(EventEmitter.prototype.emit).to.have.been.calledWithMatch('viewerevent', {
                event,
                data,
                viewerName,
                fileId: fileID
            });
        });
    });

    let stubs = {};
    let event = {};
    describe('Pinch to Zoom Handlers', () => {
        beforeEach(() => {
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
});
