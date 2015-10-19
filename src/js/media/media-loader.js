'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

const AUDIO_FORMATS = [ 'aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma' ];
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
        EXTENSIONS: AUDIO_FORMATS,
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


let singleton = null;

class MediaLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader}
     */
    constructor() {
        if (!singleton) {
            super();
            this.dash = false; //browser.canPlayDash();
            singleton = this;
        }

        return singleton;
    }

    /**
     * Determines if this loader can be used
     * 
     * @param {Object} file box file
     * @return {Boolean}
     */
    canLoad(file) {
        return !!this.determineViewer(file);
    }

    /**
     * Loads the media previewer
     * 
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    load(file, container, options) {

        // Create an asset path creator function depending upon the locale
        let assetPathCreator = this.createAssetUrl(options.locale);

        // Determine the viewer to use
        let viewer = this.determineViewer(file);

        // Determine the representation to use
        let representation = this.determineRepresentation(file, viewer);

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(viewer.STYLESHEETS.map(assetPathCreator));

        // Load the scripts for this previewer
        return this.loadScripts(viewer.SCRIPTS.map(assetPathCreator)).then(() => {

            let previewer = new Box.Preview[viewer.CONSTRUCTOR](container, options);

            // Load the representations and return the instantiated previewer object
            return previewer.load(this.generateContentUrl(file.representations.content_base_url, representation.content, representation.properties, options));

        });
    }

    /**
     * Chooses a viewer based on file extension.
     * 
     * @param {Object} file box file
     * @return {Object} the viewer to use
     */
    determineViewer(file) {
        return VIEWERS.find((viewer) => {
            return viewer.EXTENSIONS.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => {
                return viewer.REPRESENTATION === entry.representation;
            });
        });
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     * 
     * @param {Object} file box file
     * @param {Object} viewer the chosen viewer
     * @return {Object} the representation to load
     */
    determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => {
            return viewer.REPRESENTATION === entry.representation;
        });
    }
}

export default new MediaLoader();