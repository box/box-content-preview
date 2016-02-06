'use strict';

import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/';
const VIDEO_FORMATS = [ '3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'qt', 'wmv' ];

const VIEWERS = [
    {
        REPRESENTATION: 'dash',
        EXTENSIONS: VIDEO_FORMATS,
        SCRIPTS: [ STATIC_URI + 'media/shaka-player.js', STATIC_URI + 'model3d/boxsdk-0.1.1.js', STATIC_URI + 'model3d/box3d-resource-loader-0.1.1.js', STATIC_URI + 'model3d/box3d-runtime-0.9.1.js', 'video360.js' ],
        STYLESHEETS: [ 'dash.css', 'video360.css' ],
        CONSTRUCTOR: 'Video360',
        PREFETCH: 'xhr'
    }
];

class Video360Loader extends AssetLoader {

    /**
     * Instantiates a loader for 360 degree video preview.
     * @returns {Video360Loader} Video360Loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new Video360Loader();