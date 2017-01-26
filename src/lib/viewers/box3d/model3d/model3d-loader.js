import AssetLoader from '../../asset-loader';
import Browser from '../../../browser';
import { replacePlaceholders } from '../../../util';
import Model3d from './model3d';

const VIEWERS = [
    {
        REP: '3d',
        EXT: ['box3d', 'fbx', 'obj', 'dae', '3ds', 'ply', 'stl'],
        NAME: Model3d
    }
];

class Model3dLoader extends AssetLoader {

    /**
     * Instantiates a loader for 3D model preview.
     * @constructor
     * @inheritdoc
     * @return {Model3dLoader} The model3d loader instance
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

        if (!Browser.supportsModel3D()) {
            const message = replacePlaceholders(__('error_unsupported'), [__('3d_models')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new Model3dLoader();
