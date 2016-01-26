'use strict';

import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: '3d',
        EXTENSIONS: [ 'fbx', 'obj', 'dae', '3ds', 'ply'  ],
        SCRIPTS: [ STATIC_URI + 'boxsdk-0.1.1.js', STATIC_URI + 'box3d-resource-loader-0.1.1.js', STATIC_URI + 'box3d-runtime-0.9.1.js', 'model3d.js' ],
        STYLESHEETS: [ 'model3d.css' ],
        CONSTRUCTOR: 'Model3d'
    }
];

class Model3dLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {Model3dLoader} The model3d loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new Model3dLoader();
