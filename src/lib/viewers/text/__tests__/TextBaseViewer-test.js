import React from 'react';
import * as file from '../../../file';
import BaseViewer from '../../BaseViewer';
import Controls from '../../../Controls';
import ControlsRoot from '../../controls/controls-root';
import TextBaseViewer from '../TextBaseViewer';
import TextControls from '../TextControls';
import ZoomControls from '../../../ZoomControls';
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
    });

    describe('zoom()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
            textBase.zoomControls = {
                setCurrentScale: jest.fn(),
                removeListener: jest.fn(),
            };
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        test('should emit the zoom event', () => {
            jest.spyOn(textBase, 'emit');
            textBase.zoom();
            expect(textBase.emit).toBeCalledWith('zoom', { canZoomIn: true, canZoomOut: true, zoom: 1 });
            expect(textBase.zoomControls.setCurrentScale).toBeCalledWith(1.0);
        });

        test('should increase font size when zooming in', () => {
            textBase.zoom('in');
            expect(textEl.style.fontSize).toBe('110%');
            expect(textBase.zoomControls.setCurrentScale).toBeCalledWith(1.1);
        });

        test('should decrease font size when zooming out', () => {
            textBase.zoom('out');
            expect(textEl.style.fontSize).toBe('90%');
            expect(textBase.zoomControls.setCurrentScale).toBeCalledWith(0.9);
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
        const addFunc = Controls.prototype.add;
        const zoomInitFunc = ZoomControls.prototype.init;

        afterEach(() => {
            Object.defineProperty(Controls.prototype, 'add', { value: addFunc });
            Object.defineProperty(ZoomControls.prototype, 'init', { value: zoomInitFunc });
        });

        test('should setup controls and add click handlers', () => {
            Object.defineProperty(Controls.prototype, 'add', { value: jest.fn() });
            Object.defineProperty(ZoomControls.prototype, 'init', { value: jest.fn() });

            textBase.loadUI();
            expect(textBase.controls).toBeInstanceOf(Controls);
            expect(Controls.prototype.add).toBeCalledTimes(2);
            expect(Controls.prototype.add).toBeCalledWith(
                expect.any(String),
                textBase.toggleFullscreen,
                expect.any(String),
                expect.any(String),
            );

            expect(textBase.zoomControls).toBeInstanceOf(ZoomControls);
            expect(ZoomControls.prototype.init).toBeCalledWith(1, {
                maxZoom: 10,
                minZoom: 0.1,
                onZoomIn: textBase.zoomIn,
                onZoomOut: textBase.zoomOut,
                zoomInClassName: 'bp-text-zoom-in-icon',
                zoomOutClassName: 'bp-text-zoom-out-icon',
            });
        });
    });

    describe('loadUIReact()', () => {
        test('should create controls root and render the react controls', () => {
            textBase.options.useReactControls = true;
            textBase.loadUIReact();

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
