'use strict';

import autobind from 'autobind-decorator';
import EventEmitter from 'events';

const STATUS_PENDING = 'pending';
const STATUS_NONE = 'none';
const STATUS_ERROR = 'error';
const STATUS_SUCCESS = 'success';
const STATUS_READY = 'ready';

@autobind
class RepLoader extends EventEmitter {

    /**
     * Converts a json object to query string
     * @param {Object} obj Object to change to query string
     * @returns {String} Query string
     */
    static generateQueryString(obj) {
        return '?' + Object.keys(obj).map((key) => {
            return global.encodeURIComponent(key) + '=' + global.encodeURIComponent(obj[key]);
        }).join('&');
    }

    /**
     * Creates the content URLs
     *
     * @protected
     * @param {String} baseUrl base url
     * @param {String} contentPath content path
     * @param {Object} properties properties
     * @param {String} token auth token
     * @returns {String} content urls
     */
    static generateContentUrl(baseUrl, contentPath, properties, token) {
        properties.access_token = token;
        return baseUrl + contentPath + RepLoader.generateQueryString(properties);
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     *
     * @param {Object} file box file
     * @param {Object} viewer the chosen viewer
     * @returns {Object} the representation to load
     */
    static determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => viewer.REPRESENTATION === entry.representation);
    }

    /**
     * Loads a representation asset
     *
     * @param {String} url rep url
     * @returns {void}
     */
    updateStatus(url) {
        fetch(url).then((response) => {
            clearTimeout(this.statusTimeout);
            switch (response.status) {
                case 200:
                    this.emit(STATUS_READY, url);
                    this.emit(STATUS_SUCCESS, url);
                    break;
                case 202:
                    this.emit(STATUS_PENDING, url);
                    this.statusTimeout = setTimeout(() => {
                        this.updateStatus(url);
                    }, 3000);
                    break;
                default:
                    this.emit(STATUS_ERROR, url);
                    break;
            }
        });
    }

    /**
     * Loads a representation asset
     *
     * @param {Object} file box file
     * @param {Object} viewer the viewer to load
     * @param {Object} options options
     * @returns {Promise} Promise to load a preview
     */
    load(file, viewer, options) {

        // Determine the representation to use
        let representation = RepLoader.determineRepresentation(file, viewer);

        let baseUrl = file.representations.content_base_url;
        let contentPath = representation.content;
        let properties = representation.properties;
        let token = options.token;
        let repUrl = RepLoader.generateContentUrl(baseUrl, contentPath, properties, token);

        switch (representation.status) {
            case STATUS_SUCCESS:
            case STATUS_NONE:
                this.emit(STATUS_READY, repUrl);
                this.emit(STATUS_SUCCESS, repUrl);
                break;
            case STATUS_ERROR:
                this.emit(STATUS_ERROR, repUrl);
                break;
            case STATUS_PENDING:
                this.updateStatus(repUrl);
                break;
        }
    }
}

export default RepLoader;
