/* eslint-disable no-unused-expressions */
import Image360Viewer from '../Image360Viewer';
import BaseViewer from '../../../BaseViewer';
import Box3DControls from '../../Box3DControls';
import Image360Renderer from '../Image360Renderer';
import { SELECTOR_BOX_PREVIEW_CONTENT } from '../../../../constants';

const sandbox = sinon.sandbox.create();
const CSS_CLASS_IMAGE_360 = 'bp-image-360';

describe('lib/viewers/box3d/image360/Image360Viewer', () => {
    let containerEl;
    let viewer;
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

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
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        viewer.containerEl = document.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (viewer && typeof viewer.destroy === 'function') {
            viewer.destroy();
        }
        viewer = null;
    });

    describe('setup()', () => {
        it('should add CSS_CLASS_IMAGE_360 to the wrapper element', () => {
            viewer.setup();
            expect(viewer.wrapperEl).to.have.class(CSS_CLASS_IMAGE_360);
        });

        it('should set the load timeout to 120000', () => {
            viewer.setup();
            expect(viewer.loadTimeout).to.equal(120000);
        });
    });

    describe('createSubModules()', () => {
        beforeEach(() => {
            viewer.setup();
            viewer.createSubModules();
        });

        it('should create Box3DControls instance and assign to .controls', () => {
            expect(viewer.controls).to.be.an.instanceof(Box3DControls);
        });

        it('should create Image360Renderer instance and assign to .renderer', () => {
            expect(viewer.renderer).to.be.an.instanceof(Image360Renderer);
        });
    });
});
