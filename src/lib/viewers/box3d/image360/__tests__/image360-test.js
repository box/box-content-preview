/* eslint-disable no-unused-expressions */
import Image360 from '../image360';
import Box3DControls from '../../box3d-controls';
import Image360Renderer from '../image360-renderer';

const sandbox = sinon.sandbox.create();
const CSS_CLASS_IMAGE_360 = 'bp-image-360';

describe('lib/viewers/box3d/image360/image360', () => {
    let containerEl;
    let viewer;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/image360/__tests__/image360-test.html');
        containerEl = document.querySelector('.container');
        viewer = new Image360({
            container: containerEl,
            token: '12345',
            file: {
                id: '0'
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

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
