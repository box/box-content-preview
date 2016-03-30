import './image360.scss';
import Box3D from '../box3d';
import autobind from 'autobind-decorator';
import Image360Controls from './image360-controls';
import Image360Renderer from './image360-renderer';
import {
    EVENT_RELOAD,
    EVENT_SWITCH_2D
} from './image360-constants';

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
            this.controls = new Image360Controls(this.wrapperEl);
        }
        this.renderer = new Image360Renderer(this.wrapperEl, this.boxSdk);
    }

    /**
    * @inheritdoc
     */
    attachEventHandlers() {
        super.attachEventHandlers();
        if (this.controls) {
            this.controls.on(EVENT_SWITCH_2D, this.switchTo2dViewer);
        }
    }

    /**
     * @inheritdoc
     */
    detachEventHandlers() {
        super.detachEventHandlers();
        if (this.controls) {
            this.controls.removeListener(EVENT_SWITCH_2D, this.switchTo2dViewer);
        }
    }

    /**
     * Switches back to 2D viewer
     * @returns {void}
     */
    @autobind
    switchTo2dViewer() {
        Box.Preview.enableViewers('Image');
        this.emit(EVENT_RELOAD);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Image360 = Image360;
global.Box = Box;
export default Image360;
