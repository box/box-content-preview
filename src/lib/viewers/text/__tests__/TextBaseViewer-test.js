import React from 'react';
import Browser from '../../../Browser';
import * as file from '../../../file';
import BaseViewer from '../../BaseViewer';
import ControlsRoot from '../../controls/controls-root';
import TextBaseViewer from '../TextBaseViewer';
import TextControls from '../TextControls';
import { PERMISSION_DOWNLOAD } from '../../../constants';

jest.mock('../../controls/controls-root');

let containerEl;
let textBase;

describe('lib/viewers/text/TextBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/TextBaseViewer-test.html');
        containerEl = document.querySelector('.container');
        textBase = new TextBaseViewer({
            file: {
                id: 0,
            },
            container: containerEl,
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        textBase.containerEl = containerEl;
        textBase.setup();
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });
        if (typeof textBase.destroy === 'function') {
            textBase.destroy();
        }

        textBase = null;
    });

    describe('destroy()', () => {
        test('should destroy the controls if they exist', () => {
            textBase.controls = {
                destroy: jest.fn(),
            };

            textBase.destroy();
            expect(textBase.controls.destroy).toBeCalled();
        });

        test('should call unbindDOMListeners', () => {
            jest.spyOn(textBase, 'unbindDOMListeners');

            textBase.destroy();
            expect(textBase.unbindDOMListeners).toBeCalled();
        });
    });

    describe('zoom()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
            textBase.renderUI = jest.fn();
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        test('should emit the zoom event', () => {
            jest.spyOn(textBase, 'emit');
            textBase.zoom();
            expect(textBase.emit).toBeCalledWith('zoom', { canZoomIn: true, canZoomOut: true, zoom: 1 });
            expect(textBase.scale).toEqual(1.0);
            expect(textBase.renderUI).toBeCalled();
        });

        test('should increase font size when zooming in', () => {
            textBase.zoom('in');
            expect(textEl.style.fontSize).toBe('110%');
            expect(textBase.scale).toEqual(1.1);
            expect(textBase.renderUI).toBeCalled();
        });

        test('should decrease font size when zooming out', () => {
            textBase.zoom('out');
            expect(textEl.style.fontSize).toBe('90%');
            expect(textBase.scale).toEqual(0.9);
            expect(textBase.renderUI).toBeCalled();
        });
    });

    describe('zoomIn() / zoomOut()', () => {
        test('should call zoom() with appropriate parameter', () => {
            jest.spyOn(textBase, 'zoom').mockImplementation();

            textBase.zoomIn();
            expect(textBase.zoom).toBeCalledWith('in');

            textBase.zoomOut();
            expect(textBase.zoom).toBeCalledWith('out');
        });
    });

    describe('bindDOMListeners()', () => {
        test('should always add wheel listener for trackpad pinch-to-zoom', () => {
            textBase.hasTouch = false;
            jest.spyOn(textBase.containerEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textBase.containerEl.addEventListener).toBeCalledWith('wheel', textBase.wheelZoomHandler, {
                passive: false,
            });
        });

        test('should add touch listeners if hasTouch is true and not iOS', () => {
            textBase.hasTouch = true;
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            jest.spyOn(textBase.containerEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textBase.containerEl.addEventListener).toBeCalledWith('touchstart', textBase.mobileZoomStartHandler);
            expect(textBase.containerEl.addEventListener).toBeCalledWith('touchmove', textBase.mobileZoomChangeHandler);
            expect(textBase.containerEl.addEventListener).toBeCalledWith('touchend', textBase.mobileZoomEndHandler);
        });

        test('should add gesture listeners if hasTouch is true and iOS', () => {
            textBase.hasTouch = true;
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            jest.spyOn(textBase.containerEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textBase.containerEl.addEventListener).toBeCalledWith(
                'gesturestart',
                textBase.mobileZoomStartHandler,
            );
            expect(textBase.containerEl.addEventListener).toBeCalledWith('gestureend', textBase.mobileZoomEndHandler);
        });

        test('should not add touch listeners if hasTouch is false', () => {
            textBase.hasTouch = false;
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            jest.spyOn(textBase.containerEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textBase.containerEl.addEventListener).not.toBeCalledWith(
                'touchstart',
                textBase.mobileZoomStartHandler,
            );
            expect(textBase.containerEl.addEventListener).not.toBeCalledWith(
                'gesturestart',
                textBase.mobileZoomStartHandler,
            );
        });
    });

    describe('unbindDOMListeners()', () => {
        test('should remove all listeners', () => {
            jest.spyOn(textBase.containerEl, 'removeEventListener');

            textBase.unbindDOMListeners();

            expect(textBase.containerEl.removeEventListener).toBeCalledWith('wheel', textBase.wheelZoomHandler);
            expect(textBase.containerEl.removeEventListener).toBeCalledWith(
                'gesturestart',
                textBase.mobileZoomStartHandler,
            );
            expect(textBase.containerEl.removeEventListener).toBeCalledWith(
                'gestureend',
                textBase.mobileZoomEndHandler,
            );
            expect(textBase.containerEl.removeEventListener).toBeCalledWith(
                'touchstart',
                textBase.mobileZoomStartHandler,
            );
            expect(textBase.containerEl.removeEventListener).toBeCalledWith(
                'touchmove',
                textBase.mobileZoomChangeHandler,
            );
            expect(textBase.containerEl.removeEventListener).toBeCalledWith('touchend', textBase.mobileZoomEndHandler);
        });
    });

    describe('wheelZoomHandler()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
            textBase.renderUI = jest.fn();
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        test('should do nothing if ctrlKey is not pressed', () => {
            jest.spyOn(textBase, 'emit');
            const event = { ctrlKey: false, deltaY: -1, preventDefault: jest.fn() };

            textBase.wheelZoomHandler(event);
            expect(event.preventDefault).not.toBeCalled();
            expect(textBase.emit).not.toBeCalled();
        });

        test('should zoom in smoothly when deltaY is negative', () => {
            textBase.scale = 1.0;
            jest.spyOn(textBase, 'emit');
            const event = { ctrlKey: true, deltaY: -10, preventDefault: jest.fn() };

            textBase.wheelZoomHandler(event);
            expect(event.preventDefault).toBeCalled();
            expect(textBase.scale).toBeGreaterThan(1.0);
            expect(textBase.renderUI).toBeCalled();
        });

        test('should zoom out smoothly when deltaY is positive', () => {
            textBase.scale = 1.0;
            jest.spyOn(textBase, 'emit');
            const event = { ctrlKey: true, deltaY: 10, preventDefault: jest.fn() };

            textBase.wheelZoomHandler(event);
            expect(event.preventDefault).toBeCalled();
            expect(textBase.scale).toBeLessThan(1.0);
            expect(textBase.renderUI).toBeCalled();
        });
    });

    describe('load()', () => {
        test('should add selectable/printable classes if user has download permissions', () => {
            jest.spyOn(file, 'checkPermission').mockReturnValue(true);

            textBase.load();

            expect(file.checkPermission).toBeCalledWith(textBase.options.file, PERMISSION_DOWNLOAD);
            expect(textBase.containerEl).toHaveClass('bp-is-printable');
            expect(textBase.containerEl).toHaveClass('bp-is-selectable');
        });

        test('should not add selectable/printable classes if user does not have download permissions', () => {
            jest.spyOn(file, 'checkPermission').mockReturnValue(false);

            textBase.load();

            expect(file.checkPermission).toBeCalledWith(textBase.options.file, PERMISSION_DOWNLOAD);
            expect(textBase.containerEl).not.toHaveClass('bp-is-printable');
            expect(textBase.containerEl).not.toHaveClass('bp-is-selectable');
        });

        test('should not add selectable/printable classes if disableTextViewer option is true', () => {
            jest.spyOn(file, 'checkPermission').mockReturnValue(true);
            jest.spyOn(textBase, 'getViewerOption').mockReturnValue(true);

            textBase.load();

            expect(file.checkPermission).toBeCalledWith(textBase.options.file, PERMISSION_DOWNLOAD);
            expect(textBase.getViewerOption).toBeCalledWith('disableTextLayer');
            expect(textBase.containerEl).not.toHaveClass('bp-is-printable');
            expect(textBase.containerEl).not.toHaveClass('bp-is-selectable');
        });
    });

    describe('loadUI()', () => {
        test('should create controls root and render the controls', () => {
            textBase.loadUI();

            expect(textBase.controls).toBeInstanceOf(ControlsRoot);
            expect(textBase.controls.render).toBeCalledWith(
                <TextControls
                    maxScale={10}
                    minScale={0.1}
                    onFullscreenToggle={textBase.toggleFullscreen}
                    onZoomIn={textBase.zoomIn}
                    onZoomOut={textBase.zoomOut}
                    scale={1}
                />,
            );
        });
    });

    describe('onKeydown()', () => {
        test('should return false if controls are not initialized', () => {
            expect(textBase.onKeydown()).toBe(false);
        });

        test('should call zoomIn() for Shift++', () => {
            textBase.controls = {};
            jest.spyOn(textBase, 'zoomIn').mockImplementation();
            expect(textBase.onKeydown('Shift++')).toBe(true);
            expect(textBase.zoomIn).toBeCalled();
        });

        test('should call zoomOut() for Shift+_', () => {
            textBase.controls = {};
            jest.spyOn(textBase, 'zoomOut').mockImplementation();
            expect(textBase.onKeydown('Shift+_')).toBe(true);
            expect(textBase.zoomOut).toBeCalled();
        });

        test('should return false for other keypresses', () => {
            textBase.controls = {};
            expect(textBase.onKeydown('blah')).toBe(false);
        });
    });
});
