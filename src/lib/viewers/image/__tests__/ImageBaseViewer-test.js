/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import ImageBaseViewer from '../ImageBaseViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import fullscreen from '../../../Fullscreen';
import PreviewError from '../../../PreviewError';
import { VIEWER_EVENT } from '../../../events';
import * as util from '../../../util';

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
        stubs.api = new Api();
        imageBase = new ImageBaseViewer({
            api: stubs.api,
            file: {
                id: '1234',
            },
        });
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
                value: sandbox.stub(),
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
                value: sandbox.stub(),
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
            expect(imageBase.zoomControls).to.not.be.undefined;
        });
    });

    describe('setOriginalImageSize()', () => {
        it('should use the naturalHeight and naturalWidth when available', done => {
            const imageEl = {
                naturalWidth: 100,
                naturalHeight: 100,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: name => imageEl[name],
            };

            const promise = imageBase.setOriginalImageSize(imageEl);
            promise
                .then(() => {
                    expect(imageEl.getAttribute('originalWidth')).to.equal(imageEl.naturalWidth);
                    expect(imageEl.getAttribute('originalHeight')).to.equal(imageEl.naturalHeight);
                    done();
                })
                .catch(() => {
                    Assert.fail();
                });
        });

        it('should default to 300x150 when naturalHeight and naturalWidth are 0x0', done => {
            const imageEl = {
                naturalWidth: 0,
                naturalHeight: 0,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: name => imageEl[name],
            };

            sandbox.stub(stubs.api, 'get').resolves('not real a image');
            const promise = imageBase.setOriginalImageSize(imageEl);
            promise
                .then(() => {
                    expect(imageEl.getAttribute('originalWidth')).to.equal(300);
                    expect(imageEl.getAttribute('originalHeight')).to.equal(150);
                    done();
                })
                .catch(() => {
                    Assert.fail();
                });
        });

        it('should resolve when the get call fails', done => {
            const imageEl = {};
            sandbox.stub(stubs.api, 'get').returns(Promise.reject());
            const promise = imageBase.setOriginalImageSize(imageEl);
            promise.then(() => Assert.fail()).catch(() => done());
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
                preventDefault: sandbox.stub(),
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
                preventDefault: sandbox.stub(),
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
                preventDefault: sandbox.stub(),
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
                preventDefault: sandbox.stub(),
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
                preventDefault: sandbox.stub(),
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
                preventDefault: sandbox.stub(),
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
                stopPropagation: sandbox.stub(),
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
                removeEventListener: sandbox.stub(),
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
                removeEventListener: sandbox.stub(),
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

    describe('handleDownloadError()', () => {
        const handleDownloadErrorFunc = BaseViewer.prototype.handleDownloadError;

        beforeEach(() => {
            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'handleDownloadError', {
                value: sandbox.stub(),
            });
        });

        afterEach(() => {
            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'handleDownloadError', {
                value: handleDownloadErrorFunc,
            });
        });

        it('should call the parent method with an error display message and the image URL', () => {
            const err = new Error('downloadError');

            imageBase.handleDownloadError(err, 'foo');

            const [error, URL] = BaseViewer.prototype.handleDownloadError.getCall(0).args;
            expect(URL).to.equal('foo');
            expect(error).to.be.instanceof(PreviewError);
            expect(error.code).to.equal('error_content_download');
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            imageBase.loaded = false;
            stubs.zoom = sandbox.stub(imageBase, 'zoom');
            stubs.loadUI = sandbox.stub(imageBase, 'loadUI');
            stubs.setOriginalImageSize = sandbox.stub(imageBase, 'setOriginalImageSize');
            imageBase.options = {
                file: {
                    id: 1,
                },
                viewer: {
                    viewerName: 'Image',
                },
            };
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
        });

        it('should load UI if not destroyed', done => {
            imageBase.on(VIEWER_EVENT.load, () => {
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
                disable: sandbox.stub(),
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
                enable: sandbox.stub(),
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
                enable: sandbox.stub(),
            };
            imageBase.isMobile = false;
            sandbox.stub(imageBase, 'bindDOMListeners');
            sandbox.stub(imageBase, 'updateCursor');
            imageBase.enableViewerControls();
            expect(imageBase.updateCursor).to.be.called;
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.execCommand = sandbox.stub();
            stubs.focus = sandbox.stub();
            stubs.print = sandbox.stub();
            stubs.mockIframe = {
                addEventListener() {},
                contentWindow: {
                    document: {
                        execCommand: stubs.execCommand,
                    },
                    focus: stubs.focus,
                    print: stubs.print,
                },
                contentDocument: {
                    querySelectorAll: sandbox.stub().returns(containerEl.querySelectorAll('img')),
                },
                removeEventListener() {},
            };

            stubs.openContentInsideIframe = sandbox.stub(util, 'openContentInsideIframe').returns(stubs.mockIframe);
            stubs.getName = sandbox.stub(Browser, 'getName');
        });

        it('should open the content inside an iframe, center, and focus', () => {
            imageBase.print();
            expect(stubs.openContentInsideIframe).to.be.called;
            expect(imageBase.printImages[0].getAttribute('style')).to.be.equal(
                'display: block; margin: 0 auto; width: 100%',
            );
            expect(stubs.focus).to.be.called;
        });

        it('should execute the print command if the browser is Explorer', done => {
            stubs.getName.returns('Explorer');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.execCommand).to.be.calledWith('print', false, null);

                done();
            };

            imageBase.print();
        });

        it('should execute the print command if the browser is Edge', done => {
            stubs.getName.returns('Edge');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.execCommand).to.be.calledWith('print', false, null);

                done();
            };

            imageBase.print();
        });

        it('should call the contentWindow print for other browsers', done => {
            stubs.getName.returns('Chrome');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.print).to.be.called;

                done();
            };

            imageBase.print();
        });
    });
});
