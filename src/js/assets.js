'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';

let document = global.document;
let loadedAssets = [];

const ASSETROOT = 'dist';

@autobind
class Assets {

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
     * @param {string} url
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
     * Loads external stylsheets by appending a <link> element
     * @param {Object} hash to urls
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
     * @param {Object} hash to urls
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
        return (url) => {
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
}

export default Assets;