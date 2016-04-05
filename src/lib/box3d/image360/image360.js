import './image360.scss';
import Box3D from '../box3d';
import Box3DControls from '../box3d-controls';
import Image360Renderer from './image360-renderer';

const Box = global.Box || {};
const CSS_CLASS_IMAGE_360 = 'box-preview-image-360';

/**
 * Image360
 * This is the entry point for the image360 preview.
 * @class
 */
class Image360 extends Box3D {

    constructor(container, options) {
        super(container, options);

        this.wrapperEl.classList.add(CSS_CLASS_IMAGE_360);
    }

    /**
     * @inheritdoc
     */
    createSubModules() {
        if (this.options.ui !== false) {
            this.controls = new Box3DControls(this.wrapperEl);
        }
        this.renderer = new Image360Renderer(this.wrapperEl, this.boxSdk);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Image360 = Image360;
global.Box = Box;
export default Image360;
