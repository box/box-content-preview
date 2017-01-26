import AssetLoader from '../../asset-loader';
import Browser from '../../../browser';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REP: '3d',
        EXT: ['box3d', 'fbx', 'obj', 'dae', '3ds', 'ply', 'stl'],
        JS: [
            `${STATIC_URI}boxsdk.js`,
            `${STATIC_URI}box3d-runtime.js`,
            `${STATIC_URI}webvr-polyfill.js`,
            `${STATIC_URI}WebVR/VRConfig.js`,
            'model3d.js'
        ],
        CSS: ['box3d.css', 'model3d.css'],
        NAME: 'Model3d',
        PREFETCH: 'xhr',
        ASSET: 'entities.json'
    }
];

class Model3dLoader extends AssetLoader {

    /**
     * Instantiates a loader for 3D model preview.
     * @constructor
     * @inheritdoc
     * @returns {Model3dLoader} The model3d loader instance
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
            throw new Error(__('error_unsupported'));
        }

        return viewer;
    }
}

export default new Model3dLoader();
