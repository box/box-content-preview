import axios from 'axios';

const api = {
    /**
     * Filter empty values from the Axios request options object
     *
     * @private
     * @param {Object} options - The request options
     * @return {Object} The cleaned request options
     */
    filterOptions(options = {}) {
        const result = {};

        Object.keys(options).forEach(key => {
            if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
                result[key] = options[key];
            }
        });

        return result;
    },

    /**
     * Helper function to convert an Axios error to the format Preview expects
     *
     * @private
     * @param {Object} response - Axios error response
     * @throws {Error} - Throws when an error response object exists
     * @return {void}
     */
    handleError({ response }) {
        if (response) {
            const error = new Error(response.statusText);
            error.response = response; // Need to pass response through so we can see what kind of HTTP error this was
            throw error;
        }
    },

    /**
     * Retrieves JSON from response.
     *
     * @private
     * @param {Response} response - Response to parse
     * @return {Promise|Response} Response if 204 or 202, otherwise promise that resolves with JSON
     */
    parseResponse: response => {
        if (response.status === 204 || response.status === 202) {
            return response;
        }

        return response.data;
    },

    transformTextResponse: data => data,

    /**
     * Wrapper function for XHR post put and delete
     *
     * @private
     * @param {string} url - The URL for XHR
     * @param {Object} options - The request options
     * @return {Promise} - XHR promise
     */
    xhr(url, options = {}) {
        let transformResponse;

        if (options.responseType === 'text') {
            transformResponse = api.transformTextResponse;
        }

        return axios(url, api.filterOptions({ transformResponse, ...options }))
            .then(api.parseResponse)
            .catch(api.handleError);
    },

    /**
     * HTTP GETs a URL
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} options - The request options
     * @return {Promise} - HTTP response
     */
    get(url, { type: responseType = 'json', ...options } = {}) {
        return api.xhr(url, { method: 'get', responseType, ...options });
    },

    /**
     * HTTP HEAD a URL
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} options - The request options
     * @return {Promise} HTTP response
     */
    head(url, options = {}) {
        return api.xhr(url, { method: 'head', ...options });
    },

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
        return api.xhr(url, { method: 'post', data, ...options });
    },

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
        return api.xhr(url, { method: 'delete', data, ...options });
    },

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
        return api.xhr(url, { method: 'put', data, ...options });
    },
};

export default api;
