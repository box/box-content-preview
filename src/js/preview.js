'use strict';

import '../css/preview.css';
import Promise from 'bluebird';
import fetch from 'isomorphic-fetch';
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
     * Returns the box file content api url
     * @param {id} file box file id
     * @param {Object} [options] optional options
     * @returns {String}
     */
    createUrl(id, options) {
        return options.host + '/filez/' + id + '/preview';
    }

    /**
     * Shows a preview
     * @param {id} file box file id
     * @param {[string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    show(id, container, options = {}) {

        return fetch(this.createUrl(id, options)).then((response) => {
            return response.json();
        }).then((file) => {

            let previewer;
            
            switch (file.type) {
                case 'image':
                    previewer = ImageLoader.load(file, container, options);
                    break;
                case 'video':
                    break;
                case 'audio':
                    break;
                default:
                    throw 'Unsupported viewer';
            }
            
            return previewer; 
        });
    }
}

Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;