/* eslint-disable no-unused-expressions */
import ZoomControls from '../ZoomControls';
import Controls from '../Controls';
import { ICON_ZOOM_OUT, ICON_ZOOM_IN } from '../icons/icons';

let zoomControls;
let stubs = {};

describe('lib/ZoomControls', () => {
    beforeEach(() => {
        fixture.load('__tests__/ZoomControls-test.html');
        const controls = new Controls(document.getElementById('test-zoom-controls-container'));
        zoomControls = new ZoomControls(controls);
    });

    afterEach(() => {
        fixture.cleanup();

        zoomControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should create the correct DOM structure', () => {
            expect(zoomControls.controlsElement).toBeDefined();
        });

        test('should throw an exception if controls is not provided', () => {
            expect(() => new ZoomControls()).toThrowError(Error);
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.add = jest.spyOn(zoomControls.controls, 'add');
            stubs.setCurrentScale = jest.spyOn(zoomControls, 'setCurrentScale');
            stubs.onZoomIn = jest.fn();
            stubs.onZoomOut = jest.fn();
        });

        test('should add the controls', () => {
            zoomControls.init(0.5, { onZoomIn: stubs.onZoomIn, onZoomOut: stubs.onZoomOut });

            expect(stubs.add).toBeCalledWith(
                __('zoom_out'),
                stubs.onZoomOut,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-out-btn ',
                ICON_ZOOM_OUT,
                undefined,
                expect.anything(),
            );
            expect(stubs.add).toBeCalledWith(
                __('zoom_current_scale'),
                undefined,
                'bp-ZoomControls-currentScale',
                expect.any(String),
                'div',
                expect.anything(),
            );
            expect(stubs.add).toBeCalledWith(
                __('zoom_in'),
                stubs.onZoomIn,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-in-btn ',
                ICON_ZOOM_IN,
                undefined,
                expect.anything(),
            );
            expect(zoomControls.currentScaleElement).toBeDefined();
            expect(stubs.setCurrentScale).toBeCalledWith(0.5);
            expect(zoomControls.maxZoom).toBe(Number.POSITIVE_INFINITY);
            expect(zoomControls.minZoom).toBe(10);
        });

        test('should set the min and max zooms if specified', () => {
            zoomControls.init(0.5, { minZoom: 0.5, maxZoom: 5 });

            expect(zoomControls.maxZoom).toBe(500);
            expect(zoomControls.minZoom).toBe(50);
        });

        test('should set the min zoom to 0 if negative is provided', () => {
            zoomControls.init(0.5, { minZoom: -0.2, maxZoom: 5 });

            expect(zoomControls.maxZoom).toBe(500);
            expect(zoomControls.minZoom).toBe(10);
        });

        test('should set the min zoom to 0.1 if number is not provided', () => {
            zoomControls.init(0.5, { minZoom: '0.2', maxZoom: 5 });

            expect(zoomControls.maxZoom).toBe(500);
            expect(zoomControls.minZoom).toBe(10);
        });

        test('should set the max zoom to Number.POSITIVE_INFINITY if number is not provided', () => {
            zoomControls.init(0.5, { minZoom: 0.5, maxZoom: '100' });

            expect(zoomControls.maxZoom).toBe(Number.POSITIVE_INFINITY);
            expect(zoomControls.minZoom).toBe(50);
        });

        test('should set optional classnames if specified', () => {
            zoomControls.init(0.5, {
                zoomInClassName: 'zoom-in-classname',
                zoomOutClassName: 'zoom-out-classname',
                onZoomIn: stubs.onZoomIn,
                onZoomOut: stubs.onZoomOut,
            });

            expect(stubs.add).toBeCalledWith(
                __('zoom_out'),
                stubs.onZoomOut,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-out-btn zoom-out-classname',
                ICON_ZOOM_OUT,
                undefined,
                expect.anything(),
            );
            expect(stubs.add).toBeCalledWith(
                __('zoom_current_scale'),
                undefined,
                'bp-ZoomControls-currentScale',
                expect.any(String),
                'div',
                expect.anything(),
            );
            expect(stubs.add).toBeCalledWith(
                __('zoom_in'),
                stubs.onZoomIn,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-in-btn zoom-in-classname',
                ICON_ZOOM_IN,
                undefined,
                expect.anything(),
            );
        });
    });

    describe('setCurrentScale()', () => {
        beforeEach(() => {
            stubs.checkButtonEnablement = jest.spyOn(zoomControls, 'checkButtonEnablement');
            zoomControls.currentScaleElement = document.createElement('span');
            zoomControls.currentScaleElement.textContent = '100%';
        });

        test('should not do anything if scale is not provided', () => {
            zoomControls.setCurrentScale();

            expect(zoomControls.currentScale).toBeUndefined();
            expect(zoomControls.currentScaleElement.textContent).toBe('100%');
            expect(stubs.checkButtonEnablement).not.toBeCalled();
        });

        test('should not do anything if scale is not a number', () => {
            zoomControls.setCurrentScale('100');

            expect(zoomControls.currentScale).toBeUndefined();
            expect(zoomControls.currentScaleElement.textContent).toBe('100%');
            expect(stubs.checkButtonEnablement).not.toBeCalled();
        });

        test('should set the scale and update the text', () => {
            zoomControls.setCurrentScale(0.5);

            expect(zoomControls.currentScale).toBe(50);
            expect(zoomControls.currentScaleElement.textContent).toBe('50%');
            expect(stubs.checkButtonEnablement).toBeCalled();
        });
    });

    describe('checkButtonEnablement()', () => {
        test('should do nothing if currentScale is not at the limits', () => {
            zoomControls.init(0.5, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).toBe(false);
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).toBe(false);
        });

        test('should disable zoom out if currentScale is at the minZoom limit', () => {
            zoomControls.init(0.3, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).toBe(true);
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).toBe(false);
        });

        test('should disable zoom in if currentScale is at the maxZoom limit', () => {
            zoomControls.init(5, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).toBe(false);
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).toBe(true);
        });
    });
});
