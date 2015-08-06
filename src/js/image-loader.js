'use strict';

import Promise from 'bluebird';
import AssetLoader from './assets';

let singleton = null;

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
     * @param {Object} assets css and js assets for the viewer
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    load(file, container, assets, options) {

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(assets.image.stylesheets);

        return new Promise((resolve, reject) => {

            let previewer;
            let representations = file.representations;

            // Load the scripts for this previewer
            Promise.all(this.loadScripts(assets.image.scripts)).then(() => {

                // Instantiate the previwer
                if (representations.length > 1) {
                    previewer = new Box.Images(container, options);
                } else {
                    previewer = new Box.Image(container, options);
                    representations = representations[0];
                }

                // Load the representations and return the instantiated previewer object
                previewer.load(representations).then(() => {
                    resolve(previewer);
                }).catch((err) => {
                    reject(err);
                });
            
            }).catch((err) => {
                reject(err);
            });
        });
    }

}

export default new ImageLoader();