'use strict';

import AssetLoader from '../asset-loader';

const VIEWERS = [
    {
        REPRESENTATION: '3d',
        EXTENSIONS: [ 'fbx', 'obj', 'dae', '3ds', 'ply'  ],
        SCRIPTS: [ 'boxsdk-0.0.2.js', 'box3d-resource-loader-0.0.3.js',
            'box3d-runtime-0.7.8.js', 'model3d.js' ],
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
