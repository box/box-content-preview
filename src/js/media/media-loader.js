'use strict';

import AssetLoader from '../assets';

const VIDEO_FORMATS = [ '3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'mts', 'qt', 'wmv' ];
const VIEWERS = [
    {
        REPRESENTATION: 'dash',
        EXTENSIONS: VIDEO_FORMATS,
        SCRIPTS: [ 'shaka-player.js', 'dash.js' ],
        STYLESHEETS: [ 'dash.css' ],
        CONSTRUCTOR: 'Dash'
    },
    {
        REPRESENTATION: 'mp4',
        EXTENSIONS: VIDEO_FORMATS,
        SCRIPTS: [ 'mp4.js' ],
        STYLESHEETS: [ 'mp4.css' ],
        CONSTRUCTOR: 'MP4'
    },
    {
        REPRESENTATION: 'mp3',
        EXTENSIONS: [ '3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'mts', 'qt', 'wmv' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'mp3' ],
        SCRIPTS: [ 'mp3.js' ],
        STYLESHEETS: [ 'mp3.css' ],
        CONSTRUCTOR: 'MP3'
    }
];

class MediaLoader extends AssetLoader {
    
    /**
     * [constructor]
     * @returns {MediaLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new MediaLoader();