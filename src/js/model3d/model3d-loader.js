'use strict';

import AssetLoader from '../asset-loader';

const VIEWERS = [
    {
        REPRESENTATION: '3d',
        EXTENSIONS: [ 'fbx', 'obj', 'dae', '3ds', 'ply'  ],
        SCRIPTS: [ 'boxsdk-0.1.1.js', 'box3d-resource-loader-0.1.1.js',
            'box3d-runtime-0.8.1.js', 'model3d.js' ],
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

    /**
     * A unique identifier for this loader
     *
     * @public
     * @returns {String} id of this loader
     */
    get id() {
        return 'box-3d';
    }
}

export default new Model3dLoader();
