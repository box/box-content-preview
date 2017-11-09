/* eslint-disable no-unused-expressions */
import ImageBaseViewer from '../ImageBaseViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import fullscreen from '../../../Fullscreen';
import * as util from '../../../util';
import { ICON_ZOOM_IN, ICON_ZOOM_OUT } from '../../../icons/icons';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';

let stubs = {};

const sandbox = sinon.sandbox.create();
let imageBase;
let containerEl;

describe('lib/viewers/image/ImageBaseViewer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/image/__tests__/ImageBaseViewer-test.html');
        stubs.emit = sandbox.stub(fullscreen, 'addListener');
        containerEl = document.querySelector('.container');
        imageBase = new ImageBaseViewer(containerEl);
        imageBase.containerEl = containerEl;
        imageBase.imageEl = document.createElement('div');

        event = {
            preventDefault: sandbox.stub(),
            stopPropagation: sandbox.stub(),
            touches: [0, 0]
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (typeof imageBase.destroy === 'function') {
            imageBase.destroy();
        }

        imageBase = null;
        stubs = {};
        event = {};
    });

    describe('destroy()', () => {
        it('should cleanup the image base viewer', () => {
            imageBase.loadUI();
            imageBase.imageEl.addEventListener('mouseup', imageBase.handleMouseUp);

            sandbox.stub(imageBase.controls, 'destroy');
            sandbox.stub(imageBase.imageEl, 'removeEventListener');

            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'destroy', {
                value: sandbox.stub()
            });

            imageBase.destroy();

            expect(imageBase.controls.destroy).to.be.called;
            expect(imageBase.imageEl.removeEventListener).to.be.calledWith('mouseup', imageBase.handleMouseUp);
            expect(BaseViewer.prototype.destroy).to.be.called;
        });

        it('should remove all the listeners', () => {
            sandbox.stub(imageBase, 'unbindDOMListeners');

            imageBase.destroy();

            expect(imageBase.unbindDOMListeners).to.be.called;
        });
    });

    describe('zoomIn()', () => {
        it('should zoom in image', () => {
            sandbox.stub(imageBase, 'zoom');

            imageBase.zoomIn();

            expect(imageBase.zoom).to.be.calledWith('in');
        });
    });

    describe('zoomOut()', () => {
        it('should zoom out image', () => {
            sandbox.stub(imageBase, 'zoom');

            imageBase.zoomOut();

            expect(imageBase.zoom).to.be.calledWith('out');
        });
    });

    describe('resize()', () => {
        it('should resize image', () => {
            sandbox.stub(imageBase, 'zoom');

            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'resize', {
                value: sandbox.stub()
            });

            imageBase.resize();

            expect(imageBase.zoom).to.be.called;
            expect(BaseViewer.prototype.resize).to.be.called;
        });
    });

    describe('updateCursor()', () => {
        it('should make the image pannable', () => {
            imageBase.isZoomable = true;
            imageBase.isPannable = true;
            imageBase.imageEl.classList.add(CSS_CLASS_ZOOMABLE);

            imageBase.updateCursor();

            expect(imageBase.isZoomable).to.have.been.false;
            expect(imageBase.imageEl).to.have.class(CSS_CLASS_PANNABLE);
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_ZOOMABLE);
        });

        it('should make the image zoomable', () => {
            imageBase.isZoomable = false;
            imageBase.isPannable = false;
            imageBase.imageEl.classList.add(CSS_CLASS_PANNABLE);

            imageBase.updateCursor();

            expect(imageBase.isZoomable).to.have.been.true;
            expect(imageBase.imageEl).to.have.class(CSS_CLASS_ZOOMABLE);
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_PANNABLE);
        });
    });

    describe('startPanning()', () => {
        beforeEach(() => {
            imageBase.wrapperEl = document.createElement('img');
        });

        beforeEach(() => {
            stubs.emit = sandbox.stub(imageBase, 'emit');
            stubs.pan = sandbox.stub(imageBase, 'pan');
            stubs.stopPanning = sandbox.stub(imageBase, 'stopPanning');
        });

        it('should not start panning if image is not pannable', () => {
            imageBase.isPannable = false;
            imageBase.isPanning = false;

            imageBase.startPanning();

            expect(imageBase.isPanning).to.be.false;
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_PANNING);
            expect(imageBase.emit).to.not.have.been.calledWith('panstart');
        });

        it('should start panning, remove listeners, and fire "panstart" event', () => {
            imageBase.isPannable = true;
            imageBase.isPanning = false;

            imageBase.startPanning();

            expect(imageBase.isPanning).to.be.true;
            expect(imageBase.imageEl).to.have.class(CSS_CLASS_PANNING);
            expect(imageBase.emit).to.have.been.calledWith('panstart');
        });
    });

    describe('pan()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(imageBase, 'emit');
            imageBase.wrapperEl = document.createElement('img');
            imageBase.didPan = false;
        });

        it('should pan to the given position', () => {
            imageBase.isPanning = true;

            imageBase.pan({});

            expect(imageBase.didPan).to.be.true;
            expect(stubs.emit).to.have.been.calledWith('pan');
        });

        it('should not pan if the viewer is not already panning', () => {
            imageBase.isPanning = false;

            imageBase.pan({});

            expect(imageBase.didPan).to.be.false;
            expect(stubs.emit).to.not.have.been.calledWith('pan');
        });
    });

    describe('stopPanning()', () => {
        it('should stop panning, remove listeners, and fire "panend" event', () => {
            sandbox.stub(imageBase, 'emit');
            imageBase.isPanning = true;

            imageBase.stopPanning();

            expect(imageBase.isPanning).to.be.false;
        });
    });

    describe('loadUI()', () => {
        it('should create controls and add control buttons for zoom', () => {
            sandbox.stub(imageBase, 'bindControlListeners');
            imageBase.loadUI();

            expect(imageBase.controls).to.not.be.undefined;
            expect(imageBase.bindControlListeners).to.be.called;
        });
    });

    describe('setOriginalImageSize()', () => {
        it('should use the naturalHeight and naturalWidth when available', (done) => {
            const imageEl = {
                naturalWidth: 100,
                naturalHeight: 100,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: (name) => imageEl[name]
            };

            const promise = imageBase.setOriginalImageSize(imageEl);
            promise.then(() => {
                expect(imageEl.getAttribute('originalWidth')).to.equal(imageEl.naturalWidth);
                expect(imageEl.getAttribute('originalHeight')).to.equal(imageEl.naturalHeight);
                done();
            }).catch(() => {
                Assert.fail();
            });
        });

        it('should default to 300x150 when naturalHeight and naturalWidth are 0x0', (done) => {
            const imageEl = {
                naturalWidth: 0,
                naturalHeight: 0,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: (name) => imageEl[name]
            };

            const getStub = sandbox.stub(util, 'get').returns(Promise.resolve('not real a image'));
            const promise = imageBase.setOriginalImageSize(imageEl);
            promise.then(() => {
                expect(imageEl.getAttribute('originalWidth')).to.equal(300);
                expect(imageEl.getAttribute('originalHeight')).to.equal(150);
                done();
            }).catch(() => {
                Assert.fail();
            });
        });

        it('should resolve when the get call fails', (done) => {
            const imageEl = {};
            const getStub = sandbox.stub(util, 'get').returns(Promise.reject());
            const promise = imageBase.setOriginalImageSize(imageEl);
            promise.then(() => Assert.fail()).catch(() => done());
        });
    });

    describe('bindControlListeners()', () => {
        it('should add the correct controls', () => {
            imageBase.controls = {
                add: sandbox.stub()
            };

            imageBase.bindControlListeners();
            expect(imageBase.controls.add).to.be.calledWith(
                __('zoom_out'),
                imageBase.zoomOut,
                'bp-image-zoom-out-icon',
                ICON_ZOOM_OUT
            );
            expect(imageBase.controls.add).to.be.calledWith(__('zoom_in'), imageBase.zoomIn, 'bp-image-zoom-in-icon', ICON_ZOOM_IN);
        });
    });

    describe('handleMouseDown()', () => {
        beforeEach(() => {
            stubs.pan = sandbox.stub(imageBase, 'startPanning');
        });

        it('should do nothing if incorrect click type', () => {
            const event = {
                button: 3,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.handleMouseDown(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            imageBase.handleMouseDown(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            imageBase.handleMouseDown(event);
            expect(stubs.pan).to.not.have.been.called;
        });

        it('should start panning if correct click type', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.handleMouseDown(event);
            expect(stubs.pan).to.have.been.called;
        });
    });

    describe('handleMouseUp()', () => {
        beforeEach(() => {
            stubs.pan = sandbox.stub(imageBase, 'stopPanning');
            stubs.zoom = sandbox.stub(imageBase, 'zoom');
            imageBase.isPanning = false;
        });

        it('should do nothing if incorrect click type', () => {
            const event = {
                button: 3,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.handleMouseUp(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            imageBase.handleMouseUp(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).to.not.have.been.called;
        });

        it('should zoom in if zoomable but not pannable', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.isZoomable = true;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).to.have.been.calledWith('in');
        });

        it('should reset zoom if mouseup was not due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.isZoomable = false;
            imageBase.didPan = false;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).to.have.been.calledWith('reset');
        });

        it('should not zoom if mouse up was due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.isZoomable = false;
            imageBase.didPan = true;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).to.not.have.been.called;
        });
    });

    describe('cancelDragEvent()', () => {
        it('should prevent drag events on the image', () => {
            const event = {
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
            imageBase.cancelDragEvent(event);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });
    });

    describe('onKeydown', () => {
        it('should return false when media controls are not ready or are focused', () => {
            const consumed = imageBase.onKeydown();

            expect(consumed).to.be.false;
        });

        it('should zoom in and return true when zoom in short cut is triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomIn');

            const consumed = imageBase.onKeydown('Shift++');

            expect(imageBase.zoomIn).to.be.called;
            expect(consumed).to.be.true;
        });

        it('should zoom in and return true when zoom out short cut is triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown('Shift+_');

            expect(imageBase.zoomOut).to.be.called;
            expect(consumed).to.be.true;
        });

        it('should return false if neither zoom keyboard short cuts are triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomIn');
            sandbox.stub(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown();

            expect(imageBase.zoomIn).to.not.be.called;
            expect(imageBase.zoomOut).to.not.be.called;
            expect(consumed).to.be.false;
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            imageBase.imageEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub()
            };

            sandbox.stub(document, 'addEventListener');
            stubs.listeners = imageBase.imageEl.addEventListener;
            imageBase.isMobile = true;
        });

        it('should bind all default image listeners', () => {
            imageBase.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('mousedown', imageBase.handleMouseDown);
            expect(stubs.listeners).to.have.been.calledWith('mouseup', imageBase.handleMouseUp);
            expect(stubs.listeners).to.have.been.calledWith('dragstart', imageBase.cancelDragEvent);
        });

        it('should bind all iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            imageBase.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('gesturestart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('gestureend', imageBase.mobileZoomEndHandler);
        });

        it('should bind all mobile and non-iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(false);
            imageBase.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('touchstart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchmove', imageBase.mobileZoomChangeHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchend', imageBase.mobileZoomEndHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            imageBase.imageEl = {
                addEventListener: sandbox.stub(),
                removeEventListener: sandbox.stub()
            };

            imageBase.imageEl.removeEventListener = sandbox.stub();
            stubs.listeners = imageBase.imageEl.removeEventListener;
            stubs.documentListener = sandbox.stub(document, 'removeEventListener');
            imageBase.isMobile = true;
        });

        it('should unbind all default image listeners if imageEl does not exist', () => {
            imageBase.imageEl = null;

            imageBase.unbindDOMListeners();
            expect(stubs.listeners).to.not.be.calledWith('mousedown', imageBase.handleMouseDown);
            expect(stubs.listeners).to.not.be.calledWith('mouseup', imageBase.handleMouseUp);
            expect(stubs.listeners).to.not.be.calledWith('dragstart', imageBase.cancelDragEvent);
        });

        it('should unbind all iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            imageBase.unbindDOMListeners();
            expect(stubs.listeners).to.be.calledWith('gesturestart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).to.be.calledWith('gestureend', imageBase.mobileZoomEndHandler);
        });

        it('should unbind all document listeners', () => {
            imageBase.unbindDOMListeners();
            expect(stubs.documentListener).to.be.calledWith('mousemove', imageBase.pan);
            expect(stubs.documentListener).to.be.calledWith('mouseup', imageBase.stopPanning);
        });

        it('should unbind all non-iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(false);
            imageBase.unbindDOMListeners();
            expect(stubs.listeners).to.be.calledWith('touchstart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).to.be.calledWith('touchmove', imageBase.mobileZoomChangeHandler);
            expect(stubs.listeners).to.be.calledWith('touchend', imageBase.mobileZoomEndHandler);
        });
    });

    describe('errorHandler()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(imageBase, 'emit');
        });

        it('should console log error and emit with generic display error message', () => {
            const err = new Error('blah');
            sandbox.mock(window.console).expects('error').withArgs(err);

            imageBase.errorHandler(err);

            err.displayMessage = 'We\'re sorry, the preview didn\'t load. Please refresh the page.';
            expect(stubs.emit).to.have.been.calledWith('error', err);
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            imageBase.loaded = false;
            stubs.zoom = sandbox.stub(imageBase, 'zoom');
            stubs.loadUI = sandbox.stub(imageBase, 'loadUI');
            stubs.setOriginalImageSize = sandbox.stub(imageBase, 'setOriginalImageSize');
            stubs.errorHandler = sandbox.stub(imageBase, 'errorHandler');
        });

        it('should do nothing if already destroyed', () => {
            imageBase.destroyed = true;
            stubs.emit = sandbox.stub(imageBase, 'emit');

            imageBase.finishLoading();
            expect(imageBase.loaded).to.be.false;
            expect(stubs.emit).to.not.have.been.called;
            expect(stubs.zoom).to.not.have.been.called;
            expect(stubs.setOriginalImageSize).to.not.have.been.called;
            expect(stubs.loadUI).to.not.have.been.called;
            expect(stubs.errorHandler).to.not.have.been.called;
        });

        it('should load UI if not destroyed', (done) => {
            imageBase.on('load', () => {
                expect(stubs.errorHandler).to.not.have.been.called;
                expect(imageBase.loaded).to.be.true;
                expect(stubs.zoom).to.have.been.called;
                expect(stubs.loadUI).to.have.been.called;
                done();
            });
            stubs.setOriginalImageSize.returns(Promise.resolve());
            imageBase.destroyed = false;

            imageBase.finishLoading();
            expect(stubs.setOriginalImageSize).to.have.been.called;
        });
    });

    describe('disableViewerControls()', () => {
        it('should disable viewer controls', () => {
            imageBase.controls = {
                disable: sandbox.stub()
            };
            sandbox.stub(imageBase, 'unbindDOMListeners');
            imageBase.disableViewerControls();
            expect(imageBase.controls.disable).to.be.called;
            expect(imageBase.unbindDOMListeners).to.be.called;
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_ZOOMABLE);
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_PANNABLE);
        });
    });

    describe('enableViewerControls()', () => {
        it('should enable viewer controls', () => {
            imageBase.controls = {
                enable: sandbox.stub()
            };
            imageBase.isMobile = true;
            sandbox.stub(imageBase, 'bindDOMListeners');
            sandbox.stub(imageBase, 'updateCursor');
            imageBase.enableViewerControls();
            expect(imageBase.controls.enable).to.be.called;
            expect(imageBase.bindDOMListeners).to.be.called;
            expect(imageBase.updateCursor).to.not.be.called;
        });

        it('should update cursor if not on mobile', () => {
            imageBase.controls = {
                enable: sandbox.stub()
            };
            imageBase.isMobile = false;
            sandbox.stub(imageBase, 'bindDOMListeners');
            sandbox.stub(imageBase, 'updateCursor');
            imageBase.enableViewerControls();
            expect(imageBase.updateCursor).to.be.called;
        });
    });
});
