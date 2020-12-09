/* eslint-disable no-unused-expressions */
import Image360Viewer from '../Image360Viewer';
import BaseViewer from '../../../BaseViewer';
import Box3DControls from '../../Box3DControls';
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
    });
});
