import AssetLoader from '../../AssetLoader';
import Browser from '../../../Browser';
import { replacePlaceholders } from '../../../util';
import Model3DViewer from './Model3DViewer';

const VIEWERS = [
    {
        NAME: 'Model3d',
        CONSTRUCTOR: Model3DViewer,
        REP: '3d',
        EXT: ['box3d', 'fbx', 'obj', 'dae', '3ds', 'ply', 'stl']
    }
];

class Model3DLoader extends AssetLoader {
    /**
     * Instantiates a loader for 3D model preview.
     * @constructor
     * @inheritdoc
     * @return {Model3DLoader} The model3d loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);

        if (viewer && !Browser.supportsModel3D()) {
            const message = replacePlaceholders(__('error_unsupported'), [__('3d_models')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new Model3DLoader();
