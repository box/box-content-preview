/* eslint-disable no-unused-expressions */
import ImageBaseViewer from '../ImageBaseViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import AnnotationService from '../../../annotations/AnnotationService';
import fullscreen from '../../../Fullscreen';

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
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (imageBase && typeof imageBase.destroy === 'function') {
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

            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'destroy', {
                value: sandbox.stub()
            });

            imageBase.destroy();

            expect(imageBase.controls.destroy).to.be.called;
            expect(imageBase.imageEl.removeEventListener).to.be.calledWith('mouseup', imageBase.handleMouseUp);
            expect(BaseViewer.prototype.destroy).to.be.called;
        });

        it('should remove all event listeners from the annotator and destroy it', () => {
            imageBase.annotator = {
                destroy: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };

            imageBase.destroy();

            expect(imageBase.annotator.removeAllListeners).to.be.calledWith('pointmodeenter');
            expect(imageBase.annotator.destroy).to.be.called;
        });
    });

    describe('setup()', () => {
        it('should create a div to wrap viewer content in', () => {
            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'setup', {
                value: sandbox.stub()
            });

            imageBase.setup();
            expect(imageBase.wrapperEl).to.be.an.instanceof(HTMLElement);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'load', {
                value: sandbox.stub()
            });
        });

        it('should attempt to initialize an annotator', () => {
            const annotationInit = sandbox.stub(imageBase, 'initAnnotations');
            imageBase.load();

            expect(annotationInit).to.be.called;
        });

        it('should bind a series of events to the DOM', () => {
            const domBind = sandbox.stub(imageBase, 'bindDOMListeners');
            imageBase.load();

            expect(domBind).to.be.called;
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
            imageBase.loadUI();

            expect(imageBase.controls).to.not.be.undefined;
            expect(imageBase.controls.buttonRefs.length).to.equal(2);
        });
    });

    describe('initAnnotations()', () => {
        it('should do nothing if the file cannot be annotated', () => {
            const createStub = sandbox.stub(imageBase, 'createAnnotator');
            imageBase.initAnnotations();
            expect(createStub).to.not.be.called;
        });

        describe('annotations enabled for the file', () => {
            const id = '123';
            const versionId = '665';
            const apiHost = 'http://www/box.com/annotations';
            beforeEach(() => {
                sandbox.stub(imageBase, 'isAnnotatable').returns(true);
                imageBase.options = {
                    apiHost,
                    file: {
                        id,
                        file_version: {
                            id: versionId
                        }
                    }
                };
            });

            it('should invoke createAnnotator() with an annotator service instance', (done) => {
                sandbox.stub(imageBase, 'createAnnotator').callsFake((vid, annotator) => {
                    expect(annotator).to.be.an.instanceof(AnnotationService);
                    done();
                });

                imageBase.initAnnotations();
            });

            it('should mark annotations as view only if mobile', () => {
                imageBase.options.file.permissions = {
                    can_annotate: true
                };

                sandbox.stub(Browser, 'isMobile').returns(true);

                imageBase.initAnnotations();
                expect(imageBase.canAnnotate).to.be.false;
            });

            it('should mark annotations as view only if user does not have anotate permissions', () => {
                imageBase.options.file.permissions = {
                    can_annotate: false
                };

                sandbox.stub(Browser, 'isMobile').returns(false);

                imageBase.initAnnotations();
                expect(imageBase.canAnnotate).to.be.false;
            });
        });
    });

    describe('showAnnotations()', () => {
        it('should do nothing if no annotator available', () => {
            imageBase.annotator = undefined;
            imageBase.showAnnotations();
            expect(imageBase.annotationsLoaded).to.be.false;
        });

        it('should do nothing if the annotations haven\'t been loaded', () => {
            imageBase.annotator = {
                showAnnotations: sandbox.stub()
            };
            imageBase.annotationsLoaded = true;
            imageBase.showAnnotations();
            expect(imageBase.annotator.showAnnotations).to.not.be.called;
        });

        it('should invoke showAnnotations() on the annotator', () => {
            imageBase.annotator = {
                showAnnotations: sandbox.stub()
            };
            imageBase.showAnnotations();
            expect(imageBase.annotator.showAnnotations).to.be.called;
        });

        it('should set annotationsLoaded to true', () => {
            imageBase.annotator = {
                showAnnotations: sandbox.stub()
            };
            imageBase.showAnnotations();
            expect(imageBase.annotationsLoaded).to.be.true;
        });
    });

    describe('isAnnotatable()', () => {
        beforeEach(() => {
            const viewer = { NAME: 'ImageBase', annotations: true };
            imageBase.options.viewers = { ImageBase: viewer };
            imageBase.options.viewer = viewer;
            imageBase.annotationTypes = ['point'];
        });

        it('should return false if not using point annotations', () => {
            const result = imageBase.isAnnotatable('highlight');
            expect(result).to.be.false;
        });

        it('should return viewer permissions if set', () => {
            expect(imageBase.isAnnotatable('point')).to.be.true;
            imageBase.options.viewers.ImageBase.annotations = false;
            expect(imageBase.isAnnotatable('point')).to.be.false;
        });

        it('should return global preview permissions if viewer permissions is not set', () => {
            imageBase.options.showAnnotations = true;
            imageBase.options.viewers.ImageBase.annotations = 'notboolean';
            const result = imageBase.isAnnotatable('point');
            expect(result).to.be.true;
        });
    });

    describe('getPointModeClickHandler()', () => {
        it('should do nothing if not annotatable', () => {
            sandbox.stub(imageBase, 'isAnnotatable').returns(false);
            const handler = imageBase.getPointModeClickHandler();
            expect(handler).to.be.null;
        });

        it('should return event listener', () => {
            const event = {};
            imageBase.annotator = {
                togglePointModeHandler: sandbox.mock().withArgs(event)
            };
            imageBase.imageEl.classList.add(CSS_CLASS_ZOOMABLE);
            imageBase.imageEl.classList.add(CSS_CLASS_PANNABLE);
            sandbox.stub(imageBase, 'isAnnotatable').returns(true);

            const handler = imageBase.getPointModeClickHandler();
            expect(handler).to.be.a('function');

            handler(event);
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_ZOOMABLE);
            expect(imageBase.imageEl).to.not.have.class(CSS_CLASS_PANNABLE);
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

        it('should do nothing if there annotator is in point placement mode', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.annotator = {
                isInPointMode: sandbox.stub().returns(true)
            };
            imageBase.handleMouseDown(event);
            expect(stubs.pan).to.not.be.called;
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

        it('should do nothing if there annotator is in point placement mode', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            imageBase.annotator = {
                isInPointMode: sandbox.stub().returns(true)
            };
            imageBase.handleMouseUp(event);
            expect(stubs.pan).to.not.be.called;
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

        it('should show annotations after image is ready', () => {
            const showStub = sandbox.stub(imageBase, 'showAnnotations');

            imageBase.finishLoading();
            expect(showStub).to.be.called;
        });
    });
});
