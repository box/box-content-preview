import './Image360.scss';
import Box3DViewer from '../Box3DViewer';
import Box3DControls from '../Box3DControls';
import Image360Renderer from './Image360Renderer';
import { ICON_FILE_IMAGE } from '../../../icons/icons';

const CSS_CLASS_IMAGE_360 = 'bp-image-360';
const LOAD_TIMEOUT = 120000;

class Image360Viewer extends Box3DViewer {
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = ICON_FILE_IMAGE;

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl.classList.add(CSS_CLASS_IMAGE_360);

        // Override timeout as we're often downloading the original representation
        // to ensure that we get the maximum resolution image. On a 3G connection,
        // the default 15 seconds is often not enough.
        this.loadTimeout = LOAD_TIMEOUT;
    }

    /**
     * @inheritdoc
     */
    createSubModules() {
        this.controls = new Box3DControls(this.wrapperEl);
        this.renderer = new Image360Renderer(this.wrapperEl, this.boxSdk);
    }
}

export default Image360Viewer;
