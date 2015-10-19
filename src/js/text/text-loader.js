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

const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'java', 'js', 'less', 'm', 'make', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'txt', 'vi', 'vim', 'webdoc', 'yaml' ],
        SCRIPTS: [ 'highlight.js', 'text.js' ],
        STYLESHEETS: [ 'text.css' ],
        CONSTRUCTOR: 'Text'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'md' ],
        SCRIPTS: [ 'highlight.js', 'markdown.js' ],
        STYLESHEETS: [ 'markdown.css' ],
        CONSTRUCTOR: 'MarkDown'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'csv' ],
        SCRIPTS: [ 'csv.js' ],
        STYLESHEETS: [ 'csv.css' ],
        CONSTRUCTOR: 'CSV'
    }
];

class TextLoader extends AssetLoader {

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
        return !!this.determineViewer(file);
    }

    /**
     * Chooses a viewer based on file extension.
     * 
     * @param {Object} file box file
     * @return {Object} the viewer to use
     */
    determineViewer(file) {
        return VIEWERS.find((viewer) => {
            return viewer.EXTENSIONS.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => {
                return viewer.REPRESENTATION === entry.representation;
            });
        });
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     * 
     * @param {Object} file box file
     * @param {Object} viewer the chosen viewer
     * @return {Object} the representation to load
     */
    determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => {
            return viewer.REPRESENTATION === entry.representation;
        });
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
        let viewer = this.determineViewer(file);

        // Determine the representation to use
        let representation = this.determineRepresentation(file, viewer);

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(viewer.STYLESHEETS.map(assetPathCreator));

        // Load the scripts for this previewer
        return this.loadScripts(viewer.SCRIPTS.map(assetPathCreator)).then(() => {

            let previewer = new Box.Preview[viewer.CONSTRUCTOR](container, options);

            // Load the representations and return the instantiated previewer object
            return previewer.load(this.generateContentUrl(file.representations.content_base_url, representation.content, representation.properties, options));

        });
    }
}

export default new TextLoader();