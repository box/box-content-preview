/* eslint-disable no-unused-expressions */
import * as util from '../../../util';
import Api from '../../../api';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import ControlsRoot from '../../controls/controls-root';
import ImageBaseViewer from '../ImageBaseViewer';
import fullscreen from '../../../Fullscreen';
import { VIEWER_EVENT } from '../../../events';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';

let stubs = {};
let imageBase;
let containerEl;

describe('lib/viewers/image/ImageBaseViewer', () => {
    beforeEach(() => {
        fixture.load('viewers/image/__tests__/ImageBaseViewer-test.html');
        stubs.emit = jest.spyOn(fullscreen, 'addListener');
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
        fixture.cleanup();

        if (imageBase && typeof imageBase.destroy === 'function') {
            imageBase.destroy();
        }

        imageBase = null;
        stubs = {};
    });

    describe('destroy()', () => {
        test('should cleanup the image base viewer', () => {
            imageBase.loadUI();
            imageBase.imageEl.addEventListener('mouseup', imageBase.handleMouseUp);

            jest.spyOn(imageBase.controls, 'destroy').mockImplementation();
            jest.spyOn(imageBase.imageEl, 'removeEventListener');

            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'destroy', {
                value: jest.fn(),
            });

            imageBase.destroy();

            expect(imageBase.controls.destroy).toBeCalled();
            expect(imageBase.imageEl.removeEventListener).toBeCalledWith('mouseup', imageBase.handleMouseUp);
            expect(BaseViewer.prototype.destroy).toBeCalled();
        });

        test('should remove all the listeners', () => {
            jest.spyOn(imageBase, 'unbindDOMListeners');

            imageBase.destroy();

            expect(imageBase.unbindDOMListeners).toBeCalled();
        });
    });

    describe('zoomIn()', () => {
        test('should zoom in image', () => {
            jest.spyOn(imageBase, 'zoom');

            imageBase.zoomIn();

            expect(imageBase.zoom).toBeCalledWith('in');
        });
    });

    describe('zoomOut()', () => {
        test('should zoom out image', () => {
            jest.spyOn(imageBase, 'zoom');

            imageBase.zoomOut();

            expect(imageBase.zoom).toBeCalledWith('out');
        });
    });

    describe('resize()', () => {
        test('should resize image', () => {
            jest.spyOn(imageBase, 'zoom');

            Object.defineProperty(Object.getPrototypeOf(ImageBaseViewer.prototype), 'resize', {
                value: jest.fn(),
            });

            imageBase.resize();

            expect(imageBase.zoom).toBeCalled();
            expect(BaseViewer.prototype.resize).toBeCalled();
        });
    });

    describe('updateCursor()', () => {
        test('should make the image pannable', () => {
            imageBase.isZoomable = true;
            imageBase.isPannable = true;
            imageBase.imageEl.classList.add(CSS_CLASS_ZOOMABLE);

            imageBase.updateCursor();

            expect(imageBase.isZoomable).toBe(false);
            expect(imageBase.imageEl).toHaveClass(CSS_CLASS_PANNABLE);
            expect(imageBase.imageEl).not.toHaveClass(CSS_CLASS_ZOOMABLE);
        });

        test('should make the image zoomable', () => {
            imageBase.isZoomable = false;
            imageBase.isPannable = false;
            imageBase.imageEl.classList.add(CSS_CLASS_PANNABLE);

            imageBase.updateCursor();

            expect(imageBase.isZoomable).toBe(true);
            expect(imageBase.imageEl).toHaveClass(CSS_CLASS_ZOOMABLE);
            expect(imageBase.imageEl).not.toHaveClass(CSS_CLASS_PANNABLE);
        });
    });

    describe('startPanning()', () => {
        beforeEach(() => {
            imageBase.wrapperEl = document.createElement('img');
        });

        beforeEach(() => {
            stubs.emit = jest.spyOn(imageBase, 'emit');
            stubs.pan = jest.spyOn(imageBase, 'pan');
            stubs.stopPanning = jest.spyOn(imageBase, 'stopPanning');
        });

        test('should not start panning if image is not pannable', () => {
            imageBase.isPannable = false;
            imageBase.isPanning = false;

            imageBase.startPanning();

            expect(imageBase.isPanning).toBe(false);
            expect(imageBase.imageEl).not.toHaveClass(CSS_CLASS_PANNING);
            expect(imageBase.emit).not.toBeCalledWith('panstart');
        });

        test('should start panning, remove listeners, and fire "panstart" event', () => {
            imageBase.isPannable = true;
            imageBase.isPanning = false;

            imageBase.startPanning();

            expect(imageBase.isPanning).toBe(true);
            expect(imageBase.imageEl).toHaveClass(CSS_CLASS_PANNING);
            expect(imageBase.emit).toBeCalledWith('panstart');
        });
    });

    describe('pan()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(imageBase, 'emit');
            imageBase.wrapperEl = document.createElement('img');
            imageBase.didPan = false;
        });

        test('should pan to the given position', () => {
            imageBase.isPanning = true;

            imageBase.pan({});

            expect(imageBase.didPan).toBe(true);
            expect(stubs.emit).toBeCalledWith('pan');
        });

        test('should not pan if the viewer is not already panning', () => {
            imageBase.isPanning = false;

            imageBase.pan({});

            expect(imageBase.didPan).toBe(false);
            expect(stubs.emit).not.toBeCalledWith('pan');
        });
    });

    describe('stopPanning()', () => {
        test('should stop panning, remove listeners, and fire "panend" event', () => {
            jest.spyOn(imageBase, 'emit');
            imageBase.isPanning = true;

            imageBase.stopPanning();

            expect(imageBase.isPanning).toBe(false);
        });
    });

    describe('loadUI()', () => {
        test('should create the controls root instance', () => {
            imageBase.loadUI();

            expect(imageBase.controls).toBeInstanceOf(ControlsRoot);
        });
    });

    describe('setOriginalImageSize()', () => {
        test('should use the naturalHeight and naturalWidth when available', done => {
            const imageEl = {
                naturalWidth: 100,
                naturalHeight: 100,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: name => imageEl[name],
            };

            imageBase
                .setOriginalImageSize(imageEl)
                .then(() => {
                    expect(imageEl.getAttribute('originalWidth')).toBe(imageEl.naturalWidth);
                    expect(imageEl.getAttribute('originalHeight')).toBe(imageEl.naturalHeight);
                    done();
                })
                .catch(() => {
                    fail();
                });
        });

        test('should default to 300x150 when naturalHeight and naturalWidth are 0x0', done => {
            jest.spyOn(stubs.api, 'get').mockResolvedValue('not real a image');

            const imageEl = {
                naturalWidth: 0,
                naturalHeight: 0,
                setAttribute: (name, value) => {
                    imageEl[name] = value;
                },
                getAttribute: name => imageEl[name],
            };

            imageBase
                .setOriginalImageSize(imageEl)
                .then(() => {
                    expect(imageEl.getAttribute('originalWidth')).toBe(300);
                    expect(imageEl.getAttribute('originalHeight')).toBe(150);
                    done();
                })
                .catch(() => {
                    fail();
                });
        });

        test('should resolve when the get call fails', done => {
            jest.spyOn(stubs.api, 'get').mockRejectedValue(undefined);

            imageBase
                .setOriginalImageSize({})
                .then(() => {
                    throw new Error('failed');
                })
                .catch(() => done());
        });
    });

    describe('handleMouseDown()', () => {
        beforeEach(() => {
            stubs.pan = jest.spyOn(imageBase, 'startPanning');
        });

        test('should do nothing if incorrect click type', () => {
            const event = {
                button: 3,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.handleMouseDown(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            imageBase.handleMouseDown(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            imageBase.handleMouseDown(event);
            expect(stubs.pan).not.toBeCalled();
        });

        test('should start panning if correct click type', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.handleMouseDown(event);
            expect(stubs.pan).toBeCalled();
        });
    });

    describe('handleMouseUp()', () => {
        beforeEach(() => {
            stubs.emitMetric = jest.spyOn(imageBase, 'emitMetric');
            stubs.pan = jest.spyOn(imageBase, 'stopPanning');
            stubs.zoom = jest.spyOn(imageBase, 'zoom');
            imageBase.isPanning = false;
        });

        test('should do nothing if incorrect click type', () => {
            const event = {
                button: 3,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.handleMouseUp(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            imageBase.handleMouseUp(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).not.toBeCalled();
            expect(stubs.emitMetric).not.toBeCalled();
        });

        test('should zoom in if zoomable but not pannable', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.isZoomable = true;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).toBeCalledWith('in');
            expect(stubs.emitMetric).toBeCalledWith('zoom', 'inClick');
        });

        test('should reset zoom if mouseup was not due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.isZoomable = false;
            imageBase.didPan = false;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).toBeCalledWith('reset');
            expect(stubs.emitMetric).toBeCalledWith('zoom', 'resetClick');
        });

        test('should not zoom if mouse up was due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: jest.fn(),
            };
            imageBase.isZoomable = false;
            imageBase.didPan = true;
            imageBase.handleMouseUp(event);
            expect(stubs.zoom).not.toBeCalled();
        });
    });

    describe('cancelDragEvent()', () => {
        test('should prevent drag events on the image', () => {
            const event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
            imageBase.cancelDragEvent(event);
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });
    });

    describe('onKeydown', () => {
        test('should return false when controls are not ready', () => {
            const consumed = imageBase.onKeydown();

            expect(consumed).toBe(false);
        });

        test('should zoom in and return true when zoom in short cut is triggered', () => {
            imageBase.loadUI();

            jest.spyOn(imageBase, 'zoomIn');

            const consumed = imageBase.onKeydown('Shift++');

            expect(imageBase.zoomIn).toBeCalled();
            expect(consumed).toBe(true);
        });

        test('should zoom in and return true when zoom out short cut is triggered', () => {
            imageBase.loadUI();

            jest.spyOn(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown('Shift+_');

            expect(imageBase.zoomOut).toBeCalled();
            expect(consumed).toBe(true);
        });

        test('should return false if neither zoom keyboard short cuts are triggered', () => {
            imageBase.loadUI();

            jest.spyOn(imageBase, 'zoomIn');
            jest.spyOn(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown();

            expect(imageBase.zoomIn).not.toBeCalled();
            expect(imageBase.zoomOut).not.toBeCalled();
            expect(consumed).toBe(false);
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            imageBase.imageEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            };
            imageBase.wrapperEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            };

            jest.spyOn(document, 'addEventListener');
            stubs.listeners = imageBase.imageEl.addEventListener;
            stubs.wrapperListeners = imageBase.wrapperEl.addEventListener;
            imageBase.isMobile = true;
            imageBase.mobileZoomStartHandler = imageBase.mobileZoomStartHandler.bind(imageBase);
            imageBase.mobileZoomChangeHandler = imageBase.mobileZoomChangeHandler.bind(imageBase);
            imageBase.mobileZoomEndHandler = imageBase.mobileZoomEndHandler.bind(imageBase);
        });

        test('should bind all default image listeners', () => {
            imageBase.bindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('mousedown', imageBase.handleMouseDown);
            expect(stubs.listeners).toBeCalledWith('mouseup', imageBase.handleMouseUp);
            expect(stubs.listeners).toBeCalledWith('dragstart', imageBase.cancelDragEvent);
        });

        test('should bind wheel listener on wrapper for trackpad zoom', () => {
            imageBase.bindDOMListeners();
            expect(stubs.wrapperListeners).toBeCalledWith('wheel', imageBase.wheelZoomHandler, { passive: false });
        });

        test('should bind all iOS listeners when hasTouch is true', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            imageBase.bindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('gesturestart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).toBeCalledWith('gestureend', imageBase.mobileZoomEndHandler);
        });

        test('should bind all touch listeners when hasTouch is true and not iOS', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            imageBase.bindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('touchstart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).toBeCalledWith('touchmove', imageBase.mobileZoomChangeHandler);
            expect(stubs.listeners).toBeCalledWith('touchend', imageBase.mobileZoomEndHandler);
        });

        test('should not bind touch listeners when hasTouch is false', () => {
            imageBase.isMobile = false;
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            imageBase.bindDOMListeners();
            expect(stubs.listeners).not.toBeCalledWith('touchstart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).not.toBeCalledWith('gesturestart', imageBase.mobileZoomStartHandler);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            imageBase.imageEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            };
            imageBase.wrapperEl = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            };

            imageBase.imageEl.removeEventListener = jest.fn();
            stubs.listeners = imageBase.imageEl.removeEventListener;
            stubs.wrapperListeners = imageBase.wrapperEl.removeEventListener;
            stubs.documentListener = jest.spyOn(document, 'removeEventListener');
            imageBase.hasTouch = true;
        });

        test('should unbind all default image listeners if imageEl does not exist', () => {
            imageBase.imageEl = null;

            imageBase.unbindDOMListeners();
            expect(stubs.listeners).not.toBeCalledWith('mousedown', imageBase.handleMouseDown);
            expect(stubs.listeners).not.toBeCalledWith('mouseup', imageBase.handleMouseUp);
            expect(stubs.listeners).not.toBeCalledWith('dragstart', imageBase.cancelDragEvent);
        });

        test('should unbind all iOS listeners', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            imageBase.unbindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('gesturestart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).toBeCalledWith('gestureend', imageBase.mobileZoomEndHandler);
        });

        test('should unbind wheel listener from wrapper', () => {
            imageBase.unbindDOMListeners();
            expect(stubs.wrapperListeners).toBeCalledWith('wheel', imageBase.wheelZoomHandler);
        });

        test('should unbind all document listeners', () => {
            imageBase.unbindDOMListeners();
            expect(stubs.documentListener).toBeCalledWith('mousemove', imageBase.pan);
            expect(stubs.documentListener).toBeCalledWith('mouseup', imageBase.stopPanning);
        });

        test('should unbind all non-iOS listeners', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            imageBase.unbindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('touchstart', imageBase.mobileZoomStartHandler);
            expect(stubs.listeners).toBeCalledWith('touchmove', imageBase.mobileZoomChangeHandler);
            expect(stubs.listeners).toBeCalledWith('touchend', imageBase.mobileZoomEndHandler);
        });
    });

    describe('wheelZoomHandler()', () => {
        beforeEach(() => {
            // Set up imageEl and wrapperEl with measurable geometry
            imageBase.imageEl.style.width = '100px';
            imageBase.imageEl.setAttribute('originalWidth', '100');
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 100, configurable: true });
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValueOnce({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 })
                .mockReturnValue({ left: 0, top: 0, width: 105, height: 105, right: 105, bottom: 105 });
            imageBase.wrapperEl = document.createElement('div');
            imageBase.wrapperEl.scrollLeft = 0;
            imageBase.wrapperEl.scrollTop = 0;
            imageBase.wrapperEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValue({ left: 0, top: 0, width: 800, height: 600 });
            imageBase.updatePannability = jest.fn();
            // Pre-set isPinching so most tests skip the hit-test logic
            imageBase.isPinching = true;
            jest.spyOn(imageBase, 'emit').mockImplementation();
            jest.spyOn(imageBase, 'featureEnabled').mockImplementation(feature => feature === 'pinchToZoom.enabled');
        });

        test('should do nothing if pinchToZoom.enabled feature is off', () => {
            imageBase.featureEnabled.mockReturnValue(false);
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(event.preventDefault).not.toBeCalled();
            expect(imageBase.emit).not.toBeCalled();
        });

        test('should do nothing if ctrlKey is not pressed', () => {
            imageBase.wheelZoomHandler({
                clientX: 0,
                clientY: 0,
                ctrlKey: false,
                deltaY: -5,
                preventDefault: jest.fn(),
            });
            expect(imageBase.emit).not.toBeCalled();
        });

        test('should do nothing if wrapperEl is missing', () => {
            imageBase.wrapperEl = null;
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(event.preventDefault).not.toBeCalled();
            expect(imageBase.emit).not.toBeCalled();
        });

        test('should not start pinch if cursor is outside the image', () => {
            imageBase.isPinching = false;
            imageBase.imageEl.getBoundingClientRect = jest.fn().mockReturnValue({
                left: 100,
                top: 100,
                right: 200,
                bottom: 200,
                width: 100,
                height: 100,
            });
            // Cursor at (50, 50) is outside the image rect (100-200, 100-200)
            const event = { clientX: 50, clientY: 50, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(event.preventDefault).not.toBeCalled();
            expect(imageBase.emit).not.toBeCalled();
        });

        test('should start pinch if cursor is over the image', () => {
            imageBase.isPinching = false;
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValueOnce({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 })
                .mockReturnValue({ left: 0, top: 0, right: 105, bottom: 105, width: 105, height: 105 });
            const event = { clientX: 50, clientY: 50, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(event.preventDefault).toBeCalled();
            expect(imageBase.isPinching).toBe(true);
        });

        test('should preventDefault and apply proportional zoom on pinch in', () => {
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(event.preventDefault).toBeCalled();
            // deltaY=-5, delta=0.05, newWidth = 100 * 1.05 = 105
            expect(imageBase.imageEl.style.width).toBe('105px');
            expect(imageBase.imageEl.style.height).toBe('');
        });

        test('should apply proportional zoom on pinch out', () => {
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: 5, preventDefault: jest.fn() };
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValueOnce({ left: 0, top: 0, width: 100, height: 100 })
                .mockReturnValue({ left: 0, top: 0, width: 95, height: 95 });

            imageBase.wheelZoomHandler(event);
            // deltaY=5, delta=-0.05, newWidth = 100 * 0.95 = 95
            expect(imageBase.imageEl.style.width).toBe('95px');
        });

        test('should call setScale with width and null height', () => {
            imageBase.setScale = jest.fn();
            imageBase.wheelZoomHandler({
                clientX: 0,
                clientY: 0,
                ctrlKey: true,
                deltaY: -5,
                preventDefault: jest.fn(),
            });
            expect(imageBase.setScale).toBeCalledWith(105, null);
        });

        test('should emit zoom event with [width, height] array and zoom capability flags', () => {
            Object.defineProperty(imageBase.imageEl, 'offsetHeight', { value: 100, configurable: true });
            imageBase.wheelZoomHandler({
                clientX: 0,
                clientY: 0,
                ctrlKey: true,
                deltaY: -5,
                preventDefault: jest.fn(),
            });
            expect(imageBase.emit).toBeCalledWith('zoom', {
                newScale: [105, 100],
                canZoomIn: true,
                canZoomOut: true,
            });
        });

        test('should clamp zoom to minimum scale (10% of original)', () => {
            // originalWidth=100, so minWidth = 100 * 0.1 = 10
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 11, configurable: true });
            Object.defineProperty(imageBase.imageEl, 'offsetHeight', { value: 11, configurable: true });
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValue({ left: 0, top: 0, width: 10, height: 10 });
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: 100, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(imageBase.imageEl.style.width).toBe('10px');
        });

        test('should clamp zoom to maximum scale (10000% of original)', () => {
            // originalWidth=100, so maxWidth = 100 * 100 = 10000
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 9999, configurable: true });
            Object.defineProperty(imageBase.imageEl, 'offsetHeight', { value: 9999, configurable: true });
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValue({ left: 0, top: 0, width: 10000, height: 10000 });
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: -100, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(imageBase.imageEl.style.width).toBe('10000px');
        });

        test('should report canZoomOut as false at minimum scale', () => {
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 11, configurable: true });
            Object.defineProperty(imageBase.imageEl, 'offsetHeight', { value: 10, configurable: true });
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValue({ left: 0, top: 0, width: 10, height: 10 });
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: 100, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(imageBase.emit).toBeCalledWith('zoom', expect.objectContaining({ canZoomOut: false }));
        });

        test('should report canZoomIn as false at maximum scale', () => {
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 9999, configurable: true });
            Object.defineProperty(imageBase.imageEl, 'offsetHeight', { value: 10000, configurable: true });
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValue({ left: 0, top: 0, width: 10000, height: 10000 });
            const event = { clientX: 0, clientY: 0, ctrlKey: true, deltaY: -100, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);
            expect(imageBase.emit).toBeCalledWith('zoom', expect.objectContaining({ canZoomIn: false }));
        });

        test('should call updatePannability', () => {
            imageBase.wheelZoomHandler({
                clientX: 0,
                clientY: 0,
                ctrlKey: true,
                deltaY: -5,
                preventDefault: jest.fn(),
            });
            expect(imageBase.updatePannability).toBeCalled();
        });

        test('should anchor zoom at cursor by adjusting wrapperEl scroll', () => {
            // Cursor at (50, 50) within a 100x100 image rooted at (0, 0); image grows to 105x105.
            // Image point under cursor = (50, 50). After zoom, same point is at (50 * 1.05, 50 * 1.05) = (52.5, 52.5).
            // Scroll delta should push it back to (50, 50) → +2.5 on each axis.
            imageBase.wrapperEl.scrollLeft = 0;
            imageBase.wrapperEl.scrollTop = 0;
            const event = { clientX: 50, clientY: 50, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);

            expect(imageBase.wrapperEl.scrollLeft).toBeCloseTo(2.5);
            expect(imageBase.wrapperEl.scrollTop).toBeCloseTo(2.5);
        });

        test('should clamp left edge to initial rect when zooming out', () => {
            // Image is zoomed in: 200px wide, positioned at left=-50 (overflows left of initial).
            // Initial rect has left=50. On zoom out, cursor-anchoring would push left to 60 (past initial).
            // Clamping should pin it to initialRect.left=50.
            Object.defineProperty(imageBase.imageEl, 'offsetWidth', { value: 200, configurable: true });
            imageBase.initialWidth = 100;
            imageBase.initialRect = { left: 50, top: 50, right: 150, bottom: 150 };
            imageBase.imageEl.getBoundingClientRect = jest
                .fn()
                .mockReturnValueOnce({ left: -50, top: -50, width: 200, height: 200 }) // before resize
                .mockReturnValue({ left: -50, top: -50, width: 190, height: 190 }); // after resize

            const event = { clientX: 50, clientY: 50, ctrlKey: true, deltaY: 5, preventDefault: jest.fn() };
            imageBase.wheelZoomHandler(event);

            // The image left edge should not go past initialRect.left (50 relative to wrapper)
            const imageRect = imageBase.imageEl.getBoundingClientRect();
            const wrapperRect = imageBase.wrapperEl.getBoundingClientRect();
            const finalLeft = imageRect.left - wrapperRect.left + imageBase.wrapperEl.scrollLeft;
            expect(finalLeft).toBeLessThanOrEqual(50);
        });

        test('should not apply clamping when zooming in', () => {
            // Even with initialRect set, zoom-in should use pure cursor-anchoring
            imageBase.initialRect = { left: 50, top: 50, right: 150, bottom: 150 };
            imageBase.initialWidth = 100;
            const event = { clientX: 50, clientY: 50, ctrlKey: true, deltaY: -5, preventDefault: jest.fn() };

            imageBase.wheelZoomHandler(event);

            // Should still apply cursor-anchoring (scroll adjusts)
            expect(imageBase.wrapperEl.scrollLeft).toBeCloseTo(2.5);
            expect(imageBase.wrapperEl.scrollTop).toBeCloseTo(2.5);
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            imageBase.loaded = false;
            stubs.zoom = jest.spyOn(imageBase, 'zoom');
            stubs.loadUI = jest.spyOn(imageBase, 'loadUI');
            stubs.setOriginalImageSize = jest.spyOn(imageBase, 'setOriginalImageSize');
            imageBase.options = {
                file: {
                    id: 1,
                },
                viewer: {
                    viewerName: 'Image',
                },
            };
        });

        test('should do nothing if already destroyed', () => {
            imageBase.destroyed = true;
            stubs.emit = jest.spyOn(imageBase, 'emit');

            imageBase.finishLoading();
            expect(imageBase.loaded).toBe(false);
            expect(stubs.emit).not.toBeCalled();
            expect(stubs.zoom).not.toBeCalled();
            expect(stubs.setOriginalImageSize).not.toBeCalled();
            expect(stubs.loadUI).not.toBeCalled();
        });

        test('should load UI if not destroyed', done => {
            stubs.setOriginalImageSize.mockResolvedValue(undefined);

            imageBase.on(VIEWER_EVENT.load, () => {
                expect(imageBase.loaded).toBe(true);
                expect(stubs.zoom).toBeCalled();
                expect(stubs.loadUI).toBeCalled();
                done();
            });

            imageBase.destroyed = false;
            imageBase.finishLoading();

            expect(stubs.setOriginalImageSize).toBeCalled();
        });
    });

    describe('disableViewerControls()', () => {
        test('should disable viewer controls', () => {
            imageBase.controls = {
                disable: jest.fn(),
            };
            jest.spyOn(imageBase, 'unbindDOMListeners');
            imageBase.disableViewerControls();
            expect(imageBase.controls.disable).toBeCalled();
            expect(imageBase.unbindDOMListeners).toBeCalled();
            expect(imageBase.imageEl).not.toHaveClass(CSS_CLASS_ZOOMABLE);
            expect(imageBase.imageEl).not.toHaveClass(CSS_CLASS_PANNABLE);
        });
    });

    describe('enableViewerControls()', () => {
        beforeEach(() => {
            imageBase.wrapperEl = document.createElement('div');
        });

        test('should enable viewer controls', () => {
            imageBase.controls = {
                enable: jest.fn(),
            };
            imageBase.isMobile = true;
            jest.spyOn(imageBase, 'bindDOMListeners');
            jest.spyOn(imageBase, 'updateCursor');
            imageBase.enableViewerControls();
            expect(imageBase.controls.enable).toBeCalled();
            expect(imageBase.bindDOMListeners).toBeCalled();
            expect(imageBase.updateCursor).not.toBeCalled();
        });

        test('should update cursor if not on mobile', () => {
            imageBase.controls = {
                enable: jest.fn(),
            };
            imageBase.isMobile = false;
            jest.spyOn(imageBase, 'bindDOMListeners');
            jest.spyOn(imageBase, 'updateCursor');
            imageBase.enableViewerControls();
            expect(imageBase.updateCursor).toBeCalled();
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.execCommand = jest.fn();
            stubs.focus = jest.fn();
            stubs.print = jest.fn();
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
                    querySelectorAll: jest.fn(() => containerEl.querySelectorAll('img')),
                },
                removeEventListener() {},
            };

            stubs.openContentInsideIframe = jest
                .spyOn(util, 'openContentInsideIframe')
                .mockReturnValue(stubs.mockIframe);
            stubs.getName = jest.spyOn(Browser, 'getName');
        });

        test('should open the content inside an iframe, center, and focus', () => {
            imageBase.print();
            expect(stubs.openContentInsideIframe).toBeCalled();
            expect(imageBase.printImages[0].getAttribute('style')).toBe('display: block; margin: 0 auto; width: 100%');
            expect(stubs.focus).toBeCalled();
        });

        test('should execute the print command if the browser is Explorer', done => {
            stubs.getName.mockReturnValue('Explorer');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.execCommand).toBeCalledWith('print', false, null);

                done();
            };

            imageBase.print();
        });

        test('should execute the print command if the browser is Edge', done => {
            stubs.getName.mockReturnValue('Edge');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.execCommand).toBeCalledWith('print', false, null);

                done();
            };

            imageBase.print();
        });

        test('should call the contentWindow print for other browsers', done => {
            stubs.getName.mockReturnValue('Chrome');
            stubs.mockIframe.addEventListener = (type, callback) => {
                callback();
                expect(stubs.print).toBeCalled();

                done();
            };

            imageBase.print();
        });
    });
});
