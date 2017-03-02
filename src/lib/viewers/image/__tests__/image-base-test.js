/* eslint-disable no-unused-expressions */
import ImageBase from '../image-base';
import Base from '../../base';
import Browser from '../../../Browser';
import fullscreen from '../../../Fullscreen';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';

let stubs = {};

const sandbox = sinon.sandbox.create();
let imageBase;
let containerEl;

describe('image-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/image/__tests__/image-base-test.html');
        stubs.emit = sandbox.stub(fullscreen, 'addListener');
        containerEl = document.querySelector('.container');
        imageBase = new ImageBase(containerEl);
        imageBase.containerEl = containerEl;
        imageBase.imageEl = document.createElement('div');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (typeof imageBase.destroy === 'function') {
            imageBase.destroy();
        }

        imageBase = null;
        stubs = {};
    });

    describe('destroy()', () => {
        it('should cleanup the image base viewer', () => {
            imageBase.loadUI();
            imageBase.imageEl.addEventListener('mouseup', imageBase.handleMouseUp);

            sandbox.stub(imageBase.controls, 'destroy');
            sandbox.stub(imageBase.imageEl, 'removeEventListener');

            Object.defineProperty(Object.getPrototypeOf(ImageBase.prototype), 'destroy', {
                value: sandbox.stub()
            });

            imageBase.destroy();

            expect(imageBase.controls.destroy).to.be.called;
            expect(imageBase.imageEl.removeEventListener).to.be.calledWith('mouseup', imageBase.handleMouseUp);
            expect(Base.prototype.destroy).to.be.called;
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

            Object.defineProperty(Object.getPrototypeOf(ImageBase.prototype), 'resize', {
                value: sandbox.stub()
            });

            imageBase.resize();

            expect(imageBase.zoom).to.be.called;
            expect(Base.prototype.resize).to.be.called;
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
        it('should create controls and add control buttons for zoom and fullscreen', () => {
            imageBase.loadUI();

            expect(imageBase.controls).to.not.be.undefined;
            expect(imageBase.controls.buttonRefs.length).to.equal(4);
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
                stopPropogation: sandbox.stub()
            };
            imageBase.cancelDragEvent(event);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropogation).to.be.called;
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
            stubs.isMobile = sandbox.stub(Browser, 'isMobile').returns(true);
        });

        it('should bind all default image listeners', () => {
            stubs.isMobile.returns(false);
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
            stubs.isMobile = sandbox.stub(Browser, 'isMobile').returns(true);
        });


        it('should unbind all default image listeners if imageEl does not exist', () => {
            imageBase.imageEl = null;
            stubs.isMobile.returns(false);

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
            stubs.isMobile.returns(false);
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
            stubs.emit = sandbox.stub(imageBase, 'emit');
            stubs.zoom = sandbox.stub(imageBase, 'zoom');
            stubs.loadUI = sandbox.stub(imageBase, 'loadUI');
        });

        it('should do nothing if already destroyed', () => {
            imageBase.destroyed = true;

            imageBase.finishLoading();
            expect(imageBase.loaded).to.be.false;
            expect(stubs.emit).to.not.have.been.called;
            expect(stubs.zoom).to.not.have.been.called;
            expect(stubs.loadUI).to.not.have.been.called;
        });

        it('should load UI if not destroyed', () => {
            imageBase.finishLoading();

            expect(imageBase.loaded).to.be.true;
            expect(stubs.emit).to.have.been.called;
            expect(stubs.zoom).to.have.been.called;
            expect(stubs.loadUI).to.have.been.called;
        });
    });
});
