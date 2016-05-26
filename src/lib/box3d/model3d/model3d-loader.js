import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: '3d',
        EXTENSIONS: ['box3d', 'fbx', 'obj', 'dae', '3ds', 'ply', 'stl'],
        SCRIPTS: [`${STATIC_URI}boxsdk.js`, `${STATIC_URI}box3d-resource-loader.js`, `${STATIC_URI}box3d-runtime.js`, 'model3d.js'],
        STYLESHEETS: ['box3d.css', 'model3d.css'],
        CONSTRUCTOR: 'Model3d'
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
}

export default new Model3dLoader();
