'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';

let document = global.document;
let loadedAssets = [];
let prefetchedAssets = [];

const ASSETROOT = 'dist';

@autobind
class Assets {

    /**
     * Converts a json object to query string
     * @param {Object} obj Object to change to query string
     * @returns {String} Query string
     */
    generateQueryString(obj) {
        return '?' + Object.keys(obj).map((key) => {
            return global.encodeURIComponent(key) + '=' + global.encodeURIComponent(obj[key]);
        }).join('&');
    }
    
    /**
     * Converts a json object to query string
     * @param {Object} obj Object to change to query string
     * @returns {String} Query string
     */
    generateContentUrl(baseUrl, contentPath, properties, options) {
        properties.access_token = options.authToken;
        return options.host + baseUrl + contentPath + this.generateQueryString(properties);
    }
    
    /**
     * Create <link> element to prefetch external resource
     * @param {string} url
     * @returns {HTMLElement}
     */
    createPrefetchLink(url) {
        let link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        return link;
    }

    /**
     * Create <link> element to load external stylesheet
     * @param {string} url
     * @returns {HTMLElement}
     */
    createStylesheet(url) {
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        return link;
    }

    /**
     * Create <script> element to load external script
     * @param {String} url
     * @returns {Array}
     */
    createScript(url) {
        let script = document.createElement('script');
        script.src = url;
        script.async = false;
        
        return [script, new Promise((resolve, reject) => {
            script.addEventListener('load', resolve);
            script.addEventListener('error', reject);
        })];
    }

    /**
     * Prefetches external stylsheets or js by appending a <link rel="prefetch"> element
     * @param {Array} urls
     * @returns {void}
     */
    prefetchAssets(urls) {
        let head = document.getElementsByTagName('head')[0];
        
        urls.forEach((url) => {
            if (prefetchedAssets.indexOf(url) === -1) {
                prefetchedAssets.push(url);
                head.appendChild(this.createPrefetchLink(url)); 
            }
        });
    }

    /**
     * Loads external stylsheets by appending a <link> element
     * @param {Array} urls
     * @returns {void}
     */
    loadStylesheets(urls) {
        let head = document.getElementsByTagName('head')[0];
        
        urls.forEach((url) => {
            if (loadedAssets.indexOf(url) === -1) {
                loadedAssets.push(url);
                head.appendChild(this.createStylesheet(url)); 
            }
        });
    }

    /**
     * Loads external scripts by appending a <script> element
     * @param {Array} urls
     * @returns {Promise}
     */
    loadScripts(urls) {
        let head = document.getElementsByTagName('head')[0];
        let promises = [];
        
        urls.forEach((url) => {
            if (loadedAssets.indexOf(url) === -1) {
                loadedAssets.push(url);
                let [script, promise] = this.createScript(url);
                promises.push(promise);
                head.appendChild(script); 
            }
        });

        return Promise.all(promises);
    }

    /**
     * Returns the asset path
     * @param {String} locale
     * @returns {Function}
     */
    createRepresentationUrl(host) {
        return (file, url) => {
            return host + '/' + url;
        };
    }

    /**
     * Returns the asset path
     * @param {String} locale
     * @param {String} name
     * @returns {Function}
     */
    createAssetUrl(locale) {
        return (name) => {
            return ASSETROOT + '/' + locale + '/' + name;
        };
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
        return this.viewers.find((viewer) => {
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
     * Loads a previewer
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

    /**
     * Prefetches assets
     * 
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    prefetch(file, options) {
        // Create an asset path creator function depending upon the locale
        let assetPathCreator = this.createAssetUrl(options.locale);

        // Determine the viewer to use
        let viewer = this.determineViewer(file);

        // Determine the representation to use
        let representation = this.determineRepresentation(file, viewer);

        // Prefetch the stylesheets needed by this previewer
        this.prefetchAssets(viewer.STYLESHEETS.map(assetPathCreator));

        // Prefetch the scripts for this previewer
        this.prefetchAssets(viewer.SCRIPTS.map(assetPathCreator));

        let img = document.createElement('img');
        img.src = this.generateContentUrl(file.representations.content_base_url, representation.content, representation.properties, options);
    }
}

export default Assets;