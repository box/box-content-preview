'use strict';

import Promise from 'bluebird';
import ImageLoader from './image-loader';

let Box = global.Box || {};

class Preview {

    /**
     * [constructor]
     * @returns {Box.Preview}
     */
    constructor() {
        if (!Box.Preview) {
            Box.Preview = this;
        }
        return Box.Preview;    
    }

    /**
     * Shows a preview
     * @param {Object} file box file
     * @param {[string|HTMLElement} container where to load the preview
     * @param {Object} assets css and js assets for the viewer
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    show(file, container, assets, options = {}) {
        let promise;

        switch (file.type) {
            case 'image':
                promise = ImageLoader.load(file, container, assets);
                break;

        }

        return promise;

    }
}

Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;