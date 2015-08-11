'use strict';

import Promise from 'bluebird';
import AssetLoader from './assets';

let singleton = null;

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
        let assetPathCreator = this.createAssetUrl(file.locale);

        // Fully qualify the representation URLs
        let representations = file.representations.map(this.createRepresentationUrl(options.host));

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(STYLESHEETS.map(assetPathCreator));

        // Load the scripts for this previewer
        return this.loadScripts(SCRIPTS.map(assetPathCreator)).then(() => {

            let previewer;

            // Instantiate the previwer
            if (representations.length > 1) {
                previewer = new Box.Images(container, options);
            } else {
                previewer = new Box.Image(container, options);
                representations = representations[0];
            }

            // Load the representations and return the instantiated previewer object
            return previewer.load(representations);        
        
        });
    }
}

export default new ImageLoader();