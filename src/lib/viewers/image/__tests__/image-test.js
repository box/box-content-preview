/* eslint-disable no-unused-expressions */
import Image from '../image';
import Browser from '../../../browser';
// import AnnotationService from '../../../annotations/annotation-service';
// import ImageAnnotator from '../../../annotations/image/image-annotator';

const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_PANNING = 'panning';
// const CSS_CLASS_IMAGE = 'box-preview-image';
// const CLASS_INVISIBLE = 'box-preview-is-invisible';

const sandbox = sinon.sandbox.create();
const imageUrl = 'data:image/png;base64,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';
let image;
let stubs = {};
let imageParams;
let containerEl;
let clock;

describe('image.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        fixture.load('viewers/image/__tests__/image-test.html');
        containerEl = document.querySelector('.container');
        imageParams = {
            file: {
                id: '1',
                file_version: {
                    id: '1'
                },
                permissions: {
                    can_annotate: true
                }
            },
            viewerName: 'Image',
            viewers: {
                Image: {
                    annotations: true
                }
            },
            location: {
                locale: 'en-US'
            },
            showAnnotations: true
        };
        image = new Image(containerEl, imageParams);
    });

    afterEach(() => {
        if (image && image.imageEl) {
            image.destroy();
        }
        stubs = {};

        sandbox.verifyAndRestore();
        fixture.cleanup();
        clock.restore();
        image = null;
    });

    describe('destroy()', () => {
        it('should destroy the annotator', () => {
            image.annotator = {
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };

            image.destroy();

            expect(image.annotator.removeAllListeners).to.have.been.called;
            expect(image.annotator.destroy).to.have.been.called;
        });

        it('should remove all the listeners', () => {
            sandbox.stub(image, 'unbindDOMListeners');

            image.destroy();

            expect(image.unbindDOMListeners).to.have.been.called;
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            sandbox.stub(image, 'appendAuthParam').returns(imageUrl);
        });

        it('should fetch the image URL and load an image', () => {
            stubs.event = sandbox.stub(image.imageEl, 'addEventListener');
            stubs.load = sandbox.stub(image, 'onLoadHandler');
            stubs.bind = sandbox.stub(image, 'bindDOMListeners');

            // load the image
            image.load(imageUrl);

            expect(stubs.event).to.have.been.calledWith('load', stubs.load);
            expect(stubs.bind).to.have.been.called;
        });
    });

    describe('updateCursor()', () => {
        it('should make the image pannable', () => {
            image.isZoomable = true;
            image.isPannable = true;
            image.imageEl.classList.add(CSS_CLASS_ZOOMABLE);

            image.updateCursor();

            expect(image.isZoomable).to.have.been.false;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNABLE)).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_ZOOMABLE)).to.have.been.false;
        });

        it('should make the image zoomable', () => {
            image.isZoomable = false;
            image.isPannable = false;
            image.imageEl.classList.add(CSS_CLASS_PANNABLE);

            image.updateCursor();

            expect(image.isZoomable).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_ZOOMABLE)).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNABLE)).to.have.been.false;
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            stubs.cursor = sandbox.stub(image, 'updateCursor');
            image.didPan = true;
        });

        it('should ignore if image does not exist', () => {
            image.imageEl = null;

            image.updatePannability();

            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;
        });

        it('should ignore if in point annotation mode', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(true)
            };

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;
        });

        it('should set pannability to true if rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.height = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();
            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to false if rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to true if non-rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '50px';
            image.wrapperEl.style.height = '10px';
            image.imageEl.style.width = '50px';
            image.wrapperEl.style.width = '10px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to false if non-rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });
    });

    describe('pan()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(image, 'emit');
            image.didPan = false;
        });

        it('should pan to the given position', () => {
            image.isPanning = true;

            image.pan({});

            expect(image.didPan).to.be.true;
            expect(stubs.emit).to.have.been.calledWith('pan');
        });

        it('should not pan if the viewer is not already panning', () => {
            image.isPanning = false;

            image.pan({});

            expect(image.didPan).to.be.false;
            expect(stubs.emit).to.not.have.been.calledWith('pan');
        });
    });

    describe('stopPanning()', () => {
        it('should stop panning, remove listeners, and fire "panend" event', () => {
            image.isPanning = true;

            image.stopPanning();

            expect(image.isPanning).to.be.false;
        });
    });

    describe('startPanning()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.pan = sandbox.stub(image, 'pan');
            stubs.stopPanning = sandbox.stub(image, 'stopPanning');
        });

        it('should not start panning if image is not pannable', () => {
            image.isPannable = false;
            image.isPanning = false;

            image.startPanning();

            expect(image.isPanning).to.be.false;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNING)).to.be.false;
            expect(image.emit).to.not.have.been.calledWith('panstart');
        });

        it('should start panning, remove listeners, and fire "panstart" event', () => {
            image.isPannable = true;
            image.isPanning = false;

            image.startPanning();

            expect(image.isPanning).to.be.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNING)).to.be.true;
            expect(image.emit).to.have.been.calledWith('panstart');
        });
    });

    describe('rotateLeft()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.orientChange = sandbox.stub(image, 'handleOrientationChange');
            image.annotator = {};
            stubs.scale = sandbox.stub(image, 'scaleAnnotations');
            image.currentRotationAngle = 0;
        });

        it('should rotate the image 90 degrees to the left', () => {
            image.rotateLeft();

            expect(image.currentRotationAngle).to.equal(-90);
            expect(image.imageEl.getAttribute('data-rotation-angle')).to.equal('-90');
            expect(image.imageEl.style.transform).to.equal('rotate(-90deg)');
            expect(stubs.emit).to.have.been.calledWith('rotate');
            expect(stubs.orientChange).to.have.been.called;
        });

        it('should re-render annotations if annotator is initialized', () => {
            image.rotateLeft();

            expect(stubs.scale).to.have.been.called;
        });
    });

    describe('zoom()', () => {
        beforeEach(() => {
            sandbox.stub(image, 'appendAuthParam').returns(imageUrl);
            sandbox.stub(image, 'onLoadHandler');

            // Stub out methods called in zoom()
            stubs.adjustZoom = sandbox.stub(image, 'adjustImageZoomPadding');

            // Set image height & width
            image.imageEl.style.width = '100px';
            image.imageEl.style.height = '100px';
            image.wrapperEl.style.width = '50px';
            image.wrapperEl.style.height = '50px';

            image.load(imageUrl);
        });

        describe('should zoom in by modifying', () => {
            it('width', () => {
                image.imageEl.style.width = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoom('in');
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).gt(origImageSize.width);
            });

            it('height', () => {
                image.imageEl.style.height = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomIn();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.height).gt(origImageSize.height);
                expect(stubs.adjustZoom).to.have.been.called;
            });
        });

        describe('should zoom out by modifying', () => {
            it('width', () => {
                image.imageEl.style.width = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomOut();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).lt(origImageSize.width);
                expect(stubs.adjustZoom).to.have.been.called;
            });

            it('height', () => {
                image.imageEl.style.height = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomOut();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.height).lt(origImageSize.height);
                expect(stubs.adjustZoom).to.have.been.called;
            });
        });

        it('should swap height & width is image is rotated', () => {
            sandbox.stub(image, 'isRotated').returns(true);
            image.imageEl.style.width = '200px'; // ensures width > height

            image.load(imageUrl);

            const origImageSize = image.imageEl.getBoundingClientRect();
            image.zoomIn();
            const newImageSize = image.imageEl.getBoundingClientRect();
            expect(newImageSize.height).gt(origImageSize.height);
            expect(stubs.adjustZoom).to.have.been.called;
        });

        it('should scale annotations if annotator exists', () => {
            image.annotator = {};
            sandbox.stub(image, 'scaleAnnotations');

            image.load(imageUrl);

            image.zoomIn();
            expect(image.scaleAnnotations).to.have.been.called;
        });
    });

    describe('scaleAnnotations()', () => {
        it('should scale and rotate annotations accordingly', () => {
            image.annotator = {
                setScale: sandbox.stub(),
                renderAnnotations: sandbox.stub()
            };

            image.currentRotationAngle = -90;
            const [width, height] = [100, 100];

            image.scaleAnnotations(width, height);
            expect(image.annotator.setScale).to.have.been.called;
            expect(image.annotator.renderAnnotations).to.have.been.calledWith(-90);
        });
    });

    describe('loadUI()', () => {
        beforeEach(() => {
            image.annotationsLoaded = false;

            Object.defineProperty(Object.getPrototypeOf(Image.prototype), 'loadUI', {
                value: sandbox.stub()
            });
            image.controls = {
                add: sandbox.stub()
            };
        });

        it('should load UI & controls', () => {
            image.annotator = null;

            image.loadUI();
            expect(image.controls.add).to.have.been.called; // Check that it's been called 4 times
            expect(image.annotationsLoaded).to.be.false;
        });

        it('should show annotations after image is rendered', () => {
            image.annotator = {
                showAnnotations: sandbox.stub()
            };

            image.loadUI();
            expect(image.annotator.showAnnotations).to.have.been.called;
            expect(image.annotationsLoaded).to.be.true;
        });
    });

    describe('initAnnotations()', () => {
        beforeEach(() => {
            stubs.annotatable = sandbox.stub(image, 'isAnnotatable');
            stubs.isMobile = sandbox.stub(Browser, 'isMobile').returns(false);
        });

        it('should not init annotations if image is not annotatable', () => {
            stubs.annotatable.returns(false);
            image.annotator = undefined;

            image.initAnnotations();
            expect(image.annotator).to.be.undefined;
        });

        it('should init annotations if user can annotate', () => {
            stubs.annotatable.returns(true);

            image.initAnnotations();
            expect(image.canAnnotate).to.be.true;
            expect(image.annotator).to.not.be.undefined;
        });

        it('should init annotations if user cannot annotate', () => {
            image.options.file.permissions.can_annotate = false;
            stubs.annotatable.returns(true);

            image.initAnnotations();
            expect(image.canAnnotate).to.be.false;
            expect(image.annotator).to.not.be.undefined;
        });
    });

    describe('isAnnotatable()', () => {
        it('should return false if not using point annotations', () => {
            const result = image.isAnnotatable('highlight');
            expect(result).to.be.false;
        });

        it('should return viewer permissions if set', () => {
            const result1 = image.isAnnotatable('point');
            image.options.viewers[image.options.viewerName].annotations = false;
            const result2 = image.isAnnotatable('point');
            expect(result1).to.be.true;
            expect(result2).to.be.false;
        });

        it('should return global preview permissions if viewer permissions is not set', () => {
            image.options.viewers[image.options.viewerName].annotations = 'notboolean';
            const result = image.isAnnotatable('point');
            expect(result).to.be.true;
        });
    });

    describe('isRotated()', () => {
        it('should return false if image is not rotated', () => {
            const result = image.isRotated();
            expect(result).to.be.false;
        });

        it('should return true if image is rotated', () => {
            image.currentRotationAngle = 90;
            const result = image.isRotated();
            expect(result).to.be.true;
        });
    });

    describe('adjustImageZoomPadding()', () => {
        beforeEach(() => {
            // Set wrapper dimensions
            image.wrapperEl.style.height = '200px';
            image.wrapperEl.style.width = '100px';

            // Set image dimensions
            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '25px';
        });

        it('should adjust zoom padding accordingly if image is rotated', () => {
            stubs.rotated = sandbox.stub(image, 'isRotated').returns(true);
            image.adjustImageZoomPadding();
            expect(stubs.rotated).to.have.been.called;
            expect(image.imageEl.style.left).to.equal('37.5px');
            expect(image.imageEl.style.top).to.equal('75px');
        });

        it('should adjust zoom padding accordingly if image is not rotated', () => {
            image.adjustImageZoomPadding();
            expect(image.imageEl.style.left).to.equal('37.5px');
            expect(image.imageEl.style.top).to.equal('75px');
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            image.imageEl.addEventListener = sandbox.stub();
            stubs.listeners = image.imageEl.addEventListener;
            stubs.isMobile = sandbox.stub(Browser, 'isMobile').returns(true);
        });

        it('should bind all default image listeners', () => {
            stubs.isMobile.returns(false);
            image.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('mousedown', image.handleMouseDown);
            expect(stubs.listeners).to.have.been.calledWith('mouseup', image.handleMouseUp);
            expect(stubs.listeners).to.have.been.calledWith('dragstart', image.handleDragStart);
        });

        it('should bind all mobile and iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            image.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
            expect(stubs.listeners).to.have.been.calledWith('gesturestart', image.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('gestureend', image.mobileZoomEndHandler);
        });

        it('should bind all mobile and non-iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(false);
            image.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
            expect(stubs.listeners).to.have.been.calledWith('touchstart', image.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchmove', image.mobileZoomChangeHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchend', image.mobileZoomEndHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            document.removeEventListener = sandbox.stub();
            image.imageEl.removeEventListener = sandbox.stub();
            stubs.listeners = image.imageEl.removeEventListener;
            stubs.isMobile = sandbox.stub(Browser, 'isMobile').returns(true);
        });

        it('should unbind all default image listeners', () => {
            stubs.isMobile.returns(false);
            image.unbindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('mousedown', image.handleMouseDown);
            expect(stubs.listeners).to.have.been.calledWith('mouseup', image.handleMouseUp);
            expect(stubs.listeners).to.have.been.calledWith('dragstart', image.handleDragStart);
        });

        it('should unbind all default image listeners if imageEl does not exist', () => {
            image.imageEl = null;
            stubs.isMobile.returns(false);
            image.unbindDOMListeners();
            expect(stubs.listeners).to.not.have.been.calledWith('mousedown', image.handleMouseDown);
            expect(stubs.listeners).to.not.have.been.calledWith('mouseup', image.handleMouseUp);
            expect(stubs.listeners).to.not.have.been.calledWith('dragstart', image.handleDragStart);
            expect(document.removeEventListener).to.have.been.calledTwice;
        });

        it('should unbind all mobile and iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            image.unbindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
            expect(stubs.listeners).to.have.been.calledWith('gesturestart', image.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('gestureend', image.mobileZoomEndHandler);
        });

        it('should unbind all mobile and non-iOS listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(false);
            image.unbindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
            expect(stubs.listeners).to.have.been.calledWith('touchstart', image.mobileZoomStartHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchmove', image.mobileZoomChangeHandler);
            expect(stubs.listeners).to.have.been.calledWith('touchend', image.mobileZoomEndHandler);
        });
    });

    describe('onLoadHandler()', () => {
        beforeEach(() => {
            image.loaded = false;
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.zoom = sandbox.stub(image, 'zoom');
            stubs.loadUI = sandbox.stub(image, 'loadUI');
        });

        it('should do nothing if already destroyed', () => {
            image.destroyed = true;
            image.onLoadHandler();
            expect(image.loaded).to.be.false;
            expect(stubs.emit).to.not.have.been.called;
            expect(stubs.zoom).to.not.have.been.called;
            expect(stubs.loadUI).to.not.have.been.called;
        });

        it('should load UI if not destroyed', () => {
            image.onLoadHandler();
            expect(image.loaded).to.be.true;
            expect(stubs.emit).to.have.been.called;
            expect(stubs.zoom).to.have.been.called;
            expect(stubs.loadUI).to.have.been.called;
        });
    });

    describe('handleMouseDown()', () => {
        beforeEach(() => {
            stubs.pan = sandbox.stub(image, 'startPanning');
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
            image.handleMouseDown(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            image.handleMouseDown(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            image.handleMouseDown(event);
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
            image.handleMouseDown(event);
            expect(stubs.pan).to.have.been.called;
        });
    });

    describe('handleMouseUp()', () => {
        beforeEach(() => {
            stubs.pan = sandbox.stub(image, 'stopPanning');
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            stubs.point = image.annotator.isInPointMode;
            stubs.zoom = sandbox.stub(image, 'zoom');
            image.isPanning = false;
        });

        it('should do nothing if in point annotation mode', () => {
            stubs.point.returns(true);
            image.handleMouseUp();
            expect(stubs.zoom).to.not.have.been.called;
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
            image.handleMouseUp(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            image.handleMouseUp(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            image.handleMouseUp(event);
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
            image.isZoomable = true;
            image.handleMouseUp(event);
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
            image.isZoomable = false;
            image.didPan = false;
            image.handleMouseUp(event);
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
            image.isZoomable = false;
            image.didPan = true;
            image.handleMouseUp(event);
            expect(stubs.zoom).to.not.have.been.called;
        });
    });

    describe('handleOrientationChange()', () => {
        beforeEach(() => {
            stubs.padding = sandbox.stub(image, 'adjustImageZoomPadding');
            image.annotator = {
                setScale: sandbox.stub(),
                renderAnnotations: sandbox.stub()
            };
            stubs.scale = image.annotator.setScale;
            stubs.render = image.annotator.renderAnnotations;
        });

        it('should adjust zoom padding if annotator does not exist', () => {
            image.annotator = null;
            image.handleOrientationChange();
            expect(stubs.padding).to.have.been.called;
            expect(stubs.scale).to.not.have.been.called;
            expect(stubs.render).to.not.have.been.called;
        });

        it('should also re-render annotations if annotator exists', () => {
            image.handleOrientationChange();
            expect(stubs.padding).to.have.been.called;
            expect(stubs.scale).to.have.been.called;
            expect(stubs.render).to.have.been.called;
        });
    });

    describe('handleDragStart()', () => {
        it('should prevent drag events on the image', () => {
            const event = {
                preventDefault: sandbox.stub(),
                stopPropogation: sandbox.stub()
            };
            image.handleDragStart(event);
            expect(event.preventDefault).to.have.been.called;
            expect(event.stopPropogation).to.have.been.called;
        });
    });

    describe('getPointModeClickHandler()', () => {
        it('should do nothing if not annotatable', () => {
            sandbox.stub(image, 'isAnnotatable').returns(false);
            const handler = image.getPointModeClickHandler();
            expect(handler).to.be.null;
        });

        it('should return event listener', () => {
            const handler = image.getPointModeClickHandler();
            expect(handler).to.be.a('function');
        });
    });
});
