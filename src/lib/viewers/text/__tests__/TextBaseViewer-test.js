import React from 'react';
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

        test('should unbind DOM listeners', () => {
            const textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
            jest.spyOn(textEl, 'removeEventListener');

            textBase.destroy();

            expect(textEl.removeEventListener).toBeCalledWith('wheel', textBase.wheelZoomHandler);
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

    describe('bindDOMListeners()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        test('should add wheel event listener when pinchToZoom is enabled', () => {
            jest.spyOn(textBase, 'featureEnabled').mockReturnValue(true);
            jest.spyOn(textEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textEl.addEventListener).toBeCalledWith('wheel', textBase.wheelZoomHandler, { passive: false });
        });

        test('should not add wheel event listener when pinchToZoom is disabled', () => {
            jest.spyOn(textBase, 'featureEnabled').mockReturnValue(false);
            jest.spyOn(textEl, 'addEventListener');

            textBase.bindDOMListeners();

            expect(textEl.addEventListener).not.toBeCalled();
        });
    });

    describe('wheelZoomHandler()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
            textBase.renderUI = jest.fn();
            Object.defineProperty(textEl, 'scrollLeft', { value: 0, writable: true });
            Object.defineProperty(textEl, 'scrollTop', { value: 0, writable: true });
            textEl.getBoundingClientRect = jest.fn().mockReturnValue({
                left: 0,
                top: 0,
                width: 800,
                height: 600,
            });
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        test('should do nothing if ctrlKey is not pressed', () => {
            const event = new WheelEvent('wheel', { deltaY: -10, ctrlKey: false });
            jest.spyOn(event, 'preventDefault');

            textBase.wheelZoomHandler(event);

            expect(event.preventDefault).not.toBeCalled();
            expect(textBase.scale).toBe(1.0);
        });

        test('should prevent default and zoom in on negative deltaY', () => {
            jest.spyOn(textBase, 'emit');
            const event = new WheelEvent('wheel', {
                deltaY: -10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });
            jest.spyOn(event, 'preventDefault');

            textBase.wheelZoomHandler(event);

            expect(event.preventDefault).toBeCalled();
            expect(textBase.scale).toBeGreaterThan(1.0);
            expect(textEl.style.fontSize).toBe(`${Math.round(textBase.scale * 100)}%`);
            expect(textBase.emit).toBeCalledWith('zoom', expect.objectContaining({ zoom: textBase.scale }));
            expect(textBase.renderUI).toBeCalled();
        });

        test('should zoom out on positive deltaY', () => {
            const event = new WheelEvent('wheel', {
                deltaY: 10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.scale).toBeLessThan(1.0);
        });

        test('should not exceed max scale', () => {
            textBase.scale = 10;
            const event = new WheelEvent('wheel', {
                deltaY: -10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.scale).toBe(10);
        });

        test('should not go below min scale', () => {
            textBase.scale = 0.1;
            const event = new WheelEvent('wheel', {
                deltaY: 10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.scale).toBe(0.1);
        });

        test('should call resin.recordAction on pinch start with zoomIn target', () => {
            textBase.isPinching = false;
            textBase.options.resin = { recordAction: jest.fn() };
            textBase.options.file = { id: '0', extension: 'txt' };
            const event = new WheelEvent('wheel', {
                deltaY: -10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.options.resin.recordAction).toBeCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                target: 'zoomIn',
                fileId: '0',
                fileExtension: 'txt',
            });
        });

        test('should call resin.recordAction on pinch start with zoomOut target', () => {
            textBase.isPinching = false;
            textBase.options.resin = { recordAction: jest.fn() };
            textBase.options.file = { id: '0', extension: 'txt' };
            const event = new WheelEvent('wheel', {
                deltaY: 10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.options.resin.recordAction).toBeCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                target: 'zoomOut',
                fileId: '0',
                fileExtension: 'txt',
            });
        });

        test('should not call resin.recordAction if already pinching', () => {
            textBase.isPinching = true;
            textBase.options.resin = { recordAction: jest.fn() };
            textBase.options.file = { id: '0', extension: 'txt' };
            const event = new WheelEvent('wheel', {
                deltaY: -10,
                ctrlKey: true,
                clientX: 400,
                clientY: 300,
            });

            textBase.wheelZoomHandler(event);

            expect(textBase.options.resin.recordAction).not.toBeCalled();
        });

        describe('caret-based scroll anchoring', () => {
            let originalCaretRangeFromPoint;
            let originalCaretPositionFromPoint;

            beforeEach(() => {
                originalCaretRangeFromPoint = document.caretRangeFromPoint;
                originalCaretPositionFromPoint = document.caretPositionFromPoint;
            });

            afterEach(() => {
                if (originalCaretRangeFromPoint) {
                    document.caretRangeFromPoint = originalCaretRangeFromPoint;
                } else {
                    delete document.caretRangeFromPoint;
                }
                if (originalCaretPositionFromPoint) {
                    document.caretPositionFromPoint = originalCaretPositionFromPoint;
                } else {
                    delete document.caretPositionFromPoint;
                }
            });

            test('should use caretRangeFromPoint to anchor scroll to the line under cursor', () => {
                const mockRange = {
                    getBoundingClientRect: jest
                        .fn()
                        .mockReturnValueOnce({ top: 200 })
                        .mockReturnValueOnce({ top: 220 }),
                };
                document.caretRangeFromPoint = jest.fn().mockReturnValue(mockRange);

                const event = new WheelEvent('wheel', {
                    deltaY: -10,
                    ctrlKey: true,
                    clientX: 400,
                    clientY: 200,
                });

                textBase.wheelZoomHandler(event);

                expect(document.caretRangeFromPoint).toBeCalledWith(400, 200);
                expect(textBase.scale).toBeGreaterThan(1.0);
            });

            test('should fall back to caretPositionFromPoint for Firefox', () => {
                delete document.caretRangeFromPoint;

                const mockRange = {
                    getBoundingClientRect: jest
                        .fn()
                        .mockReturnValueOnce({ top: 200 })
                        .mockReturnValueOnce({ top: 220 }),
                    setStart: jest.fn(),
                    collapse: jest.fn(),
                };
                jest.spyOn(document, 'createRange').mockReturnValue(mockRange);
                document.caretPositionFromPoint = jest.fn().mockReturnValue({
                    offsetNode: document.createTextNode('test'),
                    offset: 0,
                });

                const event = new WheelEvent('wheel', {
                    deltaY: -10,
                    ctrlKey: true,
                    clientX: 400,
                    clientY: 200,
                });

                textBase.wheelZoomHandler(event);

                expect(document.caretPositionFromPoint).toBeCalledWith(400, 200);
                expect(textBase.scale).toBeGreaterThan(1.0);
            });

            test('should still zoom when neither caret API is available', () => {
                delete document.caretRangeFromPoint;
                delete document.caretPositionFromPoint;

                const event = new WheelEvent('wheel', {
                    deltaY: -10,
                    ctrlKey: true,
                    clientX: 400,
                    clientY: 200,
                });

                textBase.wheelZoomHandler(event);

                expect(textBase.scale).toBeGreaterThan(1.0);
                expect(textEl.style.fontSize).toBe(`${Math.round(textBase.scale * 100)}%`);
            });
        });
    });
});
