import React from 'react';
import AnnotationControlsFSM, { AnnotationMode, AnnotationState } from '../../../AnnotationControlsFSM';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import ControlsRoot from '../../controls/controls-root';
import ImageControls from '../ImageControls';
import ImageViewer from '../ImageViewer';
import {
    ANNOTATOR_EVENT,
    CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN,
    IMAGE_FTUX_CURSOR_SEEN_KEY,
} from '../../../constants';

jest.mock('../../controls/controls-root');

const imageUrl =
    'data:image/png;base64,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';
let image;
let stubs = {};
let containerEl;

describe('lib/viewers/image/ImageViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/image/__tests__/ImageViewer-test.html');
        containerEl = document.querySelector('.container');
        image = new ImageViewer({
            container: containerEl,
            file: {
                id: '1',
                name: 'tales.png',
                file_version: {
                    id: '1',
                },
            },
            viewer: {
                NAME: 'Image',
                ASSET: '1.png',
            },
            representation: {
                content: {
                    url_template: 'foo',
                },
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        image.containerEl = containerEl;
        image.options.enableAnnotationsImageDiscoverability = false;
        image.cache = {
            get: jest.fn(),
            set: jest.fn(),
        };
        image.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (image && typeof image.destroy === 'function') {
            image.destroy();
        }
        image = null;
        stubs = {};
    });

    describe('destroy()', () => {
        test.each`
            enableAnnotationsImageDiscoverability | numberOfCalls
            ${true}                               | ${1}
            ${false}                              | ${0}
        `(
            'should call removeListener $numberOfCalls times if enableAnnotationsImageDiscoverability is $enableAnnotationsImageDiscoverability',
            ({ enableAnnotationsImageDiscoverability, numberOfCalls }) => {
                image.options.enableAnnotationsImageDiscoverability = enableAnnotationsImageDiscoverability;
                jest.spyOn(image, 'removeListener');

                image.destroy();

                expect(image.removeListener).toBeCalledTimes(numberOfCalls);
            },
        );
    });

    describe('setup()', () => {
        test('should set up layout', () => {
            expect(image.wrapperEl).toHaveClass('bp-image');
            expect(image.imageEl).toHaveClass('bp-is-invisible');
            expect(image.imageEl).toHaveAttribute('alt', 'tales.png');
        });

        test.each`
            enableAnnotationsImageDiscoverability | numberOfCalls
            ${true}                               | ${1}
            ${false}                              | ${0}
        `(
            'should call addListener $numberOfCalls times if enableAnnotationsImageDiscoverability is $enableAnnotationsImageDiscoverability',
            ({ enableAnnotationsImageDiscoverability, numberOfCalls }) => {
                image.options.enableAnnotationsImageDiscoverability = enableAnnotationsImageDiscoverability;
                jest.spyOn(image, 'addListener');

                image.setup();

                expect(image.addListener).toBeCalledTimes(numberOfCalls);
            },
        );
    });

    describe('load()', () => {
        test('should fetch the image URL and load an image', () => {
            jest.spyOn(image, 'createContentUrlWithAuthParams').mockReturnValue(imageUrl);
            jest.spyOn(image, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            stubs.event = jest.spyOn(image.imageEl, 'addEventListener');
            stubs.load = jest.spyOn(image, 'finishLoading');
            stubs.bind = jest.spyOn(image, 'bindDOMListeners');

            // load the image
            return image
                .load(imageUrl)
                .then(() => {
                    expect(image.bindDOMListeners).toBeCalled();
                    expect(image.createContentUrlWithAuthParams).toBeCalledWith('foo', '1.png');
                })
                .catch(() => {});
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(image, 'startLoadTimer');
            jest.spyOn(image, 'createContentUrlWithAuthParams').mockReturnValue(imageUrl);
            jest.spyOn(image, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });

            // load the image
            return image
                .load(imageUrl)
                .then(() => {
                    expect(image.startLoadTimer).toBeCalled();
                })
                .catch(() => {});
        });
    });

    describe('prefetch()', () => {
        test('should prefetch content if content is true and representation is ready', () => {
            jest.spyOn(image, 'isRepresentationReady').mockReturnValue(true);
            jest.spyOn(image, 'createContentUrlWithAuthParams').mockReturnValue('somecontenturl');
            image.prefetch({ content: true });
            expect(image.createContentUrlWithAuthParams).toBeCalledWith('foo', '1.png');
        });

        test('should not prefetch content if content is true but representation is not ready', () => {
            jest.spyOn(image, 'isRepresentationReady').mockReturnValue(false);
            jest.spyOn(image, 'createContentUrlWithAuthParams');
            image.prefetch({ content: true });
            expect(image.createContentUrlWithAuthParams).not.toBeCalled();
        });

        test('should not prefetch content if file is watermarked', () => {
            image.options.file.watermark_info = {
                is_watermarked: true,
            };
            jest.spyOn(image, 'createContentUrlWithAuthParams');

            image.prefetch({ content: true });

            expect(image.createContentUrlWithAuthParams).not.toBeCalled();
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            stubs.cursor = jest.spyOn(image, 'updateCursor');
            image.didPan = true;
        });

        test('should ignore if image does not exist', () => {
            stubs.imageEl = image.imageEl;
            image.imageEl = null;

            image.updatePannability();

            expect(image.didPan).toBe(true);
            expect(stubs.cursor).not.toBeCalled();

            image.imageEl = stubs.imageEl;
        });

        test('should set pannability to true if rotated image is pannable', () => {
            jest.spyOn(image, 'isRotated').mockReturnValue(true);

            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.height = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();
            expect(image.didPan).toBe(false);
            expect(stubs.cursor).toBeCalled();
        });

        test('should set pannability to false if rotated image is not pannable', () => {
            jest.spyOn(image, 'isRotated').mockReturnValue(true);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.didPan).toBe(false);
            expect(stubs.cursor).toBeCalled();
        });

        test('should set pannability to true if non-rotated image is pannable', () => {
            jest.spyOn(image, 'isRotated').mockReturnValue(false);

            image.imageEl.style.height = '50px';
            image.wrapperEl.style.height = '10px';
            image.imageEl.style.width = '50px';
            image.wrapperEl.style.width = '10px';

            image.updatePannability();

            expect(image.didPan).toBe(false);
            expect(stubs.cursor).toBeCalled();
        });

        test('should set pannability to false if non-rotated image is not pannable', () => {
            jest.spyOn(image, 'isRotated').mockReturnValue(false);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.didPan).toBe(false);
            expect(stubs.cursor).toBeCalled();
        });
    });

    describe('rotateLeft()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(image, 'emit');
            stubs.orientChange = jest.spyOn(image, 'handleOrientationChange');
            stubs.scale = jest.spyOn(image, 'setScale');
            image.currentRotationAngle = 0;
        });

        test('should rotate the image 90 degrees to the left', () => {
            image.rotateLeft();

            expect(image.currentRotationAngle).toBe(-90);
            expect(image.imageEl.getAttribute('data-rotation-angle')).toBe('-90');
            expect(image.imageEl.style.transform).toBe('rotate(-90deg)');
            expect(stubs.emit).toBeCalledWith('rotate');
            expect(stubs.orientChange).toBeCalled();
        });
    });

    describe('zoom()', () => {
        const getValue = val => parseInt(val, 10);
        const clientHeight = {
            get() {
                return getValue(this.style.height);
            },
        };
        const clientWidth = {
            get() {
                return getValue(this.style.width);
            },
        };

        beforeEach(() => {
            jest.spyOn(image, 'appendAuthParams').mockReturnValue(imageUrl);
            jest.spyOn(image, 'finishLoading').mockImplementation();
            jest.spyOn(image, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });

            // Stub out methods called in zoom()
            stubs.adjustZoom = jest.spyOn(image, 'adjustImageZoomPadding').mockImplementation();

            image.setup();
            image.load(imageUrl).catch(() => {});

            // Set image height & width
            Object.defineProperty(image.imageEl, 'offsetHeight', clientHeight);
            Object.defineProperty(image.imageEl, 'offsetWidth', clientWidth);
            Object.defineProperty(image.wrapperEl, 'clientHeight', { value: 50, writable: true });
            Object.defineProperty(image.wrapperEl, 'clientWidth', { value: 50, writable: true });
        });

        test('should zoom in by modifying width', () => {
            const origImageSize = 200;

            image.imageEl.style.width = `${origImageSize}px`;
            image.zoom('in');

            expect(getValue(image.imageEl.style.width)).toBeGreaterThan(origImageSize);
        });

        test('should zoom out by modifying width', () => {
            const origImageSize = 200;

            image.imageEl.style.width = `${origImageSize}px`;
            image.zoom('out');

            expect(getValue(image.imageEl.style.width)).toBeLessThan(origImageSize);
            expect(stubs.adjustZoom).toBeCalled();
        });

        test('should zoom the height when the image rotated', () => {
            jest.spyOn(image, 'isRotated').mockReturnValue(true);

            const origImageHeight = 150;
            const origImageWidth = 200;

            image.imageEl.style.transform = 'rotate(90deg)';
            image.imageEl.style.height = `${origImageHeight}px`;
            image.imageEl.style.width = `${origImageWidth}px`;

            image.zoom('in');

            expect(getValue(image.imageEl.style.height)).toBeGreaterThan(origImageHeight);
            expect(stubs.adjustZoom).toBeCalled();
        });

        test('should reset dimensions and adjust padding when called with reset', () => {
            image.imageEl.style.width = '1000px';
            image.imageEl.style.height = '2000px';
            const naturalHeight = 10;
            const naturalWidth = 5;
            image.imageEl.setAttribute('originalHeight', naturalHeight);
            image.imageEl.setAttribute('originalWidth', naturalWidth);

            jest.spyOn(image, 'zoom');

            image.zoom('reset');

            expect(image.imageEl.style.width).toBe('');
            expect(image.imageEl.style.height).toBe(`${naturalHeight}px`);
            expect(stubs.adjustZoom).toBeCalled();
        });

        test('when rotated should reset dimensions and adjust padding when called with reset', () => {
            image.currentRotationAngle = -90;
            image.imageEl.style.width = '1000px';
            image.imageEl.style.height = '2000px';
            const naturalWidth = 10;
            const naturalHeight = 5;
            image.imageEl.setAttribute('originalHeight', naturalHeight);
            image.imageEl.setAttribute('originalWidth', naturalWidth);

            image.zoom('reset');

            expect(image.imageEl.style.width).toBe('5px');
            expect(image.imageEl.style.height).toBe('');
            expect(stubs.adjustZoom).toBeCalled();
        });
    });

    describe('setScale()', () => {
        test('should emit a scale event with current scale and rotationAngle', () => {
            jest.spyOn(image, 'emit');
            jest.spyOn(image, 'renderUI');

            image.currentRotationAngle = -90;
            const [width, height] = [100, 100];

            image.setScale(width, height);
            expect(image.emit).toBeCalledWith('scale', {
                scale: expect.anything(),
                rotationAngle: expect.any(Number),
            });
            expect(image.renderUI).toBeCalled();
        });
    });

    describe('loadUI()', () => {
        beforeEach(() => {
            image.annotationModule = {
                getColor: jest.fn(),
            };
        });

        test('should create controls root and render the controls', () => {
            image.loadUI();

            expect(image.controls).toBeInstanceOf(ControlsRoot);
            expect(image.controls.render).toBeCalledWith(
                <ImageControls
                    annotationMode="none"
                    hasDrawing={false}
                    hasHighlight={false}
                    hasRegion={false}
                    onAnnotationColorChange={image.handleAnnotationColorChange}
                    onAnnotationModeClick={image.handleAnnotationControlsClick}
                    onAnnotationModeEscape={image.handleAnnotationControlsEscape}
                    onFullscreenToggle={image.toggleFullscreen}
                    onRotateLeft={image.rotateLeft}
                    onZoomIn={image.zoomIn}
                    onZoomOut={image.zoomOut}
                    scale={1}
                    setWasClosedByUser={image.setWasClosedByUser}
                />,
            );
        });

        test.each`
            areNewAnnotationsEnabled | hasAnnotationCreatePermission | hasDrawing | showAnnotationsDrawingCreate
            ${false}                 | ${false}                      | ${false}   | ${false}
            ${false}                 | ${false}                      | ${false}   | ${true}
            ${true}                  | ${true}                       | ${false}   | ${false}
            ${true}                  | ${false}                      | ${false}   | ${true}
            ${true}                  | ${false}                      | ${false}   | ${false}
            ${false}                 | ${true}                       | ${false}   | ${true}
            ${false}                 | ${true}                       | ${false}   | ${false}
            ${true}                  | ${true}                       | ${true}    | ${true}
        `(
            'should create controls root and render the controls with hasDrawing set to $hasDrawing',
            ({ areNewAnnotationsEnabled, hasAnnotationCreatePermission, hasDrawing, showAnnotationsDrawingCreate }) => {
                jest.spyOn(image, 'areNewAnnotationsEnabled').mockReturnValue(areNewAnnotationsEnabled);
                jest.spyOn(image, 'hasAnnotationCreatePermission').mockReturnValue(hasAnnotationCreatePermission);

                image.options.showAnnotationsDrawingCreate = showAnnotationsDrawingCreate;
                image.loadUI();

                expect(image.controls).toBeInstanceOf(ControlsRoot);
                expect(image.controls.render).toBeCalledWith(
                    expect.objectContaining({
                        props: expect.objectContaining({
                            hasDrawing,
                        }),
                    }),
                );
            },
        );
    });

    describe('isRotated()', () => {
        test('should return false if image is not rotated', () => {
            const result = image.isRotated();
            expect(result).toBe(false);
        });

        test('should return true if image is rotated', () => {
            image.currentRotationAngle = 90;
            const result = image.isRotated();
            expect(result).toBe(true);
        });
    });

    describe('getInitialAnnotationMode()', () => {
        test.each`
            mode                     | enableAnnotationsImageDiscoverability
            ${AnnotationMode.REGION} | ${true}
            ${AnnotationMode.NONE}   | ${false}
        `(
            'should return $mode if enableAnnotationsImageDiscoverability is $enableAnnotationsImageDiscoverability',
            ({ enableAnnotationsImageDiscoverability, mode }) => {
                image.options.enableAnnotationsImageDiscoverability = enableAnnotationsImageDiscoverability;

                expect(image.getInitialAnnotationMode()).toBe(mode);
            },
        );
    });

    describe('getTransformWidthAndHeight', () => {
        test('should return the same width & height if the image is not rotated', () => {
            const width = 100;
            const height = 200;
            const widthAndHeightObj = image.getTransformWidthAndHeight(width, height, false);
            expect(widthAndHeightObj).toEqual({
                width,
                height,
            });
        });

        test('should return swap the width & height if the image is rotated', () => {
            const width = 100;
            const height = 200;
            const widthAndHeightObj = image.getTransformWidthAndHeight(width, height, true);
            expect(widthAndHeightObj).toEqual({
                width: height,
                height: width,
            });
        });
    });

    describe('adjustImageZoomPadding()', () => {
        beforeEach(() => {
            // Set wrapper dimensions
            Object.defineProperty(image.wrapperEl, 'clientHeight', { value: 200 });
            Object.defineProperty(image.wrapperEl, 'clientWidth', { value: 100 });
            Object.defineProperty(image.wrapperEl, 'getBoundingClientRect', {
                value: () => ({
                    height: image.wrapperEl.clientHeight,
                    width: image.wrapperEl.clientWidth,
                }),
            });

            // Set image dimensions
            Object.defineProperty(image.imageEl, 'clientHeight', { value: 50 });
            Object.defineProperty(image.imageEl, 'clientWidth', { value: 25 });
            Object.defineProperty(image.imageEl, 'getBoundingClientRect', {
                value: () => ({
                    height: image.imageEl.clientHeight,
                    width: image.imageEl.clientWidth,
                }),
            });
        });

        test('should adjust zoom padding accordingly if image is rotated', () => {
            stubs.rotated = jest.spyOn(image, 'isRotated').mockReturnValue(true);
            image.adjustImageZoomPadding();
            expect(stubs.rotated).toBeCalled();
            expect(image.imageEl.style.left).toBe('37.5px');
            expect(image.imageEl.style.top).toBe('75px');
        });

        test('should adjust zoom padding accordingly if image is not rotated', () => {
            image.adjustImageZoomPadding();
            expect(image.imageEl.style.left).toBe('37.5px');
            expect(image.imageEl.style.top).toBe('75px');
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            image.isMobile = true;
            image.imageEl.addEventListener = jest.fn();
            stubs.listeners = image.imageEl.addEventListener;
        });

        test('should bind error and load listeners', () => {
            image.bindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('load', image.finishLoading);
            expect(stubs.listeners).toBeCalledWith('error', image.handleImageDownloadError);
        });

        test('should bind all mobile listeners', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            image.bindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('orientationchange', image.handleOrientationChange);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = jest.spyOn(document, 'removeEventListener');
            image.imageEl.removeEventListener = jest.fn();
            image.isMobile = true;
            stubs.listeners = image.imageEl.removeEventListener;
        });

        test('should unbind all default image listeners', () => {
            image.unbindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('load', image.finishLoading);
            expect(stubs.listeners).toBeCalledWith('error', image.handleImageDownloadError);
        });

        test('should unbind all mobile listeners', () => {
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            image.unbindDOMListeners();
            expect(stubs.listeners).toBeCalledWith('orientationchange', image.handleOrientationChange);
        });
    });

    describe('handleMouseUp()', () => {
        beforeEach(() => {
            stubs.pan = jest.spyOn(image, 'stopPanning');
            stubs.zoom = jest.spyOn(image, 'zoom');
            image.isPanning = false;
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
            image.handleMouseUp(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            image.handleMouseUp(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            image.handleMouseUp(event);
            expect(stubs.zoom).not.toBeCalled();
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
            image.isZoomable = true;
            image.handleMouseUp(event);
            expect(stubs.zoom).toBeCalledWith('in');
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
            image.isZoomable = false;
            image.didPan = false;
            image.handleMouseUp(event);
            expect(stubs.zoom).toBeCalledWith('reset');
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
            image.isZoomable = false;
            image.didPan = true;
            image.handleMouseUp(event);
            expect(stubs.zoom).not.toBeCalled();
        });
    });

    describe('handleOrientationChange()', () => {
        test('should adjust zoom padding and set scale', () => {
            stubs.padding = jest.spyOn(image, 'adjustImageZoomPadding');
            jest.spyOn(image, 'emit');
            image.handleOrientationChange();
            expect(stubs.padding).toBeCalled();
            expect(image.emit).toBeCalledWith('scale', {
                scale: expect.anything(),
                rotationAngle: expect.any(Number),
            });
        });
    });

    describe('handleAssetAndRepLoad', () => {
        test('should setup image src', () => {
            jest.spyOn(image, 'startLoadTimer').mockImplementation();

            const url = 'https://www.box.com/foo';
            image.imageEl = document.createElement('img');
            image.handleAssetAndRepLoad(url);

            expect(image.startLoadTimer).toBeCalled();
            expect(image.imageEl.src).toBe(url);
        });
    });

    describe('handleAnnotationColorChange', () => {
        beforeEach(() => {
            image.annotationModule = {
                setColor: jest.fn(),
            };
            image.annotator = {
                emit: jest.fn(),
            };
            image.renderUI = jest.fn();
        });

        test('should call setColor and renderUI, and emit color', () => {
            const color = '#fff';
            image.handleAnnotationColorChange(color);

            expect(image.annotationModule.setColor).toBeCalledWith(color);
            expect(image.annotator.emit).toBeCalledWith(ANNOTATOR_EVENT.setColor, color);
            expect(image.renderUI).toHaveBeenCalled();
        });
    });

    describe('handleAnnotationControlsClick', () => {
        beforeEach(() => {
            image.annotator = {
                toggleAnnotationMode: jest.fn(),
            };
            image.processAnnotationModeChange = jest.fn();
        });

        test('should call toggleAnnotationMode and processAnnotationModeChange', () => {
            image.handleAnnotationControlsClick({ mode: AnnotationMode.REGION });

            expect(image.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.REGION);
            expect(image.processAnnotationModeChange).toBeCalledWith(AnnotationMode.REGION);

            image.handleAnnotationControlsClick({ mode: AnnotationMode.REGION });

            expect(image.annotator.toggleAnnotationMode).toBeCalledWith(AnnotationMode.NONE);
            expect(image.processAnnotationModeChange).toBeCalledWith(AnnotationMode.NONE);
        });
    });

    describe('getViewportDimensions', () => {
        test('should return width and height', () => {
            image.wrapperEl = document.createElement('img');
            Object.defineProperty(image.wrapperEl, 'clientWidth', { value: 100 });
            Object.defineProperty(image.wrapperEl, 'clientHeight', { value: 100 });

            const result = image.getViewportDimensions();

            expect(result).toEqual({ width: 70, height: 70 });
        });
    });

    describe('handleZoomEvent', () => {
        beforeEach(() => {
            image = new ImageViewer({
                container: containerEl,
                enableAnnotationsImageDiscoverability: true,
                file: {
                    id: '1',
                    file_version: {
                        id: '1',
                    },
                },
                viewer: {
                    NAME: 'Image',
                    ASSET: '1.png',
                },
                representation: {
                    content: {
                        url_template: 'foo',
                    },
                },
            });
            image.containerEl = containerEl;
            image.setup();
            image.wrapperEl = document.createElement('img');

            Object.defineProperty(image.wrapperEl, 'clientWidth', { value: 100 });
            Object.defineProperty(image.wrapperEl, 'clientHeight', { value: 100 });
            jest.spyOn(image, 'processAnnotationModeChange');
        });

        test('should not call getViewportDimensions if type is undefined', () => {
            const width = 100;
            const height = 100;
            image.getViewportDimensions = jest.fn();

            image.handleZoomEvent({ newScale: [width, height], type: undefined });

            expect(image.getViewportDimensions).not.toHaveBeenCalled();
        });

        test.each`
            currentState                   | height | width
            ${AnnotationState.REGION}      | ${110} | ${110}
            ${AnnotationState.REGION}      | ${60}  | ${60}
            ${AnnotationState.REGION_TEMP} | ${60}  | ${60}
        `(
            'should not call processAnnotationModeChange when height is $height and width is $width and currentState is $currentState',
            ({ currentState, height, width }) => {
                image.annotationControlsFSM = new AnnotationControlsFSM(currentState);

                image.handleZoomEvent({ newScale: [width, height], type: 'in' });

                expect(image.processAnnotationModeChange).not.toHaveBeenCalled();
            },
        );

        test('should call processAnnotationModeChange and toggleAnnotationMode if image does overflow the viewport and currentState is REGION_TEMP', () => {
            const width = 110;
            const height = 110;
            image.annotator = {
                toggleAnnotationMode: jest.fn(),
            };

            image.handleZoomEvent({ newScale: [width, height], type: 'in' });

            expect(image.processAnnotationModeChange).toHaveBeenCalled();
            expect(image.annotator.toggleAnnotationMode).toHaveBeenCalled();
            expect(image.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
        });
    });

    describe('updateDiscoverabilityResinTag()', () => {
        const REMAINING_STATES = Object.values(AnnotationState).filter(state => state !== AnnotationState.REGION_TEMP);

        beforeEach(() => {
            image.containerEl = document.createElement('div');
        });

        test.each(Object.values(AnnotationState))(
            'should set resin tag to false if enableAnnotationsImageDiscoverability is false even if state=%s',
            state => {
                image.options.enableAnnotationsImageDiscoverability = false;
                image.annotationControlsFSM = new AnnotationControlsFSM(state);

                image.updateDiscoverabilityResinTag();

                expect(image.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
            },
        );

        test.each(REMAINING_STATES)(
            'should set resin tag to false if enableAnnotationsImageDiscoverability is true but state is %s',
            state => {
                image.options.enableAnnotationsImageDiscoverability = true;
                image.annotationControlsFSM = new AnnotationControlsFSM(state);

                image.updateDiscoverabilityResinTag();

                expect(image.containerEl.getAttribute('data-resin-discoverability')).toBe('false');
            },
        );

        test('should set resin tag to true if enableDiscoverability is true and state is REGION_TEMP', () => {
            image.options.enableAnnotationsImageDiscoverability = true;
            image.annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION_TEMP);

            image.updateDiscoverabilityResinTag();

            expect(image.containerEl.getAttribute('data-resin-discoverability')).toBe('true');
        });
    });

    describe('handleAnnotationCreateEvent()', () => {
        beforeEach(() => {
            image.annotator = {
                emit: jest.fn(),
            };
            image.annotationControls = {
                destroy: jest.fn(),
                setMode: jest.fn(),
            };
            image.processAnnotationModeChange = jest.fn();
        });

        const createEvent = status => ({
            annotation: { id: '123' },
            meta: {
                status,
            },
        });

        ['error', 'pending'].forEach(status => {
            test(`should not do anything if status is ${status}`, () => {
                const event = createEvent(status);
                image.handleAnnotationCreateEvent(event);

                expect(image.annotator.emit).not.toBeCalled();
            });
        });

        test('should reset controls if status is success', () => {
            const event = createEvent('success');
            image.handleAnnotationCreateEvent(event);

            expect(image.annotator.emit).toBeCalledWith('annotations_active_set', '123');
        });
    });

    describe('applyCursorFtux()', () => {
        beforeEach(() => {
            image.containerEl = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
                removeEventListener: jest.fn(),
            };
            image.annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION);
        });

        test('should add CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN to the container classList if the cache contains IMAGE_FTUX_CURSOR_SEEN_KEY', () => {
            image.cache.get = jest.fn().mockImplementation(() => true);

            image.applyCursorFtux();

            expect(image.containerEl.classList.add).toBeCalledWith(CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN);
        });

        test('should set IMAGE_FTUX_CURSOR_SEEN_KEY in cache if the cache does not contain IMAGE_FTUX_CURSOR_SEEN_KEY', () => {
            image.cache.get = jest.fn().mockImplementation(() => false);

            image.applyCursorFtux();

            expect(image.cache.set).toBeCalledWith(IMAGE_FTUX_CURSOR_SEEN_KEY, true, true);
        });
    });
});
