'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

let singleton = null;
let document = global.document;

const VIEWERS = {
    png: {
        TYPE: 'image',
        EXTENSION: 'png',
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    jpg: {
        TYPE: 'image',
        EXTENSION: 'jpg',
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    gif: {
        TYPE: 'original',
        EXTENSION: 'gif',
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    tiff: {
        TYPE: 'tiff',
        EXTENSION: [ 'tif', 'tiff' ],
        SCRIPTS: [ 'tiff.js' ],
        STYLESHEETS: [ 'tiff.css' ],
        CONSTRUCTOR: 'Tiff'
    }
};

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader}
     */
    constructor() {
        if (!singleton) {
            super();
            singleton = this;
        }

        return singleton;    
    }

    /**
     * Loads the image previewer
     * 
     * @param {Object} file box file
     * @param {String|HTMLElement} container where to load the preview
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
            switch (file.extension) {
                case 'gif':
                    return this.loadGif(file, container, options);
                case 'tif':
                    return this.loadTiff(file, container, options);
                default:
                    return this.loadPng(file, container, options);
            }
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

        if (VIEWERS.tiff.EXTENSION.indexOf(file.extension) > -1) {
            viewer = VIEWERS['tiff'];
        } else {
            viewer = VIEWERS['image'];
        }

        let representation = file.representations.entries.filter((entry) => {
            return entry.type === viewer.TYPE && entry.properties.extension === viewer.EXTENSION;
        });

        return [ viewer, representation[0] ];
    }

    /**
     * Loads the gif previewer
     * 
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    loadGif(file, container, options) {
        let previewer = new Box.Preview.Image(container, options);
        return previewer.load(file.download_url);   
    }

    /**
     * Loads the tiff previewer
     * 
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    loadTiff(file, container, options) {
        // Fully qualify the representation URLs
        let representations = file.representations.map(this.createRepresentationUrl(options.host));

        let previewer = new Box.Preview.Image(container, options);
        return previewer.load(file.download_url);   
    }

    /**
     * Loads the png previewer
     * 
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    loadPng(file, container, options) {
        // Fully qualify the representation URLs
        let representations = file.representations.map(this.createRepresentationUrl(options.host));

        let previewer = new Box.Preview.Image(container, options);
        return previewer.load(file.download_url);   
    }

    /**
     * Loads the image previewer
     * 
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    prefetch(file, options) {

        // Create an asset path creator function depending upon the locale
        let assetPathCreator = this.createAssetUrl(options.locale);

        // Fully qualify the representation URLs
        let representations = file.representations.map(this.createRepresentationUrl(options.host));

        representations.forEach((representation) => {
            let img = document.createElement('img');
            img.src = representation;
        });
    }
}

export default new ImageLoader();