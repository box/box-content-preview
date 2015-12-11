'use strict';

import autobind from 'autobind-decorator';
import RepLoader from './rep-loader';
import { generateContentUrl } from './util';

const CLASS_PREVIEW_LOADED = 'box-preview-loaded';

let Promise = global.Promise;
let document = global.document;
let loadedAssets = [];
let prefetchedAssets = [];

@autobind
class AssetLoader {

    /**
     * Create <link> element to prefetch external resource
     *
     * @param {string} url  asset urls
     * @returns {HTMLElement} link element
     */
    createPrefetchLink(url) {
        let link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        return link;
    }

    /**
     * Create <link> element to load external stylesheet
     *
     * @param {string} url  asset urls
     * @returns {HTMLElement} link element
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
     *
     * @param {String} url  asset url
     * @returns {Array} script element
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
     *
     * @param {Array} urls asset urls
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
     *
     * @param {Array} urls asset urls
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
     *
     * @param {Array} urls asset urls
     * @returns {Promise} Promise to load scripts
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
     * Factory to create asset URLs
     * @param {String} template url
     * @returns {Function} factory for creating asset url
     */
    assetUrlFactory(template) {
        return (name) => template.replace('{{asset_name}}', name);
    }

    /**
     * Determines if this loader can be used
     *
     * @param {Object} file box file
     * @returns {Boolean} Is file supported
     */
    canLoad(file) {
        return !!this.determineViewer(file);
    }

    /**
     * Chooses a viewer based on file extension.
     *
     * @param {Object} file box file
     * @returns {Object} the viewer to use
     */
    determineViewer(file) {
        return this.viewers.find((viewer) => {
            return viewer.EXTENSIONS.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => viewer.REPRESENTATION === entry.representation);
        });
    }

    /**
     * Loads a previewer
     *
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @returns {Promise} Promise to load a preview
     */
    load(file, container, options) {

        // Create a new representation loader
        let repLoader = new RepLoader();

        // Create an asset path creator function
        let assetPathCreator = this.assetUrlFactory(options.location.hrefTemplate);

        // Determine the viewer to use
        let viewer = this.determineViewer(file);

        // Save the factory for creating content urls
        options.contentUrlFactory = generateContentUrl;

        // Save the factory for creating asset urls
        options.assetUrlFactory = assetPathCreator;

        // Save CSS entries as options
        options.stylesheets = viewer.STYLESHEETS.map(assetPathCreator);

        // Save JS entries as options
        options.scripts = viewer.SCRIPTS.map(assetPathCreator);

        // Save file as options as the viewer may use it
        options.file = file;

        // 1st load the stylesheets needed by this previewer
        this.loadStylesheets(options.stylesheets);

        // Load the scripts for this previewer
        return this.loadScripts(options.scripts).then(() => {

            this.previewer = new Box.Preview[viewer.CONSTRUCTOR](container, options);

            // Once the previewer loads, hides loading indicator
            this.previewer.addListener('load', () => {
                if (container) {
                    container.firstElementChild.classList.add(CLASS_PREVIEW_LOADED);
                }
            });

            repLoader.addListener('ready', (rep) => this.previewer.load(rep));
            repLoader.addListener('error', (rep) => Promise.reject('Failed to load ' + rep));
            repLoader.load(file, viewer, options);
        });
    }

    /**
     * Prefetches assets
     *
     * @param {Object} file box file
     * @param {Object} [options] optional options
     * @returns {void}
     */
    prefetch(file, options) {
        // Create an asset path creator function
        let assetPathCreator = this.assetUrlFactory(options.location.hrefTemplate);

        // Determine the viewer to use
        let viewer = this.determineViewer(file);

        // Determine the representation to use
        let representation = RepLoader.determineRepresentation(file, viewer);

        // Prefetch the stylesheets needed by this previewer
        this.prefetchAssets(viewer.STYLESHEETS.map(assetPathCreator));

        // Prefetch the scripts for this previewer
        this.prefetchAssets(viewer.SCRIPTS.map(assetPathCreator));

        let img = document.createElement('img');
        img.src = generateContentUrl(representation.links.content.url, options.token);
    }

    /**
     * An empty function that can be overriden just incase
     * some loader wants to do some initialization stuff
     *
     * @param {Object} options options
     * @returns {void}
     */
    init(options) {
        // empty
    }

    /**
     * Destroys a previewer
     *
     * @param {Object} file box file
     * @param {string|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @returns {void}
     */
    destroy() {
        if (this.previewer && typeof this.previewer.destroy === 'function') {
            this.previewer.destroy();
        }

        this.previewer = undefined;
    }
}

export default AssetLoader;
