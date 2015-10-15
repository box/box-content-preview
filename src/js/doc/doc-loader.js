'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

let singleton = null;
let document = global.document;

const STYLESHEETS = [];

const SCRIPTS = [
    'crocodoc.js',
    'pdf.js'
    // others
];

const DOC_FORMATS = [ 'doc', 'docx', 'gdoc', 'gsheet', 'htm', 'html', 'msg', 'odp', 'odt', 'ods', 'pdf', 'ppt', 'pptx', 'rtf', 'tsv', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl' ];


class DocLoader extends AssetLoader {

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
     * Determines if this loader can be used
     * 
     * @param {Object} file box file
     * @return {Boolean}
     */
    canLoad(file) {
        return DOC_FORMATS.indexOf(file.extension) > -1;
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

            // Choose crocodoc.js or pdf.js        
        
        });
    }

    /**
     * Prefetches assets of a doc file
     * 
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @return {void}
     */
    prefetch(file, options) {
        
    }
}

export default new TextLoader();