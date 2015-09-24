'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

let singleton = null;
let document = global.document;

const STYLESHEETS = [
    'text.css',
    'github.css'
];

const SCRIPTS = [
    'highlight.js',
    'text.js'
];

class TextLoader extends AssetLoader {

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

            let previewer = new Box.Preview.PlainText(container, options);

            // Load the representations and return the instantiated previewer object
            return previewer.load(file);        
        
        });
    }

    /**
     * Prefetches content of a text file
     * 
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @return {void}
     */
    prefetch(file, options) {
        fetch(file.download_url).then((response) => {
            return response.text();
        }).then((txt) => {
            file.content = txt; 
        });
    }
}

export default new TextLoader();