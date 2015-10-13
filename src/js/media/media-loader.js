'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';
import browser from '../browser';
import {
    audio as AUDIO_FORMATS,
    video as VIDEO_FORMATS
} from '../extensions';

let singleton = null;

const VIEWERS = {
    dash: {
        TYPE: 'video',
        EXTENSION: 'mpd',
        SCRIPTS: [ 'shaka-player.js', 'dash.js' ],
        STYLESHEETS: [ 'dash.css' ],
        CONSTRUCTOR: 'Dash'
    },
    mp3: {
        TYPE: 'audio',
        EXTENSION: 'mp3',
        SCRIPTS: [ 'mp3.js' ],
        STYLESHEETS: [ 'mp3.css' ],
        CONSTRUCTOR: 'MP3'
    },
    mp4: {
        TYPE: 'video',
        EXTENSION: 'mp4',
        SCRIPTS: [ 'mp4.js' ],
        STYLESHEETS: [ 'mp4.css' ],
        CONSTRUCTOR: 'MP4'
    }
};

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
        let [viewer, representation] = this.determineViewerAndRepresentation(file);

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(viewer.STYLESHEETS.map(assetPathCreator));

        // Load the scripts for this previewer
        return this.loadScripts(viewer.SCRIPTS.map(assetPathCreator)).then(() => {

            let previewer = new Box.Preview[viewer.CONSTRUCTOR](container, options);

            // Load the representations and return the instantiated previewer object
            return previewer.load(this.generateContentUrl(file.representations.content, viewer.TYPE, representation.manifest, representation.properties, options));

        });
    }

    /**
     * Chooses a viewer
     * 
     * @param {Object} file box file
     * @return {Array} the viewer to use and representation to load
     */
    determineViewerAndRepresentation(file) {
        let viewer;

        if (AUDIO_FORMATS.indexOf(file.extension) > -1) {
            viewer = VIEWERS['mp3'];
        } else if (this.dash) {
            viewer = VIEWERS['dash'];
        } else {
            viewer = VIEWERS['mp4'];
        }

        let representation = file.representations.entries.filter((entry) => {
            return entry.type === viewer.TYPE && entry.properties.extension === viewer.EXTENSION;
        });

        return [ viewer, representation[0] ];
    }
}

export default new MediaLoader();