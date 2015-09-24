'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

let singleton = null;
let document = global.document;

const STYLESHEETS = [
    'image.css'
];

const SCRIPTS = [
    'image.js',
    'images.js'
];

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader}
     */
    constructor() {
        super();

        if (!singleton) {
            singleton = this;
        }

        return singleton;    
    }

    /**
     * Loads the image previewer
     * 
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    load(file, container, options) {

        // Create an asset path creator function depending upon the locale
        let assetPathCreator = this.createAssetUrl(options.locale);

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(STYLESHEETS.map(assetPathCreator));

        // Load the scripts for this previewer
        return this.loadScripts(SCRIPTS.map(assetPathCreator)).then(() => {
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