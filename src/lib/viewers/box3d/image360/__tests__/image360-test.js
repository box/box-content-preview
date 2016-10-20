/* eslint-disable no-unused-expressions */
import Image360 from '../image360';
import Box3DControls from '../../box3d-controls';
import Image360Renderer from '../image360-renderer';

const sandbox = sinon.sandbox.create();
const CSS_CLASS_IMAGE_360 = 'box-preview-image-360';

let containerEl;

describe('image360', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/image360/__tests__/image360-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('constructor()', () => {
        let viewer;
        beforeEach(() => {
            viewer = new Image360(containerEl, { token: '12345' });
        });

        afterEach(() => {
            viewer = null;
        });

        it('should add CSS_CLASS_IMAGE_360 to the wrapper element', () => {
            expect(viewer.wrapperEl).to.have.class(CSS_CLASS_IMAGE_360);
        });

        it('should set the load timeout to 120000', () => {
            expect(viewer.loadTimeout).to.equal(120000);
        });
    });

    describe('createSubModules()', () => {
        let viewer;
        beforeEach(() => {
            viewer = new Image360(containerEl, { token: '12345' });
        });

        afterEach(() => {
            viewer = null;
        });

        it('should create Box3DControls instance and assign to .controls', () => {
            expect(viewer.controls).to.be.an.instanceof(Box3DControls);
        });

        it('should create Image360Renderer instance and assign to .renderer', () => {
            expect(viewer.renderer).to.be.an.instanceof(Image360Renderer);
        });
    });
});
