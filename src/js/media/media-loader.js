'use strict';

import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/media/';
const VIDEO_FORMATS = [ '3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'mts', 'qt', 'wmv' ];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a mp3 file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the mp3 representation (for watermarked versions).
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'mp3' ],
        SCRIPTS: [ 'mp3.js' ],
        STYLESHEETS: [ 'mp3.css' ],
        CONSTRUCTOR: 'MP3'
    },
    {
        REPRESENTATION: 'dash',
        EXTENSIONS: VIDEO_FORMATS,
        SCRIPTS: [ STATIC_URI + 'shaka-player.js', 'dash.js' ],
        STYLESHEETS: [ 'dash.css' ],
        CONSTRUCTOR: 'Dash',
        PREFETCH: 'xhr'
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
        EXTENSIONS: [ 'aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma' ],
        SCRIPTS: [ 'mp3.js' ],
        STYLESHEETS: [ 'mp3.css' ],
        CONSTRUCTOR: 'MP3'
    }
];

class MediaLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {MediaLoader} MediaLoader instance
     */
    constructor() {
        super();
        this.type = 'media';
        this.viewers = VIEWERS;
    }
}

export default new MediaLoader();