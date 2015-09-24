'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

let singleton = null;
let document = global.document;

const SCRIPTS = [
    'swfobject.js',
    'swf.js'
];

class SwfLoader extends AssetLoader {

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

        // Load the scripts for this previewer
        return this.loadScripts(SCRIPTS.map(assetPathCreator)).then(() => {

            let previewer = new Box.Preview.Swf(container, options);

            // Load the representations and return the instantiated previewer object
            return previewer.load(file.download_url);        
        
        });
    }

    /**
     * Prefetches the swf
     * 
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    prefetch(file, options) {
        let img = document.createElement('img');
        img.src = file.download_url;
    }
}

export default new SwfLoader();