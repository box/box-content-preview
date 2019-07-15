import axios from 'axios';
import DownloadReachability from './DownloadReachability';
import MetadataAPI from './metadataAPI';

/**
 * Retrieves JSON from response.
 *
 * @private
 * @param {Response} response - Response to parse
 * @return {Promise|Response} Response if 204 or 202, otherwise promise that resolves with JSON
 */
const parseResponse = response => {
    if (response.status === 204 || response.status === 202) {
        return response;
    }

    return response.data;
};

/**
 * Filter empty values from the http request options object
 *
 * @private
 * @param {Object} options - The request options
 * @return {Object} The cleaned request options
 */
const filterOptions = (options = {}) => {
    const result = {};

    Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
            result[key] = options[key];
        }
    });

    return result;
};

/**
 * Helper function to convert an http error to the format Preview expects
 *
 * @private
 * @param {Object} response - Axios error response
 * @throws {Error} - Throws when an error response object exists
 * @return {void}
 */
const handleError = ({ response }) => {
    if (response) {
        const error = new Error(response.statusText);
        error.response = response; // Need to pass response through so we can see what kind of HTTP error this was
        throw error;
    }
};

/**
 * Pass through transformer if the response type is text
 * @param {Object} data
 * @return {Object}
 */
const transformTextResponse = data => data;

export default class Api {
    /**
     * [constructor]
     *
     * @return {Api} Instance of the API
     */
    constructor() {
        this.client = axios.create();
        this.metadata = new MetadataAPI(this);
        this.reachability = new DownloadReachability(this);
    }

    /**
     * Adds a function that intercepts an http response

     * @public
     * @param {Function} responseInterceptor - Function that gets called on each response
     * @return {void}
     */
    addResponseInterceptor(responseInterceptor) {
        if (typeof responseInterceptor === 'function') {
            this.client.interceptors.response.use(responseInterceptor);
        }
    }

    /**
     * Adds a function that intercepts an http request
     * @public
     * @param {Function} requestInterceptor - function that gets called on each request
     * @return {void}

     */
    addRequestInterceptor(requestInterceptor) {
        if (typeof requestInterceptor === 'function') {
            this.client.interceptors.request.use(requestInterceptor);
        }
    }

    /**
     * Ejects all interceptors
     * @public
     *
     * @return {void}
     */
    ejectInterceptors() {
        ['response', 'request'].forEach(interceptorType => {
            this.client.interceptors[interceptorType].handlers.forEach((interceptor, index) => {
                this.client.interceptors[interceptorType].eject(index);
            });
        });
    }

    /**
     * HTTP GETs a URL
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} options - The request options
     * @return {Promise} - HTTP response
     */
    get(url, { type: responseType = 'json', ...options } = {}) {
        return this.xhr(url, { method: 'get', responseType, ...options });
    }

    /**
     * HTTP HEAD a URL
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} options - The request options
     * @return {Promise} HTTP response
     */
    head(url, options = {}) {
        return this.xhr(url, { method: 'head', ...options });
    }

    /**
     * HTTP POSTs a URL with JSON data
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} data - JS Object representation of JSON data to send
     * @param {Object} options - The request options
     * @return {Promise} HTTP response
     */
    post(url, data, options = {}) {
        return this.xhr(url, { method: 'post', data, ...options });
    }

    /**
     * HTTP DELETEs a URL with JSON data
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} data - JS Object representation of JSON data to send
     * @param {Object} options - The request options
     * @return {Promise} HTTP response
     */
    delete(url, data, options = {}) {
        return this.xhr(url, { method: 'delete', data, ...options });
    }

    /**
     * HTTP PUTs a url with JSON data
     *
     * @public
     * @param {string} url - The url to fetch
     * @param {Object} data - JS Object representation of JSON data to send
     * @param {Object} options - The request options
     * @return {Promise} HTTP response
     */
    put(url, data, options = {}) {
        return this.xhr(url, { method: 'put', data, ...options });
    }

    /**
     * Wrapper function for XHR post put and delete
     *
     * @private
     * @param {string} url - The URL for XHR
     * @param {Object} options - The request options
     * @return {Promise} - XHR promise
     */
    xhr(url, options = {}) {
        if (!(this instanceof Api)) {
            return Promise.reject(new SyntaxError('Invalid invocation'));
        }

        let transformResponse;

        if (options.responseType === 'text') {
            transformResponse = transformTextResponse;
        }

        return this.client(url, filterOptions({ transformResponse, ...options }))
            .then(parseResponse)
            .catch(handleError);
    }
}
