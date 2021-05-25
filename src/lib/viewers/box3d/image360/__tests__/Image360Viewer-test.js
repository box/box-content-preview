/* eslint-disable no-unused-expressions */
import Image360Viewer from '../Image360Viewer';
import BaseViewer from '../../../BaseViewer';
import Box3DControls from '../../Box3DControls';
import ControlsRoot from '../../../controls';
import Image360Renderer from '../Image360Renderer';
import { SELECTOR_BOX_PREVIEW_CONTENT } from '../../../../constants';

const CSS_CLASS_IMAGE_360 = 'bp-image-360';

describe('lib/viewers/box3d/image360/Image360Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;
    let containerEl;
    let viewer;

    beforeEach(() => {
        fixture.load('viewers/box3d/image360/__tests__/Image360Viewer-test.html');
        containerEl = document.querySelector('.container');
        viewer = new Image360Viewer({
            container: containerEl,
            token: '12345',
            file: {
                id: '0',
            },
        });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        viewer.containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (viewer && typeof viewer.destroy === 'function') {
            viewer.destroy();
        }
        viewer = null;
    });

    describe('setup()', () => {
        test('should add CSS_CLASS_IMAGE_360 to the wrapper element', () => {
            viewer.setup();
            expect(viewer.wrapperEl).toHaveClass(CSS_CLASS_IMAGE_360);
        });

        test('should set the load timeout to 120000', () => {
            viewer.setup();
            expect(viewer.loadTimeout).toBe(120000);
        });
    });

    describe('createSubModules()', () => {
        beforeEach(() => {
            viewer.setup();
            viewer.createSubModules();
        });

        test('should create Box3DControls instance and assign to .controls', () => {
            expect(viewer.controls).toBeInstanceOf(Box3DControls);
        });

        test('should create Image360Renderer instance and assign to .renderer', () => {
            expect(viewer.renderer).toBeInstanceOf(Image360Renderer);
        });

        describe('With react controls', () => {
            beforeEach(() => {
                jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => true);
            });

            test('should create ControlsRoot instance and assign to .controls', () => {
                viewer.createSubModules();
                expect(viewer.controls).toBeInstanceOf(ControlsRoot);
            });
        });
    });

    describe('handleSceneLoaded()', () => {
        beforeEach(() => {
            jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => true);
            jest.spyOn(viewer, 'renderUI');
        });

        test('should render the react UI', () => {
            viewer.handleSceneLoaded();
            expect(viewer.renderUI).toBeCalled();
        });

        describe('Without react controls', () => {
            beforeEach(() => {
                jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => false);
            });

            test('should render the react UI', () => {
                viewer.handleSceneLoaded();
                expect(viewer.renderUI).not.toBeCalled();
            });
        });
    });

    describe('handleShowVrButton()', () => {
        beforeEach(() => {
            jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => true);
            jest.spyOn(viewer, 'renderUI');

            viewer.setup();
            viewer.createSubModules();
        });

        test('should render the react UI', () => {
            viewer.handleShowVrButton();

            expect(viewer.showVrButton).toBe(true);
            expect(viewer.renderUI).toBeCalled();
        });

        describe('Without react controls', () => {
            beforeEach(() => {
                jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => false);

                viewer.createSubModules();

                jest.spyOn(viewer.controls, 'showVrButton');
            });

            test('should call showVrButton on the controls', () => {
                viewer.handleShowVrButton();

                expect(viewer.renderUI).not.toBeCalled();
                expect(viewer.controls.showVrButton).toBeCalled();
            });
        });
    });

    describe('renderUI()', () => {
        const getProps = instance => instance.controls.render.mock.calls[0][0].props;

        beforeEach(() => {
            jest.spyOn(viewer, 'getViewerOption').mockImplementation(() => true);
            viewer.controls = {
                destroy: jest.fn(),
                render: jest.fn(),
            };
        });

        test('should render react controls with the correct props', () => {
            viewer.renderUI();

            expect(getProps(viewer)).toMatchObject({
                isVrShown: false,
                onFullscreenToggle: viewer.toggleFullscreen,
                onVrToggle: viewer.handleToggleVr,
            });
        });
    });
});
